# Tools — PAC CLI / PowerShell helpers

Automation to cut down the manual clicking when standing up the Power App
described in [`../docs/POWER_APP_Build_Guide.md`](../docs/POWER_APP_Build_Guide.md).

## What's here

| File | Purpose |
|---|---|
| `dataverse-schema.json` | Declarative schema: choice columns, 5 tables with all columns, 7 one-to-many relationships |
| `Setup-DataverseSchema.ps1` | PowerShell bootstrap that reads the JSON and creates everything in your Dataverse environment via the Web API |

## What it creates (and doesn't)

**Created by the script (≈70% of the clicking):**
- Global option sets (choice columns) — Project / Vendor / BOQ / Quotation status, Availability, Material/Labour, Currency
- Tables with primary name + auto-number columns
- All standard columns (String, Memo, DateOnly, Decimal, Money, Picklist)
- One-to-many relationships including the lookup columns with cascade behaviour

**Still do these in Power Apps Studio** (the Web API for them is messy enough
that scripting offers no real saving over the UI):
- Rollup columns (e.g. `Project.as_boqbudgetedtotal`) — §6 of the build guide
- Formula columns (e.g. `BOQ Item.as_budgetedtotal`) — §3.3
- Business rules — §5
- Views, forms, charts, dashboards — §8–§10
- Power Automate flows — §7
- Security roles — §11
- The model-driven app itself (site map, navigation) — §12

## Prerequisites

1. **PowerShell** 5.1 or later (Windows PowerShell is fine; macOS/Linux users use PowerShell 7).
2. **Azure CLI** — <https://aka.ms/installazurecli>. Used to obtain a bearer token.
   - Verify: `az --version`
3. **System Customizer** (or System Administrator) role in the target Dataverse environment.
4. **Power Platform CLI** is optional — useful for verification (`pac org who`) but the script doesn't depend on it.

## One-time auth

```powershell
az login                               # browser opens; sign in with your AAD account
az account show                        # confirm you're on the right tenant
```

If you have multiple subscriptions/tenants:

```powershell
az login --tenant <your-tenant.onmicrosoft.com>
```

## Run it

From this `tools/` directory:

```powershell
./Setup-DataverseSchema.ps1 -OrgUrl https://<yourenv>.crm5.dynamics.com
```

- Replace `<yourenv>` with your Dataverse environment subdomain. Find it under
  <https://admin.powerplatform.microsoft.com> → Environments → *yours* → **Environment URL**.
- The script is **idempotent** — re-running it skips anything that already
  exists, so it's safe to run multiple times while you adjust the JSON.

Typical output:
```
Loaded schema: 5 tables, 7 choices, 7 relationships.

=== Choice columns ===
  + as_projectstatus  [created]
  + as_vendorstatus   [created]
  ...

=== Tables ===
  + as_project        [created]
  + as_vendor         [created]
  ...

=== Columns ===
  + as_project.as_code   [String]
  + as_project.as_client [String]
  ...

=== Relationships ===
  + as_project_boqitem    [as_project 1→N as_boqitem]
  ...
```

Allow ~3–5 minutes total. Most time is spent on column creation.

## After it finishes

1. Open <https://make.powerapps.com> → your environment → **Tables**.
2. Confirm you see `as_project`, `as_vendor`, `as_boqitem`, `as_quotation`, `as_projectvendor`.
3. Switch to the **Solutions** view and either:
   - Create a new unmanaged solution and add the existing components to it (so
     you can export later), or
   - Continue working from the default solution.
4. Follow §5 onwards of `docs/POWER_APP_Build_Guide.md` for rollup columns,
   flows, forms, views and the app shell.
5. Bulk-load your KU Mingalar data using `docs/PowerApp_Import_Templates/`.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `Failed to get access token via 'az'` | Not logged in | Run `az login` first |
| `401 Unauthorized` | Token for wrong tenant | `az logout`, then `az login --tenant <tenant>` |
| `403 Forbidden` | User not a System Customizer in env | Ask an admin to grant the role in <https://admin.powerplatform.microsoft.com> |
| `An attribute already exists` | Re-run after manual change | Script tolerates this — that column is just skipped |
| Hung on column creation | Throttling | Wait 60s, re-run; script resumes where it stopped |

## Modifying the schema

Edit `dataverse-schema.json` and re-run the script. New choices / tables /
columns / relationships will be added. **The script does not delete or alter
existing components** — to remove something, drop it from Power Apps Studio
first.
