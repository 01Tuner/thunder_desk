# Copyright (c) 2026, Thunder Desk and contributors
# For license information, please see license.txt

"""Remap legacy Font Awesome icon class names to Frappe Lucide icon names."""

import frappe

FA_TO_LUCIDE = {
	"fa fa-users": "users",
	"fa fa-user": "customer",
	"fa fa-user-plus": "add-round",
	"fa fa-truck": "stock",
	"fa fa-home": "website",
	"fa fa-phone": "call",
	"fa fa-shopping-cart": "sell",
	"fa fa-shopping-bag": "buying",
	"fa fa-file-text": "file",
	"fa fa-file-text-o": "list-alt",
	"fa fa-file-o": "small-file",
	"fa fa-file": "file",
	"fa fa-credit-card": "card",
	"fa fa-th": "retail",
	"fa fa-dollar": "money-coins-1",
	"fa fa-inbox": "stock",
	"fa fa-cubes": "stock",
	"fa fa-cube": "stock",
	"fa fa-qrcode": "scan",
	"fa fa-barcode": "scan",
	"fa fa-building": "organization",
	"fa fa-building-o": "organization",
	"fa fa-exchange": "change",
	"fa fa-balance-scale": "equity",
	"fa fa-bar-chart": "chart",
	"fa fa-line-chart": "chart",
	"fa fa-list": "list",
	"fa fa-calculator": "accounting",
	"fa fa-book": "list-alt",
	"fa fa-sitemap": "branch",
	"fa fa-pencil-square-o": "edit",
	"fa fa-check-circle": "solid-success",
	"fa fa-university": "organization",
	"fa fa-arrow-circle-left": "arrow-left",
	"fa fa-arrow-circle-right": "arrow-right",
	"fa fa-cog": "setting-gear",
	"fa fa-shield": "permission",
	"fa fa-print": "printer",
	"fa fa-wrench": "tool",
	"fa fa-sliders": "customization",
	"fa fa-plus-circle": "add",
	"fa fa-folder": "folder-normal",
	"fa fa-bolt": "shortcut",
}

TABLES = (
	"Windows Style Menu",
	"Windows Style Menu Item",
	"Dashboard Menu",
	"Dashboard Menu Item",
	"Dashboard Quick Action",
)


def execute():
	for doctype in TABLES:
		if not frappe.db.exists("DocType", doctype):
			continue
		for old, new in FA_TO_LUCIDE.items():
			frappe.db.sql(
				f"""
				UPDATE `tab{doctype}`
				SET icon = %s
				WHERE icon = %s OR TRIM(icon) = %s
				""",
				(new, old, old),
			)
