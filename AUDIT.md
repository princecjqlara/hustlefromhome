# Recruiting system implementation audit

The application is deployed, but the complete Facebook recruiting workflow is **not active or verified end to end**. A successful build and accessible screens do not prove real message delivery.

**Facebook setup update:** the app-level Page webhook has now been switched to the local ngrok tunnel requested for initial testing and Meta confirms it is active. Page authorization and scheduler configuration are still pending. Meta rejected basic-settings API updates because this app disables them; see [FACEBOOK_SETUP.md](FACEBOOK_SETUP.md) for the exact remaining fields.

## Live configuration inspected

| Item                                          | Observed state                                                                                                 |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Admin account                                 | One administrator exists; production sign-in verified                                                          |
| Facebook Pages in this workspace              | None connected                                                                                                 |
| Facebook app credentials                      | Accepted by Meta's read API                                                                                    |
| App's Page webhook                            | Active at `https://mae-squarish-sid.ngrok-free.dev/api/webhooks/facebook`; confirmed by Meta after ngrok setup |
| Questions, saved answers, qualification rules | Empty; intended to be configured in the dashboard                                                              |
| Automation                                    | Paused                                                                                                         |
| Ad accounts                                   | None connected                                                                                                 |
| Jev                                           | Live structured decision request succeeded and classified refusal as `stop`                                    |
| cron-job.org                                  | Public GET/POST endpoint requires no secret; recurring external schedule is not verified                        |
| Real contacts / meetings                      | None; verification fixtures are cleaned up                                                                     |

## Verified behavior

- TypeScript and production build pass, with 14 automated tests for messaging-window boundaries, opt-out, timing estimates, quiet hours, signatures, token encryption, meeting generations, and event ordering.
- Live database checks cover direct-access restrictions, contact locks, transactional RSVP capacity, idempotent RSVP, click recording, and job claims.
- HTTP checks cover administrator sign-in, protected routes, cross-origin mutation rejection, secret redaction, webhook verification/signatures, the public cron endpoint, and all 12 workspace screens.
- Action checks use synthetic records and restore the original settings: question/FAQ/button persistence, contact notes/tags/details, takeover resume, meeting creation/edit/reinvitation/cancellation, tag-filtered recipients, tracked redirects, and blocked campaign recipients. A 1,001-recipient fixture checks bulk pagination.
- Signed synthetic webhook checks cover durable receipt, duplicate delivery, read/delivery ordering, stale timestamps, immediate STOP suppression, and worker processing. They send no real customer messages.

## Bugs corrected during this audit

- Empty optional media URLs could throw `Invalid URL`, preventing playbook/settings saves. Validation now accepts blanks while rejecting non-HTTPS URLs.
- Restoring consent or resuming a contact after takeover did not schedule another eligible follow-up. It now re-arms the scheduler while preserving its eligibility checks.
- Editing a meeting without changing its start time could reuse canceled job keys. Each edit now gets a new revision used by invitation/reminder keys.
- A meeting-link edit could reuse an older tracked destination. Invitation processing refreshes the destination and sends full additional notes separately from Meta's limited card subtitle.
- Read status could regress after a delayed delivery receipt or echo; delivery receipts without message IDs could fail. Receipt updates now advance status and support watermark-only delivery events.
- Delayed incoming messages could be applied to a newer questionnaire step. They remain in history but do not advance the current conversation or cancel its follow-up.
- Inquiry timing used ingestion time for newly created contacts. It now uses the inbound event timestamp.
- Multiple reminder offsets were parsed on every keystroke, disrupting input. Parsing now happens when the meeting is submitted.
- Campaign date input used a full timestamp as an HTML date value. It now displays its date portion.
- Custom-button clicks were recorded but absent from contact details. The contact panel now includes destinations, click counts, and last-click times.
- Bulk campaign/meeting queries inherited PostgREST's default 1,000-row cap. Those operations now paginate matching recipients.
- Preflight failures could leave an outbound reservation despite no Meta request. Reservation now follows preflight validation.

## Incomplete, conditional, or unverified

| Feature                                                     | Remaining limit                                                                                                                                                                                              |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Actual Messenger conversation flow                          | Needs Page-manager OAuth, Page subscription, the correct app webhook, configured playbook, and a scheduler; no real tester conversation has completed the flow                                               |
| Human Agent replies and media                               | Code exists for individual eligible replies; real permission and delivery have not been tested. Automated Human Agent follow-ups/broadcasts are excluded                                                     |
| Utility templates                                           | Individual template creation/status lookup/sending exists; no Page template approval or real utility delivery verified. Header/body text parameters are supported; richer template components need extension |
| Marketing Messages API                                      | Not implemented; route is disabled                                                                                                                                                                           |
| Automatic invitations/reminders outside the standard window | No automatic utility/marketing fallback; those jobs are blocked when the standard window is closed                                                                                                           |
| Media                                                       | Composers accept HTTPS URLs; there is no built-in file-upload interface                                                                                                                                      |
| Best contact times                                          | Hour-based recency scoring with first-inquiry fallback; no weekday preference model, learned response-probability model, or accuracy study                                                                   |
| Advertising costs                                           | Sync and calculations exist; no authorized account or real ad data verified. Missing historical referral IDs cannot be fabricated                                                                            |
| Demographics                                                | Summaries use provided custom details; Facebook demographics are not inferred or guaranteed available                                                                                                        |
| Day-by-day reporting                                        | Current contact statuses grouped by first-inquiry date; historical daily status snapshots are not implemented                                                                                                |
| Visual/browser interaction                                  | Browser connection unavailable; visual layout and clicking through the interface are unverified                                                                                                              |
| Automatic GitHub deployments                                | Source is pushed, but Vercel's GitHub repository connection failed; CLI deployment works                                                                                                                     |

## Repeat the checks

Use `.env.local` and the verified Supabase certificate. The action and workflow scripts are intended for an idle initial workspace, not a live sending queue.

```powershell
npm run typecheck
npm test
npm run build
node --env-file=.env.local scripts/verify-database.mjs
node --env-file=.env.local scripts/verify-actions.mjs
node --env-file=.env.local scripts/verify-http.mjs
node --env-file=.env.local scripts/verify-workflow.mjs
node --env-file=.env.local scripts/audit-live.mjs
```

Set `TEST_APP_URL` to `https://hustle-from-home.vercel.app` for deployed checks. The read-only live audit makes one small Jev inference request; its full output is saved under ignored `artifacts/`.
