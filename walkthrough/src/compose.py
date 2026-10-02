#!/usr/bin/env python3
"""60 fps compositor: the canvas plate (background + browser chrome) with the
screencast frames pasted into the window's content area, a smooth cursor with
click ripples, Screen-Studio-style zooms, and overlay PNGs (step rail, cards,
kinetic intro lines) → H.264 via ffmpeg stdin. Hot path is numpy/OpenCV (BGR).

usage: compose.py <outDir> [--fps 60] [--preview]   (preview = 1280x720, libx264)
"""
import bisect
import json
import math
import os
import subprocess
import sys
import time

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ACCENT_BGR = (184, 194, 143)  # #8fc2b8


def ease(u):
    u = max(0.0, min(1.0, u))
    return 4 * u * u * u if u < 0.5 else 1 - ((-2 * u + 2) ** 3) / 2


def make_cursor(h=64):
    """macOS-style arrow: dark fill, white outline, soft shadow. Hotspot = tip.
    Drawn at 8× with PIL and downsampled. Returns (BGRA uint8 array, hotspot)."""
    S = 8
    H = h * S
    pts = [(0, 0), (0, 0.80 * H), (0.20 * H, 0.63 * H), (0.34 * H, 0.95 * H), (0.46 * H, 0.90 * H),
           (0.33 * H, 0.60 * H), (0.60 * H, 0.60 * H)]
    pad = int(0.16 * H)
    W = int(0.62 * H)
    img = Image.new('RGBA', (W + 2 * pad, int(H) + 2 * pad), (0, 0, 0, 0))
    poly = [(x + pad, y + pad) for x, y in pts]
    sh = Image.new('RGBA', img.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).polygon([(x + 0.03 * H, y + 0.05 * H) for x, y in poly], fill=(0, 0, 0, 110))
    sh = sh.filter(ImageFilter.GaussianBlur(0.045 * H))
    img.alpha_composite(sh)
    d = ImageDraw.Draw(img)
    d.polygon(poly, fill=(255, 255, 255, 255))
    d.line(poly + [poly[0]], fill=(255, 255, 255, 255), width=int(0.09 * H), joint='curve')
    d.polygon(poly, fill=(16, 16, 18, 255))
    out = img.resize((img.width // S, img.height // S), Image.LANCZOS)
    arr = np.array(out)  # RGBA
    return arr[:, :, [2, 1, 0, 3]].copy(), (pad // S, pad // S)


def blend(dst, src_bgra, x, y, alpha_mul=1.0):
    """Alpha-composite a BGRA sprite onto the BGR frame at (x, y) with clipping."""
    H, W = dst.shape[:2]
    h, w = src_bgra.shape[:2]
    x0, y0 = max(0, x), max(0, y)
    x1, y1 = min(W, x + w), min(H, y + h)
    if x1 <= x0 or y1 <= y0:
        return
    src = src_bgra[y0 - y:y1 - y, x0 - x:x1 - x]
    a = src[:, :, 3:4].astype(np.float32) * (alpha_mul / 255.0)
    region = dst[y0:y1, x0:x1].astype(np.float32)
    region *= (1.0 - a)
    region += src[:, :, :3].astype(np.float32) * a
    dst[y0:y1, x0:x1] = region.astype(np.uint8)


def scale_sprite(bgra, s):
    if abs(s - 1.0) < 0.02:
        return bgra
    w = max(1, int(round(bgra.shape[1] * s)))
    h = max(1, int(round(bgra.shape[0] * s)))
    return cv2.resize(bgra, (w, h), interpolation=cv2.INTER_AREA if s < 1 else cv2.INTER_LINEAR)


def corner_mask(r):
    """r×r float mask of a bottom-right rounded corner (1 = inside the window)."""
    yy, xx = np.mgrid[0:r, 0:r].astype(np.float32)
    d = np.sqrt((xx + 0.5) ** 2 + (yy + 0.5) ** 2)
    m = np.clip(r - d + 0.5, 0, 1)
    return m[:, :, None]


class Zoomer:
    """Keyframed camera: each cue eases from the camera state at its start time to
    its target (cx, cy, scale). Zoom-out keeps the current centre (straight pull-back)."""

    def __init__(self, zooms, W, H):
        self.W, self.H = W, H
        keys = sorted(zooms, key=lambda z: z['t'])
        self.keys = []
        state = (W / 2, H / 2, 1.0)
        for z in keys:
            start = self._state_at(z['t'], self.keys, state)
            target = (z['cx'], z['cy'], z['scale']) if z['scale'] > 1 else (start[0], start[1], 1.0)
            self.keys.append((z['t'], z.get('duration', 0.7), start, target))

    @staticmethod
    def _state_at(t, keys, initial):
        st = initial
        for (kt, dur, start, target) in keys:
            if t < kt:
                break
            u = ease((t - kt) / dur) if dur > 0 else 1.0
            st = tuple(start[i] + (target[i] - start[i]) * u for i in range(3))
        return st

    def view(self, t):
        cx, cy, s = self._state_at(t, self.keys, (self.W / 2, self.H / 2, 1.0))
        if s <= 1.0005:
            return None
        w, h = self.W / s, self.H / s
        x0 = min(max(cx - w / 2, 0), self.W - w)
        y0 = min(max(cy - h / 2, 0), self.H - h)
        return (x0, y0, s)


def has_encoder(name):
    """True if this ffmpeg build can encode with `name` (videotoolbox is macOS-only)."""
    try:
        out = subprocess.run(['ffmpeg', '-hide_banner', '-encoders'], capture_output=True, text=True).stdout
    except OSError:
        return False
    return any(line.split()[1:2] == [name] for line in out.splitlines())


def main():
    out_dir = sys.argv[1]
    fps = 60
    preview = '--preview' in sys.argv
    if '--fps' in sys.argv:
        fps = int(sys.argv[sys.argv.index('--fps') + 1])
    tl = json.load(open(os.path.join(out_dir, 'timeline.json')))
    W, H = tl['width'], tl['height']
    OW, OH = (1280, 720) if preview else (W, H)
    so = OW / W  # output scale
    frames = tl['frames']
    ftimes = [f[0] for f in frames]
    dur = tl['duration']
    n_out = int(math.ceil(dur * fps))

    # canvas plate + window content rect (output px)
    L = tl['layout']
    plate = cv2.imread(L['plate'], cv2.IMREAD_COLOR)
    if preview:
        plate = cv2.resize(plate, (OW, OH), interpolation=cv2.INTER_AREA)
    cx, cy = int(round(L['content']['x'] * so)), int(round(L['content']['y'] * so))
    cw, ch = int(round(L['content']['w'] * so)), int(round(L['content']['h'] * so))
    r = max(2, int(round(L['radius'] * so)))
    cm = corner_mask(r)                       # bottom-right orientation
    masks = {'bl': cm[:, ::-1], 'br': cm}
    plate_bl = plate[cy + ch - r:cy + ch, cx:cx + r].astype(np.float32)
    plate_br = plate[cy + ch - r:cy + ch, cx + cw - r:cx + cw].astype(np.float32)

    cur = np.array(tl['cursor'], dtype=np.float64) if tl['cursor'] else np.zeros((0, 3))
    ct = cur[:, 0] if len(cur) else np.zeros(0)
    clicks = tl['clicks']
    zoomer = Zoomer(tl['zooms'], W, H)

    overlays = []
    for o in tl['overlays']:
        im = cv2.imread(o['png'], cv2.IMREAD_UNCHANGED)
        if im.shape[2] == 3:
            im = cv2.cvtColor(im, cv2.COLOR_BGR2BGRA)
        if preview:
            im = cv2.resize(im, (max(1, int(im.shape[1] * so)), max(1, int(im.shape[0] * so))), interpolation=cv2.INTER_AREA)
        overlays.append((o, np.ascontiguousarray(im)))
    cursor_bgra, hot = make_cursor(h=int(H * 0.028))
    cv2.imwrite(os.path.join(out_dir, 'cursor-sprite.png'), cursor_bgra)

    video_path = os.path.join(out_dir, 'video-preview.mp4' if preview else 'video-4k.mp4')
    if preview:
        vcodec = ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20']
    elif has_encoder('h264_videotoolbox'):
        vcodec = ['-c:v', 'h264_videotoolbox', '-b:v', '48M', '-maxrate', '60M', '-profile:v', 'high', '-allow_sw', '1']
    else:  # no hardware encoder (non-macOS): slower, same picture
        vcodec = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-profile:v', 'high']
    ff = subprocess.Popen([
        'ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{OW}x{OH}',
        '-r', str(fps), '-i', '-', *vcodec, '-pix_fmt', 'yuv420p', '-color_primaries', 'bt709',
        '-color_trc', 'bt709', '-colorspace', 'bt709', '-movflags', '+faststart', video_path,
    ], stdin=subprocess.PIPE, bufsize=0)

    frames_dir = os.path.join(out_dir, 'frames')
    last_idx, app = -1, None
    t_start = time.time()

    def card_drift(o, im, t):
        """Slow Ken Burns push-in (1.00 → 1.045) over the card's visible span."""
        span = max(o['end'], o['start'] + 1) - o['start']
        u = min(1.0, max(0.0, (t - o['start']) / span))
        sc = 1.0 + 0.045 * u
        h, w = im.shape[:2]
        M = np.float32([[sc, 0, (1 - sc) * w / 2], [0, sc, (1 - sc) * h / 2]])
        return cv2.warpAffine(im, M, (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)

    def cursor_at(t):
        if len(cur) == 0:
            return None
        i = bisect.bisect_right(ct, t)
        if i == 0:
            return cur[0, 1], cur[0, 2]
        if i >= len(cur):
            return cur[-1, 1], cur[-1, 2]
        a, b = cur[i - 1], cur[i]
        if b[0] - a[0] > 0.5:  # gap between gestures: hold
            return a[1], a[2]
        u = (t - a[0]) / (b[0] - a[0]) if b[0] > a[0] else 1.0
        return a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u

    for k in range(n_out):
        t = k / fps
        active = []
        opaque_card = None
        for (o, im) in overlays:
            if not (o['start'] <= t <= o['end']):
                continue
            a_in = (t - o['start']) / o['fadeIn'] if o['fadeIn'] > 0 else 1.0
            a_out = (o['end'] - t) / o['fadeOut'] if o['fadeOut'] > 0 else 1.0
            alpha = max(0.0, min(1.0, a_in, a_out))
            if o['kind'] == 'card' and alpha >= 0.999:
                opaque_card = (o, im)
            active.append((o, im, alpha, a_in))

        if opaque_card is not None:
            o, im = opaque_card
            im = card_drift(o, im, t) if o.get('drift') else im
            frame = np.ascontiguousarray(im[:, :, :3])
            x0 = y0 = 0.0
            s = 1.0
        else:
            idx = max(0, bisect.bisect_right(ftimes, t) - 1)
            if idx != last_idx:
                app = cv2.imread(os.path.join(frames_dir, frames[idx][1]), cv2.IMREAD_COLOR)
                if app.shape[1] != cw or app.shape[0] != ch:
                    app = cv2.resize(app, (cw, ch), interpolation=cv2.INTER_AREA)
                last_idx = idx
            canvas = plate.copy()
            canvas[cy:cy + ch, cx:cx + cw] = app
            # round the window's bottom corners back onto the plate
            for key, (ys, xs, pl) in {
                'bl': (slice(cy + ch - r, cy + ch), slice(cx, cx + r), plate_bl),
                'br': (slice(cy + ch - r, cy + ch), slice(cx + cw - r, cx + cw), plate_br),
            }.items():
                m = masks[key]
                canvas[ys, xs] = (canvas[ys, xs].astype(np.float32) * m + pl * (1 - m)).astype(np.uint8)

            view = zoomer.view(t)
            if view:
                x0, y0, s = view
                M = np.float32([[s, 0, -x0 * s * so], [0, s, -y0 * s * so]])
                frame = cv2.warpAffine(canvas, M, (OW, OH), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
            else:
                x0 = y0 = 0.0
                s = 1.0
                frame = canvas

            def P(x, y):
                return ((x - x0) * s * so, (y - y0) * s * so)

            # click ripples (last 0.55 s)
            for (ctk, ccx, ccy) in clicks:
                age = t - ctk
                if 0 <= age < 0.55:
                    u = age / 0.55
                    rr = (14 + 95 * ease(u)) * s * so
                    a = int(210 * (1 - u) ** 1.4)
                    px, py = P(ccx, ccy)
                    size = int(2 * rr) + 16
                    tile = np.zeros((size, size, 4), np.uint8)
                    c = (size // 2, size // 2)
                    cv2.circle(tile, c, int(rr), ACCENT_BGR + (int(a * 0.22),), thickness=-1, lineType=cv2.LINE_AA)
                    cv2.circle(tile, c, int(rr), ACCENT_BGR + (a,), thickness=max(2, int(5 * s * so)), lineType=cv2.LINE_AA)
                    blend(frame, tile, int(px - size / 2), int(py - size / 2))

            # cursor
            c = cursor_at(t)
            if c is not None:
                px, py = P(c[0], c[1])
                pressed = any(0 <= t - ck[0] < 0.12 for ck in clicks)
                sc = s * so * (0.88 if pressed else 1.0)
                spr = scale_sprite(cursor_bgra, sc)
                blend(frame, spr, int(round(px - hot[0] * sc)), int(round(py - hot[1] * sc)))

        # overlays (rail, kinetic lines, fading cards) in screen space
        rail_alpha = max(0.0, 1.0 - (s - 1.0) / 0.12)  # the step rail hides while zoomed in
        for (o, im, alpha, a_in) in active:
            if opaque_card is not None and im is opaque_card[1]:
                continue
            if o['kind'] == 'rail':
                alpha *= rail_alpha
                if alpha <= 0.002:
                    continue
            if o['kind'] == 'card' and o.get('drift'):
                im = card_drift(o, im, t)
            dy = int((1 - ease(min(1.0, a_in))) * 40 * so) if o['anim'] == 'rise' else 0
            blend(frame, im, int(o['x'] * so), int(o['y'] * so) + dy, alpha)

        ff.stdin.write(frame.tobytes())
        if k % (fps * 10) == 0:
            el = time.time() - t_start
            print(f'  {t:6.1f}s / {dur:.1f}s  ({k}/{n_out} frames, {k / max(el, 1e-6):.0f} fps render)', flush=True)

    ff.stdin.close()
    ff.wait()
    print(f'  wrote {video_path} ({n_out} frames @ {fps} fps) in {time.time() - t_start:.0f}s')


if __name__ == '__main__':
    main()
