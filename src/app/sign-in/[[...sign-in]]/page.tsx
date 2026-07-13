import { SignIn } from '@clerk/nextjs';
import { Logo } from '@/components/brand/logo';
import { MarketingFooter } from '@/components/marketing/footer';

export default function SignInPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 grid lg:grid-cols-2">
        <div className="hidden lg:flex flex-col justify-between p-12 bg-ink-950 text-white">
          <div className="flex items-center gap-2.5"><Logo className="h-7 w-7 text-white" /> <span className="text-lg font-display font-bold">Collectly</span></div>
          <div>
            <h2 className="text-4xl font-display font-bold leading-tight">Stop chasing invoices.<br/>Start collecting them.</h2>
            <p className="mt-4 text-ink-300 max-w-md">Join hundreds of small businesses getting paid 3× faster with AI-native accounts receivable.</p>
            <div className="mt-8 grid grid-cols-3 gap-4 max-w-md">
              <div><div className="text-2xl font-bold">12</div><div className="text-xs text-ink-400">avg days to pay</div></div>
              <div><div className="text-2xl font-bold">$28K</div><div className="text-xs text-ink-400">recovered / mo</div></div>
              <div><div className="text-2xl font-bold">74</div><div className="text-xs text-ink-400">NPS</div></div>
            </div>
          </div>
          <p className="text-xs text-ink-500">© 2026 Collectly, Inc.</p>
        </div>
        <div className="flex items-center justify-center p-6 sm:p-12 bg-ink-50">
          <SignIn appearance={{ elements: { card: 'shadow-xl border border-ink-200' } }} />
        </div>
      </div>
    </div>
  );
}
