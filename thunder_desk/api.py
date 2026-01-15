
import frappe
import requests
from frappe.desk.search import search_link as standard_search_link

@frappe.whitelist()
def get_arabic_translation(text):
	if not text:
		return ""
	
	try:
		url = "https://translate.googleapis.com/translate_a/single"
		params = {
			"client": "gtx",
			"sl": "auto",
			"tl": "ar",
			"dt": "t",
			"q": text
		}
		response = requests.get(url, params=params)
		if response.status_code == 200:
			result = response.json()
			# Result format: [[['translated_text', 'original_text', ...], ...], ...]
			if result and result[0] and result[0][0] and result[0][0][0]:
				return result[0][0][0]
	except Exception as e:
		frappe.log_error(message=str(e), title="Thunder Desk Translation Error")
	
	return ""

	return ""

def update_item_selling_price(doc, method=None):
	"""
	Update Item Price based on Purchase Invoice details.
	Handles both Selling and Buying price updates.
	"""
	if not (doc.update_selling_price or doc.get("update_buying_price")):
		return

	from frappe import _

	# 1. Handle Selling Price
	if doc.update_selling_price:
		standard_selling_price_list = frappe.db.get_value("Price List", {"name": _("Standard Selling")}, "name") or "Standard Selling"
		
		for item in doc.items:
			if item.selling_price > 0:
				update_price_list_rate(item.item_code, item.item_name, standard_selling_price_list, item.selling_price, doc.currency, selling=1)

	# 2. Handle Buying Price
	if doc.get("update_buying_price"):
		standard_buying_price_list = frappe.db.get_value("Price List", {"name": _("Standard Buying")}, "name") or "Standard Buying"
		
		for item in doc.items:
			if item.rate > 0:
				update_price_list_rate(item.item_code, item.item_name, standard_buying_price_list, item.rate, doc.currency, buying=1)

def update_price_list_rate(item_code, item_name, price_list, rate, currency, selling=0, buying=0):
	"""Helper to update or create Item Price"""
	item_price_name = frappe.db.get_value("Item Price", {
		"item_code": item_code,
		"price_list": price_list,
        "selling": selling,
        "buying": buying
	})

	if item_price_name:
		frappe.db.set_value("Item Price", item_price_name, "price_list_rate", rate)
	else:
		ip = frappe.get_doc({
			"doctype": "Item Price",
			"item_code": item_code,
			"item_name": item_name,
			"price_list": price_list,
            "selling": selling,
            "buying": buying,
			"price_list_rate": rate,
			"currency": currency
		})
		ip.insert(ignore_permissions=True)
@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def get_records_for_company(doctype, txt, searchfield, start, page_len, filters):
    if not frappe.db.exists("DocType", doctype):
        return []

    if isinstance(filters, str):
        import json
        filters = json.loads(filters)
    
    company = filters.pop("company", None)
    conditions = []
    values = {"txt": f"%{txt}%"}
    
    # 1. Search text filter (General)
    if txt:
        if doctype == "Item":
            conditions.append("(`tabItem`.`item_code` LIKE %(txt)s OR `tabItem`.`item_name` LIKE %(txt)s)")
        else:
            conditions.append(f"(`tab{doctype}`.`{searchfield}` LIKE %(txt)s)")

    # 2. Multi-company isolation filter
    if company:
        conditions.append(f"""(
            NOT EXISTS (SELECT name FROM `tabAllowed Company` WHERE parent = `tab{doctype}`.name AND parenttype = '{doctype}')
            OR 
            EXISTS (SELECT name FROM `tabAllowed Company` WHERE parent = `tab{doctype}`.name AND parenttype = '{doctype}' AND company = %(company)s)
        )""")
        values["company"] = company

    # 3. Standard Item conditions (mimic erpnext.controllers.queries.item_query)
    if doctype == "Item":
        conditions.append("`tabItem`.disabled = 0")
        conditions.append("`tabItem`.has_variants = 0")
        conditions.append("`tabItem`.docstatus < 2")
        conditions.append("(`tabItem`.end_of_life > %(today)s OR IFNULL(`tabItem`.end_of_life, '0000-00-00') = '0000-00-00')")
        values["today"] = frappe.utils.nowdate()
        
    # 4. Standard Filters Condition (get_filters_cond)
    from frappe.desk.reportview import get_filters_cond, get_match_cond
    fcond = get_filters_cond(doctype, filters, [])
    
    # 5. Match Condition (Permissions)
    mcond = get_match_cond(doctype)
    
    where_clause = " AND ".join(conditions) if conditions else "1=1"
    
    # Determine fields to return based on doctype
    if doctype == "Item":
        select_fields = "`name`, `item_name`, `item_group`"
    elif doctype == "Customer":
        select_fields = "`name`, `customer_name`"
    elif doctype == "Supplier":
        select_fields = "`name`, `supplier_name`"
    else:
        select_fields = "`name`"
    
    return frappe.db.sql(f"""
        SELECT DISTINCT {select_fields}
        FROM `tab{doctype}`
        WHERE {where_clause} {fcond} {mcond}
        ORDER BY 
            CASE WHEN `tab{doctype}`.`{searchfield}` LIKE %(txt)s THEN 0 ELSE 1 END,
            `modified` DESC
        LIMIT %(start)s, %(page_len)s
    """, {**values, "start": start, "page_len": page_len})

@frappe.whitelist()
def set_session_company(company):
    frappe.defaults.set_user_default("company", company)
    return True

def validate_allowed_companies(doc, method=None):
    """
    Prevent duplicate companies in Allowed Company table.
    """
    if not doc.get("allowed_companies"):
        return
        
    companies = []
    for row in doc.allowed_companies:
        if row.company in companies:
            frappe.throw(
                frappe._("Company {0} is already added in the list").format(row.company),
                title=frappe._("Duplicate Entry")
            )
        companies.append(row.company)

def set_default_allowed_company(doc, method=None):
    """
    Sets default session company for Quick Entry or non-form access.
    Logic:
    - If doc already has companies, do nothing.
    - If 'allowed_companies' was explicitly submitted (even empty), do nothing (User intentionally made it global).
    - Otherwise (Quick Entry, API missing field), default to session company.
    """
    if hasattr(frappe, "request") and frappe.request:
        # Frappe automatically parses the payload into frappe.form_dict
        action = frappe.form_dict.get("action")
        if action:
            return
            
    if doc.get("allowed_companies"):
        return

    # If the user didn't explicitly submit this field (missing from payload),
    # we assume they are in Quick Entry or an Import where they want smart defaults.
    if frappe.db.count("Company") > 1:
        company = frappe.defaults.get_user_default("company")
        if company:
            doc.append("allowed_companies", {"company": company})


def boot_session(bootinfo):
    """
    Extend bootinfo with Thunder Desk specific data.
    """
    bootinfo.thunder_desk = {
        "company_count": frappe.db.count("Company")
    }
