import frappe
from frappe import _

def get_context(context):
    """Set context for thunder login page"""

    # Redirect if already logged in
    if frappe.session.user != "Guest":
        frappe.local.flags.redirect_location = "/dashboard"
        raise frappe.Redirect

    # Set page context
    try:
        provider_name = frappe.db.get_single_value("System Settings", "app_name") or "Thunder POS"
    except:
        provider_name = "Thunder POS"

    context.update({
        "title": _("Thunder POS Login"),
        "provider_name": provider_name,
        "disable_signup": True,
        "hide_footer": True,
        "hide_navbar": True
    })

    return context