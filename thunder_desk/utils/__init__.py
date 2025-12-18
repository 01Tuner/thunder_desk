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
    Get last 5 sales records. 
    Supports single item_code or list of item_codes (bulk mode).
    item_code: can be single item code string, or list of codes, or JSON string of list.
    """
    if not item_code or not customer:
        return {}
    
    item_codes = item_code
    
    # Check if input is list or needs parsing
    if isinstance(item_codes, str):
        import json
        try:
            # Try to parse as JSON list
            possible_list = json.loads(item_codes)
            if isinstance(possible_list, list):
                item_codes = possible_list
            else:
                # It's a single item code string
                item_codes = [item_codes]
        except:
            # Not JSON, so single item code
            item_codes = [item_codes]
    elif isinstance(item_codes, list):
        pass # Already a list
    else:
        # Unknown type
        return {}

    if not item_codes:
        return {}
    
    placeholders = ', '.join(['%s'] * len(item_codes))
    query = f"""
        select 
            sii.item_code, si.posting_date, sii.rate, sii.qty, si.name as invoice_name
        from 
            `tabSales Invoice` si, `tabSales Invoice Item` sii
        where 
            si.name = sii.parent 
            and si.customer = %s 
            and sii.item_code IN ({placeholders})
            and si.docstatus = 1
        order by 
            si.posting_date desc
        limit 100
    """
    
    params = [customer] + item_codes
    results = frappe.db.sql(query, tuple(params), as_dict=1)
    
    # Group by item_code
    grouped = {}
    for r in results:
        if r.item_code not in grouped:
            grouped[r.item_code] = []
        if len(grouped[r.item_code]) < 5: 
            grouped[r.item_code].append(r)
            
    return grouped

# Alias for backward compatibility / cached clients
get_items_rate_history = get_item_rate_history
