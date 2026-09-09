# Copyright (c) 2026, Thunder Desk and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class DashboardMenuItem(Document):
	def validate(self):
		if not self.item_type:
			self.item_type = "DocType"

		if self.item_type == "DocType":
			if not self.link_doctype:
				frappe.throw(frappe._("DocType is required"))
			self.report_name = None
			self.route = None
		elif self.item_type == "Report":
			if not self.report_name:
				frappe.throw(frappe._("Report is required"))
			self.link_doctype = None
			self.route = None
		elif self.item_type == "Route":
			if not self.route:
				frappe.throw(frappe._("Route is required"))
			self.link_doctype = None
			self.report_name = None
