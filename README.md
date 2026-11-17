# Hustle From Home

A Next.js recruiting workspace for one business and multiple Facebook Pages, deployed on Vercel with Supabase Auth/Postgres and Jev structured decisions through OpenRouter.

## Run locally

```powershell
npm ci
# Fill .env.local using .env.example; never commit real secrets.
npm run dev
```

The administrator signs in through Supabase Auth. Public registration is not exposed. All application table access passes through authenticated server handlers; direct anonymous/authenticated PostgREST table access is denied. Page tokens use AES-256-GCM encryption.

## Initial database and administrator setup

Download your Supabase database CA certificate from Database Settings. Use the session-pooler DATABASE_URL in `.env.local` and set `DATABASE_CA_FILE` to the downloaded certificate path. TLS verification stays enabled.

```powershell
$env:DATABASE_CA_FILE='artifacts/supabase-ca.crt'
npm run setup
```

Setup applies the SQL files in `supabase/migrations/` in order, creates the administrator if absent, and grants protected administrator membership. Reruns do not reset an existing password or enable automation. ADMIN_PASSWORD and DATABASE_URL are setup-only; they are not needed by the deployed app. Back up TOKEN_ENCRYPTION_KEY privately: replacing it without re-encrypting Page tokens requires reconnecting Pages.

## Facebook setup

Current local testing uses **https://mae-squarish-sid.ngrok-free.dev**. Meta’s webhook and the local environment now point to this tunnel. See [NGROK_SETUP.md](NGROK_SETUP.md).

The app-level webhook has been configured and verified. Follow [FACEBOOK_SETUP.md](FACEBOOK_SETUP.md) for the remaining dashboard settings, Page authorization, and cron-job.org steps.

1. In Meta Developers, configure Facebook Login with the exact **OAuth redirect URI** displayed in Settings.
2. Configure a **Page webhook**, using the exact webhook URL and verification token shown in Settings. The endpoint verifies the raw-body `X-Hub-Signature-256` signature and persists deliveries before acknowledging them.
3. Configure the app’s privacy URL as `/privacy`, and data-deletion instructions as `/data-deletion`, on the deployed domain.
4. Use **Connect Facebook** in Settings, authorize the Page-management/messaging permissions, and select the Pages to subscribe. Ads reporting additionally needs `ads_read` and access to an ad account.
5. In development mode, test with an account assigned an app role and authorized to use the relevant Page. Live customer use requires Meta’s applicable App Review/access requirements. The app cannot grant its own Meta permissions or change app mode.
6. Configure questions, saved answers, and job-related rules in the dashboard, then enable and save the playbook.

The supplied app ID/secret alone cannot authorize a Page. A Page manager must complete OAuth. The setup has not sent any real customer messages.

### Messaging routes

- Standard automated messages use the eligible 24-hour window, measured from inbound Messenger messages/postbacks; outbound messages never extend it. Read receipts, delivery receipts, and link clicks do not extend it.
- HUMAN_AGENT is available only for an individually initiated human reply, with confirmed access, within seven days. It is never used for campaigns or automated follow-ups.
- Utility messages use Meta-approved UTILITY templates, checked against the selected Page immediately before sending. Record the contact’s request for those updates in the conversation panel. The basic template editor submits fixed text; existing templates support header/body text parameters. Availability and suitability remain subject to Meta’s recipient, region, and template rules.
- Deprecated ACCOUNT_UPDATE / CONFIRMED_EVENT_UPDATE / POST_PURCHASE_UPDATE tags are not sent. New Marketing Messages API activation is not implemented; the route is explicitly disabled. Do not use utility messages to bypass marketing restrictions.

