# Current local Facebook test setup

The local app is running on port 3000 through the existing ngrok tunnel:

**https://mae-squarish-sid.ngrok-free.dev**

Meta's app-level Page webhook has been switched to this tunnel and verified as active. `.env.local` now uses this origin for APP_URL and FACEBOOK_PUBLIC_APP_URL. Use this ngrok site for Page connection during the test.

## Values to save in Meta Developers

Open [app 2887110501632122](https://developers.facebook.com/apps/2887110501632122/). Basic-setting API updates are disabled for this app, so these fields need to be saved in the dashboard.

| Setting                                    | Value                                                           |
| ------------------------------------------ | --------------------------------------------------------------- |
| App Domain                                 | `mae-squarish-sid.ngrok-free.dev`                               |
| Website / Site URL                         | `https://mae-squarish-sid.ngrok-free.dev/`                      |
| Privacy Policy URL                         | `https://mae-squarish-sid.ngrok-free.dev/privacy`               |
| Data deletion instructions URL             | `https://mae-squarish-sid.ngrok-free.dev/data-deletion`         |
| Valid OAuth Redirect URI                   | `https://mae-squarish-sid.ngrok-free.dev/api/facebook/callback` |
| Page webhook callback (already configured) | `https://mae-squarish-sid.ngrok-free.dev/api/webhooks/facebook` |

Add the redirect URI under Facebook Login → Settings or Facebook Login for Business → Settings, depending on the app's dashboard. Enable Client OAuth Login and Web OAuth Login where shown, and save. Keep the app in development mode for testing with app-role accounts.

Then sign in at [ngrok workspace Settings](https://mae-squarish-sid.ngrok-free.dev/settings), click **Connect Facebook**, authorize the Page manager's account, select the Pages, and click **Connect selected Pages**.

## Scheduler for this test

Use a one-minute **POST** job at cron-job.org:

```text
https://mae-squarish-sid.ngrok-free.dev/api/jobs/tick
```

Copy the full Authorization header value from the ngrok workspace's Settings → Reveal setup credentials. Do not put the secret into the URL. An external scheduler account/API key is still required to create the recurring job.

## Keep the local app available

The app and tunnel must remain running on this computer. To restart the app from this project folder:

```powershell
npm start
```

In another terminal, start ngrok if it is not already running:

```powershell
& "$env:APPDATA/npm/node_modules/ngrok/bin/ngrok.exe" http 3000
```

This computer's npm `ngrok` shortcut did not launch the agent correctly during setup; the explicit `.exe` above works. The existing tunnel was reused, rather than replacing its running agent.

If the public URL changes, update the private local configuration and Meta webhook:

```powershell
node scripts/use-public-url.mjs https://YOUR_NEW_NGROK_HOST
# Restart npm start after changing .env.local.
node --env-file=.env.local scripts/configure-facebook.mjs --apply
```

Also add the new OAuth redirect URI in Meta's dashboard. A private backup of the original local environment is stored under ignored `artifacts/`.

## DNS and browser notice

The Wi-Fi router's DNS returns NXDOMAIN for the ngrok hostname. OpenDNS was verified to resolve the correct ngrok addresses, including through its DNS-over-HTTPS endpoint. The setup verifier now uses OpenDNS as its first process-local fallback and retries the returned addresses; system DNS settings remain untouched. Local login, public ngrok login, and webhook verification passed with this resolver.

If Chrome reports a name-resolution error, open `chrome://settings/security`, enable **Use secure DNS**, select a custom provider, and enter `https://doh.opendns.com/dns-query`. Restart the browser and reload the ngrok URL. The app is also available immediately at `http://localhost:3000` on this computer. If ngrok shows its visitor notice, choose **Visit Site** before signing in and connecting Facebook.
