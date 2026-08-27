# Copyright (c) 2026, Thunder Desk and contributors
# For license information, please see license.txt

import frappe


WINDOWS_STYLE_MENUS = [
	{
		"menu_key": "Customer",
		"title": "Partners & Contacts",
		"icon": "users",
		"color": "#3498db",
		"items": [
			{"label": "Customer", "item_type": "DocType", "link_doctype": "Customer", "icon": "customer"},
			{"label": "Supplier", "item_type": "DocType", "link_doctype": "Supplier", "icon": "organization"},
			{"label": "Customer Group", "item_type": "DocType", "link_doctype": "Customer Group", "icon": "users"},
			{"label": "Address", "item_type": "DocType", "link_doctype": "Address", "icon": "website"},
			{"label": "Contact", "item_type": "DocType", "link_doctype": "Contact", "icon": "call"},
		],
	},
	{
		"menu_key": "Selling",
		"title": "Sales & Selling",
		"icon": "sell",
		"color": "#2ecc71",
		"items": [
			{"label": "Quotation", "item_type": "DocType", "link_doctype": "Quotation", "icon": "file"},
			{"label": "Sales Order", "item_type": "DocType", "link_doctype": "Sales Order", "icon": "list-alt"},
			{"label": "Sales Invoice", "item_type": "DocType", "link_doctype": "Sales Invoice", "icon": "file"},
			{"label": "POS Invoice", "item_type": "DocType", "link_doctype": "POS Invoice", "icon": "card"},
			{"label": "Payment Entry", "item_type": "DocType", "link_doctype": "Payment Entry", "icon": "money-coins-1"},
		],
	},
	{
		"menu_key": "Buying",
		"title": "Purchase & Buying",
		"icon": "buying",
		"color": "#e74c3c",
		"items": [
			{"label": "Request for Quotation", "item_type": "DocType", "link_doctype": "Request for Quotation", "icon": "file"},
			{"label": "Supplier Quotation", "item_type": "DocType", "link_doctype": "Supplier Quotation", "icon": "small-file"},
			{"label": "Purchase Order", "item_type": "DocType", "link_doctype": "Purchase Order", "icon": "list-alt"},
			{"label": "Purchase Invoice", "item_type": "DocType", "link_doctype": "Purchase Invoice", "icon": "money-coins-1"},
			{"label": "Purchase Receipt", "item_type": "DocType", "link_doctype": "Purchase Receipt", "icon": "stock"},
		],
	},
	{
		"menu_key": "Stock",
		"title": "Inventory & Stock",
		"icon": "stock",
		"color": "#f39c12",
		"items": [
			{"label": "Item", "item_type": "DocType", "link_doctype": "Item", "icon": "stock"},
			{"label": "Item Group", "item_type": "DocType", "link_doctype": "Item Group", "icon": "folder-normal"},
			{
				"label": "Item Barcode Print",
				"item_type": "DocType",
				"link_doctype": "Barcode Print",
				"route": "/app/barcode-print/new",
				"icon": "scan",
			},
			{"label": "Warehouse", "item_type": "DocType", "link_doctype": "Warehouse", "icon": "organization"},
			{"label": "Stock Entry", "item_type": "DocType", "link_doctype": "Stock Entry", "icon": "change"},
			{"label": "Delivery Note", "item_type": "DocType", "link_doctype": "Delivery Note", "icon": "stock"},
			{"label": "Stock Reconciliation", "item_type": "DocType", "link_doctype": "Stock Reconciliation", "icon": "equity"},
		],
	},
	{
		"menu_key": "Reports",
		"title": "Reports & Analytics",
		"icon": "chart",
		"color": "#9b59b6",
		"items": [
			{"label": "All Reports", "item_type": "Route", "route": "/app/reports", "icon": "list"},
			{"label": "Sales Analytics", "item_type": "Report", "report_name": "Sales Analytics", "route": "/app/query-report/Sales%20Analytics", "icon": "chart"},
			{"label": "Purchase Analytics", "item_type": "Report", "report_name": "Purchase Analytics", "route": "/app/query-report/Purchase%20Analytics", "icon": "chart"},
			{"label": "Stock Balance", "item_type": "Report", "report_name": "Stock Balance", "route": "/app/query-report/Stock%20Balance", "icon": "stock"},
			{"label": "Profit and Loss Statement", "item_type": "Report", "report_name": "Profit and Loss Statement", "route": "/app/query-report/Profit%20and%20Loss%20Statement", "icon": "accounting"},
			{"label": "Balance Sheet", "item_type": "Report", "report_name": "Balance Sheet", "route": "/app/query-report/Balance%20Sheet", "icon": "file"},
			{"label": "POS Register", "item_type": "Report", "report_name": "POS Register", "route": "/app/query-report/POS%20Register", "icon": "retail"},
			{"label": "Cash and Bank Summary", "item_type": "Report", "report_name": "Cash and Bank Summary", "route": "/app/query-report/Cash%20and%20Bank%20Summary", "icon": "equity"},
			{"label": "Day Book", "item_type": "Report", "report_name": "Day Book", "route": "/app/query-report/Day%20Book", "icon": "calendar"},
		],
	},
	{
		"menu_key": "Accounting",
		"title": "Accounting",
		"icon": "accounting",
		"color": "#1abc9c",
		"items": [
			{"label": "Chart of Accounts", "item_type": "Route", "route": "/app/account/view/tree", "icon": "branch"},
			{"label": "General Ledger", "item_type": "Report", "report_name": "General Ledger", "route": "/app/query-report/General%20Ledger", "icon": "list-alt"},
			{"label": "Trial Balance", "item_type": "Report", "report_name": "Trial Balance", "route": "/app/query-report/Trial%20Balance", "icon": "equity"},
			{"label": "Journal Entry", "item_type": "DocType", "link_doctype": "Journal Entry", "icon": "edit"},
			{"label": "Payment Reconciliation", "item_type": "DocType", "link_doctype": "Payment Reconciliation", "icon": "solid-success"},
			{"label": "Bank Reconciliation", "item_type": "Route", "route": "/app/bank-reconciliation-tool", "icon": "organization"},
			{"label": "Accounts Payable", "item_type": "Report", "report_name": "Accounts Payable", "route": "/app/query-report/Accounts%20Payable", "icon": "arrow-left"},
			{"label": "Accounts Receivable", "item_type": "Report", "report_name": "Accounts Receivable", "route": "/app/query-report/Accounts%20Receivable", "icon": "arrow-right"},
		],
	},
	{
		"menu_key": "Setup",
		"title": "Settings & Setup",
		"icon": "setting-gear",
		"color": "#34495e",
		"items": [
			{"label": "Company", "item_type": "DocType", "link_doctype": "Company", "icon": "organization"},
			{"label": "User", "item_type": "DocType", "link_doctype": "User", "icon": "customer"},
			{"label": "Role", "item_type": "DocType", "link_doctype": "Role", "icon": "permission"},
			{"label": "Print Format", "item_type": "DocType", "link_doctype": "Print Format", "icon": "printer"},
			{"label": "System Settings", "item_type": "DocType", "link_doctype": "System Settings", "icon": "tool"},
			{"label": "Thunder Desk Settings", "item_type": "Route", "route": "/app/thunder-desk-config", "icon": "customization"},
		],
	},
]


