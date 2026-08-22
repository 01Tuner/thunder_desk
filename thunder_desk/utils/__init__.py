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
def get_item_rate_history(item_code, customer=None, supplier=None, company=None, limit=10):
    """
    Get last N sales and purchase records for a single item.
    item_code: single item code string.
    customer: optional customer filter for sales
    supplier: optional supplier filter for purchase
    company: optional company filter
    limit: number of records to fetch (default 10, e.g. 10, 20, 50, 100)
    """
    if not item_code:
        return {}

    limit = frappe.utils.cint(limit)
    if limit <= 0:
        limit = 10
    if limit > 500:
        limit = 100

    # SALES HISTORY
    sales_conditions = [
        "si.name = sii.parent",
        "sii.item_code = %s",
        "si.docstatus = 1",
        "ifnull(si.is_return, 0) = 0"
    ]
    sales_args = [item_code]

    if company:
        sales_conditions.append("si.company = %s")
        sales_args.append(company)

    if customer:
        sales_conditions.append("si.customer = %s")
        sales_args.append(customer)

    sales_query = f"""
        select 
            sii.item_code, si.company, si.posting_date, sii.rate, sii.qty, sii.amount, sii.uom, si.name as invoice_name, si.customer
        from 
            `tabSales Invoice` si, `tabSales Invoice Item` sii
        where 
            {" and ".join(sales_conditions)}
        order by 
            si.posting_date desc, si.name desc
        limit %s
    """
    sales_args.append(limit)
    sales_results = frappe.db.sql(sales_query, tuple(sales_args), as_dict=1)
    sales_grouped = {item_code: sales_results}

    # PURCHASE HISTORY
    purchase_conditions = [
        "pi.name = pii.parent",
        "pii.item_code = %s",
        "pi.docstatus = 1",
        "ifnull(pi.is_return, 0) = 0"
    ]
    purchase_args = [item_code]

    if company:
        purchase_conditions.append("pi.company = %s")
        purchase_args.append(company)

    if supplier:
        purchase_conditions.append("pi.supplier = %s")
        purchase_args.append(supplier)

    purchase_query = f"""
        select 
            pii.item_code, pi.company, pi.posting_date, pii.rate, pii.qty, pii.amount, pii.uom, pi.name as invoice_name, pi.supplier
        from 
            `tabPurchase Invoice` pi, `tabPurchase Invoice Item` pii
        where 
            {" and ".join(purchase_conditions)}
        order by 
            pi.posting_date desc, pi.name desc
        limit %s
    """
    purchase_args.append(limit)
    purchase_results = frappe.db.sql(purchase_query, tuple(purchase_args), as_dict=1)
    purchase_grouped = {item_code: purchase_results}

    # QUOTATION HISTORY
    quotation_conditions = [
        "q.name = qi.parent",
        "qi.item_code = %s",
        "q.docstatus < 2"
    ]
    quotation_args = [item_code]

    if company:
        quotation_conditions.append("q.company = %s")
        quotation_args.append(company)

    if customer:
        quotation_conditions.append("(q.party_name = %s or q.customer_name = %s)")
        quotation_args.extend([customer, customer])

    quotation_query = f"""
        select 
            qi.item_code, q.company, q.transaction_date as posting_date, qi.rate, qi.qty, qi.amount, qi.uom, q.name as invoice_name, q.party_name as customer, q.status
        from 
            `tabQuotation` q, `tabQuotation Item` qi
        where 
            {" and ".join(quotation_conditions)}
        order by 
            q.transaction_date desc, q.name desc
        limit %s
    """
    quotation_args.append(limit)
    quotation_results = frappe.db.sql(quotation_query, tuple(quotation_args), as_dict=1)
    quotation_grouped = {item_code: quotation_results}

    return {
        "sales": sales_grouped,
        "purchase": purchase_grouped,
        "quotation": quotation_grouped
    }

# Alias for backward compatibility / cached clients
get_items_rate_history = get_item_rate_history