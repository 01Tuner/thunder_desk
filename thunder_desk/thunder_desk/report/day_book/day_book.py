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
	allowed_types = []
	if filters.get("voucher_type"):
		allowed_types = [filters.get("voucher_type")]
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

	conditions = ""
	params = [filters.company, filters.from_date, filters.to_date]

	if allowed_types:
		conditions += " and voucher_type in ({})".format(", ".join(["%s"] * len(allowed_types)))
		params.extend(allowed_types)

	gl_entries = frappe.db.sql(
		f"""
		select gle.posting_date, gle.voucher_type, gle.voucher_no, gle.account, 
		gle.party_type, gle.party, gle.against, gle.debit, gle.credit, gle.remarks,
		acc.account_type
		from `tabGL Entry` gle
		left join `tabAccount` acc on gle.account = acc.name
		where gle.company = %s
		  and gle.posting_date between %s and %s
		  and gle.is_cancelled = 0
		  {conditions.replace('voucher_type', 'gle.voucher_type')}
		order by gle.posting_date, gle.voucher_type, gle.voucher_no, gle.name
		""",
		tuple(params),
		as_dict=True,
	)

	if not gl_entries:
		return []

	# Fetch Payment Entry payment_type for display mapping
	payment_entry_names = {e.voucher_no for e in gl_entries if e.voucher_type == "Payment Entry"}
	payment_entry_types = {}
	if payment_entry_names:
		pe_data = frappe.get_all(
			"Payment Entry",
			filters={"name": ["in", list(payment_entry_names)]},
			fields=["name", "payment_type"]
		)
		payment_entry_types = {d.name: d.payment_type for d in pe_data}

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
		
		# Calculate voucher debit/credit based on transaction type
		voucher_debit, voucher_credit = get_voucher_debit_credit(entries, voucher_type, voucher_no)
		
		# Tally Prime particulars logic
		particulars = get_voucher_particulars(entries)
		
		# Get payment entry type if applicable
		pe_type = None
		if voucher_type == "Payment Entry":
			pe_type = payment_entry_types.get(voucher_no)
		
		parent_row_id = f"{voucher_type}-{voucher_no}"
		
		# Parent row for the voucher
		parent_row = {
			"posting_date": posting_date,
			"particulars": particulars,
			"voucher_type": voucher_type,
			"voucher_no": voucher_no,
			"debit": voucher_debit,
			"credit": voucher_credit,
			"currency": company_currency,
			"indent": 0,
			"row_id": parent_row_id,
			"parent_row_id": None,
			"payment_entry_type": pe_type,
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
				"voucher_no": "",
				"debit": entry.debit,
				"credit": entry.credit,
				"currency": company_currency,
				"indent": 1,
				"row_id": f"{parent_row_id}-{idx}",
				"parent_row_id": parent_row_id,
				"payment_entry_type": pe_type,
			}
			data.append(child_row)

	return data

def get_voucher_particulars(entries):
	# 1. If there's a party (customer/supplier), use the party
	for entry in entries:
		if entry.party:
			return entry.party
			
	# 2. Otherwise use the opposing account (against)
	for entry in entries:
		if entry.against:
			return entry.against
			
	# 3. Default to the first account name
	return entries[0].account if entries else ""


def get_voucher_debit_credit(entries, voucher_type, voucher_no):
	if voucher_type == "Sales Invoice":
		filtered_entries = [e for e in entries if e.get("account_type") not in ("Stock", "Cost of Goods Sold", "Stock Adjustment")]
		amount = max(sum(flt(e.debit) for e in filtered_entries), sum(flt(e.credit) for e in filtered_entries))
		return amount, 0.0
	elif voucher_type == "Purchase Invoice":
		filtered_entries = [e for e in entries if e.get("account_type") not in ("Stock", "Stock Received But Not Billed", "Stock Adjustment")]
		amount = max(sum(flt(e.debit) for e in filtered_entries), sum(flt(e.credit) for e in filtered_entries))
		return 0.0, amount

	# Calculate total debit and credit of the voucher
	total_debit = sum(flt(e.debit) for e in entries)
	total_credit = sum(flt(e.credit) for e in entries)
	amount = max(total_debit, total_credit)
	
	if voucher_type == "Delivery Note":
		doc_amount = frappe.db.get_value("Delivery Note", voucher_no, "base_grand_total")
		return flt(doc_amount) or amount, 0.0
	elif voucher_type == "Purchase Receipt":
		doc_amount = frappe.db.get_value("Purchase Receipt", voucher_no, "base_grand_total")
		return 0.0, flt(doc_amount) or amount
	elif voucher_type == "Stock Entry":
		return amount, 0.0
	elif voucher_type == "Stock Reconciliation":
		return amount, 0.0
	elif voucher_type in ("Payment Entry", "Journal Entry"):
		# Check if any entry has a party:
		has_customer = False
		has_supplier = False
		customer_credit = 0.0
		supplier_debit = 0.0
		
		for e in entries:
			if e.party_type == "Customer":
				has_customer = True
				customer_credit += flt(e.credit)
			elif e.party_type == "Supplier":
				has_supplier = True
				supplier_debit += flt(e.debit)
				
		if has_customer and customer_credit > 0:
			return amount, 0.0
		elif has_supplier and supplier_debit > 0:
			return 0.0, amount
			
		# Check Cash/Bank accounts
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
				return amount, 0.0
			elif cb_credit > cb_debit:
				return 0.0, amount
				
	return amount, 0.0
