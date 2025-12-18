
import frappe
import requests

@frappe.whitelist()
def get_arabic_translation(text):
	if not text:
		return ""
	
	try:
		url = "https://translate.googleapis.com/translate_a/single"
		params = {
			"client": "gtx",
			"sl": "auto",
			"tl": "ar",
			"dt": "t",
			"q": text
		}
		response = requests.get(url, params=params)
		if response.status_code == 200:
			result = response.json()
			# Result format: [[['translated_text', 'original_text', ...], ...], ...]
			if result and result[0] and result[0][0] and result[0][0][0]:
				return result[0][0][0]
	except Exception as e:
		frappe.log_error(message=str(e), title="Thunder Desk Translation Error")
	
	return ""

	return ""

def update_item_selling_price(doc, method=None):
	"""
	Update Item Price based on Purchase Invoice details.
	Handles both Selling and Buying price updates.
	"""
	if not (doc.update_selling_price or doc.get("update_buying_price")):
		return

	from frappe import _

	# 1. Handle Selling Price
	if doc.update_selling_price:
		standard_selling_price_list = frappe.db.get_value("Price List", {"name": _("Standard Selling")}, "name") or "Standard Selling"
		
		for item in doc.items:
			if item.selling_price > 0:
				update_price_list_rate(item.item_code, item.item_name, standard_selling_price_list, item.selling_price, doc.currency, selling=1)

	# 2. Handle Buying Price
	if doc.get("update_buying_price"):
		standard_buying_price_list = frappe.db.get_value("Price List", {"name": _("Standard Buying")}, "name") or "Standard Buying"
		
		for item in doc.items:
			if item.rate > 0:
				update_price_list_rate(item.item_code, item.item_name, standard_buying_price_list, item.rate, doc.currency, buying=1)

def update_price_list_rate(item_code, item_name, price_list, rate, currency, selling=0, buying=0):
	"""Helper to update or create Item Price"""
	item_price_name = frappe.db.get_value("Item Price", {
		"item_code": item_code,
		"price_list": price_list,
        "selling": selling,
        "buying": buying
	})

	if item_price_name:
		frappe.db.set_value("Item Price", item_price_name, "price_list_rate", rate)
	else:
		ip = frappe.get_doc({
			"doctype": "Item Price",
			"item_code": item_code,
			"item_name": item_name,
			"price_list": price_list,
            "selling": selling,
            "buying": buying,
			"price_list_rate": rate,
			"currency": currency
		})
		ip.insert(ignore_permissions=True)
