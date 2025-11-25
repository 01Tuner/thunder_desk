# Copyright (c) 2024, rafeeq and contributors
# For license information, please see license.txt

import frappe
from frappe import _
import json

def execute(filters=None):
	columns = get_columns(filters)
	data = get_data(filters)
	return columns, data

def get_columns(filters):
	currency = "SAR"
	if filters and filters.get("company"):
		company_currency = frappe.db.get_value("Company", filters.get("company"), "default_currency")
		if company_currency:
			currency = company_currency
	
	return [
		{
			"fieldname": "title",
			"label": _("Title"),
			"fieldtype": "Data",
			"width": 300
		},
		{
			"fieldname": "amount",
			"label": _("Amount ({0})".format(currency)),
			"fieldtype": "Currency",
			"width": 150
		},
		{
			"fieldname": "adjustment",
			"label": _("Adjustment ({0})".format(currency)),
			"fieldtype": "Currency",
			"width": 150
		},
		{
			"fieldname": "vat_amount",
			"label": _("VAT Amount ({0})".format(currency)),
			"fieldtype": "Currency",
			"width": 150
		}
	]

def get_data(filters):
	data = []
	
	# Get Sales Data
	sales_data = get_sales_data(filters)
	
	# Add VAT on Sales header
	data.append({
		"title": _("VAT on Sales"),
		"amount": 0.0,
		"adjustment": 0.0,
		"vat_amount": 0.0,
		"indent": 0
	})
	
	# Add sales categories
	sales_total_amount = 0.0
	sales_total_adjustment = 0.0
	sales_total_vat = 0.0
	
	for row in sales_data:
		data.append(row)
		sales_total_amount += row.get("amount", 0.0)
		sales_total_adjustment += row.get("adjustment", 0.0)
		sales_total_vat += row.get("vat_amount", 0.0)
	
	# Add sales grand total
	data.append({
		"title": _("Grand Total"),
		"amount": sales_total_amount,
		"adjustment": sales_total_adjustment,
		"vat_amount": sales_total_vat,
		"indent": 0,
		"bold": 1
	})
	
	# Add empty row
	data.append({
		"title": "",
		"amount": 0.0,
		"adjustment": 0.0,
		"vat_amount": 0.0
	})
	
	# Get Purchase Data
	purchase_data = get_purchase_data(filters)
	
	# Add VAT on Purchases header
	data.append({
		"title": _("VAT on Purchases"),
		"amount": 0.0,
		"adjustment": 0.0,
		"vat_amount": 0.0,
		"indent": 0
	})
	
	# Add purchase categories
	purchase_total_amount = 0.0
	purchase_total_adjustment = 0.0
	purchase_total_vat = 0.0
	
	for row in purchase_data:
		data.append(row)
		purchase_total_amount += row.get("amount", 0.0)
		purchase_total_adjustment += row.get("adjustment", 0.0)
		purchase_total_vat += row.get("vat_amount", 0.0)
	
	# Add purchase grand total
	data.append({
		"title": _("Grand Total"),
		"amount": purchase_total_amount,
		"adjustment": purchase_total_adjustment,
		"vat_amount": purchase_total_vat,
		"indent": 0,
		"bold": 1
	})
	
	# Add empty row
	data.append({
		"title": "",
		"amount": 0.0,
		"adjustment": 0.0,
		"vat_amount": 0.0
	})
	
	# Add VAT Payable Amount
	vat_payable = sales_total_vat - purchase_total_vat
	data.append({
		"title": _("VAT Payable Amount"),    
		"amount": 0.0,
		"adjustment": 0.0,
		"vat_amount": vat_payable,
		"indent": 0,
		"bold": 1
	})
	
	return data

