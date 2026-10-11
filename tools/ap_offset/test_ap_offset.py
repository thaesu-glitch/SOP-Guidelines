import unittest
from decimal import Decimal
from pathlib import Path

from ap_offset import read_bills, read_credits, suggest

SAMPLE = Path(__file__).parent / "sample"


def run(allow_fifo=False):
    bills = read_bills(SAMPLE / "open_bills.csv")
    credits = read_credits(SAMPLE / "open_credits.csv")
    return suggest(bills, credits, allow_fifo=allow_fifo)


def by_credit(suggestions, ref):
    return [(s.bill.ref_nbr, s.amount, s.confidence) for s in suggestions if s.credit.ref_nbr == ref]


class SuggestTest(unittest.TestCase):
    def setUp(self):
        self.suggestions, self.exceptions = run()
        self.exception_refs = {e.credit.ref_nbr: e for e in self.exceptions}

    def test_payment_applied_to_referenced_bills(self):
        self.assertEqual(by_credit(self.suggestions, "PM000501"), [
            ("BL000101", Decimal("1200.00"), "High"),
            ("BL000102", Decimal("800.00"), "High"),
        ])

    def test_payment_exact_amount(self):
        self.assertEqual(by_credit(self.suggestions, "PM000502"),
                         [("BL000103", Decimal("450.00"), "High")])

    def test_prepayment_matched_by_po(self):
        self.assertEqual(by_credit(self.suggestions, "PP000601"),
                         [("BL000201", Decimal("5000.00"), "High")])

    def test_duplicate_amounts_pick_oldest_with_medium_confidence(self):
        self.assertEqual(by_credit(self.suggestions, "PM000503"),
                         [("BL000301", Decimal("300.00"), "Medium")])

    def test_single_exact_bill_preferred_over_combination(self):
        self.assertEqual(by_credit(self.suggestions, "PM000504"),
                         [("BL000403", Decimal("300.00"), "High")])

    def test_unmatched_debit_adjustment_is_exception_without_fifo(self):
        self.assertIn("AD000701", self.exception_refs)
        self.assertEqual(by_credit(self.suggestions, "AD000701"), [])

    def test_vendor_without_bills_is_exception(self):
        self.assertIn("No open bills", self.exception_refs["PM000505"].reason)

    def test_fifo_partially_applies_debit_adjustment(self):
        suggestions, _ = run(allow_fifo=True)
        self.assertEqual(by_credit(suggestions, "AD000701"),
                         [("BL000202", Decimal("250.00"), "Low")])

    def test_never_over_applies_a_bill(self):
        applied = {}
        for s in self.suggestions:
            applied[s.bill.ref_nbr] = applied.get(s.bill.ref_nbr, 0) + s.amount
        original = {b.ref_nbr: b.balance for b in read_bills(SAMPLE / "open_bills.csv")}
        for ref, amount in applied.items():
            self.assertLessEqual(amount, original[ref])


class CombinationTest(unittest.TestCase):
    def test_exact_combination(self):
        from ap_offset import Bill, Credit
        from datetime import date
        bills = [Bill("V9", f"B{i}", f"R{i}", date(2026, 9, i), date(2026, 9, i), "USD", "", Decimal(a), "")
                 for i, a in enumerate(["100", "250", "75"], start=1)]
        credit = Credit("V9", "Payment", "P1", date(2026, 10, 1), "USD", "", Decimal("175"), "", "")
        suggestions, exceptions = suggest(bills, [credit])
        self.assertEqual([(s.bill.ref_nbr, s.amount, s.confidence) for s in suggestions],
                         [("B1", Decimal("100"), "Medium"), ("B3", Decimal("75"), "Medium")])
        self.assertEqual(exceptions, [])


if __name__ == "__main__":
    unittest.main()
