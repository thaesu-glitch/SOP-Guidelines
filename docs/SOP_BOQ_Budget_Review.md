# SOP — BOQ Budget Review

**Document owner:** Finance & Internal Control
**Applies to:** All projects with a Bill of Quantities (BOQ) cost structure.

## 1. Purpose

To establish a controlled process for preparing, reviewing and approving a
project's Bill of Quantities so that procurement and award decisions are
made against an authorised baseline budget.

## 2. Scope

Applies from project kickoff through to award of the last BOQ line item.
Covers all civil, MEP, finishes, FF&E and equipment line items.

## 3. Roles & Responsibilities

| Role | Responsibility |
|---|---|
| Project Manager | Prepares draft BOQ, validates quantities |
| QS / Cost Engineer | Validates unit rates and total budget |
| Procurement | Confirms market alignment of budgeted rates |
| Finance Controller | Reviews against project budget envelope |
| Department Head | Approves the BOQ baseline |

## 4. Procedure

1. **Draft BOQ preparation.** PM enters each line item in the *Projects → BOQ*
   tab: section, item code, description, unit, quantity, budgeted unit rate.
   The system computes the budgeted total automatically.
2. **Internal QS review.** QS verifies quantities against drawings and unit
   rates against the cost database; flags variances >5% in *Remarks*.
3. **Procurement sanity check.** Procurement confirms market rates and
   updates the unit rate where required (changes are logged on the line).
4. **Budget envelope check.** Finance Controller compares the sum of
   budgeted totals against the project budget on the project card. A
   variance ≥0% must be justified before approval.
5. **Approval.** Department Head sets the project status to `in_progress`
   to indicate the BOQ baseline is approved and procurement may commence.
6. **Change control.** Any post-approval edit to a BOQ line must reference
   an approved Variation Order ID in the *Remarks* field.

## 5. Controls

- BOQ lines cannot be deleted once a quotation has been linked, except via
  the *Delete* action which cascades and is logged.
- *Awarded total* is system-computed from the selected quotation; it cannot
  be manually overridden.
- Variance (awarded − budgeted) is displayed on the project page and the
  dashboard. Lines with variance >10% require Finance sign-off in *Remarks*.

## 6. Records

All BOQ lines, edits and awards are stored in the `boq_items` table
(`web-app/server/data/sop.db`). Export available via the API endpoint
`GET /api/boq?project_id={id}`.
