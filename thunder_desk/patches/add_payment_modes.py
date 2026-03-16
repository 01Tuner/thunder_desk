import frappe

PAYMENT_MODES = [
	{
		"name": "CASH",
		"type": "Cash",
		"zatca_code": "10",
		"account": {
			"account_name": "Cash",
			"account_type": "Cash",
			"root_type": "Asset",
			"default_account_field": "default_cash_account",
		},
	},
	{
		"name": "BANK",
		"type": "Bank",
		"zatca_code": "42",
		"account": {
			"account_name": "Primary Bank",
			"account_type": "Bank",
			"root_type": "Asset",
			"default_account_field": "default_bank_account",
		},
	},
	{
		"name": "CARD",
		"type": "General",
		"zatca_code": "48",
		"account": {
			"account_name": "Primary Bank",
			"account_type": "Bank",
			"root_type": "Asset",
			"default_account_field": "default_bank_account",
		},
	},
	{
		"name": "CHEQUE",
		"type": "Bank",
		"zatca_code": "20",
		"account": {
			"account_name": "Primary Bank",
			"account_type": "Bank",
			"root_type": "Asset",
			"default_account_field": "default_bank_account",
		},
	},
]

DEFAULT_REPORT_TYPE = "Balance Sheet"


def execute():
	frappe.reload_doc("accounts", "doctype", "mode_of_payment")
	frappe.reload_doc("accounts", "doctype", "mode_of_payment_account")

	if frappe.get_all("Mode of Payment", limit=1):
		return

	companies = frappe.get_all(
		"Company",
		fields=[
			"name",
			"default_currency",
			"default_cash_account",
			"default_bank_account",
		],
	)

	if not companies:
		return

	for company in companies:
		# Create Primary Bank account first
		primary_bank_config = {
			"account_name": "Primary Bank",
			"account_type": "Bank",
			"root_type": "Asset",
		}
		get_or_create_account(company, primary_bank_config)

	setup_default_bank_account(companies)

	for config in PAYMENT_MODES:
		mode_doc = get_or_create_mode_of_payment(config)
		accounts_updated = sync_mode_of_payment_accounts(mode_doc, companies, config["account"])

		if accounts_updated or mode_doc.is_new() or mode_doc.flags.is_dirty:
			mode_doc.save(ignore_permissions=True)


def get_or_create_mode_of_payment(config):
	doc_name = frappe.db.exists("Mode of Payment", config["name"])

	if doc_name:
		doc = frappe.get_doc("Mode of Payment", doc_name)
	else:
		doc = frappe.new_doc("Mode of Payment")
		doc.mode_of_payment = config["name"]

	if doc.enabled != 1:
		doc.enabled = 1
		doc.flags.is_dirty = True

	if doc.type != config["type"]:
		doc.type = config["type"]
		doc.flags.is_dirty = True

	if doc.custom_zatca_payment_means_code != config["zatca_code"]:
		doc.custom_zatca_payment_means_code = config["zatca_code"]
		doc.flags.is_dirty = True

	return doc


def sync_mode_of_payment_accounts(mode_doc, companies, account_config):
	accounts_modified = False

	for company in companies:
		account_name = get_or_create_account(company, account_config)

		if not account_name:
			continue

		accounts_modified |= upsert_mode_of_payment_account(mode_doc, company["name"], account_name)

	return accounts_modified


def upsert_mode_of_payment_account(mode_doc, company_name, account_name):
	for row in mode_doc.accounts:
		if row.company == company_name:
			if row.default_account != account_name:
				row.default_account = account_name
				return True
			return False

	mode_doc.append(
		"accounts",
		{
			"company": company_name,
			"default_account": account_name,
		},
	)
	return True


def get_or_create_account(company, account_config):
	existing_account = frappe.db.get_value(
		"Account",
		{
			"company": company["name"],
			"account_name": account_config["account_name"],
			"is_group": 0,
		},
		"name",
	)

	if existing_account:
		return existing_account

	parent_account = get_parent_account(company, account_config)

	if not parent_account:
		return None

	account_doc = frappe.get_doc(
		{
			"doctype": "Account",
			"account_name": account_config["account_name"],
			"company": company["name"],
			"parent_account": parent_account,
			"is_group": 0,
			"root_type": account_config.get("root_type", "Asset"),
			"report_type": account_config.get("report_type", DEFAULT_REPORT_TYPE),
			"account_type": account_config.get("account_type"),
			"account_currency": company.get("default_currency"),
		}
	)

	account_doc.insert(ignore_permissions=True)

	return account_doc.name


def get_parent_account(company, account_config):
	default_parent_source = account_config.get("default_account_field")
	parent_account = None

	# If it's a bank account, try to find the "Bank Accounts" group first
	if account_config.get("account_type") == "Bank":
		parent_account = frappe.db.get_value(
			"Account",
			{"company": company["name"], "account_name": "Bank Accounts", "is_group": 1},
			"name",
		)

	if not parent_account and default_parent_source:
		default_account = company.get(default_parent_source)

		if default_account:
			parent_account = frappe.db.get_value("Account", default_account, "parent_account")

	if not parent_account:
		parent_account = get_first_group_account(
			company["name"], account_config.get("root_type", "Asset"), DEFAULT_REPORT_TYPE
		)

	return parent_account


def get_first_group_account(company_name, root_type, report_type):
	result = frappe.get_all(
		"Account",
		fields=["name"],
		filters={
			"company": company_name,
			"root_type": root_type,
			"report_type": report_type,
			"is_group": 1,
		},
		order_by="lft asc",
		limit=1,
	)

	return result[0].name if result else None


def setup_default_bank_account(companies):
	bank_name = get_or_create_bank()

	for company in companies:
		# Find the Primary Bank GL account for this company
		bank_account_gl = frappe.db.get_value(
			"Account",
			{
				"company": company["name"],
				"account_name": "Primary Bank",
				"account_type": "Bank",
				"is_group": 0,
			},
			"name",
		)

		if not bank_account_gl:
			continue

		# Check if "Primary Bank" Bank Account already exists
		existing = frappe.db.get_value(
			"Bank Account",
			{"account_name": "Primary Bank", "company": company["name"]},
			"name",
		)

		if existing:
			bank_account_name = existing
		else:
			ba_doc = frappe.get_doc(
				{
					"doctype": "Bank Account",
					"account_name": "Primary Bank",
					"company": company["name"],
					"bank": bank_name,
					"account": bank_account_gl,
					"is_default": 1,
					"is_company_account": 1,
				}
			)
			ba_doc.insert(ignore_permissions=True)
			bank_account_name = ba_doc.name

		# Ensure is_default is set
		if not frappe.db.get_value("Bank Account", bank_account_name, "is_default"):
			frappe.db.set_value("Bank Account", bank_account_name, "is_default", 1)

		# Set as the company default_bank_account if not already set
		if not company.get("default_bank_account"):
			frappe.db.set_value(
				"Company", company["name"], "default_bank_account", bank_account_gl
			)


def get_or_create_bank():
	bank_name = "Primary Bank"
	if not frappe.db.exists("Bank", bank_name):
		doc = frappe.get_doc(
			{
				"doctype": "Bank",
				"bank_name": bank_name,
			}
		)
		doc.insert(ignore_permissions=True)
		return doc.name

	return bank_name