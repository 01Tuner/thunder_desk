
import frappe
import json
import os
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def setup_custom_fields():
    """
    Load custom fields from JSON files in the 'custom' directory.
    """
    custom_dir = os.path.dirname(__file__)
    json_file = os.path.join(custom_dir, "purchase_invoice.json")
    
    if os.path.exists(json_file):
        with open(json_file, "r") as f:
            fields = json.load(f)

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
            
        # Create fields
        for dt, field_list in fields_by_doctype.items():
            create_custom_fields({dt: field_list})
            frappe.db.commit()
