
frappe.ui.form.on("Purchase Invoice", {
    refresh: function (frm) {
        // Trigger visibility check on load
        frm.trigger("toggle_selling_price_column");

        // Setup Item History
        frappe.require('/assets/thunder_desk/js/item_history.js', function () {
            if (window.thunder_desk && thunder_desk.item_history) {
                thunder_desk.item_history.setup(frm, {
                    child_table: 'items',
                    child_doctype: 'Purchase Invoice Item',
                    doctype_type: 'buying',
                    party_field: 'supplier'
                });
            }
        });
    },
    update_selling_price: function (frm) {
        frm.trigger("toggle_selling_price_column");
        if (frm.doc.update_selling_price) {
            // Optional: specific logic when enabled, maybe trigger recalc?
            frm.trigger("calculate_all_selling_prices");
        }
    },
    margin_type: function (frm) {
        if (frm.doc.update_selling_price) {
            frm.trigger("calculate_all_selling_prices");
        }
    },
    margin_rate: function (frm) {
        if (frm.doc.update_selling_price) {
            frm.trigger("calculate_all_selling_prices");
        }
    },
    toggle_selling_price_column: function (frm) {
        let grid = frm.fields_dict["items"]?.grid;
        if (!grid) return;
        if (frm.doc.update_selling_price) {
            grid.update_docfield_property("selling_price", "hidden", 0);
        } else {
            grid.update_docfield_property("selling_price", "hidden", 1);
        }
        grid.refresh();
    },
    calculate_all_selling_prices: function (frm) {
        (frm.doc.items || []).forEach(item => {
            frm.events.calculate_item_selling_price(frm, item);
        });
        frm.refresh_field("items");
    },
    calculate_item_selling_price: function (frm, item) {
        if (!frm.doc.update_selling_price) return;

        let rate = flt(item.rate);
        let margin_rate = flt(frm.doc.margin_rate);
        let selling_price = 0;

        if (frm.doc.margin_type === "Percentage") {
            selling_price = rate + (rate * margin_rate / 100);
        } else {
            // Amount
            selling_price = rate + margin_rate;
        }

        frappe.model.set_value(item.doctype, item.name, "selling_price", selling_price);
    }
});

frappe.ui.form.on("Purchase Invoice Item", {
    item_code: function (frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (row && row.item_code) {
            frm.active_item_payload = {
                item_code: row.item_code,
                item_name: row.item_name
            };
        }
    },
    rate: function (frm, doctype, name) {
        if (frm.doc.update_selling_price) {
            let item = frappe.get_doc(doctype, name);
            frm.events.calculate_item_selling_price(frm, item);
        }
    },
    // If we want individual overrides later, we can add logic here.
    // For now, manual edit is allowed and persistent until global param changes.
});
