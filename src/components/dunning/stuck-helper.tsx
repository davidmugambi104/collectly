'use client';
import { useStuckSignals } from '@/hooks/use-stuck-signals';
import { Spotlight } from '@/components/ui/spotlight';
import { DUNNING_UNSAVED_EVENT, DUNNING_ERROR_EVENT } from '@/lib/dunning/events';

/**
 * Contextual help that only appears when a rule-based "stuck" signal fires —
 * the opposite of the scripted DunningTour, which always plays once. No ML:
 * plain thresholds on clicks/idle-time/errors/navigation, same category of
 * signal Intercom/Appcues use before any predictive layer. Each hint points
 * at the exact control involved and states, in one sentence, whether the
 * thing the user is worried about already happened or not.
 */
export function DunningStuckHelper() {
  const { signal, dismiss } = useStuckSignals({
    watchIds: ['save-sequence', 'generate-preview'],
    unsavedEvent: DUNNING_UNSAVED_EVENT,
    errorEvent: DUNNING_ERROR_EVENT,
    bounceRoutes: ['/dashboard/dunning', '/dashboard/dunning/performance'],
  });

  if (!signal) return null;

  switch (signal.type) {
    case 'idle-unsaved':
      return (
        <Spotlight
          selector="[data-stuck-id='unsaved-bar']"
          badge="Still here?"
          title="This change isn't saved yet"
          body="Nothing you've typed here is kept until you click Save below. And to be clear: saving still doesn't send anything to a customer — it only stores the rule for the next automatic run."
          primaryLabel="Got it"
          onDismiss={dismiss}
          dismissOnTargetClick={false}
        />
      );
    case 'rage-click':
      if (signal.target === 'save-sequence') {
        return (
          <Spotlight
            selector="[data-stuck-id='save-sequence']"
            badge="Already worked"
            title="That saved on the first click"
            body="This bar disappearing is the confirmation — the rule is stored. You don't need to click again. If it's still showing, check your connection and try once more."
            primaryLabel="Got it"
            onDismiss={dismiss}
          />
        );
      }
      return (
        <Spotlight
          selector="[data-stuck-id='generate-preview']"
          badge="Still loading?"
          title="This calls the AI live"
          body="Generating a preview can take a few seconds because it's writing a fresh message in real time. If it keeps failing rather than just being slow, the error will show just above this button."
          primaryLabel="Got it"
          onDismiss={dismiss}
        />
      );
    case 'repeated-error':
      return (
        <Spotlight
          selector="[data-tour='generate-preview']"
          badge="This keeps failing"
          title="Here's what's actually going wrong"
          body={`"${signal.message}" — if you're on a trial or dev setup, this usually means the AI key isn't configured yet. Check Integrations, or reach out to support if it keeps happening.`}
          primaryLabel="Got it"
          onDismiss={dismiss}
        />
      );
    case 'bounce':
      return (
        <Spotlight
          selector="[data-tour='activity']"
          badge="Looking for proof it sent?"
          title="This list is the real record"
          body="Every message this app sends — automatic or one-off — shows up here, usually within a minute, with who it went to and whether it worked. Nothing sends without leaving a trace here."
          primaryLabel="Got it"
          onDismiss={dismiss}
        />
      );
  }
}
