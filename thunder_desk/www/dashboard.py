import frappe
from frappe import _


def get_context(context):
    """Set context for Thunder Desk dashboard"""
    # Redirect guests to appropriate login page
    if frappe.session.user == "Guest":
        frappe.local.flags.redirect_location = "/login"
        raise frappe.Redirect

    # Check if ERPNext setup is completed
    if not frappe.is_setup_complete():
        frappe.local.flags.redirect_location = "/app/home"
        raise frappe.Redirect

    # Get user info
    user = frappe.get_doc("User", frappe.session.user)

    from thunder_desk.menu_api import (
        get_dashboard_menu,
        get_dashboard_quick_actions,
    )

    modules = get_dashboard_menu()
    quick_actions = get_dashboard_quick_actions()

    settings = frappe.get_single("Thunder Desk Settings")
    appearance = {
        "dm_light_bg": settings.get("dm_light_bg") or "#ffffff",
        "dm_light_hover_bg": settings.get("dm_light_hover_bg") or "#f8f9fa",
        "dm_dark_bg": settings.get("dm_dark_bg") or "#2d2d2d",
        "dm_dark_hover_bg": settings.get("dm_dark_hover_bg") or "#3d3d3d",
        "qa_light_bg": settings.get("qa_light_bg") or "#ffffff",
        "qa_light_hover_bg": settings.get("qa_light_hover_bg") or "#f8f9fa",
        "qa_dark_bg": settings.get("qa_dark_bg") or "#2d2d2d",
        "qa_dark_hover_bg": settings.get("qa_dark_hover_bg") or "#3d3d3d",
    }

    # Set page context
    context.update({
        "title": _("Thunder Desk Dashboard"),
        "user_name": user.full_name or user.name,
        "modules": modules,
        "quick_actions": quick_actions,
        "appearance": appearance,
        "show_sidebar": False,
        "no_cache": True
    })

    return context


@frappe.whitelist()
def get_module_count(doctype):
    """Get count of documents for a module"""
    try:
        if frappe.has_permission(doctype, "read"):
            return frappe.db.count(doctype)
        return 0
    except Exception:
        return 0


def get_modules():
    """Compatibility wrapper — dashboard modules from DocTypes."""
    from thunder_desk.menu_api import get_dashboard_menu

    return get_dashboard_menu()


@frappe.whitelist()
def global_search(text, start=0, limit=10):
    """
    Global search that includes:
    1. Modules/Pages
    2. Doctypes (Navigation)
    3. Reports
    4. Global Search (Records)
    """
    start = int(start)
    limit = int(limit)
    results = []
    text = text.lower()

    if start == 0:
        # 1. Search Modules
        modules = get_modules()
        for module in modules:
            # Search Module Title
            if text in module["title"].lower():
                results.append({
                    "type": "Module",
                    "name": module["title"],
                    "doctype": "Module",
                    "route": f"/dashboard#module-{module['name']}" # Anchor link to module on dashboard
                })
            
            # Search Module Items
            for item in module["items"]:
                label = item["label"]
                if text in label.lower():
                    route = item.get("route")
                    if not route and item.get("doctype"):
                         # Ensure kebab-case for standard doctype routes
                         route = f"/app/{frappe.scrub(item['doctype']).replace('_', '-')}"
                    
                    if route:
                        results.append({
                            "type": "Page",
                            "name": label,
                            "doctype": item.get("doctype") or "Page",
                            "route": route
                        })

        # 2. Search Doctypes (Navigation) - Fallback for doctypes not in modules
        doctypes = frappe.get_user().get_can_read()
        for dt in doctypes:
            if text in dt.lower():
                # Avoid duplicates if already found in modules
                if not any(r["name"] == dt for r in results):
                    results.append({
                        "type": "Doctype",
                        "name": dt,
                        "doctype": "DocType",
                        "route": f"/app/{frappe.scrub(dt).replace('_', '-')}"
                    })
    
    # Limit non-record results
    if len(results) > 5:
        results = results[:5]

    # 3. Search Records using Global Search
    try:
        from frappe.utils.global_search import search
        record_results = search(text, start=start, limit=limit)
        
        for record in record_results:
            results.append({
                "type": "Record",
                "name": record.name,
                "doctype": record.doctype,
                "route": f"/app/{frappe.scrub(record.doctype).replace('_', '-')}/{record.name}"
            })
    except Exception:
        pass

    return results
