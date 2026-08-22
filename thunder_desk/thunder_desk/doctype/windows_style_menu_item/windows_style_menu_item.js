// Copyright (c) 2026, Thunder Desk and contributors
// For license information, please see license.txt

frappe.ui.form.on("Windows Style Menu Item", {
	setup(frm) {
		frm.set_query("parent_item", () => ({
			filters: {
				menu: frm.doc.menu,
				item_type: "Group",
				name: ["!=", frm.doc.name || ""],
			},
		}));
	},
	item_type(frm) {
		frm.set_value("is_group", frm.doc.item_type === "Group" ? 1 : 0);
		if (frm.doc.item_type === "Group") {
			frm.set_value("link_doctype", "");
			frm.set_value("report_name", "");
			frm.set_value("route", "");
		}
	},
});
