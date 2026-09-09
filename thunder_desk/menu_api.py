# Copyright (c) 2026, Thunder Desk and contributors
# For license information, please see license.txt

import frappe
from frappe import _


def _can_access_item(item):
	"""Permission check matching previous dashboard/desk menu behavior."""
	if item.get("is_group"):
		return True
	if item.get("report_name"):
		return True
	doctype_to_check = item.get("doctype") or item.get("link_doctype") or item.get("required_doctype")
	if doctype_to_check:
		try:
			return frappe.has_permission(doctype_to_check, "read")
		except Exception:
			return False
	return True


def _item_route(item):
	if item.get("route"):
		return item["route"]
	doctype = item.get("doctype") or item.get("link_doctype")
	if doctype:
		return f"/app/{frappe.scrub(doctype).replace('_', '-')}"
	if item.get("report_name"):
		from urllib.parse import quote

		return f"/app/query-report/{quote(item['report_name'])}"
	return ""


def _serialize_wsm_item(row):
	is_group = cint(row.is_group) or row.item_type == "Group"
	item = {
		"name": row.name,
		"label": _(row.label) if row.label else row.label,
		"icon": row.icon or "",
		"is_group": is_group,
		"item_type": row.item_type or ("Group" if is_group else "DocType"),
		"doctype": row.link_doctype,
		"link_doctype": row.link_doctype,
		"report_name": row.report_name,
		"route": row.route,
		"children": [],
	}
	if not item["route"] and not item["is_group"]:
		item["route"] = _item_route(item)
	return item


def cint(val):
	return 1 if val else 0


def _build_wsm_tree(items):
	by_parent = {}
	roots = []
	serialized = {row.name: _serialize_wsm_item(row) for row in items}

	for row in items:
		node = serialized[row.name]
		parent = row.parent_item
		if parent and parent in serialized:
			by_parent.setdefault(parent, []).append(node)
		else:
			roots.append(node)

	def attach(node):
		children = by_parent.get(node["name"], [])
		node["children"] = children
		for child in children:
			attach(child)
		return node

	for root in roots:
		attach(root)
	return roots


def _filter_wsm_tree(nodes):
	filtered = []
	for node in nodes:
		children = _filter_wsm_tree(node.get("children") or [])
		node["children"] = children
		if node.get("is_group"):
			if children:
				filtered.append(node)
		elif _can_access_item(node):
			filtered.append(node)
	return filtered


def get_windows_style_menu(for_boot=False):
	"""Return nested Windows Style Menu structure for the current user."""
	if not frappe.db.exists("DocType", "Windows Style Menu"):
		return []

	menus = frappe.get_all(
		"Windows Style Menu",
		filters={"enabled": 1},
		fields=["name", "title", "menu_key", "icon", "color", "idx"],
		order_by="idx asc, creation asc",
	)
	result = []
	for menu in menus:
		items = frappe.get_all(
			"Windows Style Menu Item",
			filters={"menu": menu.name, "enabled": 1},
			fields=[
				"name",
				"label",
				"parent_item",
				"is_group",
				"item_type",
				"link_doctype",
				"report_name",
				"route",
				"icon",
				"idx",
			],
			order_by="idx asc, creation asc",
		)
		tree = _filter_wsm_tree(_build_wsm_tree(items))
		# Desk UI historically used flat `submenus` at top level; keep both
		# flat first-level list and nested children for multi-level support.
		submenus = []
		for node in tree:
			entry = {
				"label": node["label"],
				"icon": node.get("icon"),
				"doctype": node.get("doctype"),
				"report_name": node.get("report_name"),
				"route": node.get("route"),
				"is_group": node.get("is_group"),
				"children": node.get("children") or [],
			}
			submenus.append(entry)

		if submenus:
			result.append(
				{
					"name": menu.menu_key or menu.name,
					"title": _(menu.title) if menu.title else menu.title,
					"icon": menu.icon,
					"color": menu.color,
					"submenus": submenus,
				}
			)
	return result


