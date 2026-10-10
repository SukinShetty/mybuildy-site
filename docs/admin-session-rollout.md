# Server-backed admin sessions: rollout and verification

This change rejects the previous deterministic cookies. Every administrator must sign in again. It uses the existing Supabase service-role connection; do not expose that key in browser code.

## Deployment order

1. Review and apply `supabase/admin-sessions.sql` through an authorized database administrator. This creates a new private table and grants only select/insert/delete to the existing service role. Do not run it against production without approval.
2. Verify RLS is enabled, public/anon/authenticated have no grants or policies, and the existing service-role connection can insert, select and delete a synthetic test session.
3. Deploy the code. Missing table, database outage, or missing configuration causes login/access to fail closed.
4. Verify admin login, data page, CSV authorization, expiration, logout, and replay of a copied synthetic session against the deployed shared database. Never record real bearer tokens in tickets or logs.
5. Periodically delete expired rows with the optional maintenance statement in the migration. Expired rows cannot authenticate even before cleanup.

## Behavior and rollback

- Token: independent 256-bit cryptographic random bearer token per login, sent only as an HttpOnly/Secure/SameSite=Strict cookie scoped to `/admin`.
- Database: password-bound HMAC hash and timestamps only. Server enforces the existing seven-day maximum age.
- Successful logout removes that session across server instances. A failed database revoke reports failure and retains the cookie so the user can retry; it never claims logout succeeded.
- Changing ADMIN_PASSWORD invalidates previous session lookups. Do not rotate production credentials as part of applying this patch without separate approval.
- Existing process-local login throttling remains a speed bump, not a distributed security limit. Add managed edge/WAF limits or a reviewed shared limiter before relying on it against sustained guessing.
- Avoid rolling back to the old auth code: that would revive its deterministic token acceptance, including old copied cookies. Prefer a forward fix or disable admin access while repairing. Dropping the session table signs everyone out and prevents new logins on this code.

## Checks

Run `npm test` with Node 24+, `npm run lint`, `npx tsc --noEmit`, and `npm run build`. Tests use a synthetic shared session store and mock cookies; they do not apply the migration or prove live Supabase permissions. Production migration and a real shared-database smoke test remain deployment prerequisites.