DASHBOARD_MENUS = [
	{
		"menu_key": "Customer",
		"title": "Partners & Contacts",
		"icon": "users",
		"color": "#3498db",
		"items": [
			{"label": "Customer", "item_type": "DocType", "link_doctype": "Customer", "icon": "customer"},
			{"label": "Supplier", "item_type": "DocType", "link_doctype": "Supplier", "icon": "organization"},
			{"label": "Customer Group", "item_type": "DocType", "link_doctype": "Customer Group", "icon": "users"},
			{"label": "Address", "item_type": "DocType", "link_doctype": "Address", "icon": "website"},
			{"label": "Contact", "item_type": "DocType", "link_doctype": "Contact", "icon": "call"},
		],
	},
	{
		"menu_key": "Selling",
		"title": "Sales & Selling",
		"icon": "sell",
		"color": "#2ecc71",
		"items": [
			{"label": "Quotation", "item_type": "DocType", "link_doctype": "Quotation", "icon": "file"},
			{"label": "Sales Order", "item_type": "DocType", "link_doctype": "Sales Order", "icon": "list-alt"},
			{"label": "Sales Invoice", "item_type": "DocType", "link_doctype": "Sales Invoice", "icon": "file"},
			{"label": "POS Invoice", "item_type": "DocType", "link_doctype": "POS Invoice", "icon": "card"},
			{"label": "Payment Entry", "item_type": "DocType", "link_doctype": "Payment Entry", "icon": "money-coins-1"},
		],
	},
	{
		"menu_key": "Buying",
		"title": "Purchase & Buying",
		"icon": "buying",
		"color": "#e74c3c",
		"items": [
			{"label": "Request for Quotation", "item_type": "DocType", "link_doctype": "Request for Quotation", "icon": "file"},
			{"label": "Supplier Quotation", "item_type": "DocType", "link_doctype": "Supplier Quotation", "icon": "small-file"},
			{"label": "Purchase Order", "item_type": "DocType", "link_doctype": "Purchase Order", "icon": "list-alt"},
			{"label": "Purchase Invoice", "item_type": "DocType", "link_doctype": "Purchase Invoice", "icon": "money-coins-1"},
			{"label": "Purchase Receipt", "item_type": "DocType", "link_doctype": "Purchase Receipt", "icon": "stock"},
		],
	},
	{
		"menu_key": "Stock",
		"title": "Inventory & Stock",
		"icon": "stock",
		"color": "#f39c12",
		"items": [
			{"label": "Item", "item_type": "DocType", "link_doctype": "Item", "icon": "stock"},
			{"label": "Item Group", "item_type": "DocType", "link_doctype": "Item Group", "icon": "folder-normal"},
			{"label": "Item Barcode Print", "item_type": "DocType", "link_doctype": "Barcode Print", "route": "/app/barcode-print/new", "icon": "scan"},
			{"label": "Warehouse", "item_type": "DocType", "link_doctype": "Warehouse", "icon": "organization"},
			{"label": "Stock Entry", "item_type": "DocType", "link_doctype": "Stock Entry", "icon": "change"},
			{"label": "Delivery Note", "item_type": "DocType", "link_doctype": "Delivery Note", "icon": "stock"},
			{"label": "Stock Reconciliation", "item_type": "DocType", "link_doctype": "Stock Reconciliation", "icon": "equity"},
		],
	},
	{
		"menu_key": "Reports",
		"title": "Reports & Analytics",
		"icon": "chart",
		"color": "#9b59b6",
		"items": [
			{"label": "All Reports", "item_type": "Route", "route": "/app/reports", "icon": "list"},
			{"label": "Sales Analytics", "item_type": "Report", "report_name": "Sales Analytics", "route": "/app/query-report/Sales%20Analytics", "icon": "chart"},
			{"label": "Purchase Analytics", "item_type": "Report", "report_name": "Purchase Analytics", "route": "/app/query-report/Purchase%20Analytics", "icon": "chart"},
			{"label": "Stock Balance", "item_type": "Report", "report_name": "Stock Balance", "route": "/app/query-report/Stock%20Balance", "icon": "stock"},
			{"label": "Profit and Loss Statement", "item_type": "Report", "report_name": "Profit and Loss Statement", "route": "/app/query-report/Profit%20and%20Loss%20Statement", "icon": "accounting"},
			{"label": "Balance Sheet", "item_type": "Report", "report_name": "Balance Sheet", "route": "/app/query-report/Balance%20Sheet", "icon": "file"},
			{"label": "POS Register", "item_type": "Report", "report_name": "POS Register", "route": "/app/query-report/POS%20Register", "icon": "retail"},
		],
	},
	{
		"menu_key": "Setup",
		"title": "Settings & Setup",
		"icon": "setting-gear",
		"color": "#34495e",
		"items": [
			{"label": "Company", "item_type": "DocType", "link_doctype": "Company", "icon": "organization"},
			{"label": "User", "item_type": "DocType", "link_doctype": "User", "icon": "customer"},
			{"label": "Role", "item_type": "DocType", "link_doctype": "Role", "icon": "permission"},
			{"label": "Print Format", "item_type": "DocType", "link_doctype": "Print Format", "icon": "printer"},
			{"label": "System Settings", "item_type": "DocType", "link_doctype": "System Settings", "icon": "tool"},
			{"label": "Thunder Desk Settings", "item_type": "Route", "route": "/app/thunder-desk-config", "icon": "customization"},
		],
	},
]


