import frappe
from frappe.model import document


@frappe.whitelist()
def get_doc_with_dashboard_menu(doctype, name=None, **kwargs):
    """
    Override get_doc to include dashboard menu context
    This replaces the traditional ERPNext header with dashboard menus
    """
    # Skip dashboard menu for backup and system pages
    if doctype in ['File', 'Backup'] or (name and 'backup' in name.lower()):
        # Return original document without dashboard menu modifications
        if name:
            return frappe.get_doc(doctype, name)
        else:
            return frappe.new_doc(doctype)

    # Get the original document
    if name:
        doc = frappe.get_doc(doctype, name)
    else:
        doc = frappe.new_doc(doctype)

    # Add dashboard menu context
    if hasattr(doc, 'as_dict'):
        doc_dict = doc.as_dict()
    else:
        doc_dict = {}

    # Add dashboard menu metadata
    doc_dict.update({
        '_dashboard_menu_enabled': True,
        '_dashboard_menu_context': get_dashboard_menu_context(doctype),
        '_header_replacement': 'dashboard_menu'
    })

    return doc_dict


def get_dashboard_menu_context(doctype):
    """Get module header menu context for a specific doctype"""

    # ERPNext module mapping for header context
    module_mapping = {
        # CRM
        'Customer': 'CRM',
        'Lead': 'CRM',
        'Opportunity': 'CRM',
        'Contact': 'CRM',
        'Address': 'CRM',

        # Selling
        'Quotation': 'Selling',
        'Sales Order': 'Selling',
        'Sales Invoice': 'Selling',
        'POS Invoice': 'Selling',
        'Delivery Note': 'Selling',
        'Sales Partner': 'Selling',
        'Sales Person': 'Selling',

        # Buying
        'Supplier': 'Buying',
        'Request for Quotation': 'Buying',
        'Purchase Order': 'Buying',
        'Purchase Invoice': 'Buying',
        'Purchase Receipt': 'Buying',
        'Supplier Quotation': 'Buying',

        # Stock/Inventory
        'Item': 'Stock',
        'Warehouse': 'Stock',
        'Stock Entry': 'Stock',
        'Stock Reconciliation': 'Stock',
        'Item Group': 'Stock',
        'Brand': 'Stock',

        # Accounts
        'Journal Entry': 'Accounts',
        'Payment Entry': 'Accounts',
        'Account': 'Accounts',
        'Cost Center': 'Accounts',
        'Fiscal Year': 'Accounts',
        'Budget': 'Accounts',

        # Manufacturing
        'BOM': 'Manufacturing',
        'Work Order': 'Manufacturing',
        'Production Plan': 'Manufacturing',
        'Workstation': 'Manufacturing',

        # Projects
        'Project': 'Projects',
        'Task': 'Projects',
        'Timesheet': 'Projects',
        'Project Type': 'Projects',

        # Assets
        'Asset': 'Assets',
        'Asset Category': 'Assets',
        'Asset Movement': 'Assets',

        # Support
        'Issue': 'Support',
        'Warranty Claim': 'Support',
        'Maintenance Schedule': 'Support',
        'Maintenance Visit': 'Support',

        # Setup
        'Company': 'Setup',
        'User': 'Setup',
        'Role': 'Setup',
        'Print Format': 'Setup',
        'System Settings': 'Setup',
        'Territory': 'Setup',
    }

    module = module_mapping.get(doctype, 'Setup')

    return {
        'current_module': module,
        'current_doctype': doctype,
        'refresh_enabled': True,
        'menu_items': get_module_menu_items(module)
    }


