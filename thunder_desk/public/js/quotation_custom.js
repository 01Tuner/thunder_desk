// Quotation Custom Script
// Adds "Item History" feature to view sales/purchase rate history for items in Quotation.

frappe.ui.form.on('Quotation', {
    refresh: function (frm) {
        frappe.require('/assets/thunder_desk/js/item_history.js', function () {
            if (window.thunder_desk && thunder_desk.item_history) {
                thunder_desk.item_history.setup(frm, {
                    child_table: 'items',
                    child_doctype: 'Quotation Item',
                    doctype_type: 'selling',
                    party_field: 'party_name'
                });
            }
        });
    }
});

frappe.ui.form.on('Quotation Item', {
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

// Extended Item Search: shows available qty / valuation rate in the item_code dropdown.
frappe.ui.form.on('Quotation', {
    refresh: function (frm) {
        const settings = frappe.boot.thunder_desk?.settings || {};
        const company_count = frappe.boot.thunder_desk?.company_count || 0;

        if ((!settings.show_item_qty_in_search && !settings.show_item_valuation_rate_in_search) || company_count > 1) {
            return;
        }

        const original_query = frm.fields_dict['items']?.grid?.get_field('item_code')?.get_query?.();

        frm.set_query('item_code', 'items', function (doc, cdt, cdn) {
            const base = (typeof original_query === 'function')
                ? (original_query(doc, cdt, cdn) || {})
                : (original_query || {});
            const safe_filters = Object.fromEntries(
                Object.entries(base.filters || {}).filter(([k]) => !['customer', 'party_name', 'quotation_to'].includes(k))
            );
            return {
                query: 'thunder_desk.api.get_records_for_company',
                filters: safe_filters
            };
        });
    }
});
