/**
 * Field names from a Zod issue list, deduped and in order.
 *
 * Split out with no imports so the node test runner can load it: parse-body.ts
 * imports NextResponse from next/server, which the runner cannot resolve. Same
 * reason src/lib/legacy-domain.ts and src/lib/lead-email.ts are separate from
 * the modules that use them.
 */
export function invalidFields(issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey> }>): string[] {
  const seen = new Set<string>();
  for (const issue of issues) {
    seen.add(issue.path.length ? issue.path.map(String).join('.') : '(body)');
  }
  return [...seen];
}
