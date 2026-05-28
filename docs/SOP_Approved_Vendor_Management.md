# SOP — Approved Vendor Management

**Document owner:** Finance & Internal Control with Procurement.
**Applies to:** All vendors transacting with the company.

## 1. Purpose

To maintain a controlled master list of approved vendors and ensure
visibility of vendor exposure across all projects.

## 2. Vendor Lifecycle

```
   pending  →  approved  →  (optionally) blacklisted
                  ↓
               awarded contracts (project_vendors)
```

## 3. Onboarding

1. Procurement creates the vendor in *Vendors → + New vendor* with status
   `pending`. Mandatory fields: code, name, category, contact, registration
   no., tax ID.
2. Finance reviews KYC documents (trade licence, tax registration, bank
   details) and any conflict-of-interest declarations.
3. Approver clicks *Approve* on the vendor row. The system stamps
   `approved_date` and `approved_by` (recorded from the prompt).

## 4. Eligibility for Award

- A vendor must be `approved` to be selected for award against any BOQ
  line (enforced in the Quotation Comparison workflow).
- Vendors moved to `blacklisted` retain their history but cannot receive
  new awards.

## 5. Cross-Project Visibility

The *Approved Vendor Matrix* page displays a vendor × project grid of
contract values, populated from awards. Use it to:

- monitor vendor concentration risk (one vendor on many projects),
- track total exposure to any one vendor,
- spot category gaps (categories with no approved vendor).

The dashboard also shows top vendors by total contract value and spend
broken down by vendor category.

## 6. Periodic Review

- **Quarterly:** Finance Controller reviews top-10 vendors by exposure
  against KYC validity.
- **Annually:** Procurement re-validates approved vendors; vendors with
  no activity in 24 months are moved to `pending` for re-confirmation.

## 7. Controls

- The `vendor_code` is unique and immutable once awards exist.
- Approval is a single recorded action (`POST /api/vendors/:id/approve`).
- Deleting a vendor cascades to quotations and project_vendors; reserve
  this for genuine duplicates only — otherwise use `blacklisted`.

## 8. Records

Vendors are stored in the `vendors` table; their project linkage and
contract values live in `project_vendors`. The matrix is exposed at
`GET /api/dashboard/vendor-matrix`.
