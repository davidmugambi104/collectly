#!/usr/bin/env python3
"""Audio: place narration lines on the timeline, loop + duck the music under the
voice, normalize to -14 LUFS, mux with the composited video, and derive 1080p.

usage: mix.py <outDir> [--music out/music.mp3] [--music-gain 0.22] [--skip-1080]
"""
import json
import os
import subprocess
import sys


def run(cmd):
    print('  $', ' '.join(c if ' ' not in c else repr(c) for c in cmd)[:400])
    subprocess.run(cmd, check=True)


def main():
    out_dir = sys.argv[1]
    music = os.path.join(out_dir, 'music.mp3')
    gain = 0.5  # on top of the -20 LUFS bed normalization → ≈ -26 LUFS in gaps, ~-36 under speech
    if '--music' in sys.argv:
        music = sys.argv[sys.argv.index('--music') + 1]
    if '--music-gain' in sys.argv:
        gain = float(sys.argv[sys.argv.index('--music-gain') + 1])
    tl = json.load(open(os.path.join(out_dir, 'timeline.json')))
    dur = tl['duration']
    video = os.path.join(out_dir, 'video-4k.mp4')

    # ---- voice bus: every narration line delayed to its scene start --------
    inputs, filters, labels = [], [], []
    for i, n in enumerate(tl['narration']):
        inputs += ['-i', n['wav']]
        ms = int(round(n['start'] * 1000))
        filters.append(f'[{i}:a]aresample=48000,aformat=channel_layouts=mono,adelay={ms}|{ms}[v{i}]')
        labels.append(f'[v{i}]')
    n_lines = len(labels)
    voice_wav = os.path.join(out_dir, 'voice.wav')
    filters.append(f'{"".join(labels)}amix=inputs={n_lines}:normalize=0:dropout_transition=0,'
                   f'apad=whole_dur={dur:.3f},atrim=0:{dur:.3f},'
                   f'loudnorm=I=-16:TP=-1.5:LRA=9[voice]')
    run(['ffmpeg', '-y', '-loglevel', 'error', *inputs, '-filter_complex', ';'.join(filters),
         '-map', '[voice]', '-ar', '48000', '-ac', '1', voice_wav])

    # ---- music bed: loop to length, fades, side-chain duck under the voice ---
    mix_wav = os.path.join(out_dir, 'mix.wav')
    have_music = os.path.exists(music)
    if have_music:
        # music bed: normalized to a fixed loudness first (so `gain` means the same
        # for any generated track), looped to length, faded, then side-chain ducked
        # ~10 dB under the voice (threshold ≈ -20 dBFS on the voice bus, ratio 4).
        duck = os.environ.get('DUCK', 'threshold=0.1:ratio=4:attack=25:release=650:makeup=1:level_sc=1')
        fc = (
            f'[1:a]aresample=48000,aformat=channel_layouts=stereo,loudnorm=I=-20:TP=-2:LRA=9,'
            f'aloop=loop=-1:size=2e9,atrim=0:{dur:.3f},'
            f'afade=t=in:st=0:d=1.8,afade=t=out:st={max(0, dur - 3.5):.3f}:d=3.5,volume={gain}[m];'
            f'[0:a]asplit[vsc][vmain];'
            f'[m][vsc]sidechaincompress={duck}[md0];[md0]asplit[md][mdbg];'
            f'[vmain]aformat=channel_layouts=stereo[vst];'
            f'[md][vst]amix=inputs=2:normalize=0:dropout_transition=0,loudnorm=I=-14:TP=-1.5:LRA=11[out]'
        )
        run(['ffmpeg', '-y', '-loglevel', 'error', '-i', voice_wav, '-i', music, '-filter_complex', fc,
             '-map', '[out]', '-ar', '48000', '-ac', '2', mix_wav,
             '-map', '[mdbg]', '-ar', '48000', '-ac', '2', os.path.join(out_dir, 'music-ducked.wav')])
    else:
        print('  ! no music file — voice only')
        run(['ffmpeg', '-y', '-loglevel', 'error', '-i', voice_wav, '-af', 'aformat=channel_layouts=stereo,loudnorm=I=-14:TP=-1.5:LRA=11',
             '-ar', '48000', '-ac', '2', mix_wav])

    # ---- mux -----------------------------------------------------------------
    final4k = os.path.join(out_dir, 'walkthrough-4k.mp4')
    run(['ffmpeg', '-y', '-loglevel', 'error', '-i', video, '-i', mix_wav, '-map', '0:v:0', '-map', '1:a:0',
         '-c:v', 'copy', '-c:a', 'aac', '-b:a', '320k', '-shortest', '-movflags', '+faststart', final4k])
    if '--skip-1080' not in sys.argv:
        final1080 = os.path.join(out_dir, 'walkthrough-1080p.mp4')
        run(['ffmpeg', '-y', '-loglevel', 'error', '-i', final4k, '-vf', 'scale=1920:1080:flags=lanczos',
             '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'copy',
             '-movflags', '+faststart', final1080])
        # small share copy (phone/chat preview)
        final720 = os.path.join(out_dir, 'walkthrough-720p.mp4')
        run(['ffmpeg', '-y', '-loglevel', 'error', '-i', final4k, '-vf', 'scale=1280:720:flags=lanczos', '-r', '30',
             '-c:v', 'libx264', '-preset', 'fast', '-crf', '22', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k',
             '-movflags', '+faststart', final720])
    for f in (final4k, os.path.join(out_dir, 'walkthrough-1080p.mp4'), os.path.join(out_dir, 'walkthrough-720p.mp4')):
        if os.path.exists(f):
            print(f'  {f}: {os.path.getsize(f) / 1e6:.1f} MB')


if __name__ == '__main__':
    main()
