'use client';

import { CheckCircle2, Copy, FileText } from 'lucide-react';
import { useState } from 'react';

type Template = { name: string; subject: string; body: string; when: string };

export function DisputeTemplateList({ templates }: { templates: Template[] }) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  async function copy(text: string, idx: number) {
    try {
      await navigator.clipboard?.writeText(text);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx((cur) => (cur === idx ? null : cur)), 1500);
    } catch {
      // Older browsers, focus-restricted contexts, or denied permission.
      // The copy button is a convenience; failure here is non-fatal.
    }
  }

  return (
    <div className="grid gap-6 max-w-4xl">
      {templates.map((t, i) => (
        <div key={i} className="card-lg">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-brand-600" />
            <h2 className="text-xl font-semibold text-ink-900">{t.name}</h2>
          </div>
          <p className="mt-2 text-xs uppercase font-medium tracking-wider text-ink-500">
            When to send
          </p>
          <p className="mt-1 text-sm text-ink-700">{t.when}</p>
          <p className="mt-4 text-xs uppercase font-medium tracking-wider text-ink-500">
            Subject line
          </p>
          <p className="mt-1 font-mono text-sm text-ink-900 bg-ink-50 px-3 py-2 rounded-md">
            {t.subject}
          </p>
          <p className="mt-4 text-xs uppercase font-medium tracking-wider text-ink-500">
            Body
          </p>
          <pre className="mt-1 whitespace-pre-wrap font-sans text-sm text-ink-900 bg-ink-50 px-4 py-3 rounded-md border border-ink-200">
            {t.body}
          </pre>
          <button
            type="button"
            onClick={() => copy(t.body, i)}
            className="mt-3 inline-flex items-center gap-1.5 text-sm text-brand-700 hover:text-brand-900"
          >
            {copiedIdx === i ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" /> Copy to clipboard
              </>
            )}
          </button>
        </div>
      ))}
    </div>
  );
}
