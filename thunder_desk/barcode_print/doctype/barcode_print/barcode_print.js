frappe.ui.form.on('Barcode Print', {
    refresh: function (frm) {
        // Set filters for price lists
        frm.set_query('selling_price_list', () => {
            return {
                filters: {
                    selling: 1
                }
            };
        });

        frm.set_query('buying_price_list', () => {
            return {
                filters: {
                    buying: 1
                }
            };
        });

        // Set default price lists if not already set
        if (!frm.doc.selling_price_list) {
            frappe.db.get_single_value('Selling Settings', 'selling_price_list').then(selling_price_list => {
                if (selling_price_list) {
                    frm.set_value('selling_price_list', selling_price_list);
                }
            });
        }

        if (!frm.doc.buying_price_list) {
            frappe.db.get_single_value('Buying Settings', 'buying_price_list').then(buying_price_list => {
                if (buying_price_list) {
                    frm.set_value('buying_price_list', buying_price_list);
                }
            });
        }

        // Add custom buttons
        if (!frm.is_new()) {
            frm.add_custom_button(__('Print Barcodes'), function () {
                if (frm.doc.items_table && frm.doc.items_table.length > 0) {
                    frappe.route_options = { "format": "Barcode Print" };
                    frappe.set_route('print', frm.doc.doctype, frm.doc.name);
                } else {
                    frappe.show_alert({
                        message: __('No barcodes to print. Please add items.'),
                        indicator: 'red'
                    });
                }
            });
        }

        // No parent quantity; quantities are per row
    }
});

// Update existing items when price lists change
frappe.ui.form.on('Barcode Print', {
    selling_price_list: function (frm) {
        update_existing_item_prices(frm);
    },
    buying_price_list: function (frm) {
        update_existing_item_prices(frm);
    },
    apply_tax_in_price: function (frm) {
        update_existing_item_prices(frm);
    }
});

// Function to update prices for all existing items in the table
function update_existing_item_prices(frm) {
    if (!frm.doc.items_table || !frm.doc.items_table.length) {
        return;
    }

    frm.doc.items_table.forEach(function (row) {
        if (row.item_code && row.item_name) { // Only update rows that have items
            update_item_prices(frm, row);
        }
    });
}

// Function to update prices for a specific item
function update_item_prices(frm, row) {
    const sellingPriceList = frm.doc.selling_price_list;
    const buyingPriceList = frm.doc.buying_price_list;
    const applyTax = frm.doc.apply_tax_in_price;

    // Update selling price if selling price list is available
    if (sellingPriceList) {
        if (applyTax) {
            frappe.call({
                method: 'thunder_desk.barcode_print.doctype.barcode_print.barcode_print.get_item_price_with_tax',
                args: {
                    item_code: row.item_code,
                    company: frappe.defaults.get_default("company"),
                    price_list: sellingPriceList
                },
                callback: function (r) {
                    row.price = r.message || 0;
                    frm.refresh_field('items_table');
                }
            });
        } else {
            frappe.db.get_value('Item Price', { item_code: row.item_code, price_list: sellingPriceList }, 'price_list_rate').then(pr => {
                row.price = (pr && pr.message && pr.message.price_list_rate) || 0;
                frm.refresh_field('items_table');
            });
        }
    } else {
        row.price = 0;
    }

    // Update buying price if buying price list is available
    if (buyingPriceList) {
        // Buying price usually doesn't need tax application for printing labels, but if needed we can add similar logic.
        // For now keeping it as is.
        frappe.db.get_value('Item Price', { item_code: row.item_code, price_list: buyingPriceList }, 'price_list_rate').then(bpr => {
            row.buying_price = (bpr && bpr.message && bpr.message.price_list_rate) || 0;
            frm.refresh_field('items_table');
        });
    } else {
        row.buying_price = 0;
        frm.refresh_field('items_table');
    }
}

// Auto-populate child row when Item is selected
frappe.ui.form.on('Barcode Print Item', {
    item_code: function (frm, cdt, cdn) {
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
                callback: function (r) {
                    const barcodes = r.message || [];
                    if (barcodes.length) {
                        // pick the first barcode by default
                        row.barcode = barcodes[0].barcode;
                        row.barcode_type = barcodes[0].type;
                        row.uom = barcodes[0].uom;
                    } else {
                        frappe.show_alert({
                            message: __('Barcode not found. Setting Item Code as barcode.'),
                            indicator: 'orange'
                        });
                        // Fallback: use item code as barcode
                        row.barcode = item.item_code;
                        row.barcode_type = 'CODE128';
                    }
                    if (!row.quantity) row.quantity = 1;

                    // fetch selling price using selling_price_list from parent form
                    const sellingPriceList = frm.doc.selling_price_list;
                    const applyTax = frm.doc.apply_tax_in_price;

                    if (sellingPriceList) {
                        if (applyTax) {
                            frappe.call({
                                method: 'thunder_desk.barcode_print.doctype.barcode_print.barcode_print.get_item_price_with_tax',
                                args: {
                                    item_code: item.name,
                                    company: frappe.defaults.get_default("company"),
                                    price_list: sellingPriceList
                                },
                                callback: function (r) {
                                    row.price = r.message || 0;
                                    update_buying_price(frm, row, item.name);
                                }
                            });
                        } else {
                            frappe.db.get_value('Item Price', { item_code: item.name, price_list: sellingPriceList }, 'price_list_rate').then(pr => {
                                row.price = (pr && pr.message && pr.message.price_list_rate) || 0;
                                update_buying_price(frm, row, item.name);
                            });
                        }
                    } else {
                        // No selling price list set, set both prices to 0
                        row.price = 0;
                        row.buying_price = 0;
                        frm.refresh_field('items_table');
                    }
                }
            });
        });
    }
});

function update_buying_price(frm, row, item_code) {
    // fetch buying price using buying_price_list from parent form
    const buyingPriceList = frm.doc.buying_price_list;
    if (buyingPriceList) {
        frappe.db.get_value('Item Price', { item_code: item_code, price_list: buyingPriceList }, 'price_list_rate').then(bpr => {
            row.buying_price = (bpr && bpr.message && bpr.message.price_list_rate) || 0;
            frm.refresh_field('items_table');
        });
    } else {
        // No buying price list set, set buying_price to 0
        row.buying_price = 0;
        frm.refresh_field('items_table');
    }
}

