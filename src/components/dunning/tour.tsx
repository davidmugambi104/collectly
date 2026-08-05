'use client';
import { useEffect, useState } from 'react';
import { Hand } from 'lucide-react';
import { Spotlight } from '@/components/ui/spotlight';

const STORAGE_KEY = 'collectly.dunning.tour.v2';
const REPLAY_EVENT = 'dunning-tour:replay';

// Plain English, one idea per step, each one answering a specific "what
// just happened / what happens next" question rather than describing the
// UI. Split from 4 broad zones into more specific stops so nothing has to
// be inferred.
const STEPS: Array<{ selector: string; title: string; body: string }> = [
  {
    selector: '[data-tour="impact"]',
    title: 'What this page is for',
    body: '"Revenue at risk" is money owed to you right now. "Recovered via dunning" is money that came back after a reminder went out. Everything below exists to grow the second number and shrink the first.',
  },
  {
    selector: '[data-tour="control"]',
    title: 'This switch is the only thing that sends anything automatically',
    body: 'On: the steps below fire by themselves, once a day, based on how late a bill is. Off: nothing sends on its own, but you can still send a reminder by hand from a customer’s page.',
  },
  {
    selector: '[data-tour="flow"]',
    title: 'Each box is a rule, not a guess',
    body: 'Example: "Day 7" means "once a bill is at least 7 days late, send this." That’s the whole decision — no randomness, nothing chosen on the fly. Click a box to change its day, channel, or tone.',
  },
  {
    selector: '[data-tour="flow"]',
    title: 'Editing a box does not send anything',
    body: 'Change a day, channel, or tone and a "Save" bar appears at the bottom. Saving only stores the rule for tomorrow’s automatic run — it never sends a message right now, even to test it.',
  },
  {
    selector: '[data-tour="generate-preview"]',
    title: 'See the exact words before anything happens',
    body: 'This shows what the AI would actually write, using one of your real overdue invoices as the example. It is a preview only — nothing is saved or sent by clicking it.',
  },
  {
    selector: '[data-tour="activity"]',
    title: 'Proof, not trust',
    body: 'Every message this app sends — automatic or one-off — lands here within a minute: who it went to, which step triggered it, and whether it worked. If it’s not here, it wasn’t sent.',
  },
];

export function DunningTour() {
  const [stepIndex, setStepIndex] = useState(-1);

  function finish() {
    setStepIndex(-1);
    try { localStorage.setItem(STORAGE_KEY, 'done'); } catch {}
  }

  // First run only — small delay so it appears after the page's own
  // entrance animations settle instead of popping in mid-transition.
  useEffect(() => {
    let seen = false;
    try { seen = localStorage.getItem(STORAGE_KEY) === 'done'; } catch {}
    if (!seen) {
      const t = setTimeout(() => setStepIndex(0), 900);
      return () => clearTimeout(t);
    }
  }, []);

  // Manual replay, e.g. from the "Replay guide" button — ignores whether
  // it's been seen before.
  useEffect(() => {
    function onReplay() { setStepIndex(0); }
    window.addEventListener(REPLAY_EVENT, onReplay);
    return () => window.removeEventListener(REPLAY_EVENT, onReplay);
  }, []);

  if (stepIndex < 0) return null;

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  return (
    <Spotlight
      key={stepIndex}
      selector={step.selector}
      badge={`Step ${stepIndex + 1} of ${STEPS.length}`}
      title={step.title}
      body={step.body}
      primaryLabel={isLast ? 'Got it' : 'Next'}
      onPrimary={() => (isLast ? finish() : setStepIndex(stepIndex + 1))}
      secondaryLabel="Skip tour"
      onSecondary={finish}
      onDismiss={finish}
    />
  );
}

export function ReplayTourButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      data-tour-ui
      onClick={() => window.dispatchEvent(new Event(REPLAY_EVENT))}
      className={className}
    >
      <Hand className="h-3.5 w-3.5" />Replay guide
    </button>
  );
}
