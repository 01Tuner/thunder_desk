// Copyright (c) 2026, Thunder Desk and contributors
// For license information, please see license.txt

frappe.ui.form.on("Windows Style Menu", {
	refresh(frm) {
		frm.add_custom_button(__("Manage Items"), () => {
			frappe.set_route("List", "Windows Style Menu Item", {
				menu: frm.doc.name,
			});
		});
	},
});
