# SOP: Daily Claude AI Usage Reminder System

| | |
|---|---|
| **Document owner** | Direct reporting manager |
| **Applies to** | Direct report team members designated in `automation/team_roster.yaml` |
| **Effective date** | 2026-07-24 |
| **Review cadence** | Quarterly, or on team roster change |

## 1. Purpose

This SOP establishes a daily reminder process encouraging direct report team
members to use Claude AI as part of their standard workflow (e.g. drafting,
review, analysis, and documentation tasks relevant to finance and internal
control work), and defines how usage is tracked and followed up on.

## 2. Scope

Applies to all team members listed as active in the team roster
(`automation/team_roster.yaml`). New hires are added to the roster on their
start date; departures are removed the same day access is revoked.

## 3. Process

1. **Daily reminder (automated).** A scheduled job
   (`.github/workflows/daily-claude-reminder.yml`) runs on weekday mornings
   and sends each active team member an email reminder via
   `automation/send_daily_reminder.py`, prompting them to use Claude AI for
   at least one applicable task that day.
2. **Self-logging.** Team members record a one-line entry in
   `logs/usage-log.csv` (date, name, task type, brief note) after using
   Claude AI. This is a lightweight honor-system log, not an audit trail.
3. **Weekly manager review.** Every Friday, the manager reviews
   `logs/usage-log.csv` for the week, follows up 1:1 with anyone who has no
   entries, and notes recurring blockers (access issues, unclear use cases,
   etc.).
4. **Escalation.** If a team member has no log entries for two consecutive
   weeks, the manager discusses it in their next 1:1 to understand whether
   the reminder isn't reaching them, the tool isn't fitting their workflow,
   or another blocker exists — this is a coaching conversation, not a
   disciplinary one.

## 4. Roles and responsibilities

| Role | Responsibility |
|---|---|
| Manager | Maintains `team_roster.yaml`, holds the Azure AD credentials used to send reminders, reviews the weekly log, follows up on gaps |
| Team member | Uses Claude AI for applicable tasks, logs usage, raises blockers |
| IT / Security | Owns the Azure AD app registration and its `Mail.Send` application permission grant |

## 5. Reminder content

The daily email is short and non-intrusive by design — one prompt, one link,
no required response. See `automation/send_daily_reminder.py` for the
template; the subject and body can be edited there without changing the
schedule or credentials.

## 6. Data handled

The system stores: team member names and work emails (roster), and a
free-text usage log the team member writes themselves. No Claude AI
conversation content is captured, transmitted, or logged by this system.

## 7. Setup and ownership

See `automation/README.md` for the technical setup steps (Azure AD app
registration, required permission, GitHub secrets) needed before the
scheduled reminder can actually send mail. Until that setup is complete,
this SOP's automated step does not run — sections 2–4 (manual logging and
review) can be followed independently of the automation.