def get_sales_data(filters):
	"""Get sales data grouped by ZATCA category"""
	conditions = get_conditions(filters)
	
	invoices = frappe.get_all("Sales Invoice", 
		filters=conditions, 
		fields=["name"]
	)
	
	invoice_names = [inv.name for inv in invoices]
	
	if not invoice_names:
		return get_empty_sales_categories()
	
	# Fetch items with ZATCA categories
	items = frappe.db.sql("""
		SELECT 
			si_item.parent,
			si_item.item_code,
			si_item.amount,
			si_item.item_tax_template,
			COALESCE(itt.custom_zatca_item_tax_category, 'Standard rate') as zatca_category
		FROM 
			`tabSales Invoice Item` si_item
		LEFT JOIN
			`tabItem Tax Template` itt ON si_item.item_tax_template = itt.name
		WHERE 
			si_item.parent IN %s
	""", (tuple(invoice_names),), as_dict=1)
	
	# Fetch taxes
	taxes = frappe.db.sql("""
		SELECT 
			st.parent,
			st.item_wise_tax_detail
		FROM 
			`tabSales Taxes and Charges` st
		WHERE 
			st.parent IN %s
			AND st.item_wise_tax_detail IS NOT NULL
	""", (tuple(invoice_names),), as_dict=1)
	
	# Process data
	category_totals = {
		"Standard Rated Sales": {"amount": 0.0, "vat": 0.0},
		"Zero Rated Domestic Sales": {"amount": 0.0, "vat": 0.0},
		"Exempted Sales": {"amount": 0.0, "vat": 0.0},
		"Export": {"amount": 0.0, "vat": 0.0}
	}
	
	# Build tax lookup
	tax_lookup = {}
	for tax in taxes:
		if tax.item_wise_tax_detail:
			try:
				tax_detail = json.loads(tax.item_wise_tax_detail)
				tax_lookup[tax.parent] = tax_detail
			except:
				pass
	
	# Calculate totals by item
	invoice_item_totals = {}
	for item in items:
		key = (item.parent, item.item_code)
		if key not in invoice_item_totals:
			invoice_item_totals[key] = 0.0
		invoice_item_totals[key] += item.amount
	
	# Process items
	for item in items:
		category_key = map_zatca_to_sales_category(item.zatca_category)
		
		if category_key in category_totals:
			category_totals[category_key]["amount"] += item.amount
			
			# Calculate tax
			if item.item_code and item.parent in tax_lookup:
				tax_detail = tax_lookup[item.parent]
				if item.item_code in tax_detail:
					total_tax_for_item = tax_detail[item.item_code][1]
					total_item_amount = invoice_item_totals.get((item.parent, item.item_code), 0.0)
					if total_item_amount > 0:
						ratio = item.amount / total_item_amount
						category_totals[category_key]["vat"] += total_tax_for_item * ratio
	
	# Build result
	result = []
	for category in ["Standard Rated Sales", "Zero Rated Domestic Sales", "Exempted Sales", "Export"]:
		result.append({
			"title": _(category),
			"amount": category_totals[category]["amount"],
			"adjustment": 0.0,
			"vat_amount": category_totals[category]["vat"],
			"indent": 1
		})
	
	return result

def get_purchase_data(filters):
	"""Get purchase data grouped by ZATCA category"""
	conditions = get_purchase_conditions(filters)
	
	invoices = frappe.get_all("Purchase Invoice", 
		filters=conditions, 
		fields=["name"]
	)
	
	invoice_names = [inv.name for inv in invoices]
	
	if not invoice_names:
		return get_empty_purchase_categories()
	
	# Fetch items with ZATCA categories
	items = frappe.db.sql("""
		SELECT 
			pi_item.parent,
			pi_item.item_code,
			pi_item.amount,
			pi_item.item_tax_template,
			COALESCE(itt.custom_zatca_item_tax_category, 'Standard rate') as zatca_category
		FROM 
			`tabPurchase Invoice Item` pi_item
		LEFT JOIN
			`tabItem Tax Template` itt ON pi_item.item_tax_template = itt.name
		WHERE 
			pi_item.parent IN %s
	""", (tuple(invoice_names),), as_dict=1)
	
	# Fetch taxes
	taxes = frappe.db.sql("""
		SELECT 
			pt.parent,
			pt.item_wise_tax_detail
		FROM 
			`tabPurchase Taxes and Charges` pt
		WHERE 
			pt.parent IN %s
			AND pt.item_wise_tax_detail IS NOT NULL
	""", (tuple(invoice_names),), as_dict=1)
	
	# Process data
	category_totals = {
		"Standard Rated Domestic Purchase": {"amount": 0.0, "vat": 0.0},
		"Zero Rated Purchase": {"amount": 0.0, "vat": 0.0},
		"Exempted Purchase": {"amount": 0.0, "vat": 0.0}
	}
	
	# Build tax lookup
	tax_lookup = {}
	for tax in taxes:
		if tax.item_wise_tax_detail:
			try:
				tax_detail = json.loads(tax.item_wise_tax_detail)
				tax_lookup[tax.parent] = tax_detail
			except:
				pass
	
	# Calculate totals by item
	invoice_item_totals = {}
	for item in items:
		key = (item.parent, item.item_code)
		if key not in invoice_item_totals:
			invoice_item_totals[key] = 0.0
		invoice_item_totals[key] += item.amount
	
	# Process items
	for item in items:
		category_key = map_zatca_to_purchase_category(item.zatca_category)
		
		if category_key in category_totals:
			category_totals[category_key]["amount"] += item.amount
			
			# Calculate tax
			if item.item_code and item.parent in tax_lookup:
				tax_detail = tax_lookup[item.parent]
				if item.item_code in tax_detail:
					total_tax_for_item = tax_detail[item.item_code][1]
					total_item_amount = invoice_item_totals.get((item.parent, item.item_code), 0.0)
					if total_item_amount > 0:
						ratio = item.amount / total_item_amount
						category_totals[category_key]["vat"] += total_tax_for_item * ratio
	
	# Build result
	result = []
	for category in ["Standard Rated Domestic Purchase", "Zero Rated Purchase", "Exempted Purchase"]:
		result.append({
			"title": _(category),
			"amount": category_totals[category]["amount"],
			"adjustment": 0.0,
			"vat_amount": category_totals[category]["vat"],
			"indent": 1
		})
	
	return result

