# Copyright (c) 2026, Muhammed Rafeeq and Contributors
# License: GNU General Public License v3. See license.txt

import frappe
from frappe import _
from frappe.utils import flt, getdate
import erpnext

def execute(filters=None):
	validate_filters(filters)
	columns = get_columns()
	data = get_data(filters)
	return columns, data

def validate_filters(filters):
	if not filters.company:
		frappe.throw(_("Company is required"))
	if not filters.from_date:
		filters.from_date = frappe.utils.today()
	if not filters.to_date:
		filters.to_date = frappe.utils.today()
	
	if getdate(filters.from_date) > getdate(filters.to_date):
		frappe.throw(_("From Date cannot be greater than To Date"))

def get_columns():
	return [
		{
			"fieldname": "posting_date",
			"label": _("Date"),
			"fieldtype": "Date",
			"width": 130,
		},
		{
			"fieldname": "particulars",
			"label": _("Particulars"),
			"fieldtype": "Data",
			"width": 300,
		},
		{
			"fieldname": "voucher_type",
			"label": _("Voucher Type"),
			"fieldtype": "Link",
			"options": "DocType",
			"width": 150,
		},
		{
			"fieldname": "voucher_no",
			"label": _("Voucher No"),
			"fieldtype": "Dynamic Link",
			"options": "voucher_type",
			"width": 180,
		},
		{
			"fieldname": "cheque_ref_no",
			"label": _("Reference No"),
			"fieldtype": "Data",
			"width": 150,
		},
		{
			"fieldname": "debit",
			"label": _("Debit"),
			"fieldtype": "Currency",
			"options": "currency",
			"width": 120,
		},
		{
			"fieldname": "credit",
			"label": _("Credit"),
			"fieldtype": "Currency",
			"options": "currency",
			"width": 120,
		},
		{
			"fieldname": "currency",
			"label": _("Currency"),
			"fieldtype": "Link",
			"options": "Currency",
			"hidden": 1,
		},
	]

