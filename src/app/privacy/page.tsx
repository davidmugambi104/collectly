export const metadata = { title: 'Privacy' };
export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-ink-50">
      <div className="container-tight py-16 prose prose-ink max-w-none">
        <h1 className="text-4xl font-display font-bold">Privacy Policy</h1>
        <p className="text-ink-500 text-sm">Last updated: July 13, 2026</p>
        <p className="lead">This is a placeholder. Replace with your real privacy policy before going live in production.</p>
        <h2 className="font-display font-semibold text-xl mt-8">What we collect</h2>
        <p>Email, name, billing info, and the data you put in our platform (customers, invoices, payment records).</p>
        <h2 className="font-display font-semibold text-xl mt-8">How we use it</h2>
        <p>To provide the service. To send you transactional emails. To send you product updates if you opt in.</p>
        <h2 className="font-display font-semibold text-xl mt-8">What we never do</h2>
        <ul>
          <li>Sell your data</li>
          <li>Share customer data with third parties except those needed to provide the service (Stripe, Twilio, Resend, OpenAI)</li>
          <li>Train AI models on your data</li>
        </ul>
        <h2 className="font-display font-semibold text-xl mt-8">Data deletion</h2>
        <p>You can delete your account at any time from Settings. We delete all associated data within 30 days.</p>
      </div>
    </div>
  );
}
