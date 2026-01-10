
import frappe
import json
import os
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def setup_custom_doctypes():
    """
    Load custom DocTypes from doctypes.json in the 'custom' directory.
    """
    custom_dir = os.path.dirname(__file__)
    json_file = os.path.join(custom_dir, "doctypes.json")
    
    if not os.path.exists(json_file):
        return

    with open(json_file, "r") as f:
        doctypes = json.load(f)
        for dt_data in doctypes:
            if frappe.db.exists("DocType", dt_data["name"]):
                doc = frappe.get_doc("DocType", dt_data["name"])
                doc.update(dt_data)
                doc.save(ignore_permissions=True)
            else:
                doc = frappe.get_doc(dt_data)
                doc.insert(ignore_permissions=True)
            frappe.db.commit()

def setup_custom_fields():
    """
    Load custom fields from JSON files in the 'custom' directory.
    """
    # Create DocTypes first
    setup_custom_doctypes()

    custom_dir = os.path.dirname(__file__)
    fields = []
    # Iterate over all JSON files in the directory
    for filename in os.listdir(custom_dir):
        # Skip doctypes.json as it's handled separately
        if filename == "doctypes.json":
            continue
            
        if filename.endswith(".json"):
            json_file = os.path.join(custom_dir, filename)
            with open(json_file, "r") as f:
                current_fields = json.load(f)
                if isinstance(current_fields, list):
                    fields.extend(current_fields)

    # Filter out system fields that cause timestamp mismatches
    for field in fields:
        for key in ["modified", "creation", "modified_by", "owner", "docstatus", "name"]:
            if key in field:
                del field[key]
        
    # Group fields by doctype
    fields_by_doctype = {}
    for field in fields:
        dt = field.get("dt")
        if not dt:
            continue
        if dt not in fields_by_doctype:
            fields_by_doctype[dt] = []
        fields_by_doctype[dt].append(field)
        
    for dt, field_list in fields_by_doctype.items():
        try:
            create_custom_fields({dt: field_list}, ignore_validate=True)
            frappe.db.commit()
        except Exception as e:
            print(f"Error creating custom fields for {dt}: {e}")
            frappe.log_error(f"Error creating custom fields for {dt}: {e}")