QUICK_ACTIONS = [
	{"label": "Point of Sale", "icon": "retail", "route": "/app/point-of-sale", "css_class": "pos-btn"},
	{"label": "New Invoice", "icon": "file", "route": "/app/sales-invoice/new", "css_class": "invoice-btn"},
	{"label": "New Customer", "icon": "customer", "route": "/app/customer/new", "css_class": "customer-btn"},
	{"label": "New Item", "icon": "add", "route": "/app/item/new", "css_class": "item-btn"},
	{"label": "Print Barcode", "icon": "scan", "route": "/app/barcode-print/new", "css_class": "barcode-btn"},
]


COLOR_DEFAULTS = {
	"wsm_light_bg": "#f0f0f0",
	"wsm_light_hover_bg": "#e1e1e1",
	"wsm_dark_bg": "#2d2d2d",
	"wsm_dark_hover_bg": "#3d3d3d",
	"dm_light_bg": "#ffffff",
	"dm_light_hover_bg": "#f8f9fa",
	"dm_dark_bg": "#2d2d2d",
	"dm_dark_hover_bg": "#3d3d3d",
	"qa_light_bg": "#ffffff",
	"qa_light_hover_bg": "#f8f9fa",
	"qa_dark_bg": "#2d2d2d",
	"qa_dark_hover_bg": "#3d3d3d",
}


