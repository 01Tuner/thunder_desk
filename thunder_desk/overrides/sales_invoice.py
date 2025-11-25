import frappe
from erpnext.accounts.doctype.sales_invoice.sales_invoice import SalesInvoice
from frappe.model.naming import make_autoname

class CustomSalesInvoice(SalesInvoice):
	def before_insert(self):
		if self.docstatus == 0:
			self.naming_series = "DRAFT-INV-.#####"
			self.name = make_autoname(self.naming_series)

	def before_submit(self):
		if self.name.startswith("DRAFT-INV-"):
			# Fetch default naming series from Meta
			meta = frappe.get_meta(self.doctype)
			field = meta.get_field("naming_series")
			series = field.default
			if not series:
				options = (field.options or "").split("\n")
				series = options[0] if options else ""
			
			if series:
				# naming_series is set_only_once, so we must update DB first to bypass validation
				self.db_set("naming_series", series)
				self.naming_series = series
				if self._doc_before_save:
					self._doc_before_save.naming_series = series

			self.name = frappe.rename_doc(
				self.doctype, self.name, make_autoname(self.naming_series), ignore_if_exists=True, force=True
			)
			
			# Reload to ensure all fields (including modified timestamp and children) are synced with DB
			self.reload()
			self.docstatus = 1 # Restore docstatus as reload resets it to 0 (from DB)
		
		super().before_submit()
