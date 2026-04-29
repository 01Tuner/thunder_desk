import frappe

def execute():
    
    reports = [
        "General Ledger",
        # Add any other report names here
    ]

    for report_name in reports:
        if frappe.db.exists("Report", report_name):
            frappe.db.set_value("Report", report_name, "add_total_row", 0)
            print(f"Updated: {report_name}")
        else:
            print(f"Not found: {report_name}")

    frappe.db.commit()
    print("Done!")