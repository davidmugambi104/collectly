/**
 * Smoke test for the MFA helper. Pure logic — no DB, no network.
 *
 * Run: npx tsx scripts/mfa-check.mts
 */

async function main(): Promise<void> {
  // FLAG (2026-08-24): `../src/lib/mfa.ts` does not exist and has no git
  // history in this repo at all (`git log --all -- src/lib/mfa.ts` is
  // empty) -- this smoke test was written for an MFA-enforcement module
  // (hasVerifiedSecondFactorSync / MfaRequiredError, gating on Clerk's
  // sessionClaims.factorVerificationAge) that was never actually built.
  // grep confirms no `factorVerificationAge`/`MfaRequired`/`SecondFactor`
  // anywhere in src/ and getAuth() in auth-helper.ts never checks a
  // second factor. This script currently crashes with
  // ERR_MODULE_NOT_FOUND on every run and isn't wired into `npm test`,
  // so nobody would notice. Implementing the MFA module itself is a real
  // security feature needing its own design/review, not something to
  // build as a side effect of a lint cleanup -- left as `any` here
  // (there is no real module to type this import against) and flagged
  // for the user rather than fixed inline.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mfa: any = await import('../src/lib/mfa.ts');
  const { hasVerifiedSecondFactorSync, MfaRequiredError } = mfa;

  let pass = 0, fail = 0;
  function log(msg: string, ok: boolean): void {
    if (ok) { pass++; console.log(`  ✓ ${msg}`); } else { fail++; console.log(`  ✗ ${msg}`); }
  }

  console.log('\nTEST 1: factorVerificationAge absent → false');
  log('null sessionClaims', hasVerifiedSecondFactorSync(null) === false);
  log('empty object', hasVerifiedSecondFactorSync({}) === false);

  console.log('\nTEST 2: only first-factor verified → false');
  log('only first factor', hasVerifiedSecondFactorSync({ factorVerificationAge: [1000, null] }) === false);
  log('first factor only (length 1)', hasVerifiedSecondFactorSync({ factorVerificationAge: [1000] }) === false);

  console.log('\nTEST 3: both factors verified → true');
  log('both verified', hasVerifiedSecondFactorSync({ factorVerificationAge: [1000, 2000] }) === true);

  console.log('\nTEST 4: weird/malformed inputs → false');
  log('garbage age', hasVerifiedSecondFactorSync({ factorVerificationAge: 'lol' }) === false);
  // (Negative secondFactorAge is unrealistic — Clerk returns ms timestamps.
  //  We don't defensively reject negatives because Number.isFinite is the
  //  canonical "is this a real number" check, and rejecting would mask a
  //  legitimate Clerk schema change.)
  log('NaN second factor', hasVerifiedSecondFactorSync({ factorVerificationAge: [100, NaN] }) === false);
  log('Infinity second factor', hasVerifiedSecondFactorSync({ factorVerificationAge: [100, Infinity] }) === false);

  console.log('\nTEST 5: MfaRequiredError class');
  const e1 = new MfaRequiredError();
  log('is Error', e1 instanceof Error);
  log('name preserved', e1.name === 'MfaRequiredError');
  log('default message non-empty', typeof e1.message === 'string' && e1.message.length > 0);
  const e2 = new MfaRequiredError('custom');
  log('custom message preserved', e2.message === 'custom');

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error('Fatal:', e?.stack ?? e); process.exit(1); });
