# Copyright (c) 2026, Muhammed Rafeeq and Contributors
# License: GNU General Public License v3. See license.txt

import frappe
from frappe import _
from frappe.utils import flt
import erpnext
from erpnext.accounts.report.trial_balance.trial_balance import (
	validate_filters,
	get_opening_balances,
	calculate_values,
	accumulate_values_into_parents,
	prepare_data,
	filter_out_zero_value_rows,
)
from erpnext.accounts.report.financial_statements import filter_accounts

def execute(filters=None):
	if not filters:
		filters = frappe._dict()

	# Set default values for hidden filters
	filters.setdefault("show_net_values", 1)
	filters.setdefault("show_group_accounts", 1)
	filters.setdefault("with_period_closing_entry_for_current_period", 1)
	filters.setdefault("with_period_closing_entry_for_opening", 1)
	filters.setdefault("include_default_book_entries", 1)
	filters.setdefault("show_zero_values", 1)

	from erpnext.accounts.utils import get_fiscal_year
	if not filters.get("fiscal_year"):
		reference_date = filters.get("to_date") or frappe.utils.today()
		filters.fiscal_year = get_fiscal_year(reference_date, company=filters.company)[0]

	validate_filters(filters)
	data = get_data(filters)
	columns = get_columns()
	return columns, data


def get_columns():
	return [
		{
			"fieldname": "account",
			"label": _("Account"),
			"fieldtype": "Link",
			"options": "Account",
			"width": 300,
		},
		{
			"fieldname": "currency",
			"label": _("Currency"),
			"fieldtype": "Link",
			"options": "Currency",
			"hidden": 1,
		},
		{
			"fieldname": "opening",
			"label": _("Opening"),
			"fieldtype": "Currency",
			"options": "currency",
			"width": 120,
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
			"fieldname": "balance",
			"label": _("Balance"),
			"fieldtype": "Currency",
			"options": "currency",
			"width": 120,
		},
	]


def get_data(filters):
	accounts = frappe.db.sql(
		"""
		select name, account_number, parent_account, account_name, root_type, report_type, is_group, lft, rgt
		from `tabAccount`
		where company = %s
		  and account_type in ('Cash', 'Bank')
		order by lft
		""",
		filters.company,
		as_dict=True,
	)

	if not accounts:
		return None

	account_names = {a.name for a in accounts}
	for a in accounts:
		if a.parent_account not in account_names:
			a.parent_account = None

	company_currency = filters.presentation_currency or erpnext.get_company_currency(filters.company)
	ignore_is_opening = frappe.db.get_single_value(
		"Accounts Settings", "ignore_is_opening_check_for_reporting"
	)

	accounts, accounts_by_name, parent_children_map = filter_accounts(accounts)

	gl_entries_by_account = {}

	opening_balances = get_opening_balances(filters, ignore_is_opening)

	from erpnext.accounts.report.financial_statements import set_gl_entries_by_account
	set_gl_entries_by_account(
		filters.company,
		filters.from_date,
		filters.to_date,
		filters,
		gl_entries_by_account,
		root_lft=None,
		root_rgt=None,
		ignore_closing_entries=not flt(filters.with_period_closing_entry_for_current_period),
		ignore_opening_entries=True,
		group_by_account=True,
	)

	calculate_values(
		accounts,
		gl_entries_by_account,
		opening_balances,
		filters.get("show_net_values"),
		ignore_is_opening=ignore_is_opening,
	)
	accumulate_values_into_parents(accounts, accounts_by_name)

	data = prepare_data(accounts, filters, parent_children_map, company_currency)
	data = filter_out_zero_value_rows(
		data, parent_children_map, show_zero_values=filters.get("show_zero_values")
	)

	final_data = []
	for row in data:
		if row and row.get("account") != "'Total'":
			row["opening"] = flt(row.get("opening_debit", 0.0)) - flt(row.get("opening_credit", 0.0))
			row["balance"] = flt(row.get("closing_debit", 0.0)) - flt(row.get("closing_credit", 0.0))
			final_data.append(row)

	return final_data
