import frappe
from frappe.model.document import Document
from frappe.utils import cstr
import json

class BarcodePrint(Document):
	def validate(self):
		# Ensure items table has at least one row with a barcode
		if not self.items_table or len(self.items_table) == 0:
			frappe.throw("Add at least one item/barcode to print.")

		invalid_rows = [r for r in self.items_table if not getattr(r, "barcode", None)]
		if invalid_rows:
			frappe.throw("All rows must have a barcode.")

		# Set barcode data for printing
		self.set_barcode_data()

	def set_barcode_data(self):
		"""Aggregate barcode values from table into hidden list for convenience"""
		barcodes = [r.barcode for r in (self.items_table or []) if getattr(r, "barcode", None)]
		self.barcode_list = json.dumps(barcodes)

	def populate_items_table(self):
		"""No-op: item selection moved to items_table; retain for compatibility"""
		return



@frappe.whitelist()
def get_item_barcodes(item_code):
	"""Get all barcodes for an item"""
	if not item_code:
		return []

	item = frappe.get_doc("Item", item_code)
	barcodes = []

	if hasattr(item, 'barcodes') and item.barcodes:
		for barcode in item.barcodes:
			barcodes.append({
				"barcode": barcode.barcode,
				"type": barcode.barcode_type or "CODE128",
				"uom": barcode.uom
			})

	return barcodes

@frappe.whitelist()
def get_item_barcode_preview(item_code):
	"""Get barcode preview data for the UI"""
	if not item_code:
		return {"has_barcodes": False, "barcode_count": 0, "barcodes": []}

	try:
		item = frappe.get_doc("Item", item_code)
		barcodes = get_item_barcodes(item_code)

		return {
			"has_barcodes": len(barcodes) > 0,
			"barcode_count": len(barcodes),
			"barcodes": barcodes,
			"item_name": item.item_name,
			"item_code": item.item_code
		}
	except Exception as e:
		frappe.log_error(f"Error getting barcode preview for {item_code}: {str(e)}")
		return {"has_barcodes": False, "barcode_count": 0, "barcodes": []}

@frappe.whitelist()
def generate_barcode_print(item_code, quantity=1, settings=None):
	"""Generate barcode print document for one item, expanding its barcodes into rows"""
	if not item_code:
		frappe.throw("Item Code is required")

	if settings:
		settings = json.loads(settings)
	else:
		settings = {}

	item = frappe.get_doc("Item", item_code)
	barcodes = get_item_barcodes(item_code)
	if not barcodes:
		frappe.throw("Selected item has no barcodes.")

	doc = frappe.get_doc({
		"doctype": "Barcode Print",
		"quantity": quantity,
		"printer_type": settings.get("printer_type", "POS"),
		"print_barcode_only": settings.get("print_barcode_only", 0),
		"print_price": settings.get("print_price", 1),
		"print_item_name": settings.get("print_item_name", 1),
		"layout": settings.get("layout", "Standard"),
		"barcode_type": settings.get("barcode_type", "CODE128"),
	})

	for b in barcodes:
		row = doc.append("items_table", {})
		row.item_code = item.item_code
		row.item_name = item.item_name
		row.barcode = b.get("barcode")
		row.barcode_type = b.get("type") or "CODE128"
		row.uom = b.get("uom")
		row.quantity = quantity or 1

	doc.insert()
	return doc.name

@frappe.whitelist()
def get_item_price_with_tax(item_code, company, price_list, qty=1):
	"""Get item price including tax"""
	if not item_code or not company:
		return 0

	# Fetch Price List currency
	price_list_currency = frappe.db.get_value("Price List", price_list, "currency")
	
	args = {
		"item_code": item_code,
		"company": company,
		"price_list": price_list,
		"qty": qty,
		"doctype": "Quotation", # Dummy doctype to trigger tax calculation
		"transaction_date": frappe.utils.nowdate(),
		"currency": price_list_currency,
		"price_list_currency": price_list_currency
	}

	from erpnext.stock.get_item_details import get_item_details
	details = get_item_details(args)
	
	# If we have a valid rate, return it. 
	# get_item_details returns 'rate' which is the price list rate, 
	# and we need to apply tax on top of it if it's exclusive, 
	# or just return it if it's inclusive but we want to show the full amount.
	# Actually, get_item_details calculates 'net_rate' and 'grand_total' (if we were simulating a doc).
	# But get_item_details is for a single item row context.
	
	# Let's look at how get_item_details works. It returns 'item_tax_rate' map.
	# We need to calculate the tax amount based on that.
	
	rate = details.get("price_list_rate") or 0
	item_tax_map = json.loads(details.get("item_tax_rate") or "{}")
	
	tax_amount = 0
	
	if item_tax_map:
		for tax_type, tax_rate in item_tax_map.items():
			tax_amount += (rate * tax_rate / 100)
	else:
		# If no specific item tax, try to apply default Sales Taxes and Charges
		default_tax_template = frappe.db.get_value("Sales Taxes and Charges Template", 
			{"company": company, "is_default": 1}, "name")
			
		if default_tax_template:
			taxes = frappe.get_all("Sales Taxes and Charges", 
				filters={"parent": default_tax_template}, 
				fields=["rate", "charge_type"])
				
			for tax in taxes:
				if tax.charge_type == "On Net Total":
					tax_amount += (rate * tax.rate / 100)
				# Note: This is a simplified calculation. Complex tax rules (compounding, etc.) are not handled here.
		
	return rate + tax_amount
