import frappe
from frappe import request


def before_request():
    """
    Handle home page routing based on request source.
    If request is from Tauri app, redirect to thunder_login only for specific scenarios.
    Otherwise, let normal Frappe behavior handle it.
    """
    # Only handle GET requests
    if request.method != 'GET':
        return

    # Skip if user is already logged in and not on root path
    if frappe.session.user != "Guest" and request.path != '/':
        return

    # Check if request is from Tauri app
    user_agent = request.headers.get('User-Agent', '')
    is_tauri_request = 'tauri' in user_agent.lower()

    # Only redirect Tauri requests to root path or when accessing login-related paths
    if is_tauri_request and request.path in ['/', '/login', '/desk']:
        # For logged-in users, redirect to Thunder Desk dashboard
        if frappe.session.user != "Guest":
            frappe.local.flags.redirect_location = '/dashboard'
        else:
            frappe.local.flags.redirect_location = '/thunder_login'
        raise frappe.Redirect