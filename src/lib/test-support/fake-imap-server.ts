/**
 * A minimal in-process IMAP server for tests: plain TCP on 127.0.0.1, one
 * mailbox, LOGIN, EXAMINE/SELECT, UID FETCH, LOGOUT. It records every command
 * so tests can prove the poller never wrote anything (no STORE, no SELECT).
 * No real mailbox and no network beyond loopback.
 */
import net from 'node:net';

export type FakeMessage = { uid: number; source: string };

export class FakeImapServer {
  readonly commands: string[] = [];
  messages: FakeMessage[] = [];
  uidNext = 1;
  uidValidity = 1;
  password = 'app-password-for-tests';
  user = 'replies@test.invalid';
  /** When set, UID FETCH replies NO, to exercise a failing mailbox. */
  failFetch = false;
  private server: net.Server;
  private sockets = new Set<net.Socket>();
  port = 0;

  constructor() {
    this.server = net.createServer((s) => this.onConnection(s));
  }

  async start(): Promise<void> {
    await new Promise<void>((res) => this.server.listen(0, '127.0.0.1', res));
    this.port = (this.server.address() as net.AddressInfo).port;
  }

  async stop(): Promise<void> {
    for (const s of this.sockets) s.destroy();
    await new Promise<void>((res) => this.server.close(() => res()));
  }

  /** Simulate the server renumbering the mailbox (restore, migration): new UIDVALIDITY, new UIDs. */
  renumber(newValidity: number): void {
    this.uidValidity = newValidity;
    this.messages = this.messages.map((m, i) => ({ ...m, uid: i + 1 }));
    this.uidNext = this.messages.length + 1;
  }

  /** Deliver a message; returns its UID. */
  deliver(source: string): number {
    const uid = this.uidNext++;
    this.messages.push({ uid, source: source.replace(/\r?\n/g, '\r\n') });
    return uid;
  }

  private onConnection(sock: net.Socket) {
    this.sockets.add(sock);
    sock.on('close', () => this.sockets.delete(sock));
    sock.on('error', () => {});
    sock.write('* OK [CAPABILITY IMAP4rev1 AUTH=PLAIN] stand-in ready\r\n');
    let buf = '';
    let authed = false;
    let authTag: string | null = null;
    sock.on('data', (d) => {
      buf += d.toString('latin1');
      let i: number;
      while ((i = buf.indexOf('\r\n')) >= 0) {
        const line = buf.slice(0, i);
        buf = buf.slice(i + 2);
        if (authTag) {
          // Continuation line of AUTHENTICATE PLAIN: base64 of \0user\0pass.
          const [, u, p] = Buffer.from(line, 'base64').toString().split('\0');
          if (u === this.user && p === this.password) { authed = true; sock.write(`${authTag} OK AUTHENTICATE completed\r\n`); }
          else sock.write(`${authTag} NO [AUTHENTICATIONFAILED] bad credentials\r\n`);
          authTag = null;
          continue;
        }
        const am = /^(\S+)\s+AUTHENTICATE\s+PLAIN\s*$/i.exec(line);
        if (am) { this.commands.push('AUTHENTICATE PLAIN'); authTag = am[1]; sock.write('+ \r\n'); continue; }
        authed = this.handle(sock, line, authed);
      }
    });
  }

