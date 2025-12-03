import frappe

def execute():
	frappe.reload_doc("website", "doctype", "website_settings")
	
	# Add redirect from / to /dashboard
	website_settings = frappe.get_single("Website Settings")
	
	# Check if redirect already exists to avoid duplicates
	redirect_exists = False
	for row in website_settings.route_redirects:
		if row.source == "/" and row.target == "/dashboard":
			redirect_exists = True
			break
	
	if not redirect_exists:
		website_settings.append("route_redirects", {
			"source": "/",
			"target": "/dashboard"
		})
		website_settings.save()
