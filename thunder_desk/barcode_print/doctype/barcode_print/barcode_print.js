frappe.ui.form.on('Barcode Print', {
    refresh: function(frm) {
        // Add custom buttons
        frm.add_custom_button(__('Print Barcodes'), function() {
            if (frm.doc.items_table && frm.doc.items_table.length > 0) {
                const print_url = `/app/print/${encodeURIComponent(frm.doc.doctype)}/${encodeURIComponent(frm.doc.name)}?format=${encodeURIComponent('Barcode Print')}&no_letterhead=1`;
                window.open(print_url, '_blank');
            } else {
                frappe.show_alert({
                    message: __('No barcodes to print. Please add items.'),
                    indicator: 'red'
                });
            }
        });

        // No parent quantity; quantities are per row
    }
});

// Auto-populate child row when Item is selected
frappe.ui.form.on('Barcode Print Item', {
    item_code: function(frm, cdt, cdn) {
        const row = frappe.get_doc(cdt, cdn);
        if (!row.item_code) {
            return;
        }

        frappe.db.get_doc('Item', row.item_code).then(item => {
            row.item_name = item.item_name;
            // fetch barcodes for the item
            frappe.call({
                method: 'thunder_desk.barcode_print.doctype.barcode_print.barcode_print.get_item_barcodes',
                args: { item_code: item.name },
                callback: function(r) {
                    const barcodes = r.message || [];
                    if (barcodes.length) {
                        // pick the first barcode by default
                        row.barcode = barcodes[0].barcode;
                        row.barcode_type = barcodes[0].type;
                        row.uom = barcodes[0].uom;
                    } else {
                        frappe.show_alert({
                            message: __('No barcodes found for this item.'),
                            indicator: 'orange'
                        });
                        row.barcode = '';
                        row.barcode_type = 'CODE128';
                    }
                    if (!row.quantity) row.quantity = 1;
                    // fetch price
                    frappe.db.get_single_value('Selling Settings', 'selling_price_list').then(price_list => {
                        const priceFilters = price_list ? { item_code: item.name, price_list: price_list } : { item_code: item.name, selling: 1 };
                        frappe.db.get_value('Item Price', priceFilters, 'price_list_rate').then(pr => {
                            row.price = (pr && pr.message && pr.message.price_list_rate) || 0;
                            frm.refresh_field('items_table');
                        });
                    });
                }
            });
        });
    }
});
