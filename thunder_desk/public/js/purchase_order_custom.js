// Purchase Order Custom Script
// Adds "Item History" feature to view sales/purchase rate history for items in Purchase Order.

frappe.ui.form.on('Purchase Order', {
    refresh: function (frm) {
        frappe.require('/assets/thunder_desk/js/item_history.js', function () {
            if (window.thunder_desk && thunder_desk.item_history) {
                thunder_desk.item_history.setup(frm, {
                    child_table: 'items',
                    child_doctype: 'Purchase Order Item',
                    doctype_type: 'buying',
                    party_field: 'supplier'
                });
            }
        });
    }
});

frappe.ui.form.on('Purchase Order Item', {
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
