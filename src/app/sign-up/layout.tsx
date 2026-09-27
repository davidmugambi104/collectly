import { ClerkProvider } from '@/components/clerk-provider';

// Clerk's <SignUp> is a client component and needs the provider. It lives here
// rather than in the root layout because the root layout wraps the public
// marketing pages too, and Clerk's production instance rejects any origin but
// getcollectly.app — which blanked the server render of every mugavi.com page.
// See the note in src/app/layout.tsx.
export default function SignUpLayout({ children }: { children: React.ReactNode }) {
  return <ClerkProvider>{children}</ClerkProvider>;
}
