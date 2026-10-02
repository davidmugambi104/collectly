/** Who may take the whole workspace's data out: the owner (our organizations.ownerId, as for account deletion) or a Clerk org admin. */
export function isOwnerOrAdmin(a: { userId: string | null | undefined; ownerId: string | null | undefined; orgRole?: string | null }): boolean {
  if (!a.userId) return false;
  if (a.ownerId && a.ownerId === a.userId) return true;
  return a.orgRole === 'org:admin' || a.orgRole === 'admin';
}