def seed_menus():
	"""Idempotent seed of Windows Style / Dashboard / Quick Action menus."""
	if not frappe.db.exists("DocType", "Windows Style Menu"):
		return
	_cleanup_legacy_settings_page()
	_seed_windows_style_menus()
	_seed_dashboard_menus()
	_seed_quick_actions()
	_seed_appearance_defaults()
	frappe.db.commit()


def _cleanup_legacy_settings_page():
	"""Page name must not clash with Single DocType Thunder Desk Settings."""
	if frappe.db.exists("Page", "thunder-desk-settings"):
		frappe.delete_doc("Page", "thunder-desk-settings", force=1, ignore_permissions=True)

	for doctype in ("Windows Style Menu Item", "Dashboard Menu Item"):
		if not frappe.db.exists("DocType", doctype):
			continue
		frappe.db.sql(
			f"""
			UPDATE `tab{doctype}`
			SET route = %s
			WHERE route = %s
			""",
			("/app/thunder-desk-config", "/app/thunder-desk-settings"),
		)

def _seed_windows_style_menus():
	if frappe.db.count("Windows Style Menu"):
		return
	for idx, menu in enumerate(WINDOWS_STYLE_MENUS, start=1):
		doc = frappe.get_doc(
			{
				"doctype": "Windows Style Menu",
				"menu_key": menu["menu_key"],
				"title": menu["title"],
				"icon": menu["icon"],
				"color": menu["color"],
				"enabled": 1,
				"idx": idx,
			}
		)
		doc.insert(ignore_permissions=True)
		for i_idx, item in enumerate(menu["items"], start=1):
			frappe.get_doc(
				{
					"doctype": "Windows Style Menu Item",
					"menu": doc.name,
					"label": item["label"],
					"item_type": item.get("item_type") or "DocType",
					"link_doctype": item.get("link_doctype"),
					"report_name": item.get("report_name")
					if item.get("report_name") and frappe.db.exists("Report", item.get("report_name"))
					else None,
					"route": item.get("route"),
					"icon": item.get("icon"),
					"enabled": 1,
					"idx": i_idx,
				}
			).insert(ignore_permissions=True, ignore_links=True)


def _seed_dashboard_menus():
	if frappe.db.count("Dashboard Menu"):
		return
	for idx, menu in enumerate(DASHBOARD_MENUS, start=1):
		items = []
		for item in menu["items"]:
			items.append(
				{
					"label": item["label"],
					"item_type": item.get("item_type") or "DocType",
					"link_doctype": item.get("link_doctype"),
					"report_name": item.get("report_name")
					if item.get("report_name") and frappe.db.exists("Report", item.get("report_name"))
					else None,
					"route": item.get("route"),
					"icon": item.get("icon"),
					"enabled": 1,
				}
			)
		frappe.get_doc(
			{
				"doctype": "Dashboard Menu",
				"menu_key": menu["menu_key"],
				"title": menu["title"],
				"icon": menu["icon"],
				"color": menu["color"],
				"enabled": 1,
				"idx": idx,
				"items": items,
			}
		).insert(ignore_permissions=True, ignore_links=True)


def _seed_quick_actions():
	if frappe.db.count("Dashboard Quick Action"):
		return
	for idx, action in enumerate(QUICK_ACTIONS, start=1):
		frappe.get_doc(
			{
				"doctype": "Dashboard Quick Action",
				"label": action["label"],
				"icon": action["icon"],
				"route": action["route"],
				"css_class": action.get("css_class"),
				"enabled": 1,
				"idx": idx,
			}
		).insert(ignore_permissions=True)


def _seed_appearance_defaults():
	if not frappe.db.exists("DocType", "Thunder Desk Settings"):
		return
	settings = frappe.get_single("Thunder Desk Settings")
	changed = False
	for key, value in COLOR_DEFAULTS.items():
		if hasattr(settings, key) and not settings.get(key):
			settings.set(key, value)
			changed = True
	if changed:
		settings.save(ignore_permissions=True)