def map_zatca_to_sales_category(zatca_category):
	"""Map ZATCA category to sales report category"""
	if not zatca_category or zatca_category == "Standard rate":
		return "Standard Rated Sales"
	elif "Zero rated" in zatca_category:
		if "Export" in zatca_category:
			return "Export"
		else:
			return "Zero Rated Domestic Sales"
	elif "Exempt" in zatca_category:
		return "Exempted Sales"
	else:
		return "Standard Rated Sales"

def map_zatca_to_purchase_category(zatca_category):
	"""Map ZATCA category to purchase report category"""
	if not zatca_category or zatca_category == "Standard rate":
		return "Standard Rated Domestic Purchase"
	elif "Zero rated" in zatca_category:
		return "Zero Rated Purchase"
	elif "Exempt" in zatca_category:
		return "Exempted Purchase"
	else:
		return "Standard Rated Domestic Purchase"

def get_empty_sales_categories():
	"""Return empty sales categories"""
	return [
		{"title": _("Standard Rated Sales"), "amount": 0.0, "adjustment": 0.0, "vat_amount": 0.0, "indent": 1},
		{"title": _("Zero Rated Domestic Sales"), "amount": 0.0, "adjustment": 0.0, "vat_amount": 0.0, "indent": 1},
		{"title": _("Exempted Sales"), "amount": 0.0, "adjustment": '', "vat_amount": 0.0, "indent": 1},
		{"title": _("Export"), "amount": 0.0, "adjustment": 0.0, "vat_amount": 0.0, "indent": 1}
	]

def get_empty_purchase_categories():
	"""Return empty purchase categories"""
	return [
		{"title": _("Standard Rated Domestic Purchase"), "amount": 0.0, "adjustment": 0.0, "vat_amount": 0.0, "indent": 1},
		{"title": _("Zero Rated Purchase"), "amount": 0.0, "adjustment": 0.0, "vat_amount": 0.0, "indent": 1},
		{"title": _("Exempted Purchase"), "amount": 0.0, "adjustment": 0.0, "vat_amount": 0.0, "indent": 1}
	]

def get_conditions(filters):
	"""Get conditions for Sales Invoice"""
	conditions = {}
	if filters.get("company"):
		conditions["company"] = filters["company"]
	if filters.get("from_date") and filters.get("to_date"):
		conditions["posting_date"] = ["between", [filters["from_date"], filters["to_date"]]]
	conditions["docstatus"] = 1
	return conditions

def get_purchase_conditions(filters):
	"""Get conditions for Purchase Invoice"""
	conditions = {}
	if filters.get("company"):
		conditions["company"] = filters["company"]
	if filters.get("from_date") and filters.get("to_date"):
		conditions["posting_date"] = ["between", [filters["from_date"], filters["to_date"]]]
	conditions["docstatus"] = 1
	return conditions