def get_dashboard_menu():
	"""Return flat dashboard modules/items for the current user."""
	if not frappe.db.exists("DocType", "Dashboard Menu"):
		return []

	menus = frappe.get_all(
		"Dashboard Menu",
		filters={"enabled": 1},
		fields=["name", "title", "menu_key", "icon", "color", "idx"],
		order_by="idx asc, creation asc",
	)
	result = []
	for menu in menus:
		doc = frappe.get_doc("Dashboard Menu", menu.name)
		items = []
		for row in doc.items or []:
			if not row.enabled:
				continue
			item = {
				"label": _(row.label) if row.label else row.label,
				"doctype": row.link_doctype,
				"report_name": row.report_name,
				"route": row.route,
				"icon": row.icon or "",
			}
			if not item["route"]:
				item["route"] = _item_route(item)
			if _can_access_item(item):
				items.append(item)
		if items:
			result.append(
				{
					"name": menu.menu_key or menu.name,
					"title": _(menu.title) if menu.title else menu.title,
					"icon": menu.icon,
					"color": menu.color,
					"items": items,
				}
			)
	return result


def get_dashboard_quick_actions():
	"""Return enabled dashboard quick actions."""
	if not frappe.db.exists("DocType", "Dashboard Quick Action"):
		return []

	rows = frappe.get_all(
		"Dashboard Quick Action",
		filters={"enabled": 1},
		fields=["name", "label", "icon", "route", "css_class", "idx"],
		order_by="idx asc, creation asc",
	)
	return [
		{
			"name": r.name,
			"label": _(r.label) if r.label else r.label,
			"icon": r.icon or "",
			"route": r.route,
			"css_class": r.css_class or "",
		}
		for r in rows
	]


@frappe.whitelist()
def get_windows_style_menu_api():
	return get_windows_style_menu()


@frappe.whitelist()
def get_dashboard_menu_api():
	return get_dashboard_menu()


@frappe.whitelist()
def get_dashboard_quick_actions_api():
	return get_dashboard_quick_actions()


@frappe.whitelist()
def get_settings_page_data():
	"""Data for Thunder Desk Settings page (System Manager)."""
	frappe.only_for("System Manager")
	settings = frappe.get_single("Thunder Desk Settings")
	return {
		"settings": settings.as_dict(),
		"windows_menus": frappe.get_all(
			"Windows Style Menu",
			fields=["name", "title", "menu_key", "icon", "color", "enabled", "idx"],
			order_by="idx asc, creation asc",
		),
		"windows_items": frappe.get_all(
			"Windows Style Menu Item",
			fields=[
				"name",
				"menu",
				"parent_item",
				"label",
				"is_group",
				"item_type",
				"link_doctype",
				"report_name",
				"route",
				"icon",
				"enabled",
				"idx",
			],
			order_by="idx asc, creation asc",
		),
		"dashboard_menus": [
			{
				**m,
				"items": frappe.get_doc("Dashboard Menu", m.name).as_dict().get("items") or [],
			}
			for m in frappe.get_all(
				"Dashboard Menu",
				fields=["name", "title", "menu_key", "icon", "color", "enabled", "idx"],
				order_by="idx asc, creation asc",
			)
		],
		"quick_actions": frappe.get_all(
			"Dashboard Quick Action",
			fields=["name", "label", "icon", "route", "css_class", "enabled", "idx"],
			order_by="idx asc, creation asc",
		),
	}


@frappe.whitelist()
def save_thunder_desk_settings(settings):
	"""Save Thunder Desk Settings from the settings page."""
	frappe.only_for("System Manager")
	if isinstance(settings, str):
		settings = frappe.parse_json(settings)
	doc = frappe.get_single("Thunder Desk Settings")
	allowed = {
		"enable_top_menu",
		"hide_side_bar",
		"customer_default_company",
		"supplier_default_company",
		"item_default_company",
		"show_item_qty_in_search",
		"show_item_valuation_rate_in_search",
		"wsm_light_bg",
		"wsm_light_hover_bg",
		"wsm_dark_bg",
		"wsm_dark_hover_bg",
		"dm_light_bg",
		"dm_light_hover_bg",
		"dm_dark_bg",
		"dm_dark_hover_bg",
		"qa_light_bg",
		"qa_light_hover_bg",
		"qa_dark_bg",
		"qa_dark_hover_bg",
	}
	for key, value in settings.items():
		if key in allowed:
			doc.set(key, value)
	doc.save(ignore_permissions=True)
	return doc.as_dict()


