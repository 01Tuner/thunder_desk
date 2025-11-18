import frappe
from frappe import _

def update_item_standard_rate_from_price_list(doc, method=None):
	"""
	Update item's standard_rate when Item Price is updated for Standard Selling price list.

	Args:
		doc: The Item Price document
		method: The calling method (optional)
	"""

	# Only process selling prices
	if not doc.selling:
		return

	# Check if this is for the "Standard Selling" price list
	standard_selling_price_list = frappe.db.get_value(
		"Price List",
		{"name": _("Standard Selling")},
		"name"
	)

	if not standard_selling_price_list:
		# Fallback to direct name if translation not found
		standard_selling_price_list = "Standard Selling"

	if doc.price_list != standard_selling_price_list:
		return

	# Update the item's standard_rate
	frappe.db.set_value("Item", doc.item_code, "standard_rate", doc.price_list_rate)

	# Log the update for auditing
	frappe.logger().info(f"Updated standard_rate for Item {doc.item_code} to {doc.price_list_rate} from Item Price {doc.name}")