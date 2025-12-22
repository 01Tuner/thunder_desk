import frappe
from frappe import request


def before_request():
    """
    Handle home page routing based on request source.
    If request is from Tauri app, redirect to thunder_login only for specific scenarios.
    Otherwise, let normal Frappe behavior handle it.
    """
    # Only handle GET requests
    if request.method != 'GET':
        return

    # Skip if user is already logged in and not on root path
    if frappe.session.user != "Guest" and request.path != '/':
        return

    # Check if request is from Tauri app
    user_agent = request.headers.get('User-Agent', '')
    is_tauri_request = 'tauri' in user_agent.lower()

    # Only redirect Tauri requests to root path or when accessing login-related paths
    if is_tauri_request and request.path in ['/', '/login', '/desk']:
        # For logged-in users, redirect to Thunder Desk dashboard
        if frappe.session.user != "Guest":
            frappe.local.flags.redirect_location = '/dashboard'
        else:
            frappe.local.flags.redirect_location = '/thunder_login'
        raise frappe.Redirect


@frappe.whitelist()
def get_item_rate_history(item_code, customer):
    """
    Get last 5 sales and purchase records for a single item.
    item_code: single item code string.
    """
    if not item_code or not customer:
        return {}
    
    # SALES HISTORY
    sales_query = """
        select 
            sii.item_code, si.posting_date, sii.rate, sii.qty, sii.amount, sii.uom, si.name as invoice_name
        from 
            `tabSales Invoice` si, `tabSales Invoice Item` sii
        where 
            si.name = sii.parent 
            and si.customer = %s 
            and sii.item_code = %s
            and si.docstatus = 1
        order by 
            si.posting_date desc
        limit 5
    """
    
    sales_results = frappe.db.sql(sales_query, (customer, item_code), as_dict=1)
    
    sales_grouped = {item_code: sales_results}

    # PURCHASE HISTORY
    purchase_query = """
        select 
            pii.item_code, pi.posting_date, pii.rate, pii.qty, pii.amount, pii.uom, pi.name as invoice_name, pi.supplier
        from 
            `tabPurchase Invoice` pi, `tabPurchase Invoice Item` pii
        where 
            pi.name = pii.parent 
            and pii.item_code = %s
            and pi.docstatus = 1
        order by 
            pi.posting_date desc
        limit 5
    """
    
    purchase_results = frappe.db.sql(purchase_query, (item_code,), as_dict=1)

    purchase_grouped = {item_code: purchase_results}
            
    return {
        "sales": sales_grouped,
        "purchase": purchase_grouped
    }

# Alias for backward compatibility / cached clients
get_items_rate_history = get_item_rate_history