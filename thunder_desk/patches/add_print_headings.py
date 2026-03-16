import frappe

def execute():
    """
    Check if Print Headings exist and insert them with Arabic translations 
    in the description field. If they exist but lack description, update them.
    """
    headings_to_update = [
        {"print_heading": "Tax Invoice", "description": "فاتورة ضريبية"},
        {"print_heading": "Simplified Tax Invoice", "description": "فاتورة ضريبية مبسطة"},
        {"print_heading": "Credit Note", "description": "إشعار دائن"},
        {"print_heading": "Simplified Credit Note", "description": "إشعار دائن مبسط"},
        {"print_heading": "Debit Note", "description": "إشعار مدين"},
        {"print_heading": "Simplified Debit Note", "description": "إشعار مدين مبسط"}
    ]

    for heading in headings_to_update:
        if not frappe.db.exists("Print Heading", heading["print_heading"]):
            frappe.get_doc({
                "doctype": "Print Heading",
                "print_heading": heading["print_heading"],
                "description": heading["description"]
            }).insert(ignore_permissions=True)
        else:
            # Update description if it already exists but might be empty or different
            doc = frappe.get_doc("Print Heading", heading["print_heading"])
            if not doc.description:
                doc.description = heading["description"]
                doc.save(ignore_permissions=True)
