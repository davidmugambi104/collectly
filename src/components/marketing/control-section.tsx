import { CheckCheck, PauseCircle, MessageCircleReply, BadgeCheck, ShieldCheck } from 'lucide-react';
import { Reveal } from '@/components/marketing/reveal';

/**
 * "You stay in charge": the homepage's answer to the most repeated complaint
 * about automated invoice reminders, which is not that they exist but that they
 * fire without the owner's say-so, over a private arrangement, or in a sender's
 * name the customer doesn't recognise.
 *
 * Every line here is something the product does today. That is the point of the
 * section, so keep it that way: if a control isn't built, it doesn't go here.
 * The last card says plainly what is not built yet.
 */
const CONTROLS = [
  {
    icon: CheckCheck,
    title: 'You approve every reminder',
    body: 'Mugavi drafts each message and holds it. Edit the wording, approve it, or skip it. You can switch an account to automatic sending yourself, any time.',
  },
  {
    icon: PauseCircle,
    title: 'Pause any customer',
    body: 'Spoken to them, or agreed a plan? Pause automatic reminders for that customer until a date you choose, or until you resume. Pausing also discards any drafts already waiting.',
  },
  {
    icon: MessageCircleReply,
    title: 'Stops when they answer',
    body: 'When a customer replies, reminders for that invoice wait until you have read it and marked it handled. A promised payment date or an open dispute pauses them too.',
  },
  {
    icon: BadgeCheck,
    title: 'Sent under your business name',
    body: 'Reminders arrive as "Your Business via Mugavi", with an unsubscribe link. Every send is logged, and you get an email after each batch.',
  },
  {
    icon: ShieldCheck,
    title: 'Consent is never overridden',
    body: 'An unsubscribe or a bounced address stops reminders for good, and approving a message does not change that. Texts go only to people who have opted in.',
  },
];

export function ControlSection() {
  return (
    <section className="border-y border-ink-200 bg-white" aria-labelledby="control-heading">
      <div className="container-page pt-14 pb-16 sm:pt-16 sm:pb-20">
        <Reveal>
          <div className="max-w-2xl">
            <p className="eyebrow">You stay in charge</p>
            <h2 id="control-heading" className="mt-2 h2">Automation shouldn&apos;t surprise your customers, or you.</h2>
            <p className="mt-4 lead">
              The usual complaint about automatic invoice reminders is that they go out when you didn&apos;t
              expect them, to someone you had already spoken to. These are the controls that prevent that.
            </p>
          </div>
        </Reveal>
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {CONTROLS.map((c, i) => {
            const Icon = c.icon;
            return (
              <Reveal key={c.title} delay={i * 0.06}>
                <div className="card h-full hover:border-ink-300 transition-colors">
                  <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50">
                    <Icon aria-hidden="true" className="h-5 w-5 text-brand-600" />
                  </div>
                  <h3 className="mb-1.5 font-semibold text-ink-900">{c.title}</h3>
                  <p className="text-sm leading-relaxed text-ink-600">{c.body}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
        <p className="mt-6 max-w-2xl text-sm text-ink-500">
          One thing not built yet: reminders are sent from Mugavi&apos;s address with your business name on
          them, not from your own email address or domain.
        </p>
      </div>
    </section>
  );
}
