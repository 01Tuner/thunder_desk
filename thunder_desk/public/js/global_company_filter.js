$(document).on('app_ready', function () {
    // Monkey-patch to catch all form setups globally
    const original_setup = frappe.ui.form.ScriptManager.prototype.setup;
    frappe.ui.form.ScriptManager.prototype.setup = function () {
        original_setup.apply(this, arguments);
        const frm = this.frm;
        // Apply filters if DocType has 'company' or our custom 'allowed_companies' field
        if (frm.meta && frm.meta.fields.some(f => ['company'].includes(f.fieldname))) {
            apply_global_company_filters(frm);
        }
        // Apply filters if DocType has 'company' or our custom 'allowed_companies' field
        if (frm.meta && frm.meta.fields.some(f => ['allowed_companies'].includes(f.fieldname))) {
            apply_allowed_companies_filters(frm);
        }
    };
});

function apply_global_company_filters(frm) {

    frappe.ui.form.on(frm.doctype, {
        company: function (frm) {
            // 1. Filter Items by Company in the Child Table
            // This handles the 'item_code' inside the 'items' table

            const merge_filters = (base_filters, company) => {
                let filters = base_filters || {};
                if (Array.isArray(filters)) {
                    filters.push(['company', '=', company]);
                } else {
                    filters['company'] = company;
                }
                return filters;
            };

            const configs = [
                { field: 'item_code', parent: 'items' },
                { field: 'customer' },
                { field: 'supplier' },
                { field: 'supplier', parent: 'suppliers' }
            ];

            configs.forEach(cfg => {
                const check_field = cfg.parent || cfg.field;
                if (!frm.meta || !frm.meta.fields.some(f => f.fieldname === check_field)) return;

                // Safely get existing query
                let current_query;
                if (cfg.parent) {
                    if (!frm.fields_dict[cfg.parent]) return;
                    current_query = frm.fields_dict[cfg.parent]?.grid?.get_field(cfg.field)?.get_query?.();
                } else {
                    current_query = frm.fields_dict[cfg.field]?.get_query?.();
                }

                // Avoid double wrapping: if it's already our filter, use its original_query
                let original_query = (current_query && current_query._is_global_filter)
                    ? current_query._original_query
                    : current_query;

                const fnFilter = function (doc, cdt, cdn) {
                    const base = (typeof original_query === 'function')
                        ? original_query(doc, cdt, cdn)
                        : (original_query || {});

                    return {
                        query: 'thunder_desk.api.get_records_for_company',
                        filters: merge_filters(base.filters, frm.doc.company)
                    };
                };

                // Store metadata on the function for transparency
                fnFilter._is_global_filter = true;
                fnFilter._original_query = original_query;

                if (cfg.parent) {
                    frm.set_query(cfg.field, cfg.parent, fnFilter);
                } else {
                    frm.set_query(cfg.field, fnFilter);
                }
            });
        }
    });
}

function apply_allowed_companies_filters(frm) {

    // Filter Linked Companies to avoid duplicates in selection list
    if (frm.fields_dict['allowed_companies']) {
        frm.set_query('company', 'allowed_companies', function (doc, cdt, cdn) {
            let existing_companies = (doc.allowed_companies || [])
                .filter(row => row.company && row.name !== cdn) // Use cdn to identify currently editing row
                .map(row => row.company);

            return {
                filters: [
                    ['Company', 'name', 'not in', existing_companies]
                ]
            };
        });
    }

    // Default the company when adding a row to Allowed Company table
    frappe.ui.form.on('Allowed Company', {
        allowed_companies_add: function (frm, cdt, cdn) {
            let child = locals[cdt][cdn];
            if (Object.keys(locals[cdt]).length === 1 && child.__islocal && child.__unedited && child.__unsaved) {
                frappe.model.set_value(cdt, cdn, 'company', frappe.defaults.get_user_default("company"));
            } else {
                frappe.model.set_value(cdt, cdn, 'company', '');
            }
        },
        company: function (frm, cdt, cdn) {
            let child = locals[cdt][cdn];
            if (child.company) {
                let row_count = 0;
                frm.doc.allowed_companies.forEach(row => {
                    if (row.company === child.company) {
                        row_count++;
                    }
                });

                if (row_count > 1) {
                    frappe.model.set_value(cdt, cdn, 'company', '');
                    frappe.msgprint(__('Company {0} is already added in the list', [child.company]));
                }
            }
        }
    });
}