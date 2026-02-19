
import frappe
import requests
from frappe.desk.search import search_link as standard_search_link
from frappe.utils import unique

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
    
    meta = frappe.get_meta(doctype)
    if not searchfield:
        searchfield = meta.title_field or "name"
    
    search_fields = meta.get_search_fields() or []
    if "name" not in search_fields:
        search_fields.append("name")
        
    if searchfield and searchfield not in search_fields:
        search_fields.append(searchfield)

    if doctype == "Item":
        for f in ["item_code", "item_name", "item_group"]:
            if f not in search_fields:
                search_fields.append(f)

    conditions = []
    values = {"txt": f"%{txt}%", "_txt": txt.replace("%", "")}
    
    # 1. Search text filter (General)
    if txt:
        or_conditions = []
        for field in search_fields:
            or_conditions.append(f"`tab{doctype}`.`{field}` LIKE %(txt)s")
            
        if doctype == "Item":
             or_conditions.append("`tabItem`.item_code IN (select parent from `tabItem Barcode` where barcode LIKE %(txt)s)")
             if frappe.db.count(doctype, cache=True) < 50000:
                 or_conditions.append("`tabItem`.description LIKE %(txt)s")

        if or_conditions:
            conditions.append(f"({' OR '.join(or_conditions)})")

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
    select_columns = ["name"]
    
    if doctype == "Item":
        select_columns.extend(["item_name", "item_group"])
    elif doctype == "Customer":
        select_columns.append("customer_name")
    elif doctype == "Supplier":
        select_columns.append("supplier_name")
        
    if searchfield and searchfield not in select_columns:
        select_columns.append(searchfield)

    # Include any extra search_fields configured in DocType metadata (e.g. valuation_rate)
    # This mirrors item_query's "extra_searchfields" logic
    extra_fields = [
        f for f in (meta.get_search_fields() or [])
        if f not in select_columns and f != "description"
    ]
    select_columns.extend(extra_fields)
        
    select_fields = ", ".join([f"`{f}`" for f in select_columns])
    
    order_by_clause = ""
    if txt:
        # Prioritize matches in name, then searchfield, then others if possible (but simpler is better)
        order_by_clause += f"""
            (CASE WHEN LOCATE(%(_txt)s, `tab{doctype}`.name) > 0 THEN LOCATE(%(_txt)s, `tab{doctype}`.name) ELSE 99999 END),
        """
        if searchfield and searchfield != "name":
             order_by_clause += f"""
                (CASE WHEN LOCATE(%(_txt)s, `tab{doctype}`.`{searchfield}`) > 0 THEN LOCATE(%(_txt)s, `tab{doctype}`.`{searchfield}`) ELSE 99999 END),
            """
    
    order_by_clause += f"`tab{doctype}`.`modified` DESC"

    if doctype == "Item":
        qualified_select = ", ".join([f"`tabItem`.`{f}`" for f in select_columns])
        
        show_qty = frappe.db.get_single_value("Thunder Desk Settings", "show_item_qty_in_search")
        
        if show_qty:
            # LEFT JOIN tabBin and then tabWarehouse to show qty
            # only from active warehouses belonging to the selected company.
            # Must use GROUP BY instead of DISTINCT when using aggregate functions.
            if company:
                values["company_for_wh"] = company
                bin_join = """LEFT JOIN `tabBin` ON `tabBin`.item_code = `tabItem`.name
                LEFT JOIN `tabWarehouse` ON `tabWarehouse`.name = `tabBin`.warehouse
                    AND `tabWarehouse`.company = %(company_for_wh)s
                    AND `tabWarehouse`.disabled = 0"""
            else:
                bin_join = "LEFT JOIN `tabBin` ON `tabBin`.item_code = `tabItem`.name"

            return frappe.db.sql(f"""
                SELECT {qualified_select},
                    CONCAT('| Qty: ', IFNULL(ROUND(SUM(`tabBin`.actual_qty), 2), 0)) AS item_info
                FROM `tabItem`
                {bin_join}
                WHERE {where_clause} {fcond} {mcond}
                GROUP BY `tabItem`.name
                ORDER BY {order_by_clause}
                LIMIT %(start)s, %(page_len)s
            """, {**values, "start": start, "page_len": page_len})

        # Qty not enabled - simple query
        return frappe.db.sql(f"""
            SELECT DISTINCT {qualified_select}
            FROM `tabItem`
            WHERE {where_clause} {fcond} {mcond}
            ORDER BY {order_by_clause}
            LIMIT %(start)s, %(page_len)s
        """, {**values, "start": start, "page_len": page_len})

    return frappe.db.sql(f"""
        SELECT DISTINCT {select_fields}
        FROM `tab{doctype}`
        WHERE {where_clause} {fcond} {mcond}
        ORDER BY {order_by_clause}
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
    # Check Thunder Desk Settings before applying default
    settings = frappe.get_single("Thunder Desk Settings")
    
    should_set_default = False
    if doc.doctype == "Customer" and settings.customer_default_company:
        should_set_default = True
    elif doc.doctype == "Supplier" and settings.supplier_default_company:
        should_set_default = True
    elif doc.doctype == "Item" and settings.item_default_company:
        should_set_default = True
        
    if not should_set_default:
        return

    if frappe.db.count("Company") > 1:
        company = frappe.defaults.get_user_default("company")
        if company:
            doc.append("allowed_companies", {"company": company})


def boot_session(bootinfo):
    """
    Extend bootinfo with Thunder Desk specific data.
    """
    bootinfo.thunder_desk = {
        "company_count": frappe.db.count("Company"),
        "settings": frappe.get_single("Thunder Desk Settings")
    }
