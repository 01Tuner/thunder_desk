
// Sales Invoice Custom Script
// Adds "Item History" feature to view sales/purchase rate history for items in the grid.

frappe.ui.form.on('Sales Invoice', {
    refresh: function (frm) {
        frappe.require('/assets/thunder_desk/js/item_history.js', function () {
            if (window.thunder_desk && thunder_desk.item_history) {
                thunder_desk.item_history.setup(frm, {
                    child_table: 'items',
                    child_doctype: 'Sales Invoice Item',
                    doctype_type: 'selling',
                    party_field: 'customer'
                });
            }
        });
    }
});

// Capture Item Code change to update global active item immediately
frappe.ui.form.on('Sales Invoice Item', {
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

// Extended Item Search: shows available qty in the item_code dropdown.
// Only active when show_item_qty_in_search is enabled in Thunder Desk Settings
// and the site is single-company (multi-company uses global_company_filter.js).
// Placed here (doctype_js) so it runs AFTER ERPNext's own Sales Invoice scripts
// and our set_query is not overridden by the standard query.
frappe.ui.form.on('Sales Invoice', {
    refresh: function (frm) {
        const settings = frappe.boot.thunder_desk?.settings || {};
        const company_count = frappe.boot.thunder_desk?.company_count || 0;

        if (!settings.show_item_qty_in_search || company_count > 1) {
            return;
        }

        const original_query = frm.fields_dict['items']?.grid?.get_field('item_code')?.get_query?.();

        frm.set_query('item_code', 'items', function (doc, cdt, cdn) {
            // Only merge filters that are valid on tabItem.
            // Do NOT forward `customer` here — tabItem has no customer field
            // and passing it causes the query to return zero results.
            const base = (typeof original_query === 'function')
                ? (original_query(doc, cdt, cdn) || {})
                : (original_query || {});
            const safe_filters = Object.fromEntries(
                Object.entries(base.filters || {}).filter(([k]) => k !== 'customer')
            );
            return {
                query: 'thunder_desk.api.get_records_for_company',
                filters: safe_filters
            };
        });
    }
});
