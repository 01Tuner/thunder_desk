import frappe
from frappe.utils import get_system_timezone

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

	if not system_settings.language:
		system_settings.language = "en"

	if not system_settings.time_zone:
		system_settings.time_zone = get_system_timezone()

	system_settings.save()

	# Accounts Settings
	accounts_settings = frappe.get_single("Accounts Settings")
	# Enable Round Tax Amount Row-wise (under Invoice and Billing tab)
	accounts_settings.round_row_wise_tax = 1
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
