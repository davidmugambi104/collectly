import { CheckCheck, PauseCircle, MessageCircleReply, BadgeCheck, ShieldCheck } from 'lucide-react';
import { Reveal } from '@/components/marketing/reveal';

/**
 * The homepage's answer to the most repeated complaint about automated invoice
 * reminders: not that they exist, but that they fire without the owner's
 * say-so, over a private arrangement, or in a sender's name the customer
 * doesn't recognise.
 *
 * Every line here is something the product does today. That is the point of
 * the section, so keep it that way: if a control isn't built, it doesn't go
 * here. The note under the grid says plainly what is not built yet.
 *
 * Layout: one featured cell and four supporting ones (five items, five cells,
 * nothing empty), with real variation in surface so it does not read as a row
 * of identical cards: a brand tint for the lead control, plain for two, and the
 * page's ink for the one that is about consent. One radius throughout.
 */
export function ControlSection() {
  return (
    <section className="border-y border-ink-200 bg-white" aria-labelledby="control-heading">
      <div className="container-page pt-14 pb-16 sm:pt-20 sm:pb-24">
        <Reveal>
          <div className="max-w-2xl">
            <h2 id="control-heading" className="h2 text-balance">Automation shouldn&apos;t surprise your customers, or you.</h2>
            <p className="mt-4 lead">
              The usual complaint about automatic invoice reminders is that they go out when you didn&apos;t
              expect them, to someone you had already spoken to. These are the controls that prevent that.
            </p>
          </div>
        </Reveal>

        <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
          <Reveal className="md:col-span-2">
            <div className="grid h-full gap-6 rounded-2xl border border-brand-100 bg-brand-50/70 p-7 sm:p-9 md:grid-cols-[auto_1fr] md:items-center md:gap-8">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white text-brand-700 ring-1 ring-brand-100">
                <CheckCheck aria-hidden="true" className="h-6 w-6" />
              </span>
              <div className="max-w-2xl">
                <h3 className="font-display text-2xl font-bold tracking-tight text-ink-950 sm:text-3xl">You approve every reminder</h3>
                <p className="mt-2 text-base leading-relaxed text-ink-700">
                  Mugavi drafts each message and holds it. Edit the wording, approve it, or skip it.
                  You can switch an account to automatic sending yourself, any time, and back again.
                </p>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.06}>
            <div className="h-full rounded-2xl border border-ink-200 bg-white p-7">
              <PauseCircle aria-hidden="true" className="h-6 w-6 text-brand-600" />
              <h3 className="mt-4 font-display text-lg font-bold text-ink-950">Pause any customer</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">
                Spoken to them, or agreed a plan? Pause automatic reminders until a date you choose, or
                until you resume. Pausing also discards any drafts already waiting.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.12}>
            <div className="h-full rounded-2xl border border-ink-200 bg-white p-7">
              <MessageCircleReply aria-hidden="true" className="h-6 w-6 text-brand-600" />
              <h3 className="mt-4 font-display text-lg font-bold text-ink-950">Stops when they answer</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">
                When a customer replies, reminders for that invoice wait until you have read it and marked
                it handled. A promised payment date or an open dispute pauses them too.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.06}>
            <div className="h-full rounded-2xl border border-ink-200 bg-ink-50 p-7">
              <BadgeCheck aria-hidden="true" className="h-6 w-6 text-brand-600" />
              <h3 className="mt-4 font-display text-lg font-bold text-ink-950">Sent under your business name</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">
                Reminders arrive as &quot;Your Business via Mugavi&quot;, with an unsubscribe link. Every send is
                logged, and you get an email after each batch.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.12}>
            <div className="h-full rounded-2xl border border-ink-950 bg-ink-950 p-7 text-white">
              <ShieldCheck aria-hidden="true" className="h-6 w-6 text-brand-300" />
              <h3 className="mt-4 font-display text-lg font-bold">Consent is never overridden</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-200">
                An unsubscribe or a bounced address stops reminders for good, and approving a message does
                not change that. Texts go only to people who have opted in.
              </p>
            </div>
          </Reveal>
        </div>

        <p className="mt-6 max-w-2xl text-sm text-ink-500">
          One thing not built yet: reminders are sent from Mugavi&apos;s address with your business name on
          them, not from your own email address or domain.
        </p>
      </div>
    </section>
  );
}