def get_module_menu_items(module):
    """Get menu items for a specific module"""

    module_items = {
        'Customer': [
            {'label': 'Customer', 'doctype': 'Customer', 'icon': 'fa fa-user'},
            {'label': 'Customer Group', 'doctype': 'Customer Group', 'icon': 'fa fa-users'},
            {'label': 'Territory', 'doctype': 'Territory', 'icon': 'fa fa-map-marker'},
            {'label': 'Address', 'doctype': 'Address', 'icon': 'fa fa-home'},
            {'label': 'Contact', 'doctype': 'Contact', 'icon': 'fa fa-phone'},
        ],
        'Selling': [
            {'label': 'Quotation', 'doctype': 'Quotation', 'icon': 'fa fa-file-text'},
            {'label': 'Sales Order', 'doctype': 'Sales Order', 'icon': 'fa fa-file-text-o'},
            {'label': 'Sales Invoice', 'doctype': 'Sales Invoice', 'icon': 'fa fa-file-invoice'},
            {'label': 'POS Invoice', 'doctype': 'POS Invoice', 'icon': 'fa fa-credit-card'},
            {'label': 'Point of Sale', 'route': '/app/point-of-sale', 'icon': 'fa fa-th'},
        ],
        'Buying': [
            {'label': 'Supplier', 'doctype': 'Supplier', 'icon': 'fa fa-truck'},
            {'label': 'Request for Quotation', 'doctype': 'Request for Quotation', 'icon': 'fa fa-file-o'},
            {'label': 'Purchase Order', 'doctype': 'Purchase Order', 'icon': 'fa fa-file-text'},
            {'label': 'Purchase Invoice', 'doctype': 'Purchase Invoice', 'icon': 'fa fa-file-invoice-dollar'},
            {'label': 'Purchase Receipt', 'doctype': 'Purchase Receipt', 'icon': 'fa fa-inbox'},
        ],
        'Stock': [
            {'label': 'Item', 'doctype': 'Item', 'icon': 'fa fa-cube'},
            {'label': 'Warehouse', 'doctype': 'Warehouse', 'icon': 'fa fa-building'},
            {'label': 'Stock Entry', 'doctype': 'Stock Entry', 'icon': 'fa fa-exchange'},
            {'label': 'Delivery Note', 'doctype': 'Delivery Note', 'icon': 'fa fa-truck'},
            {'label': 'Stock Reconciliation', 'doctype': 'Stock Reconciliation', 'icon': 'fa fa-balance-scale'},
        ],
        'Reports': [
            {'label': 'Sales Analytics', 'route': '/app/query-report/Sales%20Analytics', 'icon': 'fa fa-line-chart'},
            {'label': 'Purchase Analytics', 'route': '/app/query-report/Purchase%20Analytics', 'icon': 'fa fa-line-chart'},
            {'label': 'Stock Balance', 'route': '/app/query-report/Stock%20Balance', 'icon': 'fa fa-cubes'},
            {'label': 'Accounts Receivable', 'route': '/app/query-report/Accounts%20Receivable', 'icon': 'fa fa-money'},
            {'label': 'General Ledger', 'route': '/app/query-report/General%20Ledger', 'icon': 'fa fa-book'},
        ],
        'Setup': [
            {'label': 'Company', 'doctype': 'Company', 'icon': 'fa fa-building-o'},
            {'label': 'User', 'doctype': 'User', 'icon': 'fa fa-user'},
            {'label': 'Role', 'doctype': 'Role', 'icon': 'fa fa-shield'},
            {'label': 'Print Format', 'doctype': 'Print Format', 'icon': 'fa fa-print'},
            {'label': 'System Settings', 'doctype': 'System Settings', 'icon': 'fa fa-wrench'},
        ]
    }

    return module_items.get(module, [])


def on_doctype_update():
    """Hook called when doctype is updated - refresh dashboard menu"""
    frappe.publish_realtime('dashboard_menu_refresh', {
        'action': 'refresh_menu'
    })


@frappe.whitelist()
def refresh_dashboard_menu():
    """API endpoint to refresh dashboard menu"""
    return {
        'status': 'success',
        'message': 'Dashboard menu refreshed'
    }
