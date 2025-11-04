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
