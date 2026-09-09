# Copyright (c) 2026, Thunder Desk and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class DashboardMenu(Document):
	def validate(self):
		for item in self.items or []:
			item_type = item.item_type or "DocType"
			item.item_type = item_type
			if item_type == "DocType":
				if not item.link_doctype:
					frappe.throw(frappe._("DocType is required for item '{0}'").format(item.label))
				item.report_name = None
				item.route = None
			elif item_type == "Report":
				if not item.report_name:
					frappe.throw(frappe._("Report is required for item '{0}'").format(item.label))
				item.link_doctype = None
				item.route = None
			elif item_type == "Route":
				if not item.route:
					frappe.throw(frappe._("Route is required for item '{0}'").format(item.label))
				item.link_doctype = None
				item.report_name = None
