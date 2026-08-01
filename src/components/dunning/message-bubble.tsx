import { Mail, MessageSquare } from 'lucide-react';

/**
 * Renders a generated reminder the way the recipient will actually see it —
 * an email client chrome for email, an outgoing text bubble for SMS —
 * instead of a plain textarea. Recognizable framing builds more trust in
 * the AI-written copy than raw text does.
 */
export function MessageBubble({
  channel,
  subject,
  body,
  className = '',
}: {
  channel: 'email' | 'sms';
  subject?: string | null;
  body: string;
  className?: string;
}) {
  if (channel === 'sms') {
    return (
      <div className={`animate-fade-in rounded-2xl border border-ink-200 bg-gradient-to-b from-ink-50 to-ink-100/60 p-4 ${className}`}>
        <div className="flex items-center gap-1.5 text-[11px] text-ink-400 mb-2.5">
          <MessageSquare className="h-3 w-3" />Text message
        </div>
        <div className="flex justify-end">
          <div className="max-w-[88%] rounded-2xl rounded-br-md bg-brand-600 text-white px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap shadow-[0_4px_14px_rgba(37,99,235,0.35)]">
            {body}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`animate-fade-in rounded-xl border border-ink-200 bg-white shadow-[0_8px_24px_-8px_rgba(16,17,20,0.18)] overflow-hidden ${className}`}>
      <div className="flex items-center gap-1.5 px-3.5 py-2 bg-ink-50 border-b border-ink-200">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        <span className="ml-2 flex items-center gap-1 text-[11px] text-ink-400">
          <Mail className="h-3 w-3" />New message
        </span>
      </div>
      <div className="p-4 space-y-2">
        {subject && <div className="text-sm font-semibold text-ink-900">{subject}</div>}
        <div className="text-sm text-ink-800 whitespace-pre-wrap leading-relaxed">{body}</div>
      </div>
    </div>
  );
}