  private handle(sock: net.Socket, line: string, authed: boolean): boolean {
    const m = /^(\S+)\s+(\S+)\s*(.*)$/.exec(line);
    if (!m) return authed;
    const [, tag, cmdRaw, rest] = m;
    const cmd = cmdRaw.toUpperCase();
    this.commands.push(`${cmd} ${cmd === 'LOGIN' ? '(redacted)' : rest}`.trim());
    const ok = (t = 'done') => sock.write(`${tag} OK ${t}\r\n`);
    switch (cmd) {
      case 'CAPABILITY':
        sock.write('* CAPABILITY IMAP4rev1 AUTH=PLAIN\r\n');
        ok();
        break;
      case 'ID':
        sock.write('* ID NIL\r\n');
        ok();
        break;
      case 'LOGIN': {
        const parts = [...rest.matchAll(/"((?:[^"\\]|\\.)*)"|(\S+)/g)].map((x) => (x[1] ?? x[2]).replace(/\\(.)/g, '$1'));
        if (parts[0] === this.user && parts[1] === this.password) { authed = true; ok('LOGIN completed'); }
        else sock.write(`${tag} NO [AUTHENTICATIONFAILED] bad credentials\r\n`);
        break;
      }
      case 'AUTHENTICATE': {
        // AUTHENTICATE PLAIN <base64 initial response>
        const b64 = rest.split(/\s+/)[1] ?? '';
        const [, u, p] = Buffer.from(b64, 'base64').toString().split('\0');
        if (u === this.user && p === this.password) { authed = true; ok('AUTHENTICATE completed'); }
        else sock.write(`${tag} NO [AUTHENTICATIONFAILED] bad credentials\r\n`);
        break;
      }
      case 'SELECT':
      case 'EXAMINE':
        if (!authed) { sock.write(`${tag} NO login first\r\n`); break; }
        sock.write(
          `* ${this.messages.length} EXISTS\r\n* 0 RECENT\r\n* FLAGS (\\Seen \\Answered \\Flagged \\Deleted \\Draft)\r\n` +
          `* OK [UIDVALIDITY ${this.uidValidity}] ok\r\n* OK [UIDNEXT ${this.uidNext}] ok\r\n`,
        );
        sock.write(`${tag} OK [${cmd === 'EXAMINE' ? 'READ-ONLY' : 'READ-WRITE'}] ${cmd} completed\r\n`);
        break;
      case 'LIST':
        sock.write('* LIST (\\HasNoChildren) "/" "INBOX"\r\n');
        ok();
        break;
      case 'NOOP':
        ok();
        break;
      case 'UID': {
        const fm = /^FETCH\s+(\S+)\s+/i.exec(rest);
        if (!fm || this.failFetch) { sock.write(`${tag} NO fetch failed\r\n`); break; }
        const [lo, hiRaw] = fm[1].split(':');
        const from = Number(lo);
        const hi = hiRaw === undefined ? from : hiRaw === '*' ? Infinity : Number(hiRaw);
        let picked = this.messages.filter((x) => x.uid >= from && x.uid <= hi);
        // RFC 3501: "n:*" always includes the newest message, even when n is past the end.
        if (hiRaw === '*' && picked.length === 0 && this.messages.length) picked = [this.messages[this.messages.length - 1]];
        for (const msg of picked) {
          const seq = this.messages.indexOf(msg) + 1;
          const len = Buffer.byteLength(msg.source, 'latin1');
          sock.write(`* ${seq} FETCH (UID ${msg.uid} BODY[] {${len}}\r\n`);
          sock.write(Buffer.from(msg.source, 'latin1'));
          sock.write(')\r\n');
        }
        ok('UID FETCH completed');
        break;
      }
      case 'LOGOUT':
        sock.write('* BYE bye\r\n');
        ok('LOGOUT completed');
        sock.end();
        break;
      default:
        sock.write(`${tag} BAD unsupported ${cmd}\r\n`);
    }
    return authed;
  }
}

/** Build a raw RFC 822 message for the stand-in mailbox. */
export function rawMessage(o: {
  from: string;
  to?: string;
  subject: string;
  body: string;
  messageId?: string;
  inReplyTo?: string;
  references?: string;
  headers?: Record<string, string>;
}): string {
  const h = [
    `From: ${o.from}`,
    `To: ${o.to ?? 'replies@test.invalid'}`,
    `Subject: ${o.subject}`,
    `Message-ID: ${o.messageId ?? `<m${Math.random().toString(36).slice(2)}@customer.test>`}`,
    'Date: Fri, 03 Oct 2026 10:00:00 +0000',
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
  ];
  if (o.inReplyTo) h.push(`In-Reply-To: ${o.inReplyTo}`);
  if (o.references) h.push(`References: ${o.references}`);
  for (const [k, v] of Object.entries(o.headers ?? {})) h.push(`${k}: ${v}`);
  return `${h.join('\r\n')}\r\n\r\n${o.body}\r\n`;
}
