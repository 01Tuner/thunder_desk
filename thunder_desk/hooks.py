app_name = "thunder_desk"
app_title = "Thunder Desk"
app_publisher = "rafeeq"
app_description = "Desktop app extending erpnext"
app_email = "muhammedrafeeq93@gmail.com"
app_license = "Copyright rafeeq"

# Apps
# ------------------

required_apps = ["erpnext@version-15"]

# Each item in the list will be shown as an app in the apps page
# add_to_apps_screen = [
# 	{
# 		"name": "thunder_desk",
# 		"logo": "/assets/thunder_desk/logo.png",
# 		"title": "Thunder Desk",
# 		"route": "/thunder_desk",
# 		"has_permission": "thunder_desk.api.permission.has_app_permission"
# 	}
# ]

# Includes in <head>
# ------------------


# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "thunder_desk/public/scss/website"


# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
page_js = {
    "print" : "public/js/overrides/print_overrides.js",
    "point-of-sale" : "public/js/pos_overrides.js"
}

# include js in doctype views
doctype_js = {
    "Item" : "public/js/item_overrides.js",
    "Sales Invoice": "public/js/sales_invoice_custom.js",
    "Purchase Invoice": "public/js/purchase_invoice_custom.js"
}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Svg Icons
# ------------------
# include app icons in desk
# app_include_icons = "thunder_desk/public/icons.svg"

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"  # Handled dynamically in before_request

# website user home page (by Role)
# role_home_page = {
# 	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# Jinja
# ----------

# add methods to jinja environment
jinja = {
    "methods": [
        "thunder_desk.utils.barcode.get_barcode_svg"
    ]
}

# Installation
# ------------

# before_install = "thunder_desk.install.before_install"
# after_install = "thunder_desk.install.after_install"

# Uninstallation
# ------------

# before_uninstall = "thunder_desk.uninstall.before_uninstall"
# after_uninstall = "thunder_desk.uninstall.after_uninstall"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "thunder_desk.utils.before_app_install"
# after_app_install = "thunder_desk.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "thunder_desk.utils.before_app_uninstall"
# after_app_uninstall = "thunder_desk.utils.after_app_uninstall"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "thunder_desk.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# DocType Class
# ---------------
# Override standard doctype classes

# override_doctype_class = {
# 	"ToDo": "custom_app.overrides.CustomToDo"
# }

# Document Events
# ---------------
# Hook on document methods and events

doc_events = {
	"Company": {
		"on_update": "thunder_desk.table_logger.log_company_update",
		"after_insert": "thunder_desk.table_logger.log_company_insert",
		# "on_trash": "thunder_desk.table_logger.log_company_delete"
	},
	"Item Price": {
		"after_insert": "thunder_desk.side_effects.update_item_standard_rate_from_price_list",
		"on_update": "thunder_desk.side_effects.update_item_standard_rate_from_price_list",
	},
    "Purchase Invoice": {
        "on_submit": "thunder_desk.api.update_item_selling_price"
    }
}

# Scheduled Tasks
# ---------------

# scheduler_events = {
# 	"all": [
# 		"thunder_desk.tasks.all"
# 	],
# 	"daily": [
# 		"thunder_desk.tasks.daily"
# 	],
# 	"hourly": [
# 		"thunder_desk.tasks.hourly"
# 	],
# 	"weekly": [
# 		"thunder_desk.tasks.weekly"
# 	],
# 	"monthly": [
# 		"thunder_desk.tasks.monthly"
# 	],
# }

# Testing
# -------

# before_tests = "thunder_desk.install.before_tests"

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "thunder_desk.event.get_events"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "thunder_desk.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
# before_request = ["thunder_desk.utils.before_request"]
# after_request = ["thunder_desk.utils.after_request"]

# Job Events
# ----------
# before_job = ["thunder_desk.utils.before_job"]
# after_job = ["thunder_desk.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
# 	{
# 		"doctype": "{doctype_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_2}",
# 		"filter_by": "{filter_by}",
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_3}",
# 		"strict": False,
# 	},
# 	{
# 		"doctype": "{doctype_4}"
# 	}
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"thunder_desk.auth.validate"
# ]

# Automatically update python controller files with type annotations for this app.
# export_python_type_annotations = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }

# Global includes to replace ERPNext headers with modern dropdown menu
app_include_js = [
    "/assets/thunder_desk/js/windows_style_menu.js",
]

app_include_css = [
    "/assets/thunder_desk/css/windows_style_menu.css",
    "/assets/thunder_desk/css/global_no_sidebar.css"
]

# Fixtures
# --------
fixtures = [
    {
        "dt": "Custom Field",
        "filters": [
            ["dt", "in", ["Purchase Invoice", "Purchase Invoice Item"]]
        ]
    }
]

# Override the main document refresh to include module header menu
# override_whitelisted_methods = {
#     "frappe.model.document.get_doc": "thunder_desk.overrides.document.get_doc_with_dashboard_menu"
# }
