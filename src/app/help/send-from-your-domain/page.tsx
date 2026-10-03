import Link from 'next/link';
import { MarketingHeader } from '@/components/marketing/header';
import { MarketingFooter } from '@/components/marketing/footer';
import { pageMetadata } from '@/lib/seo';
import { CONTACT } from '@/lib/site-contact';

export const metadata = pageMetadata({
  title: 'Send reminders from your own domain: SPF, DKIM and DMARC setup',
  description:
    'Step by step: connect your domain in Mugavi, add the DNS records at your registrar, check verification, and add a DMARC record.',
  path: '/help/send-from-your-domain',
  keywords: ['SPF DKIM DMARC setup', 'send invoice reminders from own domain', 'Resend domain verification'],
});

const mistakes = [
  { t: 'The domain name appears twice.', b: 'Some registrars add your domain to the Name field for you. If the table says resend._domainkey and you end up with resend._domainkey.acme.com.acme.com, enter only resend._domainkey.' },
  { t: 'A long DKIM value is cut or has extra quotes.', b: 'Paste the whole value on one line. Some registrars add the quotes themselves, so do not type your own.' },
  { t: 'A proxy is switched on.', b: 'If your DNS host is Cloudflare, set any record from the table to "DNS only" (grey cloud).' },
  { t: 'You are using a free mailbox domain.', b: 'gmail.com, outlook.com, yahoo.com and similar cannot be connected. You need a domain you own and can add DNS records to.' },
  { t: 'You already have a DMARC record.', b: 'Keep it. A domain can only have one record at _dmarc, and two make both invalid.' },
];

