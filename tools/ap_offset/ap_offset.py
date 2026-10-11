"""Suggest AP offsets in Acumatica: apply payments, prepayments and debit
adjustments to open bills of the same vendor.

Phase 1 (read-only). Input is two CSV exports from Acumatica (see README.md).
Output is a suggestions CSV for review and an exceptions CSV. Nothing is posted.

Usage:
    python ap_offset.py open_bills.csv open_credits.csv --out-dir output
"""
import argparse
import csv
import re
import sys
from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from itertools import combinations
from pathlib import Path

ZERO = Decimal("0")
MIN_REF_LEN = 4             # shorter references match too loosely
MAX_COMBO_BILLS = 5         # max bills in one exact-sum combination
MAX_COMBO_CANDIDATES = 20   # only the oldest N bills are tried in combinations

DATE_FORMATS = ("%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%d-%b-%Y")


@dataclass
class Bill:
    vendor: str
    ref_nbr: str
    vendor_ref: str
    doc_date: date
    due_date: date
    currency: str
    branch: str
    balance: Decimal
    po_nbr: str


@dataclass
class Credit:
    """An open payment, prepayment or debit adjustment with unapplied balance."""
    vendor: str
    doc_type: str
    ref_nbr: str
    doc_date: date
    currency: str
    branch: str
    balance: Decimal
    description: str
    po_nbr: str


@dataclass
class Suggestion:
    credit: Credit
    bill: Bill
    amount: Decimal
    rule: str
    confidence: str
    note: str = ""


@dataclass
class Exception_:
    credit: Credit
    amount: Decimal
    reason: str


def norm(text):
    return re.sub(r"[^A-Z0-9]", "", (text or "").upper())


def parse_date(text):
    text = (text or "").strip()
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            continue
    raise ValueError(f"Unrecognised date: {text!r}")


def parse_amount(text):
    try:
        return Decimal((text or "0").replace(",", "").strip())
    except InvalidOperation:
        raise ValueError(f"Unrecognised amount: {text!r}")


def read_bills(path):
    with open(path, newline="", encoding="utf-8-sig") as f:
        return [
            Bill(
                vendor=r["Vendor"].strip(),
                ref_nbr=r["RefNbr"].strip(),
                vendor_ref=r.get("VendorRef", "").strip(),
                doc_date=parse_date(r["Date"]),
                due_date=parse_date(r.get("DueDate") or r["Date"]),
                currency=r["Currency"].strip(),
                branch=r.get("Branch", "").strip(),
                balance=parse_amount(r["Balance"]),
                po_nbr=r.get("PONbr", "").strip(),
            )
            for r in csv.DictReader(f)
        ]


def read_credits(path):
    with open(path, newline="", encoding="utf-8-sig") as f:
        return [
            Credit(
                vendor=r["Vendor"].strip(),
                doc_type=r["Type"].strip(),
                ref_nbr=r["RefNbr"].strip(),
                doc_date=parse_date(r["Date"]),
                currency=r["Currency"].strip(),
                branch=r.get("Branch", "").strip(),
                balance=parse_amount(r["UnappliedBalance"]),
                description=r.get("Description", "").strip(),
                po_nbr=r.get("PONbr", "").strip(),
            )
            for r in csv.DictReader(f)
        ]


def referenced_bills(credit, candidates):
    """Bills whose PO, vendor ref or bill number appears on the credit."""
    text = norm(credit.description)
    found = []
    for bill in candidates:
        if credit.po_nbr and norm(credit.po_nbr) == norm(bill.po_nbr):
            found.append(bill)
            continue
        for ref in (bill.vendor_ref, bill.ref_nbr):
            r = norm(ref)
            if len(r) >= MIN_REF_LEN and r in text:
                found.append(bill)
                break
    return found


def exact_combinations(amount, candidates):
    pool = sorted(candidates, key=lambda b: (b.due_date, b.ref_nbr))[:MAX_COMBO_CANDIDATES]
    matches = []
    for size in range(2, MAX_COMBO_BILLS + 1):
        for combo in combinations(pool, size):
            if sum(b.balance for b in combo) == amount:
                matches.append(combo)
                if len(matches) > 1:
                    return matches
    return matches


