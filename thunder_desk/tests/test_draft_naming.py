import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import today
from frappe.model.naming import make_autoname

class TestDraftNaming(FrappeTestCase):
	def test_draft_naming_and_rename(self):
		company_name = "_Test Draft Company New"
		customer_name = "_Test Draft Customer New"
		item_code = "_Test Draft Item New"

		# Create Company
		if not frappe.db.exists("Company", company_name):
			frappe.get_doc({
				"doctype": "Company",
				"company_name": company_name,
				"default_currency": "USD",
				"chart_of_accounts": "Standard",
				"country": "United States"
			}).insert(ignore_permissions=True)

		# Create VAT Account
		if not frappe.db.exists("Account", "VAT - " + company_name):
			parent_account = frappe.db.get_value("Account", {"account_name": "Duties and Taxes", "company": company_name})
			if not parent_account:
				parent_account = frappe.get_doc({
					"doctype": "Account",
					"account_name": "Duties and Taxes",
					"company": company_name,
					"is_group": 1,
					"account_type": "Tax",
					"report_type": "Balance Sheet",
					"root_type": "Liability"
				}).insert(ignore_permissions=True).name

			frappe.get_doc({
				"doctype": "Account",
				"account_name": "VAT",
				"parent_account": parent_account,
				"company": company_name,
				"account_type": "Tax",
				"report_type": "Balance Sheet"
			}).insert(ignore_permissions=True)
			
		vat_account = "VAT - " + company_name
		if frappe.db.exists("Account", vat_account):
			vat_account_name = vat_account
		else:
			vat_account_doc = frappe.get_doc("Account", {"account_name": "VAT", "company": company_name})
			vat_account_name = vat_account_doc.name

		# Create Customer
		if not frappe.db.exists("Customer", customer_name):
			frappe.get_doc({
				"doctype": "Customer",
				"customer_name": customer_name,
				"customer_type": "Individual",
				"customer_group": "All Customer Groups",
				"territory": "All Territories"
			}).insert(ignore_permissions=True)

		# Create Item
		if not frappe.db.exists("Item", item_code):
			item = frappe.get_doc({
				"doctype": "Item",
				"item_code": item_code,
				"item_name": item_code,
				"item_group": "All Item Groups",
				"stock_uom": "Nos",
				"is_stock_item": 0
			}).insert(ignore_permissions=True)

		# Create Draft Sales Invoice
		si = frappe.get_doc({
			"doctype": "Sales Invoice",
			"company": company_name,
			"customer": customer_name,
			"currency": "USD",
			"conversion_rate": 1.0,
			"selling_price_list": "Standard Selling",
			"posting_date": today(),
			"items": [{
				"item_code": item.name,
				"qty": 1,
				"rate": 100
			}],
			"taxes": [{
				"charge_type": "On Net Total",
				"account_head": vat_account_name,
				"rate": 15,
				"description": "VAT"
			}]
		})
		
		# Save as Draft
		si.insert()
		
		self.assertTrue(si.name.startswith("DRAFT-INV-"), f"Name {si.name} should start with DRAFT-INV-")
		
		# Submit
		si.reload()
		si.submit()
		
		self.assertFalse(si.name.startswith("DRAFT-INV-"), f"Name {si.name} should NOT start with DRAFT-INV- after submit")
		self.assertEqual(si.docstatus, 1)
		
		# Check if we can load it by new name
		doc = frappe.get_doc("Sales Invoice", si.name)
		self.assertEqual(doc.docstatus, 1)
		self.assertTrue(len(doc.taxes) > 0, "Taxes should be present after rename")
