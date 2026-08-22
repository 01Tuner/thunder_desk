# Copyright (c) 2026, Thunder Desk and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class WindowsStyleMenuItem(Document):
	def validate(self):
		self.is_group = 1 if self.item_type == "Group" else 0

		if self.parent_item:
			if self.parent_item == self.name:
				frappe.throw(frappe._("Parent Item cannot be the same as this item"))
			self._validate_no_cycle()
			parent = frappe.db.get_value(
				"Windows Style Menu Item",
				self.parent_item,
				["menu", "item_type", "is_group"],
				as_dict=True,
			)
			if parent and parent.menu != self.menu:
				frappe.throw(frappe._("Parent Item must belong to the same Menu"))
			if parent and parent.item_type != "Group" and not parent.is_group:
				frappe.throw(frappe._("Parent must be a Group type item"))

		if self.item_type == "Group":
			self.link_doctype = None
			self.report_name = None
			self.route = None
			return

		if not self.item_type:
			frappe.throw(frappe._("Type is required"))

		if self.item_type == "DocType" and not self.link_doctype:
			frappe.throw(frappe._("DocType is required"))
		if self.item_type == "Report" and not self.report_name:
			frappe.throw(frappe._("Report is required"))
		if self.item_type == "Route" and not self.route:
			frappe.throw(frappe._("Route is required"))

	def _validate_no_cycle(self):
		visited = set()
		current = self.parent_item
		while current:
			if current == self.name or current in visited:
				frappe.throw(frappe._("Circular parent reference is not allowed"))
			visited.add(current)
			current = frappe.db.get_value("Windows Style Menu Item", current, "parent_item")