Reference: [Meta changelog](https://developers.facebook.com/documentation/business-messaging/messenger-platform/changelog), [Meta utility examples](https://github.com/fbsamples/messenger-platform-samples/blob/main/postman/messenger-platform-api.postman_collection.json), [OpenRouter TypeSafe SDK guide](https://openrouter.ai/docs/guides/community/typesafe-sdk).

## cron-job.org

Create one job:

- URL: the Settings **Cron endpoint** (`https://YOUR_DOMAIN/api/jobs/tick`).
- Schedule: every minute.
- HTTP method: **GET** or **POST** (both run the same authenticated job runner).
- Header name: **Authorization**.
- Header value: copy the entire **Bearer ...** value from Settings → Reveal setup credentials.
- Both methods require this header. Opening the URL in a browser without it returns **401 Unauthorized**. HEAD only checks authentication and never runs jobs.
- Request timeout: maximum supported by your cron-job.org plan. The endpoint processes up to three jobs concurrently. If the caller times out, inspect the queue rather than immediately resending uncertain sends.

No cron-job.org account/API key was supplied, so registration of this external job must be completed separately. The dashboard’s **Run due jobs** button is available for controlled testing. Webhook events are queued, so automatic responses require the scheduler.

## Workflow behavior

- Jev chooses approved actions/FAQ replies and produces advisory qualification recommendations. Administrators confirm final recruiting qualification. Ambiguous intent, unsupported answers, and provider failures pause the affected conversation for review.
- Follow-ups have no lifetime attempt cap. Default minimum spacing is two hours; quiet hours are 21:00–08:00 in the contact timezone, defaulting to Asia/Manila. Refusal, human takeover, questionnaire completion, and expiry stop automation.
- Contact-time suggestions weight recent inbound hours over 90 days with a 30-day half-life and adjacent-hour smoothing. Fewer than five messages on three distinct days falls back to five hours nearest the first inquiry. Suggestions are estimates, never guaranteed accuracy.
- Invites go to administrator-confirmed qualified contacts. RSVP capacity is enforced transactionally. Reminders are configurable and subject to messaging eligibility. Link clicks, RSVPs, and manually recorded attendance are distinct metrics. Editing a meeting cancels pending jobs; send updated invitations to reschedule reminders.
- New ad referral IDs are captured when Meta includes them. Ad spend is fetched on demand with authorized ad-account access. Costs use matching ad/date inquiry cohorts; unattributed contacts and zero denominators stay explicit.
- Calendar statuses describe the current state of contacts grouped by first-inquiry day, not historical snapshots of past qualification decisions.

## Reliability and operational limits

Jobs use unique action keys, transactional claims and expiring contact locks. Failed sends with uncertain Meta outcomes are held for review rather than automatically resent. Confirm the outcome in the Page inbox. A timed-out worker’s jobs become uncertain after five minutes. Webhook processing failures are held for human review; they are not automatically replayed after partial processing. Transient lock contention can be retried safely.

The first version loads paginated database results into the authenticated dashboard to keep totals complete. At larger volumes, move reporting aggregates and contact filtering to dedicated server queries. No fabricated demo contacts are inserted.

## Verification

```powershell
npm run typecheck
npm test
npm run build
node --env-file=.env.local scripts/verify-database.mjs
node --env-file=.env.local scripts/verify-http.mjs
```

Database verification uses synthetic records inside a rolled-back transaction. HTTP verification checks protected routes, login, signatures, verification challenges, CSRF, cron authentication, and all dashboard screens. Set TEST_APP_URL to test the deployed domain. HTTP verification expects automation to remain paused during initial acceptance testing.

## Deployment

```powershell
vercel link --yes --project hustlefromhome
# APP_URL uses DEPLOY_APP_URL, defaulting to https://hustlefromhome.vercel.app
npm run deploy
```

Deployment requires a signed-in Vercel CLI. The deployment helper sends production values to the CLI over stdin and does not upload `.env.local`, the database password, or the initial admin password. If the Vercel GitHub integration cannot access the repository, CLI deployment still works; configure that integration in Vercel for automatic deployments after pushes.