def get_data(filters):
	company_currency = erpnext.get_company_currency(filters.company)
	
	# Fetch GL entries for the date range
	conditions = ""
	params = [filters.company, filters.from_date, filters.to_date]

	if filters.get("voucher_subtype"):
		selected = filters.get("voucher_subtype")
		if selected == "Payment":
			conditions += " and gle.voucher_type = 'Payment Entry' and gle.voucher_subtype = 'Pay'"
		elif selected == "Receipt":
			conditions += " and gle.voucher_type = 'Payment Entry' and gle.voucher_subtype = 'Receive'"
		elif selected == "Contra":
			conditions += " and gle.voucher_type = 'Payment Entry' and gle.voucher_subtype = 'Internal Transfer'"
		elif selected == "Credit Note":
			conditions += " and gle.voucher_subtype = 'Credit Note'"
		elif selected == "Debit Note":
			conditions += " and gle.voucher_subtype = 'Debit Note'"
		elif selected == "Sales Invoice":
			conditions += " and gle.voucher_type = 'Sales Invoice' and (gle.voucher_subtype is null or gle.voucher_subtype = 'Sales Invoice')"
		elif selected == "Purchase Invoice":
			conditions += " and gle.voucher_type = 'Purchase Invoice' and (gle.voucher_subtype is null or gle.voucher_subtype = 'Purchase Invoice')"
		elif selected == "Sales Return":
			conditions += " and (gle.voucher_subtype = 'Sales Return' or (gle.voucher_type = 'Delivery Note' and gle.voucher_subtype = 'Sales Return'))"
		elif selected == "Purchase Return":
			conditions += " and (gle.voucher_subtype = 'Purchase Return' or (gle.voucher_type = 'Purchase Receipt' and gle.voucher_subtype = 'Purchase Return'))"
		elif selected == "Delivery Note":
			conditions += " and gle.voucher_type = 'Delivery Note' and (gle.voucher_subtype is null or gle.voucher_subtype = 'Delivery Note')"
		elif selected == "Purchase Receipt":
			conditions += " and gle.voucher_type = 'Purchase Receipt' and (gle.voucher_subtype is null or gle.voucher_subtype = 'Purchase Receipt')"
		else:
			conditions += " and (gle.voucher_subtype = %s or gle.voucher_type = %s)"
			params.extend([selected, selected])
	elif filters.get("voucher_type"):
		conditions += " and gle.voucher_type = %s"
		params.append(filters.get("voucher_type"))
	else:
		entry_type = filters.get("entry_type") or "All"
		if entry_type == "Accounting Entries":
			allowed_types = [
				"Journal Entry",
				"Payment Entry",
				"Sales Invoice",
				"Purchase Invoice",
				"Period Closing Voucher"
			]
		elif entry_type == "Inventory Entries":
			allowed_types = [
				"Stock Entry",
				"Stock Reconciliation",
				"Delivery Note",
				"Purchase Receipt",
				"Asset Depreciation Ledger",
				"Asset Value Adjustment"
			]
		else:
			allowed_types = [
				"Journal Entry",
				"Payment Entry",
				"Sales Invoice",
				"Purchase Invoice",
				"Delivery Note",
				"Purchase Receipt",
				"Stock Entry",
				"Stock Reconciliation",
				"Asset Depreciation Ledger",
				"Asset Value Adjustment",
				"Period Closing Voucher"
			]

		if allowed_types:
			conditions += " and gle.voucher_type in ({})".format(", ".join(["%s"] * len(allowed_types)))
			params.extend(allowed_types)

	gl_entries = frappe.db.sql(
		f"""
		select gle.posting_date, gle.voucher_type, gle.voucher_subtype, gle.voucher_no, gle.account, 
		gle.party_type, gle.party, gle.against, gle.debit, gle.credit, gle.remarks,
		acc.account_type
		from `tabGL Entry` gle
		left join `tabAccount` acc on gle.account = acc.name
		where gle.company = %s
		  and gle.posting_date between %s and %s
		  and gle.is_cancelled = 0
		  {conditions}
		order by gle.posting_date, gle.voucher_type, gle.voucher_no, gle.name
		""",
		tuple(params),
		as_dict=True,
	)

	if not gl_entries:
		return []

	# Map to store reference / cheque numbers for vouchers
	voucher_ref_map = {}

	# Fetch Payment Entry reference_no (cheque / reference no)
	payment_entry_names = {e.voucher_no for e in gl_entries if e.voucher_type == "Payment Entry"}
	if payment_entry_names:
		pe_data = frappe.get_all(
			"Payment Entry",
			filters={"name": ["in", list(payment_entry_names)]},
			fields=["name", "reference_no"]
		)
		for d in pe_data:
			if d.reference_no:
				voucher_ref_map[("Payment Entry", d.name)] = d.reference_no

	# Fetch Journal Entry cheque_no / bill_no
	journal_entry_names = {e.voucher_no for e in gl_entries if e.voucher_type == "Journal Entry"}
	if journal_entry_names:
		je_data = frappe.get_all(
			"Journal Entry",
			filters={"name": ["in", list(journal_entry_names)]},
			fields=["name", "cheque_no", "bill_no"]
		)
		for d in je_data:
			ref = d.cheque_no or d.bill_no
			if ref:
				voucher_ref_map[("Journal Entry", d.name)] = ref

	# Fetch Purchase Invoice bill_no (Supplier Invoice No)
	purchase_invoice_names = {e.voucher_no for e in gl_entries if e.voucher_type == "Purchase Invoice"}
	if purchase_invoice_names:
		pi_data = frappe.get_all(
			"Purchase Invoice",
			filters={"name": ["in", list(purchase_invoice_names)]},
			fields=["name", "bill_no"]
		)
		for d in pi_data:
			if d.bill_no:
				voucher_ref_map[("Purchase Invoice", d.name)] = d.bill_no

	# Fetch Sales Invoice po_no (Customer PO No)
	sales_invoice_names = {e.voucher_no for e in gl_entries if e.voucher_type == "Sales Invoice"}
	if sales_invoice_names:
		si_data = frappe.get_all(
			"Sales Invoice",
			filters={"name": ["in", list(sales_invoice_names)]},
			fields=["name", "po_no"]
		)
		for d in si_data:
			if d.po_no:
				voucher_ref_map[("Sales Invoice", d.name)] = d.po_no

	# Fetch Delivery Note lr_no / po_no
	delivery_note_names = {e.voucher_no for e in gl_entries if e.voucher_type == "Delivery Note"}
	if delivery_note_names:
		dn_data = frappe.get_all(
			"Delivery Note",
			filters={"name": ["in", list(delivery_note_names)]},
			fields=["name", "lr_no", "po_no"]
		)
		for d in dn_data:
			ref = d.lr_no or d.po_no
			if ref:
				voucher_ref_map[("Delivery Note", d.name)] = ref

	# Fetch Purchase Receipt bill_no / lr_no
	purchase_receipt_names = {e.voucher_no for e in gl_entries if e.voucher_type == "Purchase Receipt"}
	if purchase_receipt_names:
		pr_data = frappe.get_all(
			"Purchase Receipt",
			filters={"name": ["in", list(purchase_receipt_names)]},
			fields=["name", "bill_no", "lr_no"]
		)
		for d in pr_data:
			ref = d.bill_no or d.lr_no
			if ref:
				voucher_ref_map[("Purchase Receipt", d.name)] = ref

	# Group by voucher
	vouchers = {}
	for entry in gl_entries:
		key = (entry.posting_date, entry.voucher_type, entry.voucher_no)
		vouchers.setdefault(key, []).append(entry)

	data = []
	total_debit = 0.0
	total_credit = 0.0

	for key, entries in vouchers.items():
		posting_date, voucher_type, voucher_no = key
		voucher_subtype = entries[0].voucher_subtype or voucher_type
		
		# Tally Prime particulars logic
		particulars = get_voucher_particulars(entries)
		
		# Calculate voucher debit/credit based on voucher subtype and particulars
		voucher_debit, voucher_credit = get_voucher_debit_credit(entries, voucher_type, voucher_subtype, voucher_no, particulars)
		
		ref_no = voucher_ref_map.get((voucher_type, voucher_no), "")
		parent_row_id = f"{voucher_type}-{voucher_no}"
		
		# Parent row for the voucher
		parent_row = {
			"posting_date": posting_date,
			"particulars": particulars,
			"voucher_type": voucher_type,
			"voucher_subtype": voucher_subtype,
			"voucher_no": voucher_no,
			"cheque_ref_no": ref_no,
			"debit": voucher_debit,
			"credit": voucher_credit,
			"currency": company_currency,
			"indent": 0,
			"row_id": parent_row_id,
			"parent_row_id": None,
		}
		data.append(parent_row)
		
		total_debit += voucher_debit
		total_credit += voucher_credit

		# Child rows for individual GL splits
		for idx, entry in enumerate(entries):
			child_row = {
				"posting_date": posting_date,
				"particulars": entry.account,
				"voucher_type": "",
				"voucher_subtype": voucher_subtype,
				"voucher_no": "",
				"cheque_ref_no": "",
				"debit": entry.debit,
				"credit": entry.credit,
				"currency": company_currency,
				"indent": 1,
				"row_id": f"{parent_row_id}-{idx}",
				"parent_row_id": parent_row_id,
			}
			data.append(child_row)

	return data

