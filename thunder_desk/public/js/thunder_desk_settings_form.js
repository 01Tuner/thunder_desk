// Copyright (c) 2026, Thunder Desk and contributors
// For license information, please see license.txt

frappe.ui.form.on("Thunder Desk Settings", {
	refresh(frm) {
		frm.add_custom_button(__("Open Menu Manager"), () => {
			frappe.set_route("thunder-desk-config");
		});
		frm.set_intro(
			__(
				"Use <a href='/app/thunder-desk-config'>Thunder Desk Settings (Menu Manager)</a> for tabs: General, Windows Style Menu, Dashboard Menu, and Quick Actions."
			),
			"blue"
		);
	},
});
