#!/usr/bin/env python3
"""
Script to manually update SAR currency symbol
Run this with: bench execute thunder_desk.patches.update_sar_currency_symbol.execute
"""

import frappe

def execute():
	"""Update SAR currency symbol to use SVG image"""
	
	frappe.init(site='erpbo.site')
	frappe.connect()
	
	# Check if SAR currency exists
	if frappe.db.exists("Currency", "SAR"):
		# Update the symbol field with HTML img tag
		svg_symbol = '<img src="/assets/thunder_desk/images/Icon-SAR.svg" style="width:auto !important; height: 0.9em;">'
		
		frappe.db.set_value("Currency", "SAR", "symbol", svg_symbol)
		
		frappe.db.commit()
		
		print("✓ Updated SAR currency symbol with SVG image")
		print(f"  Symbol: {svg_symbol}")
	else:
		print("✗ SAR currency not found in the system")
		print("  Please create SAR currency first")
	
	frappe.destroy()

if __name__ == "__main__":
	execute()
