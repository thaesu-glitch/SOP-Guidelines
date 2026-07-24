# Automation setup: Daily Claude AI Reminder

This automation is **not active** until the steps below are completed. Until
then, follow the SOP's manual steps (`sop/claude-ai-daily-reminder-sop.md`,
sections 2–4) on their own.

## What it does

`.github/workflows/daily-claude-reminder.yml` runs on weekday mornings and
calls `send_daily_reminder.py`, which sends a short reminder email (via
Microsoft Graph) to every `active: true` member in `team_roster.yaml`.

## 1. Edit the roster

Open `team_roster.yaml` and:
- Set `sender.email` to the mailbox reminders should be sent from.
- Replace the example entry with your real direct reports (`active: true`).

## 2. Register an Azure AD app (one-time, needs an M365/Azure admin)

1. In the Azure Portal: **Azure Active Directory → App registrations → New
   registration**. Any name (e.g. `sop-claude-reminder-bot`), single tenant,
   no redirect URI needed.
2. Under **API permissions**, add **Microsoft Graph → Application
   permissions → `Mail.Send`**, then **Grant admin consent** for the tenant.
   This permission alone lets the app send mail as *any* mailbox in the
   tenant — see the scoping note below to restrict that.
3. Under **Certificates & secrets**, create a new **client secret** and copy
   its value immediately (it's shown once).
4. Note down: **Tenant ID**, **Application (client) ID**, and the **client
   secret** value from steps 2–3.

### Recommended: scope the app to only the sender mailbox

By default, an app with application-level `Mail.Send` can send as *any*
mailbox in the org. To restrict it to only the sender mailbox in
`team_roster.yaml`, have an admin create an
[Application Access Policy](https://learn.microsoft.com/en-us/graph/auth-limit-mailbox-access)
scoped to that one mailbox via Exchange Online PowerShell:

```powershell
New-ApplicationAccessPolicy -AppId <client-id> -PolicyScopeGroupId <sender-mailbox-or-mail-enabled-group> -AccessRight RestrictAccess -Description "Restrict SOP reminder bot to sender mailbox only"
```

## 3. Add repository secrets

In the GitHub repo: **Settings → Secrets and variables → Actions → New
repository secret**, add:

| Secret name | Value |
|---|---|
| `AZURE_TENANT_ID` | Tenant ID from step 2 |
| `AZURE_CLIENT_ID` | Application (client) ID from step 2 |
| `AZURE_CLIENT_SECRET` | Client secret value from step 2 |

## 4. Adjust the schedule (optional)

The workflow's cron is set to 09:00 Asia/Bangkok (UTC+7) on weekdays
(`0 2 * * 1-5` in UTC). Edit the `cron` line in
`.github/workflows/daily-claude-reminder.yml` if your team is in a
different time zone or you want a different send time.

## 5. Test it

After secrets are set, trigger a manual run from the **Actions** tab →
*Daily Claude AI Reminder* → **Run workflow**, and confirm the roster's
active members receive the email.

## Running locally (optional, for testing)

```bash
pip install -r automation/requirements.txt
export AZURE_TENANT_ID=...
export AZURE_CLIENT_ID=...
export AZURE_CLIENT_SECRET=...
python automation/send_daily_reminder.py
```
