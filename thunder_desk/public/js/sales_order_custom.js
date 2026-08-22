// Sales Order Custom Script
// Adds "Item History" feature to view sales/purchase rate history for items in Sales Order.

frappe.ui.form.on('Sales Order', {
    refresh: function (frm) {
        frappe.require('/assets/thunder_desk/js/item_history.js', function () {
            if (window.thunder_desk && thunder_desk.item_history) {
                thunder_desk.item_history.setup(frm, {
                    child_table: 'items',
                    child_doctype: 'Sales Order Item',
                    doctype_type: 'selling',
                    party_field: 'customer'
                });
            }
        });
    }
});

frappe.ui.form.on('Sales Order Item', {
    item_code: function (frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (row && row.item_code) {
            frm.active_item_payload = {
                item_code: row.item_code,
                item_name: row.item_name
            };
        }
    }
});
