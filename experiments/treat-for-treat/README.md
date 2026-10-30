# Treat For Treat

The standalone page lives at `/experiments/treat-for-treat/`; the announcement is `/treat-for-treat/`. Embed the shared partial in Markdown with `{{< treat-for-treat >}}`.

- Pages: `content/experiments/`. Add a Markdown page with `title`, `description`, `date`, and optional `icon` and `status` to get an index card automatically.
- Partial: `layouts/partials/experiments/treat-for-treat.html`.
- Client assets: `static/experiments/treat-for-treat/`.
- Backend source: this directory (`schema.sql`, `index.ts`).

## Supabase

Project: **BlogExperiments** (`rpsoodrstrmpbbbxxbob`). Table: `public.treat_for_treat_links`. Edge Function: `treat-for-treat`, deployed with `verify_jwt = true`. The schema was applied as migration `create_treat_for_treat`.

The browser uses the public legacy anon JWT because the Edge gateway requires a JWT. No service key is included in the site. The Edge Function uses Supabase's injected `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` environment variables to call a service-only, invoker-rights RPC. Direct anon/authenticated table access and RPC execution are revoked. RLS deliberately has no public policies: the security advisor's `rls_enabled_no_policy` informational notice reflects this closed-table design.

The endpoint validates and normalizes HTTP(S) URLs, removes fragments, excludes the current browser's links, and atomically stores a submission and its randomly chosen reward. Repeating the same normalized URL returns the same reward without adding rows. A submission with no reward can be retried after another reader arrives. A 30-second database cooldown applies to new links per browser ID. Returned links are displayed as social preview cards and never automatically opened. The server fetches only the awarded URL to extract Open Graph/Twitter metadata, with HTML title/description and favicon fallbacks. Preview failures do not fail the exchange. Requests have a four-second budget, three-redirect limit, and a 512 KiB HTML limit. Each destination is resolved to a public IPv4 address and the connection is pinned to it, with hostname verification for TLS. HTTPS images and favicons load directly in the browser without a referrer; missing or failed images use placeholders.

No accounts are required. Browser IDs are convenience identifiers, not verified identities: clearing storage or changing devices bypasses own-link exclusion and the cooldown. This is a small anonymous experiment, not a bot-resistant service. Recipients can report a link. One report per browser per normalized URL counts; two reports disable the URL in `treat_for_treat_moderation`, including duplicate submissions and saved rewards. A reporter stops receiving that URL immediately. Reports require a matching received reward (or a previous report for safe retries). Browser IDs are not verified identities, so this does not prevent reports from someone using multiple browser IDs. Already-open pages are not updated remotely. The database stores URLs, browser IDs, assigned rewards, and timestamps; infrastructure may keep normal request logs.

## Verification

`test.sql` checks the empty bowl, two-reader exchange, idempotency, cooldown, report deduplication, the two-report threshold, disabled reward replacement, unauthorized reports, and denied public privileges inside a rolled-back transaction. Run against an empty bowl (or a test database); it leaves no sample links behind.

```sh
hugo --destination /tmp/treat-build --gc --minify --panicOnWarning
HUGO_OUTPUT_DIR=/tmp/treat-build node scripts/audit.cjs
node --check static/experiments/treat-for-treat/app.js
node experiments/treat-for-treat/test-edge.mjs # Node with TypeScript stripping support
node experiments/treat-for-treat/test-preview.mjs
node experiments/treat-for-treat/test-client.mjs
```

A separate output directory avoids racing a running Hugo development server. The live HTTP endpoint was tested with two temporary example-domain links, then those rows were removed.

Apply `reporting.sql` to upgrade the original database; `schema.sql` is the complete schema for a new database. Deploy `index.ts` together with `preview.ts` before publishing the updated client.

The reporting backend was applied as migration `add_treat_reporting` and deployed as Edge Function version 2. Database assertions passed in a rolled-back transaction; the security advisor reported only the expected closed-table RLS notices.

The preview backend is deployed as Edge Function version 6. A live exchange returned the expected page title; its temporary test receipt was removed. Frontend publishing follows the normal Hugo deployment.