def get_voucher_particulars(entries):
	# 1. If there's a party (customer/supplier), use the party
	for entry in entries:
		if entry.party:
			return entry.party
			
	# 2. If there are Cash/Bank accounts and non-Cash/Bank accounts, prefer the non-Cash/Bank opposing account
	# (In Tally, a Payment/Receipt voucher shows the expense/income/party ledger in Particulars, not the Bank account)
	non_cb_entries = [e for e in entries if e.get("account_type") not in ("Cash", "Bank")]
	if non_cb_entries:
		for entry in non_cb_entries:
			if entry.account:
				return entry.account

	# 3. Otherwise use the opposing account (against)
	for entry in entries:
		if entry.against:
			return entry.against
			
	# 4. Default to the first account name
	return entries[0].account if entries else ""


def get_voucher_debit_credit(entries, voucher_type, voucher_subtype, voucher_no, particulars=""):
	total_debit = sum(flt(e.debit) for e in entries)
	total_credit = sum(flt(e.credit) for e in entries)
	amount = max(total_debit, total_credit)

	if voucher_subtype == "Credit Note":
		filtered_entries = [e for e in entries if e.get("account_type") not in ("Stock", "Cost of Goods Sold", "Stock Adjustment")]
		if filtered_entries:
			amount = max(sum(flt(e.debit) for e in filtered_entries), sum(flt(e.credit) for e in filtered_entries))
		return 0.0, amount  # Credit Note / Sales Return: Customer is credited

	elif voucher_subtype == "Debit Note":
		filtered_entries = [e for e in entries if e.get("account_type") not in ("Stock", "Stock Received But Not Billed", "Stock Adjustment")]
		if filtered_entries:
			amount = max(sum(flt(e.debit) for e in filtered_entries), sum(flt(e.credit) for e in filtered_entries))
		return amount, 0.0  # Debit Note / Purchase Return: Supplier is debited

	elif voucher_type == "Sales Invoice":
		filtered_entries = [e for e in entries if e.get("account_type") not in ("Stock", "Cost of Goods Sold", "Stock Adjustment")]
		if filtered_entries:
			amount = max(sum(flt(e.debit) for e in filtered_entries), sum(flt(e.credit) for e in filtered_entries))
		return amount, 0.0  # Standard Sales Invoice: Customer is debited

	elif voucher_type == "Purchase Invoice":
		filtered_entries = [e for e in entries if e.get("account_type") not in ("Stock", "Stock Received But Not Billed", "Stock Adjustment")]
		if filtered_entries:
			amount = max(sum(flt(e.debit) for e in filtered_entries), sum(flt(e.credit) for e in filtered_entries))
		return 0.0, amount  # Standard Purchase Invoice: Supplier is credited

	elif voucher_subtype == "Pay" or (voucher_type == "Payment Entry" and voucher_subtype == "Pay"):
		# Payment: Party / Expense is debited, Bank is credited -> Debit column in Tally
		return amount, 0.0

	elif voucher_subtype == "Receive" or (voucher_type == "Payment Entry" and voucher_subtype == "Receive"):
		# Receipt: Party / Income is credited, Bank is debited -> Credit column in Tally
		return 0.0, amount

	elif voucher_subtype == "Internal Transfer" or (voucher_type == "Payment Entry" and voucher_subtype == "Internal Transfer"):
		# Contra: Check whether Particulars account was debited or credited
		for e in entries:
			if e.account == particulars:
				if flt(e.debit) > flt(e.credit):
					return amount, 0.0
				else:
					return 0.0, amount
		return amount, 0.0

	elif voucher_subtype == "Sales Return" or (voucher_type == "Delivery Note" and voucher_subtype == "Sales Return"):
		doc_amount = frappe.db.get_value("Delivery Note", voucher_no, "base_grand_total")
		return 0.0, flt(doc_amount) or amount

	elif voucher_subtype == "Purchase Return" or (voucher_type == "Purchase Receipt" and voucher_subtype == "Purchase Return"):
		doc_amount = frappe.db.get_value("Purchase Receipt", voucher_no, "base_grand_total")
		return flt(doc_amount) or amount, 0.0

	elif voucher_type == "Delivery Note":
		doc_amount = frappe.db.get_value("Delivery Note", voucher_no, "base_grand_total")
		return flt(doc_amount) or amount, 0.0

	elif voucher_type == "Purchase Receipt":
		doc_amount = frappe.db.get_value("Purchase Receipt", voucher_no, "base_grand_total")
		return 0.0, flt(doc_amount) or amount

	elif voucher_type in ("Stock Entry", "Stock Reconciliation", "Asset Depreciation Ledger", "Asset Value Adjustment", "Period Closing Voucher"):
		return amount, 0.0

	elif voucher_type == "Journal Entry":
		# In Journal Entry: Check whether the Particulars ledger / party was debited or credited
		particulars_entries = [e for e in entries if (e.party and e.party == particulars) or e.account == particulars]
		if particulars_entries:
			p_dr = sum(flt(e.debit) for e in particulars_entries)
			p_cr = sum(flt(e.credit) for e in particulars_entries)
			if p_dr > p_cr:
				return amount, 0.0
			elif p_cr > p_dr:
				return 0.0, amount

		# If there is a party in entries
		for e in entries:
			if e.party_type == "Customer":
				return (0.0, amount) if flt(e.credit) > flt(e.debit) else (amount, 0.0)
			elif e.party_type == "Supplier":
				return (amount, 0.0) if flt(e.debit) > flt(e.credit) else (0.0, amount)

		# Check Cash / Bank accounts
		accounts_in_entries = [e.account for e in entries]
		cash_bank_accounts = frappe.get_all(
			"Account",
			filters={"name": ["in", accounts_in_entries], "account_type": ["in", ["Cash", "Bank"]]},
			fields=["name"]
		)
		cash_bank_names = {a.name for a in cash_bank_accounts}
		if cash_bank_names:
			cb_debit = sum(flt(e.debit) for e in entries if e.account in cash_bank_names)
			cb_credit = sum(flt(e.credit) for e in entries if e.account in cash_bank_names)
			if cb_debit > cb_credit:
				# Cash/Bank Debited (Receipt) -> Non-cash Particulars is Credited
				return 0.0, amount
			elif cb_credit > cb_debit:
				# Cash/Bank Credited (Payment) -> Non-cash Particulars is Debited
				return amount, 0.0

	return amount, 0.0
