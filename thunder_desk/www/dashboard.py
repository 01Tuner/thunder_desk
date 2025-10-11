import frappe
from frappe import _


def get_context(context):
    """Set context for Thunder Desk dashboard"""
    # Redirect guests to appropriate login page
    if frappe.session.user == "Guest":
        # Check if request is from Tauri app
        user_agent = frappe.request.headers.get('User-Agent', '')
        
        frappe.local.flags.redirect_location = "/login"
        raise frappe.Redirect

    # Get user info
    user = frappe.get_doc("User", frappe.session.user)

    # Define modules with their details
    modules = [
        {
            "name": "Customer",
            "title": _("Customer Management"),
            "icon": "fa fa-users",
            "color": "#3498db",
            "items": [
                {"label": _("Customer"), "doctype": "Customer", "icon": "fa fa-user"},
                {"label": _("Customer Group"), "doctype": "Customer Group", "icon": "fa fa-users"},
                {"label": _("Territory"), "doctype": "Territory", "icon": "fa fa-map-marker"},
                {"label": _("Address"), "doctype": "Address", "icon": "fa fa-home"},
                {"label": _("Contact"), "doctype": "Contact", "icon": "fa fa-phone"},
            ]
        },
        {
            "name": "Selling",
            "title": _("Sales & Selling"),
            "icon": "fa fa-shopping-cart",
            "color": "#2ecc71",
            "items": [
                {"label": _("Quotation"), "doctype": "Quotation", "icon": "fa fa-file-text"},
                {"label": _("Sales Order"), "doctype": "Sales Order", "icon": "fa fa-file-text-o"},
                {"label": _("Sales Invoice"), "doctype": "Sales Invoice", "icon": "fa fa-file"},
                {"label": _("POS Invoice"), "doctype": "POS Invoice", "icon": "fa fa-credit-card"},
                {"label": _("Point of Sale"), "route": "/app/point-of-sale", "icon": "fa fa-th"},
            ]
        },
        {
            "name": "Buying",
            "title": _("Purchase & Buying"),
            "icon": "fa fa-shopping-bag",
            "color": "#e74c3c",
            "items": [
                {"label": _("Supplier"), "doctype": "Supplier", "icon": "fa fa-truck"},
                {"label": _("Request for Quotation"), "doctype": "Request for Quotation", "icon": "fa fa-file-o"},
                {"label": _("Purchase Order"), "doctype": "Purchase Order", "icon": "fa fa-file-text"},
                {"label": _("Purchase Invoice"), "doctype": "Purchase Invoice", "icon": "fa fa-dollar"},
                {"label": _("Purchase Receipt"), "doctype": "Purchase Receipt", "icon": "fa fa-inbox"},
            ]
        },
        {
            "name": "Stock",
            "title": _("Inventory & Stock"),
            "icon": "fa fa-cubes",
            "color": "#f39c12",
            "items": [
                {"label": _("Item"), "doctype": "Item", "icon": "fa fa-cube"},
                {"label": _("Warehouse"), "doctype": "Warehouse", "icon": "fa fa-building"},
                {"label": _("Stock Entry"), "doctype": "Stock Entry", "icon": "fa fa-exchange"},
                {"label": _("Delivery Note"), "doctype": "Delivery Note", "icon": "fa fa-truck"},
                {"label": _("Stock Reconciliation"), "doctype": "Stock Reconciliation", "icon": "fa fa-balance-scale"},
            ]
        },
        {
            "name": "Reports",
            "title": _("Reports & Analytics"),
            "icon": "fa fa-bar-chart",
            "color": "#9b59b6",
            "items": [
                {"label": _("Sales Analytics"), "route": "/app/query-report/Sales%20Analytics", "icon": "fa fa-line-chart"},
                {"label": _("Purchase Analytics"), "route": "/app/query-report/Purchase%20Analytics", "icon": "fa fa-line-chart"},
                {"label": _("Stock Balance"), "route": "/app/query-report/Stock%20Balance", "icon": "fa fa-cubes"},
                {"label": _("Accounts Receivable"), "route": "/app/query-report/Accounts%20Receivable", "icon": "fa fa-money"},
                {"label": _("General Ledger"), "route": "/app/query-report/General%20Ledger", "icon": "fa fa-book"},
            ]
        },
        {
            "name": "Setup",
            "title": _("Settings & Setup"),
            "icon": "fa fa-cog",
            "color": "#34495e",
            "items": [
                {"label": _("Company"), "doctype": "Company", "icon": "fa fa-building-o"},
                {"label": _("User"), "doctype": "User", "icon": "fa fa-user"},
                {"label": _("Role"), "doctype": "Role", "icon": "fa fa-shield"},
                {"label": _("Print Format"), "doctype": "Print Format", "icon": "fa fa-print"},
                {"label": _("System Settings"), "doctype": "System Settings", "icon": "fa fa-wrench"},
            ]
        }
    ]

    # Set page context
    context.update({
        "title": _("Thunder Desk Dashboard"),
        "user_name": user.full_name or user.name,
        "modules": modules,
        "show_sidebar": False,
        "no_cache": True
    })

    return context


@frappe.whitelist()
def get_module_count(doctype):
    """Get count of documents for a module"""
    try:
        if frappe.has_permission(doctype, "read"):
            return frappe.db.count(doctype)
        return 0
    except Exception:
        return 0