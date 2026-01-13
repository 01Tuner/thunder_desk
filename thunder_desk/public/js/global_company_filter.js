$(document).on('app_ready', function () {
    // 1. Monkey-patch to catch all form setups globally
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

    // We listen to route changes to robustly apply the filter to any List view
    frappe.router.on('change', () => {
        const route = frappe.get_route();
        if (route[0] === 'List' && route[1]) {
            const doctype = route[1];

            // Wait for list to be ready
            frappe.model.with_doctype(doctype, function () {
                const company = frappe.defaults.get_user_default("company");
                if (!company) {
                    return;
                }

                const meta = frappe.get_meta(doctype);
                if (!meta) return;

                // Determine filter strategy
                let use_standard_company = meta.fields.some(f => f.fieldname === 'company');
                let use_allowed_companies = ['Customer', 'Supplier', 'Item'].includes(doctype) &&
                    meta.fields.some(f => f.fieldname === 'allowed_companies');

                // If no relevant fields, exit
                if (!use_standard_company && !use_allowed_companies) return;

                // Check for forced switch flag
                const forced_switch = localStorage.getItem('company_switched_flag');
                if (forced_switch) {
                    localStorage.removeItem('company_switched_flag');
                }

                // Slight delay to ensure cur_list is active and filter_area ready
                setTimeout(() => {
                    if (window.cur_list && cur_list.doctype === doctype) {

                        // STRATEGY A: Standard 'company' field
                        if (use_standard_company) {
                            // 1. Check for Standard Filter (Dropdown in the list header)
                            if (cur_list.page && cur_list.page.fields_dict && cur_list.page.fields_dict['company']) {
                                const company_field = cur_list.page.fields_dict['company'];
                                const actual_val = company_field.get_value();

                                if (forced_switch || actual_val !== company) {
                                    company_field.set_value(company);
                                }
                                return; // Done, standard filter takes precedence
                            }

                            // 2. Check Filter Area
                            apply_list_filter(cur_list, 'company', company, forced_switch);
                        }

                        // STRATEGY B: 'allowed_companies' child table
                        else if (use_allowed_companies) {
                            // Fieldname in filter list for child table is usually [ChildDocType, ChildField]
                            // We want: ['Allowed Company', 'company', 'in', [session_company]]
                            // User requested 'in' operator to help with global items (query backend likely handles this)
                            apply_list_filter(cur_list, ['Allowed Company', 'company'], company + ', ', forced_switch, 'in');
                        }
                    }
                }, 500);
            });
        }
    });
});

function apply_list_filter(list_view, field_def, value, force_remove, operator = '=') {
    if (!list_view.filter_area) return;

    const filter_list = list_view.filter_area.filter_list;
    let filter_exists = false;

    // Determine how to verify the field name
    const match_filter = (f) => {
        if (Array.isArray(field_def)) {
            return f.doctype === field_def[0] && f.fieldname === field_def[1];
        } else {
            return f.fieldname === field_def;
        }
    };

    if (filter_list && filter_list.filters) {
        // Iterate backwards to safely remove items
        for (let i = filter_list.filters.length - 1; i >= 0; i--) {
            let f = filter_list.filters[i];

            if (match_filter(f)) {
                let current_val = f.value;
                if (typeof f.get_value === 'function') {
                    current_val = f.get_value();
                }

                // Handle complex values or arrays
                let val_to_check = current_val;
                if (Array.isArray(current_val) && current_val.length > 1) {
                    // standard filter value array might be [op, val] or [val]
                    // If operator is 'in', val is likely an array inside?
                    // Let's simplify: check if it conceptually matches
                }

                // Simply check if we should remove it
                // Logic: remove if forced OR value doesn't match
                // For 'in', exact match is tricky if arrays are different objects
                // We'll rely on string comparison just for simplicity or force_remove logic

                let matches = false;
                if (operator === 'in') {
                    // Expect value to be in current_val array? Or current_val to be equal to [value]?
                    // User said "value current company". We will use [company].
                    // Assume strict match of the array content if possible, or just primary value
                    if (Array.isArray(current_val) && current_val.includes(value)) matches = true;
                    // Also support if current_val is the string itself (legacy equal treated as in?)
                    if (current_val === value) matches = true;
                } else {
                    if (current_val === value) matches = true;
                }

                if (force_remove || !matches) {
                    // Found a stale or mismatched filter, remove it
                    f.remove();
                } else {
                    filter_exists = true;
                }
            }
        }
    }

    if (!filter_exists) {
        // Apply default filter
        let final_val = value;
        if (operator === 'in' && !Array.isArray(value)) {
            final_val = [value];
        }

        let filter_obj;
        if (Array.isArray(field_def)) {
            filter_obj = [field_def[0], field_def[1], operator, final_val];
        } else {
            filter_obj = [list_view.doctype, field_def, operator, final_val];
        }

        list_view.filter_area.add([filter_obj]);
    }
}

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