def apply_in_order(credit, bills, rule, confidence, note=""):
    """Apply the credit to bills oldest-due first; returns suggestions."""
    out = []
    for bill in sorted(bills, key=lambda b: (b.due_date, b.ref_nbr)):
        if credit.balance <= ZERO:
            break
        amount = min(credit.balance, bill.balance)
        if amount <= ZERO:
            continue
        bill_note = note
        if amount < bill.balance:
            bill_note = (note + "; " if note else "") + f"partial: bill balance {bill.balance}"
        out.append(Suggestion(credit, bill, amount, rule, confidence, bill_note))
        bill.balance -= amount
        credit.balance -= amount
    return out


def suggest(bills, credits, allow_fifo=False):
    suggestions, exceptions = [], []

    for credit in sorted(credits, key=lambda c: (c.doc_date, c.ref_nbr)):
        if credit.balance <= ZERO:
            continue
        candidates = [
            b for b in bills
            if b.vendor == credit.vendor
            and b.currency == credit.currency
            and (not credit.branch or not b.branch or b.branch == credit.branch)
            and b.balance > ZERO
        ]
        if not candidates:
            exceptions.append(Exception_(credit, credit.balance, "No open bills for vendor/currency/branch"))
            continue

        # 1. Reference / PO match
        refs = referenced_bills(credit, candidates)
        if refs:
            suggestions += apply_in_order(credit, refs, "R1 Reference/PO match", "High")
            if credit.balance > ZERO:
                exceptions.append(Exception_(
                    credit, credit.balance,
                    "Unapplied remainder after referenced bills (overpayment or bills missing)"))
            continue

        # 2. Exact amount, single bill
        same = [b for b in candidates if b.balance == credit.balance]
        if len(same) == 1:
            suggestions += apply_in_order(credit, same, "R2 Exact amount", "High")
            continue
        if len(same) > 1:
            oldest = min(same, key=lambda b: (b.due_date, b.ref_nbr))
            suggestions += apply_in_order(credit, [oldest], "R2 Exact amount", "Medium",
                                          f"{len(same)} bills with same amount; oldest chosen")
            continue

        # 3. Exact sum of several bills
        combos = exact_combinations(credit.balance, candidates)
        if len(combos) == 1:
            suggestions += apply_in_order(credit, combos[0], "R3 Exact combination", "Medium")
            continue
        if len(combos) > 1:
            exceptions.append(Exception_(credit, credit.balance,
                                         "Several bill combinations match the amount; needs remittance"))
            continue

        # 4. Oldest-first (opt-in)
        if allow_fifo:
            suggestions += apply_in_order(credit, candidates, "R4 Oldest due first", "Low",
                                          "no reference or amount match")
            if credit.balance > ZERO:
                exceptions.append(Exception_(credit, credit.balance,
                                             "Credit exceeds all open bills for vendor"))
        else:
            exceptions.append(Exception_(credit, credit.balance, "No reference or amount match"))

    return suggestions, exceptions


def write_outputs(suggestions, exceptions, out_dir):
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    with open(out_dir / "suggested_applications.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["Vendor", "CreditType", "CreditRefNbr", "BillRefNbr", "BillVendorRef",
                    "Currency", "AmountToApply", "Rule", "Confidence", "Note", "Approved(Y/N)"])
        for s in suggestions:
            w.writerow([s.credit.vendor, s.credit.doc_type, s.credit.ref_nbr, s.bill.ref_nbr,
                        s.bill.vendor_ref, s.credit.currency, s.amount, s.rule, s.confidence,
                        s.note, ""])
    with open(out_dir / "exceptions.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["Vendor", "CreditType", "CreditRefNbr", "Currency", "UnappliedAmount", "Reason"])
        for e in exceptions:
            w.writerow([e.credit.vendor, e.credit.doc_type, e.credit.ref_nbr,
                        e.credit.currency, e.amount, e.reason])


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument("bills_csv")
    p.add_argument("credits_csv")
    p.add_argument("--out-dir", default="output")
    p.add_argument("--allow-fifo", action="store_true",
                   help="propose oldest-due-first applications (Low confidence) when nothing matches")
    args = p.parse_args(argv)

    suggestions, exceptions = suggest(read_bills(args.bills_csv), read_credits(args.credits_csv),
                                      allow_fifo=args.allow_fifo)
    write_outputs(suggestions, exceptions, args.out_dir)
    print(f"{len(suggestions)} suggested applications, {len(exceptions)} exceptions -> {args.out_dir}/")
    return 0


if __name__ == "__main__":
    sys.exit(main())
