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
			"account_name": "Bank",
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
			"account_name": "Card",
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
			"account_name": "Cheque",
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

	for config in PAYMENT_MODES:
		mode_doc = get_or_create_mode_of_payment(config)
		accounts_updated = sync_mode_of_payment_accounts(mode_doc, companies, config["account"])

		if accounts_updated or mode_doc.get_dirty_fields():
			mode_doc.save(ignore_permissions=True)


def get_or_create_mode_of_payment(config):
	doc_name = frappe.db.exists("Mode of Payment", config["name"])

	if doc_name:
		doc = frappe.get_doc("Mode of Payment", doc_name)
	else:
		doc = frappe.new_doc("Mode of Payment")
		doc.mode_of_payment = config["name"]

	doc.enabled = 1
	doc.type = config["type"]
	doc.custom_zatca_payment_means_code = config["zatca_code"]

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

	if default_parent_source:
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

