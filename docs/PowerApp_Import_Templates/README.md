# Power App import templates

CSVs that map onto the Dataverse table schemas defined in
[`../POWER_APP_Build_Guide.md`](../POWER_APP_Build_Guide.md). Use them
with **Dataverse → table → Import → From CSV** in Power Apps maker portal.

## Load order

Dataverse import requires lookups to resolve to existing rows, so import in
this order:

1. `as_project.csv` — projects (referenced by everything else)
2. `as_vendor.csv` — vendors
3. `as_boqitem.csv` — BOQ items (lookups to project)
4. `as_quotation.csv` — quotations (lookups to project, BOQ item, vendor)

## Lookup columns

For lookup columns the CSV must contain the **primary column value** of the
referenced row, not its GUID. Examples in these templates:

- `as_project` column in `as_boqitem.csv` holds the **project code**
  (e.g. `KU-MDY-001`), which matches `as_project.as_code`.
- `as_vendor` in `as_quotation.csv` holds the **vendor code**
  (e.g. `ALBA`), which matches `as_vendor.as_vendorcode`.
- `as_boqitem` in `as_quotation.csv` holds the **item code**
  (e.g. `1020101-001`), which matches `as_boqitem.as_itemcode`.

Power Apps' import wizard will prompt you to confirm the lookup column
mapping on first import.

## Choice columns

The numeric values match the choice value prefix `10000` recommended in the
build guide. If you used a different prefix, adjust accordingly:

| Column | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| `as_status` (project) | Planning | In progress | On hold | Completed | — |
| `as_status` (vendor) | Pending | Approved | Blacklisted | — | — |
| `as_status` (boqitem) | Pending | Under review | Awarded | Cancelled | — |
| `as_status` (quotation) | Received | Evaluated | Selected | Rejected | — |
| `as_availability` | Included | Not included | Optional | — | — |
| `as_materiallabour` | Material | Labour | Material + Labour | — | — |
| `as_currency` | MMK | USD | EUR | THB | SGD |

## Sample data

The two BOQ rows in `as_boqitem.csv` and two quotations in
`as_quotation.csv` exist so the dashboard renders something on first
import — replace or delete before loading real KU Mingalar data.
