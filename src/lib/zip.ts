/**
 * A small ZIP writer on node built-ins only (zlib deflate + crc32), so the data export needs no new dependency.
 * Plain ZIP (no ZIP64): at most 65,535 files and 4 GB, far above what the export produces.
 */
import { deflateRawSync, inflateRawSync, crc32 } from 'node:zlib';

export type ZipEntry = { name: string; data: string | Buffer };

const u16 = (n: number) => { const b = Buffer.alloc(2); b.writeUInt16LE(n); return b; };
const u32 = (n: number) => { const b = Buffer.alloc(4); b.writeUInt32LE(n >>> 0); return b; };

export function makeZip(entries: ZipEntry[], now: Date = new Date()): Buffer {
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const dosDate = (Math.max(now.getFullYear() - 1980, 0) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  const parts: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const e of entries) {
    const name = Buffer.from(e.name, 'utf8');
    const raw = Buffer.isBuffer(e.data) ? e.data : Buffer.from(e.data, 'utf8');
    const packed = deflateRawSync(raw);
    const stored = packed.length < raw.length;
    const body = stored ? packed : raw;
    const method = stored ? 8 : 0;
    const crc = crc32(raw);
    // general purpose flag bit 11: file names are UTF-8
    const local = Buffer.concat([u32(0x04034b50), u16(20), u16(0x0800), u16(method), u16(dosTime), u16(dosDate), u32(crc), u32(body.length), u32(raw.length), u16(name.length), u16(0), name]);
    parts.push(local, body);
    central.push(Buffer.concat([u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(method), u16(dosTime), u16(dosDate), u32(crc), u32(body.length), u32(raw.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), name]));
    offset += local.length + body.length;
  }
  const cd = Buffer.concat(central);
  const end = Buffer.concat([u32(0x06054b50), u16(0), u16(0), u16(entries.length), u16(entries.length), u32(cd.length), u32(offset), u16(0)]);
  return Buffer.concat([...parts, cd, end]);
}

/** Reads a ZIP made by makeZip back into name -> text. Used by tests and the selftest to prove the archive is valid. */
export function readZip(buf: Buffer): Record<string, string> {
  const out: Record<string, string> = {};
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) throw new Error('not a zip');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('bad central directory');
    const method = buf.readUInt16LE(p + 10), crc = buf.readUInt32LE(p + 16), csize = buf.readUInt32LE(p + 20);
    const nlen = buf.readUInt16LE(p + 28), elen = buf.readUInt16LE(p + 30), clen = buf.readUInt16LE(p + 32);
    const lho = buf.readUInt32LE(p + 42);
    const name = buf.subarray(p + 46, p + 46 + nlen).toString('utf8');
    const lnlen = buf.readUInt16LE(lho + 26), lelen = buf.readUInt16LE(lho + 28);
    const data = buf.subarray(lho + 30 + lnlen + lelen, lho + 30 + lnlen + lelen + csize);
    const raw = method === 8 ? inflateRawSync(data) : data;
    if (crc32(raw) !== crc) throw new Error(`crc mismatch for ${name}`);
    out[name] = raw.toString('utf8');
    p += 46 + nlen + elen + clen;
  }
  return out;
}
