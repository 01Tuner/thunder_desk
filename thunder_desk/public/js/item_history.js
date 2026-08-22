// Thunder Desk Item History Module
// Provides item historical sales and purchase rate analysis across Selling & Buying DocTypes.

frappe.provide('thunder_desk.item_history');

thunder_desk.item_history = {
    setup: function (frm, options) {
        options = Object.assign({
            child_table: 'items',
            child_doctype: 'Sales Invoice Item',
            doctype_type: 'selling', // 'selling' or 'buying'
            party_field: 'customer', // 'customer', 'supplier', 'party_name'
        }, options || {});

        // Global active item state
        frm.active_item_payload = null;

        if (!frm.fields_dict[options.child_table]) return;
        const grid = frm.fields_dict[options.child_table].grid;
        if (!grid) return;

        const add_history_button = () => {
            if (!grid.wrapper) return;

            let $download_btn = $(grid.wrapper).find('.grid-download');
            let $existing_btn = $(grid.wrapper).find('.btn-bulk-history');

            if ($existing_btn.length === 0) {
                let $btn = $(`<button type="button" class="btn btn-xs btn-default btn-bulk-history" style="margin-left: 5px;">
                    <i class="fa fa-history"></i> ${__('Item History')}
                </button>`);

                $btn.on('click', function (e) {
                    e.preventDefault();
                    if (!frm.doc.company) {
                        frappe.msgprint(__('Please select a Company first.'));
                        return;
                    }

                    // 1. Use stored active item if present
                    if (frm.active_item_payload && frm.active_item_payload.item_code) {
                        thunder_desk.item_history.show_dialog(frm, frm.active_item_payload.item_code, frm.active_item_payload.item_name, options);
                        return;
                    }

                    // 2. Check for editable/selected grid row
                    let $items_wrapper = frm.fields_dict[options.child_table].$wrapper;
                    let $active_row = $items_wrapper.find('.grid-row.editable-row');
                    if ($active_row.length > 0) {
                        let docname = $active_row.attr('data-name') || $active_row.find('.row-index').attr('data-name');
                        let row = (frm.doc[options.child_table] || []).find(d => d.name == docname);
                        if (row && row.item_code) {
                            thunder_desk.item_history.show_dialog(frm, row.item_code, row.item_name, options);
                            return;
                        }
                    }

                    // 3. If there is only one item row with item_code, use it
                    let rows = (frm.doc[options.child_table] || []).filter(d => d.item_code);
                    if (rows.length === 1) {
                        thunder_desk.item_history.show_dialog(frm, rows[0].item_code, rows[0].item_name, options);
                        return;
                    }

                    frappe.msgprint(__('Please click on an item row to select it first.'));
                });

                if ($download_btn.length > 0) {
                    $download_btn.after($btn);
                } else {
                    let $grid_btns = $(grid.wrapper).find('.grid-buttons');
                    if ($grid_btns.length > 0) {
                        $grid_btns.append($btn);
                    }
                }
            }
        };

        // Track active item when user clicks/focuses on grid row
        if (grid.wrapper) {
            $(grid.wrapper).on('focusin click', '.grid-row', function () {
                let $row = $(this);
                let cdn = $row.attr('data-name') || $row.find('.row-index').attr('data-name');
                if (cdn && locals[options.child_doctype] && locals[options.child_doctype][cdn]) {
                    let row = locals[options.child_doctype][cdn];
                    if (row.item_code) {
                        frm.active_item_payload = {
                            item_code: row.item_code,
                            item_name: row.item_name
                        };
                    }
                }
            });
        }

        // Add button on refresh
        add_history_button();

        // MutationObserver to ensure button stays when grid rerenders
        if (!grid.__history_btn_observer) {
            const observer = new MutationObserver(() => {
                add_history_button();
            });
            let $grid_footer = $(grid.wrapper).find('.grid-footer');
            if ($grid_footer.length) {
                observer.observe($grid_footer[0], { childList: true, subtree: true });
                grid.__history_btn_observer = observer;
            }
        }
    },

    show_dialog: function (frm, item_code, item_name, options) {
        if (!item_code) return;

        const is_buying = options.doctype_type === 'buying';
        let default_party = '';
        if (options.party_field === 'party_name') {
            default_party = frm.doc.quotation_to === 'Customer' ? frm.doc.party_name : '';
        } else {
            default_party = frm.doc[options.party_field] || '';
        }

        const party_field_config = is_buying ? {
            label: __('Supplier'),
            fieldname: 'supplier',
            fieldtype: 'Link',
            options: 'Supplier',
            default: default_party,
            change: () => fetch_and_render(d)
        } : {
            label: __('Customer'),
            fieldname: 'customer',
            fieldtype: 'Link',
            options: 'Customer',
            default: default_party,
            change: () => fetch_and_render(d)
        };

        const fetch_and_render = (dialog) => {
            let customer = !is_buying ? dialog.get_value('customer') : '';
            let supplier = is_buying ? dialog.get_value('supplier') : '';
            let limit = dialog.get_value('limit') || 10;

            dialog.get_field('history_html').$wrapper.html(
                '<div class="text-center text-muted" style="padding: 20px;"><i class="fa fa-spinner fa-spin"></i> ' + __('Loading...') + '</div>'
            );

            frappe.call({
                method: "thunder_desk.utils.get_item_rate_history",
                args: {
                    item_code: item_code,
                    customer: customer,
                    supplier: supplier,
                    company: frm.doc.company || '',
                    limit: limit
                },
                callback: function (r) {
                    if (r.message) {
                        dialog.history_data = r.message;
                        render_history(dialog);
                    } else {
                        dialog.get_field('history_html').$wrapper.html(
                            '<div class="alert alert-warning">' + __('No history found') + '</div>'
                        );
                        dialog.history_data = null;
                    }
                }
            });
        };

        const render_history = (dialog) => {
            let data = dialog.history_data;
            if (!data) return;

            let sales_data = data.sales || {};
            let purchase_data = data.purchase || {};

            const get_rows = (data_map) => {
                let rows = data_map[item_code];
                if (!rows) {
                    let lower = item_code.toLowerCase();
                    let key = Object.keys(data_map).find(k => k.toLowerCase() === lower);
                    if (key) rows = data_map[key];
                }
                return rows || [];
            };

            let sales_rows = get_rows(sales_data);
            let purchase_rows = get_rows(purchase_data);
            let quotation_rows = get_rows(data.quotation || {});

            let default_tab = is_buying ? 'hist-purchase' : 'hist-sales';
            const active_tab = dialog._active_tab || default_tab;

            let html = `
                <style>
                    .history-table-head th {
                        font-size: 12px !important;
                        background-color: var(--table-bg, #f8f9fa);
                    }
                    .history-content .form-tabs-list {
                        z-index: 0 !important;
                        position: static !important;
                    }
                </style>
                <div class="history-content">
                    <div class="form-tabs-list" style="border-bottom: 1px solid #d1d8dd; margin-bottom: 15px;">
                        <ul class="nav form-tabs" role="tablist">
                            <li class="nav-item ${active_tab === 'hist-sales' ? 'active' : ''}">
                                <a class="nav-link ${active_tab === 'hist-sales' ? 'active' : ''} history-tab-link" data-tab="hist-sales" style="cursor: pointer;">${__('Sales')} (${sales_rows.length})</a>
                            </li>
                            <li class="nav-item ${active_tab === 'hist-purchase' ? 'active' : ''}">
                                <a class="nav-link ${active_tab === 'hist-purchase' ? 'active' : ''} history-tab-link" data-tab="hist-purchase" style="cursor: pointer;">${__('Purchases')} (${purchase_rows.length})</a>
                            </li>
                            <li class="nav-item ${active_tab === 'hist-quotation' ? 'active' : ''}">
                                <a class="nav-link ${active_tab === 'hist-quotation' ? 'active' : ''} history-tab-link" data-tab="hist-quotation" style="cursor: pointer;">${__('Quotations')} (${quotation_rows.length})</a>
                            </li>
                        </ul>
                    </div>
                    <div class="tab-content">
                        <div class="tab-pane ${active_tab === 'hist-sales' ? 'active' : ''}" id="hist-sales" style="${active_tab === 'hist-sales' ? '' : 'display: none;'}">
                            ${render_tab_content(sales_rows, 'Sales', dialog.get_value('customer'))}
                        </div>
                        <div class="tab-pane ${active_tab === 'hist-purchase' ? 'active' : ''}" id="hist-purchase" style="${active_tab === 'hist-purchase' ? '' : 'display: none;'}">
                            ${render_tab_content(purchase_rows, 'Purchase', dialog.get_value('supplier'))}
                        </div>
                        <div class="tab-pane ${active_tab === 'hist-quotation' ? 'active' : ''}" id="hist-quotation" style="${active_tab === 'hist-quotation' ? '' : 'display: none;'}">
                            ${render_tab_content(quotation_rows, 'Quotation', dialog.get_value('customer'))}
                        </div>
                    </div>
                </div>
            `;

            let $wrapper = dialog.get_field('history_html').$wrapper;
            $wrapper.html(html);

            $wrapper.find('.history-tab-link').on('click', function (e) {
                e.preventDefault();
                let target = $(this).data('tab');
                dialog._active_tab = target;

                $wrapper.find('.nav-item').removeClass('active');
                $wrapper.find('.nav-link').removeClass('active');
                $(this).addClass('active');
                $(this).parent().addClass('active');

                $wrapper.find('.tab-pane').hide();
                $wrapper.find('#' + target).show();
            });
        };

        const render_tab_content = (rows, type, party_filter) => {
            if (!rows || rows.length === 0) {
                return `<div class="text-muted text-center" style="padding: 20px;">${__('No history found.')}</div>`;
            }

            let display_title = item_name ? `${item_code}: ${item_name}` : item_code;
            let is_purchase = type === 'Purchase';
            let is_sales = type === 'Sales';
            let is_quotation = type === 'Quotation';
            let show_customer = is_sales || is_quotation;
            let show_supplier = is_purchase;
            let show_status = is_quotation;

            let doc_col_label = is_quotation ? __("Quotation") : (is_purchase ? __("Invoice") : __("Invoice"));
            let supplier_th = show_supplier ? `<th>${__("Supplier")}</th>` : '';
            let customer_th = show_customer ? `<th>${__("Customer")}</th>` : '';
            let status_th = show_status ? `<th>${__("Status")}</th>` : '';

            return `
                <div class="item-history-block" style="margin-bottom: 20px;">
                    <h5 class="text-primary" style="font-size: 14px; margin-bottom: 10px; border-left: 3px solid #ffa00a; padding-left: 8px;"><strong>${frappe.utils.escape_html(display_title)}</strong></h5>
                    <div style="max-height: 400px; overflow-y: auto;">
                        <table class="table table-bordered table-condensed table-hover" style="font-size: 12px; margin-bottom: 0;">
                            <thead class="history-table-head">
                                <tr class="grid-heading-row">
                                    <th>${doc_col_label}</th>
                                    ${supplier_th}
                                    ${customer_th}
                                    <th class="text-right">${__("Qty")}</th>
                                    <th>${__("UOM")}</th>
                                    <th class="text-right">${__("Rate")}</th>
                                    <th class="text-right">${__("Amount")}</th>
                                    <th>${__("Date")}</th>
                                    ${status_th}
                                </tr>
                            </thead>
                            <tbody>
                                ${rows.map(row => {
                                    let rate = format_currency(row.rate, frm.doc.currency);
                                    let amount = format_currency(row.amount, frm.doc.currency);
                                    let date = frappe.datetime.str_to_user(row.posting_date);
                                    let link = is_quotation 
                                        ? `/app/quotation/${encodeURIComponent(row.invoice_name)}`
                                        : (is_purchase 
                                            ? `/app/purchase-invoice/${encodeURIComponent(row.invoice_name)}` 
                                            : `/app/sales-invoice/${encodeURIComponent(row.invoice_name)}`);

                                    let supplier_td = show_supplier ? `<td>${frappe.utils.escape_html(row.supplier || '')}</td>` : '';
                                    let customer_td = show_customer ? `<td>${frappe.utils.escape_html(row.customer || '')}</td>` : '';
                                    let status_td = show_status ? `<td><span class="indicator-pill whitespace-nowrap orange">${frappe.utils.escape_html(row.status || '')}</span></td>` : '';

                                    return `
                                        <tr>
                                            <td><a href="${link}" target="_blank">${frappe.utils.escape_html(row.invoice_name)}</a></td>
                                            ${supplier_td}
                                            ${customer_td}
                                            <td class="text-right">${row.qty}</td>
                                            <td>${frappe.utils.escape_html(row.uom || '')}</td>
                                            <td class="text-right">${rate}</td>
                                            <td class="text-right">${amount}</td>
                                            <td>${date}</td>
                                            ${status_td}
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        };

        let d = new frappe.ui.Dialog({
            title: __('Item History: {0}', [item_name || item_code]),
            fields: [
                party_field_config,
                {
                    fieldtype: 'Column Break'
                },
                {
                    label: __('No. of Records'),
                    fieldname: 'limit',
                    fieldtype: 'Select',
                    options: ['10', '20', '50', '100'],
                    default: '10',
                    change: () => fetch_and_render(d)
                },
                {
                    fieldtype: 'Section Break'
                },
                {
                    fieldname: 'history_html',
                    fieldtype: 'HTML'
                }
            ],
            primary_action_label: __('Close'),
            primary_action: () => d.hide(),
            size: "large"
        });

        d.show();
        fetch_and_render(d);
    }
};
