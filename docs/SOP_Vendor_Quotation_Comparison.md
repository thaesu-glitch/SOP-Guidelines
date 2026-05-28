# SOP — Vendor Quotation Comparison

**Document owner:** Procurement, with Finance & Internal Control oversight.
**Applies to:** All quotations received against approved BOQ line items.

## 1. Purpose

To ensure each BOQ line is awarded based on a documented, comparable and
auditable evaluation of vendor quotations.

## 2. Minimum Quotations Required

| Estimated value (USD) | Minimum quotations |
|---|---|
| < 5,000 | 1 (with justification) |
| 5,000 – 25,000 | 2 |
| > 25,000 | 3 |

Single-source procurement must be justified in *Remarks* and signed off by
Finance Controller before award.

## 3. Procedure

1. **Request quotations.** Procurement issues RFQs to vendors registered
   in the Vendor master. RFQs to vendors not yet *approved* require
   parallel onboarding (see *SOP — Approved Vendor Management*).
2. **Capture in system.** On *Projects → Quotations tab*, select the BOQ
   line and add each quotation: vendor, quoted unit rate, quote date,
   validity, payment terms, lead time. The system computes quoted total
   from the BOQ quantity.
3. **Comparison.** The quotation table shows, for each quote:
   - **vs Budget** — quoted total minus budgeted total
   - **vs Lowest** — gap to the cheapest quote received
   - Vendor approval status (only *approved* vendors may be awarded)
4. **Evaluation.** Procurement scores vendors on price, lead time,
   payment terms and technical compliance. Findings recorded in *Remarks*.
5. **Award.** Click *Award* on the selected quotation. The system:
   - sets the quotation status to `selected`,
   - sets all other quotations on that line to `rejected`,
   - copies the awarded unit rate and total to the BOQ line,
   - marks the BOQ line `awarded`,
   - inserts/updates the vendor in the `project_vendors` register so the
     approved-vendor dashboard reflects the contract.
6. **Variance check.** If the awarded total exceeds the budgeted total by
   >10%, Finance Controller co-signs the award (logged in *Remarks*).

## 4. Controls

- Only *approved* vendors are eligible for award. The system shows
  "Approve vendor first" for any non-approved vendor on a quotation.
- Awarding cannot be reversed without a separate variation entry; deleting
  a quotation that is `selected` requires Procurement Head approval.
- All quotation totals are derived from BOQ quantity × quoted unit rate;
  manual override is not permitted.

## 5. Records

Quotations are stored in the `quotations` table. Audit trail of awards is
captured via the change in `boq_items.awarded_vendor_id`,
`boq_items.awarded_total` and the entries in `project_vendors`.
