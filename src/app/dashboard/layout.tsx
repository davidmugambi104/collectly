import { getAuth as auth } from '@/lib/auth-helper';
import { IdentifyUser } from '@/components/app/identify-user';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId, orgId } = await auth();
  return (
    <>
      <IdentifyUser userId={userId ?? undefined} orgId={orgId ?? undefined} />
      {children}
    </>
  );
}
