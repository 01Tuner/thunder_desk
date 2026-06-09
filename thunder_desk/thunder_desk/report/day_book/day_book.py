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
		select posting_date, voucher_type, voucher_no, account, party_type, party, against, debit, credit, remarks
		from `tabGL Entry`
		where company = %s
		  and posting_date between %s and %s
		  and is_cancelled = 0
		  {conditions}
		order by posting_date, voucher_type, voucher_no, name
		""",
		tuple(params),
		as_dict=True,
	)

	if not gl_entries:
		return []

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
		
		# Calculate total voucher debit
		voucher_debit = sum(flt(e.debit) for e in entries)
		voucher_credit = sum(flt(e.credit) for e in entries)
		
		# Tally Prime particulars logic
		particulars = get_voucher_particulars(entries)
		
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
