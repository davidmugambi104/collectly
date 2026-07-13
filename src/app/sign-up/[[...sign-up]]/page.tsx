import { SignUp } from '@clerk/nextjs';
import { Logo } from '@/components/brand/logo';

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 grid lg:grid-cols-2">
        <div className="hidden lg:flex flex-col justify-between p-12 bg-ink-950 text-white">
          <div className="flex items-center gap-2.5"><Logo className="h-7 w-7 text-white" /> <span className="text-lg font-display font-bold">Collectly</span></div>
          <div>
            <h2 className="text-4xl font-display font-bold leading-tight">Start your<br/>14-day free trial.</h2>
            <p className="mt-4 text-ink-300 max-w-md">No credit card. No setup fees. Connect QuickBooks or Xero in 60 seconds. Get paid 3× faster.</p>
            <ul className="mt-8 space-y-2 text-sm text-ink-200">
              <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> AI dunning across email + SMS</li>
              <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Branded payment portal</li>
              <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> 4-week cash-flow forecast</li>
              <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Multi-currency (USD, GBP, AUD, CAD, EUR)</li>
            </ul>
          </div>
          <p className="text-xs text-ink-500">© 2026 Collectly, Inc.</p>
        </div>
        <div className="flex items-center justify-center p-6 sm:p-12 bg-ink-50">
          <SignUp appearance={{ elements: { card: 'shadow-xl border border-ink-200' } }} />
        </div>
      </div>
    </div>
  );
}
