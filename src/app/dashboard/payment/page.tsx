'use client';
import { useState } from 'react';

export default function PaystackTestPage() {
  const [email, setEmail] = useState('');
  const [amount, setAmount] = useState('10000'); // 100 KES
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  async function initializePayment() {
    setLoading(true);
    setStatus('');
    try {
      const reference = `collectly-test-${Date.now()}`;
      const res = await fetch('/api/paystack/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, amount: Number(amount), reference }),
      });
      const data = await res.json();
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        setStatus(`Error: ${data.error || JSON.stringify(data)}`);
      }
    } catch (e: any) {
      setStatus(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-50 p-6">
      <div className="card max-w-md w-full">
        <h1 className="h3">Paystack Test Payment</h1>
        <p className="mt-2 text-sm text-ink-600">Enter your email and an amount (in kobo) to test a Paystack transaction.</p>
        <div className="mt-4 space-y-3">
          <input
            type="email"
            placeholder="test@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
          />
          <input
            type="number"
            placeholder="Amount in kobo (e.g. 10000 = 100 KES)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="input"
          />
          <button
            onClick={initializePayment}
            disabled={loading || !email}
            className="btn-brand w-full justify-center"
          >
            {loading ? 'Initializing...' : 'Pay with Paystack'}
          </button>
        </div>
        {status && <p className="mt-3 text-sm text-red-600">{status}</p>}
      </div>
    </div>
  );
}