export default function Page() {
  return (
    <div className="min-h-screen">
      <MarketingHeader />
      <article className="container-page pt-16 pb-20 max-w-3xl">
        <p className="eyebrow">Help</p>
        <h1 className="mt-3 h1">Send reminders from your own domain</h1>
        <p className="mt-6 lead">
          By default your reminders arrive as &quot;Your Business via Mugavi&quot;. If you connect a domain you own, they arrive from an address
          like billing@yourcompany.com instead. This takes about ten minutes of your time, plus however long your DNS host takes to publish.
        </p>

        <h2 className="mt-12 h2">What you need</h2>
        <ul className="mt-4 list-disc pl-5 space-y-2 text-ink-700">
          <li>A domain you own, such as yourcompany.com, and a login to wherever its DNS is managed (your registrar, Cloudflare, or your web host).</li>
          <li>A Mugavi account with email sending turned on. If it is not, the Send settings panel says so and the Connect button stays off.</li>
        </ul>

        <h2 className="mt-12 h2">1. Connect the domain</h2>
        <ol className="mt-4 list-decimal pl-5 space-y-2 text-ink-700">
          <li>Open Dashboard, then Dunning, then Send settings, and find &quot;Send from your own domain&quot;.</li>
          <li>Type your domain (yourcompany.com is fine, so is a full web address; we strip the rest). Subdomains such as mail.yourcompany.com work too.</li>
          <li>Choose the part before the @. It defaults to billing. Names like admin, security, postmaster and noreply are not allowed.</li>
          <li>Press Connect domain. Mugavi registers the domain with our email provider, Resend, and shows you a table of DNS records.</li>
        </ol>
        <p className="mt-4 text-ink-700">Each domain can be connected to one Mugavi account, and each account can have one domain at a time. Remove it first if you want to switch.</p>

        <h2 className="mt-12 h2">2. Add the records Mugavi shows you</h2>
        <p className="mt-4 text-ink-700">
          Copy each row from the table into your DNS host exactly as shown. The values are generated for your domain, so use the ones on your
          screen and not examples from elsewhere. Typically the table holds:
        </p>
        <ul className="mt-4 list-disc pl-5 space-y-2 text-ink-700">
          <li><b>DKIM.</b> A TXT record that lets receiving mail servers check a signature on every message. It proves the mail was authorised by you.</li>
          <li><b>SPF.</b> A TXT record, plus an MX record, on a &quot;send&quot; subdomain. SPF lists which servers may send for the domain. Because it sits on the subdomain, it does not replace or conflict with the SPF record your normal mail already uses on the main domain.</li>
        </ul>
        <p className="mt-4 text-ink-700">If Resend changes what it asks for, the table in your dashboard is always the source of truth.</p>

        <h2 className="mt-12 h2">3. Check verification</h2>
        <p className="mt-4 text-ink-700">
          Press Check verification. Publishing DNS can take a few minutes or most of a day, so &quot;waiting for DNS&quot; is a normal answer, not an error.
          Each record in the table shows its own status. Come back and press the button again later.
        </p>
        <p className="mt-4 text-ink-700">
          Until the domain shows Verified, nothing is sent from it. Reminders keep going out as &quot;Your Business via Mugavi&quot; and the Dunning page
          shows a warning saying so, so you are never left guessing where your mail is coming from. If the status turns to Failed, one of the records
          is wrong or missing; compare each row against what your DNS host has.
        </p>

        <h2 className="mt-12 h2">4. Add a DMARC record (recommended)</h2>
        <p className="mt-4 text-ink-700">
          DMARC tells receiving servers what to do with mail that claims to be from your domain but fails SPF and DKIM. Gmail and Yahoo expect it from
          anyone sending to many people. It is separate from the table above and is not needed for verification. Add one TXT record:
        </p>
        <pre className="mt-4 overflow-x-auto rounded-lg border border-ink-200 bg-ink-50 p-4 text-xs"><code>{`Type:  TXT
Name:  _dmarc
Value: v=DMARC1; p=none; rua=mailto:you@yourcompany.com`}</code></pre>
        <p className="mt-4 text-ink-700">
          p=none only watches and reports, so it cannot block your own mail. The rua address (optional) receives daily summary reports; use a mailbox you read.
          Once you have run for a few weeks and the reports show only your own mail passing, you can tighten it to p=quarantine. Mugavi does not
          change your DMARC policy for you.
        </p>

        <h2 className="mt-12 h2">What changes once it is verified</h2>
        <ul className="mt-4 list-disc pl-5 space-y-2 text-ink-700">
          <li>Reminders go out with your business name as the sender, from the address you chose on your domain.</li>
          <li>Each step in a sequence can use a different name or a different address on the same domain (for example accounts@ first, a person&apos;s name last).</li>
          <li>Replies still come into your Mugavi Inbox. We do not connect to your own mailbox.</li>
          <li>Removing the domain at any time sends reminders back to the &quot;via Mugavi&quot; sender.</li>
        </ul>

        <h2 className="mt-12 h2">When an email does not get through</h2>
        <p className="mt-4 text-ink-700">
          If a message bounces because the address does not exist, or the recipient marks it as spam, Mugavi stops sending reminders to that customer and
          the reminder shows as failed. A temporary bounce (a full mailbox, for example) is recorded as failed, but reminders to that customer continue.
          If reminders failed in the last 14 days, the Dunning page tells you.
        </p>

        <h2 className="mt-12 h2">Common mistakes</h2>
        <dl className="mt-4 space-y-4">
          {mistakes.map((m) => (
            <div key={m.t}>
              <dt className="font-medium text-ink-900">{m.t}</dt>
              <dd className="mt-1 text-sm text-ink-700">{m.b}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-12 text-sm text-ink-600">
          Good authentication helps your mail get judged on its own merits. It does not guarantee inbox placement, and we cannot promise it.
          Stuck? Write to <a className="underline" href={`mailto:${CONTACT.hello}`}>{CONTACT.hello}</a> or see <Link className="underline" href="/security">how we handle your data</Link>.
        </p>
      </article>
      <MarketingFooter />
    </div>
  );
}
