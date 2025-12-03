import frappe

def execute():
	frappe.reload_doc("core", "doctype", "system_settings")
	frappe.reload_doc("accounts", "doctype", "accounts_settings")
	frappe.reload_doc("core", "doctype", "currency")
	frappe.reload_doc("core", "doctype", "country")
	frappe.reload_doc("setup", "doctype", "global_defaults")

	# System Settings
	system_settings = frappe.get_single("System Settings")
	system_settings.float_precision = 2
	system_settings.currency_precision = 2
	system_settings.save()

	# Accounts Settings
	accounts_settings = frappe.get_single("Accounts Settings")
	accounts_settings.round_tax_with_row = 1
	accounts_settings.save()

	# Currency (SAR)
	if frappe.db.exists("Currency", "SAR"):
		frappe.db.set_value("Currency", "SAR", "smallest_currency_fraction_value", 0.01)

	# Country (Saudi Arabia)
	if frappe.db.exists("Country", "Saudi Arabia"):
		frappe.db.set_value("Country", "Saudi Arabia", "code", "SA")

	# Global Defaults
	global_defaults = frappe.get_single("Global Defaults")
	global_defaults.disable_rounded_total = 1
	global_defaults.save()
