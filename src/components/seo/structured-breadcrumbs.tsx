import { breadcrumbJsonLd, SITE } from '@/lib/seo';

// Server component. Drop into any page that wants a BreadcrumbList
// JSON-LD without re-typing the helper invocation. Renders nothing
// visible — strictly an SEO signal for rich search results.
//
// Usage:
//   <StructuredBreadcrumbs items={[{ name: 'Compare', path: '/compare' }, { name: 'vs Chaser', path: '/vs-chaser' }]} />
//
// Items MUST be in order from root to leaf. `path` is the absolute
// path within this site (no domain).
export function StructuredBreadcrumbs({
  items,
}: {
  items: Array<{ name: string; path: string }>;
}) {
  // Defensive: if a caller hands us an empty array we don't emit anything.
  if (items.length === 0) return null;
  const html = JSON.stringify(breadcrumbJsonLd(items));
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

// Convenience helper that drops in the most-common breadcrumbs for a child
// page: Home → <parent name>. Saves having to import the items constant in
// every page file.
export function standardBreadcrumbs(
  parentName: string,
  parentPath: string,
  childName: string,
  childPath: string,
) {
  return (
    <StructuredBreadcrumbs
      items={[
        { name: 'Home', path: '/' },
        { name: parentName, path: parentPath },
        { name: childName, path: childPath },
      ]}
    />
  );
}

// Helper used by the slug-page path: Home → Blog → <Post title>. Keeps
// each post slug-call site tidy.
export function blogBreadcrumbs(postTitle: string, postPath: string) {
  return (
    <StructuredBreadcrumbs
      items={[
        { name: 'Home', path: '/' },
        { name: 'Blog', path: '/blog' },
        { name: postTitle, path: postPath },
      ]}
    />
  );
}

// Re-export SITE so callers that already imported this module don't need
// a second import for trivial uses. Tree-shaken when not referenced.
export { SITE };
