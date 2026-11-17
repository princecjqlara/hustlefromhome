# Facebook activation checklist

## Completed by the setup script

- App ID: `2887110501632122`.
- Public application: `https://mae-squarish-sid.ngrok-free.dev`.
- Meta's Page webhook now points to `https://mae-squarish-sid.ngrok-free.dev/api/webhooks/facebook`.
- Meta returned success, and a subsequent read confirmed the subscription is active.
- Required subscriptions are present: `messages`, `messaging_postbacks`, `messaging_referrals`, `message_deliveries`, `message_reads`, and `message_echoes`.
- The public endpoint successfully answers verification challenges. Existing additional app subscription fields were preserved.
- The original subscription was saved under ignored `artifacts/` before changing it.

The current first test uses ngrok forwarding to the app on this computer. Keep both the local app and tunnel running. See [NGROK_SETUP.md](NGROK_SETUP.md) for restart commands and the DNS note.

## Meta dashboard settings still requiring your account

Meta rejected basic-settings API updates with error `#10`: changing app settings through API calls is disabled for this app. The webhook update succeeded independently. No browser connection is available to edit the dashboard on your behalf.

Open [this app in Meta Developers](https://developers.facebook.com/apps/2887110501632122/).

Under **App settings → Basic**, use these values:

| Setting                      | Value                                                                                          |
| ---------------------------- | ---------------------------------------------------------------------------------------------- |
| App Domains                  | Add `mae-squarish-sid.ngrok-free.dev`                                                          |
| Website / Site URL, if shown | `https://mae-squarish-sid.ngrok-free.dev/`                                                     |
| Privacy Policy URL           | `https://mae-squarish-sid.ngrok-free.dev/privacy`                                              |
| User data deletion           | Choose deletion instructions and enter `https://mae-squarish-sid.ngrok-free.dev/data-deletion` |

Under **Facebook Login → Settings** or **Facebook Login for Business → Settings**, enter this exact **Valid OAuth Redirect URI**:

```text
https://mae-squarish-sid.ngrok-free.dev/api/facebook/callback
```

Enable Client OAuth Login and Web OAuth Login where these controls are available, then save. Leave unrelated existing redirect entries intact. For development testing, keep the app in Development mode and make sure the person connecting the Page has the appropriate app role and Page management access. A non-role customer's live messages require the applicable approved access and live configuration.

## Authorize the Page

1. Sign in to [the workspace Settings screen](https://mae-squarish-sid.ngrok-free.dev/settings) with the administrator account.
2. Click **Connect Facebook** and sign in with the Facebook account that manages your Page.
3. Grant the requested Page permissions. Grant ads access only for accounts you intend to report on.
4. After returning to Settings, choose the Page or Pages and click **Connect selected Pages**. This step subscribes the app to each selected Page; the app-level webhook alone does not connect a Page.
5. Send a test Messenger inquiry from an eligible app-role account. It will be stored in the queue. Use Follow-ups → Run due jobs for a controlled first test while configuring the scheduler.

If Facebook shows an error, retain its exact text. App credentials alone cannot replace this Page-manager authorization.

## Activate the scheduler

Create one job at cron-job.org:

- URL: `https://mae-squarish-sid.ngrok-free.dev/api/jobs/tick`.
- Method: **GET** or **POST**.
- Schedule: every minute.
- Headers, username and password: leave empty. No cron secret is required.

No cron-job.org account/API key has been provided, so an external recurring job has not been created by this setup. The job endpoint is public and can be triggered by anyone with its URL.

## Turn on the playbook

Enter your questions, saved replies, and job-related qualification rules in the workspace. Save and enable the playbook when you are ready to send automated responses. Confirm one tester inquiry reaches Inbox and receives the expected first question before relying on the workflow.

Human Agent approval must be confirmed separately in Meta before selecting that route. Utility templates require their own approval. A verified webhook does not grant either capability.

## Repeat webhook configuration

The local environment already contains the private verification token. To verify the callback without changing anything:

```powershell
node --env-file=.env.local scripts/configure-facebook.mjs
```

To apply the app-level Page callback and required fields:

```powershell
node --env-file=.env.local scripts/configure-facebook.mjs --apply
```

`--settings` additionally attempts the documented basic-settings update. It requires Meta's setting-update API access to be enabled; it does not configure OAuth redirect allowlists or authorize Pages.
