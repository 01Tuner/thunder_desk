import frappe

def execute():
	# Update pdf_generator options to include PagedJS
	frappe.make_property_setter({
		"doctype": "Print Format",
		"doctype_or_field": "DocField",
		"fieldname": "pdf_generator",
		"property": "options",
		"value": "wkhtmltopdf\nPagedJS",
		"is_system_generated": 0
	}, validate_fields_for_doctype=False)
	print("PagedJS option added to Print Format")