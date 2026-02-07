import frappe

def execute():
    # 1. Set Default Print Formats
    formats = {
        "Sales Invoice": "Thunder Sales Invoice Standard Format",
        "Quotation": "Thunder Quotation Standard Format",
        "Sales Order": "Thunder Sales Order Standard Format",
        "Purchase Order": "Thunder Purchase Order Standard Format",
        "Delivery Note": "Thunder Delivery Note Standard Format"
    }

    for dt, fmt in formats.items():
        if frappe.db.exists("Print Format", fmt):
            # Create or update Property Setter for default_print_format
            frappe.make_property_setter({
                "doctype": dt,
                "doctype_or_field": "DocType",
                "property": "default_print_format",
                "value": fmt
            })

    # 2. Set PagedJS for all "Thunder" formats and update margin
    thunder_formats = frappe.get_all("Print Format", filters={"name": ["like", "%Thunder%"]}, fields=["name", "margin_bottom"])
    
    for fmt in thunder_formats:
        update_dict = {"pdf_generator": "PagedJS"}
        if fmt.margin_bottom is not None:
             update_dict["margin_bottom"] = fmt.margin_bottom + 1
        else:
             update_dict["margin_bottom"] = 16 # Default 15 + 1
        
        frappe.db.set_value("Print Format", fmt.name, update_dict)
    
    frappe.db.commit()
