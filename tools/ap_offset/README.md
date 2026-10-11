# AP Offset Suggester – Phase 1 (read-only)

This tool suggests how to apply open **payments, prepayments and debit adjustments** to open **bills** for the same vendor in Acumatica. It reads two CSV exports and writes two CSV files for review. **It never posts anything to Acumatica.**

See the SOP: [`../../ap/AP-Offset-Agent.md`](../../ap/AP-Offset-Agent.md).

## 1. Export the data from Acumatica

Create two Generic Inquiries, or use Excel exports, with these column captions. The column order does not matter.

**open_bills.csv** – released AP bills with an open balance, not on hold
`Vendor, RefNbr, VendorRef, Date, DueDate, Currency, Branch, Balance, PONbr`

**open_credits.csv** – AP payments, prepayments and debit adjustments with an unapplied balance
`Vendor, Type, RefNbr, Date, Currency, Branch, UnappliedBalance, Description, PONbr`

`Description` should hold the payment reference or memo, where invoice numbers usually appear. `Branch` and `PONbr` can be left blank. Dates can be `YYYY-MM-DD`, `MM/DD/YYYY`, `DD/MM/YYYY` or `DD-Mon-YYYY`.

> Because `MM/DD/YYYY` is tried before `DD/MM/YYYY`, a day-first date such as `03/04/2026` is read as 4 March, not 3 April. Export dates as `YYYY-MM-DD` to avoid this.

## 2. Run

```bash
python ap_offset.py open_bills.csv open_credits.csv --out-dir output
# optional: also suggest oldest-due-first applications when nothing matches (Low confidence)
python ap_offset.py open_bills.csv open_credits.csv --out-dir output --allow-fifo
```

You need Python 3.9 or later. No extra packages are required.

## 3. Matching rules (in order)

Bills are only considered if they have the same **vendor and currency** as the credit, and the same branch when both documents have one. A bill is never applied above its open balance.

| Rule | Logic | Confidence |
|---|---|---|
| R1 Reference/PO | The credit's description contains the bill's vendor ref or bill number, or the credit's PO number equals the bill's PO number | High |
| R2 Exact amount | One bill has exactly the credit amount. If several do, the oldest is chosen | High / Medium |
| R3 Exact combination | Exactly one combination of 2–5 bills adds up to the credit amount | Medium |
| R4 Oldest due first | Only with `--allow-fifo`: applies to the oldest bills first | Low |
| — | Anything else, plus any amount left over after R1 or R4 | Exception |

## 4. Outputs

- `suggested_applications.csv`: one row per credit and bill pair, with the rule, confidence and note, plus an empty `Approved(Y/N)` column for the reviewer.
- `exceptions.csv`: credits, or leftover amounts, that need a person to investigate.

## 5. Tests

```bash
python -m unittest -v
```

## Known limits

- Reference matching looks for the normalised text (letters and digits only) of the bill's reference inside the description. References shorter than 4 characters are ignored. A short numeric reference could still match by chance inside a longer number, so check R1 rows where the vendor ref is short.
- Only the 20 oldest bills per vendor are tried for combinations (R3).
- This tool does not use AI. Reading remittance PDFs and emails is phase 3 in the SOP.
