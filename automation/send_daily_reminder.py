#!/usr/bin/env python3
"""Send the daily Claude AI usage reminder email to active team members.

Auth: Microsoft Graph client-credentials flow (app-only), so this can run
unattended from a scheduled job with no signed-in user. Requires the Azure
AD app registration described in automation/README.md, with admin-consented
application permission Mail.Send.

Required environment variables:
  AZURE_TENANT_ID
  AZURE_CLIENT_ID
  AZURE_CLIENT_SECRET

Roster and sender mailbox are read from automation/team_roster.yaml.
"""
import os
import sys
from pathlib import Path

import requests
import yaml

GRAPH_SCOPE = "https://graph.microsoft.com/.default"
ROSTER_PATH = Path(__file__).parent / "team_roster.yaml"

SUBJECT = "Daily reminder: use Claude AI today"
BODY_TEMPLATE = """\
<p>Hi {name},</p>
<p>Quick daily reminder to use Claude AI for at least one applicable task
today (drafting, review, analysis, or documentation work).</p>
<p>When you do, add a one-line entry to <code>logs/usage-log.csv</code> in
the SOP-Guidelines repo (date, your name, task type, brief note).</p>
<p>See the full process in
<code>sop/claude-ai-daily-reminder-sop.md</code>.</p>
<p>Thanks!</p>
"""


def get_access_token(tenant_id: str, client_id: str, client_secret: str) -> str:
    url = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"
    resp = requests.post(
        url,
        data={
            "client_id": client_id,
            "client_secret": client_secret,
            "scope": GRAPH_SCOPE,
            "grant_type": "client_credentials",
        },
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()["access_token"]


def load_roster(path: Path) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def send_mail(token: str, sender_email: str, to_email: str, to_name: str) -> None:
    url = f"https://graph.microsoft.com/v1.0/users/{sender_email}/sendMail"
    message = {
        "message": {
            "subject": SUBJECT,
            "body": {
                "contentType": "HTML",
                "content": BODY_TEMPLATE.format(name=to_name),
            },
            "toRecipients": [{"emailAddress": {"address": to_email}}],
        },
        "saveToSentItems": "true",
    }
    resp = requests.post(
        url,
        headers={"Authorization": f"Bearer {token}"},
        json=message,
        timeout=30,
    )
    resp.raise_for_status()


def main() -> int:
    tenant_id = os.environ.get("AZURE_TENANT_ID")
    client_id = os.environ.get("AZURE_CLIENT_ID")
    client_secret = os.environ.get("AZURE_CLIENT_SECRET")
    if not all([tenant_id, client_id, client_secret]):
        print(
            "Missing one or more required env vars: "
            "AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET",
            file=sys.stderr,
        )
        return 1

    roster = load_roster(ROSTER_PATH)
    sender_email = roster["sender"]["email"]
    recipients = [m for m in roster.get("team", []) if m.get("active")]

    if not recipients:
        print("No active team members in team_roster.yaml -- nothing to send.")
        return 0

    token = get_access_token(tenant_id, client_id, client_secret)

    sent, failed = 0, 0
    for member in recipients:
        try:
            send_mail(token, sender_email, member["email"], member["name"])
            print(f"Sent reminder to {member['email']}")
            sent += 1
        except requests.HTTPError as exc:
            print(f"Failed to send to {member['email']}: {exc}", file=sys.stderr)
            failed += 1

    print(f"Done. sent={sent} failed={failed}")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
