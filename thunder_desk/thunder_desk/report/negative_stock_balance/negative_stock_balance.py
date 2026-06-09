# Copyright (c) 2026, Muhammed Rafeeq and Contributors
# License: GNU General Public License v3. See license.txt

import frappe
from erpnext.stock.report.stock_balance.stock_balance import execute as execute_stock_balance

def execute(filters=None):
	columns, data = execute_stock_balance(filters)
	
	# Filter only negative stock balances
	filtered_data = []
	for row in data:
		if row and row.get("bal_qty") is not None and row.get("bal_qty") < 0:
			filtered_data.append(row)
			
	return columns, filtered_data