@frappe.whitelist()
def save_menu_document(doctype, doc):
	"""Create or update a menu-related document from the settings page."""
	frappe.only_for("System Manager")
	allowed = {
		"Windows Style Menu",
		"Windows Style Menu Item",
		"Dashboard Menu",
		"Dashboard Quick Action",
	}
	if doctype not in allowed:
		frappe.throw(_("Not allowed"))
	if isinstance(doc, str):
		doc = frappe.parse_json(doc)
	doc = frappe._dict(doc)
	doc.doctype = doctype

	if doctype == "Dashboard Menu":
		return _save_dashboard_menu(doc)

	if doc.name and frappe.db.exists(doctype, doc.name):
		existing = frappe.get_doc(doctype, doc.name)
		existing.update(doc)
		existing.save(ignore_permissions=True)
		return existing.as_dict()
	new_doc = frappe.get_doc(doc)
	new_doc.insert(ignore_permissions=True)
	return new_doc.as_dict()


def _save_dashboard_menu(doc):
	"""Save Dashboard Menu and replace child rows preserving Frappe table order (idx)."""
	items = doc.get("items") or []
	payload = {
		"doctype": "Dashboard Menu",
		"title": doc.get("title"),
		"menu_key": doc.get("menu_key"),
		"icon": doc.get("icon"),
		"color": doc.get("color"),
		"enabled": doc.get("enabled"),
	}

	def _build_row(row, idx):
		item_type = row.get("item_type") or "DocType"
		return {
			"label": row.label,
			"item_type": item_type,
			"link_doctype": row.link_doctype if item_type == "DocType" else None,
			"report_name": row.report_name if item_type == "Report" else None,
			"route": row.route if item_type == "Route" else None,
			"icon": row.icon,
			"enabled": 1 if row.get("enabled") in (None, 1, "1", True) else 0,
			"idx": idx,
		}

	if doc.get("name") and frappe.db.exists("Dashboard Menu", doc.name):
		existing = frappe.get_doc("Dashboard Menu", doc.name)
		existing.update(payload)
		existing.set("items", [])
		for idx, row in enumerate(items, start=1):
			row = frappe._dict(row)
			if not row.get("label"):
				continue
			existing.append("items", _build_row(row, idx))
		existing.save(ignore_permissions=True)
		return existing.as_dict()

	payload["items"] = []
	for idx, row in enumerate(items, start=1):
		row = frappe._dict(row)
		if not row.get("label"):
			continue
		payload["items"].append(_build_row(row, idx))
	new_doc = frappe.get_doc(payload)
	new_doc.insert(ignore_permissions=True)
	return new_doc.as_dict()


@frappe.whitelist()
def delete_menu_document(doctype, name):
	frappe.only_for("System Manager")
	allowed = {
		"Windows Style Menu",
		"Windows Style Menu Item",
		"Dashboard Menu",
		"Dashboard Quick Action",
	}
	if doctype not in allowed:
		frappe.throw(_("Not allowed"))
	frappe.delete_doc(doctype, name, ignore_permissions=True)
	return {"ok": True}


@frappe.whitelist()
def reorder_documents(doctype, ordered_names):
	"""Set idx from ordered list of names (1-based)."""
	frappe.only_for("System Manager")
	allowed = {
		"Windows Style Menu",
		"Windows Style Menu Item",
		"Dashboard Menu",
		"Dashboard Quick Action",
	}
	if doctype not in allowed:
		frappe.throw(_("Not allowed"))
	if isinstance(ordered_names, str):
		ordered_names = frappe.parse_json(ordered_names)
	for idx, name in enumerate(ordered_names or [], start=1):
		if frappe.db.exists(doctype, name):
			frappe.db.set_value(doctype, name, "idx", idx, update_modified=False)
	frappe.db.commit()
	return {"ok": True}


def sync_wsm_item_types():
	"""Backfill Type=Group from legacy is_group flag."""
	if not frappe.db.exists("DocType", "Windows Style Menu Item"):
		return
	frappe.db.sql(
		"""
		UPDATE `tabWindows Style Menu Item`
		SET item_type = 'Group', is_group = 1
		WHERE ifnull(is_group, 0) = 1 AND ifnull(item_type, '') != 'Group'
		"""
	)
	frappe.db.sql(
		"""
		UPDATE `tabWindows Style Menu Item`
		SET is_group = 1
		WHERE item_type = 'Group' AND ifnull(is_group, 0) = 0
		"""
	)
	frappe.db.sql(
		"""
		UPDATE `tabWindows Style Menu Item`
		SET item_type = 'DocType'
		WHERE ifnull(item_type, '') = '' AND ifnull(is_group, 0) = 0
		"""
	)
