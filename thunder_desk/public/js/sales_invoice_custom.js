
// Sales Invoice Custom Script
// Adds "Item History" feature to view sales rate history for all items in the grid.

frappe.ui.form.on('Sales Invoice', {
    refresh: function (frm) {
        // Global state for active item
        frm.active_item_payload = null;

        // We ensure the feature is ready, focusing on the grid button
        if (frm.fields_dict.items && frm.fields_dict.items.grid) {
            const grid = frm.fields_dict.items.grid;

            // Function to add the History button next to Download
            const add_bulk_history_button = () => {
                if (!grid.wrapper) return;

                // Find the download button
                let $download_btn = $(grid.wrapper).find('.grid-download');

                // Check and insert button
                if ($download_btn.length > 0 && $(grid.wrapper).find('.btn-bulk-history').length === 0) {
                    let $btn = $(`<button class="btn btn-xs btn-default btn-bulk-history" style="margin-left: 5px;">
                        <i class="fa fa-history"></i> ${__('Item History')}
                    </button>`);

                    $btn.on('click', function (e) {
                        e.preventDefault();

                        // Use the globally stored active item
                        if (frm.active_item_payload && frm.active_item_payload.item_code) {
                            frm.events.show_item_history(frm.active_item_payload.item_code, frm.active_item_payload.item_name);
                        } else {
                            // Fallback: Try to find active row one last time (useful if global state missed it)
                            let $items_wrapper = frm.fields_dict.items.$wrapper;
                            let $active_row = $items_wrapper.find('.grid-row.editable-row');
                            // If no row is explicitly editable, maybe just selected/open? 
                            // But usually editable-row is the "active" one in Frappe grid.

                            if ($active_row.length > 0) {
                                let docname = $active_row.attr('data-name');
                                if (!docname) docname = $active_row.find('.row-index').attr('data-name');
                                let row = (frm.doc.items || []).find(d => d.name == docname);
                                if (row && row.item_code) {
                                    frm.events.show_item_history(row.item_code, row.item_name);
                                    return;
                                }
                            }

                            frappe.msgprint(__('Please click on an item row to select it first.'));
                        }
                    });

                    $download_btn.after($btn);
                }
            };

            // TRACKING ACTIVE ITEM: Click or Focus on row
            // We listen on the wrapper to catch events on rows
            if (grid.wrapper) {
                $(grid.wrapper).on('focusin click', '.grid-row', function () {
                    let $row = $(this);
                    let cdn = $row.attr('data-name');
                    if (!cdn) cdn = $row.find('.row-index').attr('data-name');

                    if (cdn && locals['Sales Invoice Item'] && locals['Sales Invoice Item'][cdn]) {
                        let row = locals['Sales Invoice Item'][cdn];
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
            add_bulk_history_button();

            // Observer to re-add button if grid refreshes
            if (!grid.__history_btn_observer) {
                const observer = new MutationObserver((mutations) => {
                    add_bulk_history_button();
                });
                let $grid_footer = $(grid.wrapper).find('.grid-footer');
                if ($grid_footer.length) {
                    observer.observe($grid_footer[0], { childList: true, subtree: true });
                    grid.__history_btn_observer = observer;
                }
            }
        }

        // Feature: Show history for specific item
        frm.events.show_item_history = function (item_code, item_name) {
            if (!item_code) return;

            let default_customer = frm.doc.customer;
            if (!default_customer) {
                frappe.msgprint(__('Please select a Customer first.'));
                return;
            }

            // Function to fetch and render
            const fetch_and_render = (dialog) => {
                let customer = dialog.get_value('customer');

                dialog.get_field('history_html').$wrapper.html('<div class="text-center text-muted">' + __('Loading...') + '</div>');

                frappe.call({
                    method: "thunder_desk.utils.get_item_rate_history",
                    args: {
                        item_code: item_code, // Single item code
                        customer: customer
                    },
                    callback: function (r) {
                        if (r.message) {
                            dialog.history_data = r.message;
                            render_history(dialog);
                        } else {
                            dialog.get_field('history_html').$wrapper.html('<div class="alert alert-warning">' + __('No history found') + '</div>');
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

                // Helper to get rows for our item
                const get_rows = (data_map) => {
                    let rows = data_map[item_code];
                    if (!rows) {
                        // try lower case key match
                        let lower = item_code.toLowerCase();
                        let key = Object.keys(data_map).find(k => k.toLowerCase() === lower);
                        if (key) rows = data_map[key];
                    }
                    return rows || [];
                };

                let sales_rows = get_rows(sales_data);
                let purchase_rows = get_rows(purchase_data);

                // Render HTML
                let html = `
                    <style>
                        .history-table-head th {
                            font-size: 12px !important;
                        }
                        .history-content .form-tabs-list {
                            z-index: 0 !important;
                            position: static !important;
                        }
                    </style>
                    <div class="history-content">
                        <div class="form-tabs-list" style="border-bottom: 1px solid #d1d8dd; margin-bottom: 15px;">
                            <ul class="nav form-tabs" role="tablist">
                                <li class="nav-item active">
                                    <a class="nav-link active history-tab-link" data-tab="hist-sales" style="cursor: pointer;">${__('Sales')}</a>
                                </li>
                                <li class="nav-item">
                                    <a class="nav-link history-tab-link" data-tab="hist-purchase" style="cursor: pointer;">${__('Purchases')}</a>
                                </li>
                            </ul>
                        </div>
                        <div class="tab-content">
                            <div class="tab-pane active" id="hist-sales">
                                ${render_tab_content(sales_rows, 'Sales')}
                            </div>
                            <div class="tab-pane" id="hist-purchase" style="display: none;">
                                ${render_tab_content(purchase_rows, 'Purchase')}
                            </div>
                        </div>
                    </div>
                `;

                let $wrapper = dialog.get_field('history_html').$wrapper;
                $wrapper.html(html);

                // Bind Tab Events
                $wrapper.find('.history-tab-link').on('click', function (e) {
                    e.preventDefault();
                    let target = $(this).data('tab');

                    // UI Updates
                    $wrapper.find('.nav-item').removeClass('active');
                    $wrapper.find('.nav-link').removeClass('active');
                    $(this).addClass('active');
                    $(this).parent().addClass('active');

                    $wrapper.find('.tab-pane').hide();
                    $wrapper.find('#' + target).show();
                });
            };

            const render_tab_content = (rows, type) => {
                if (!rows || rows.length === 0) {
                    return `<div class="text-muted text-center" style="padding: 20px;">${__('No history found.')}</div>`;
                }

                let display_title = item_name ? `${item_code}: ${item_name}` : item_code;
                let is_purchase = type === 'Purchase';

                // Headers
                let supplier_th = is_purchase ? `<th>${__("Supplier")}</th>` : '';

                return `
                    <div class="item-history-block" style="margin-bottom: 20px;">
                        <h5 class="text-primary" style="font-size: 14px; margin-bottom: 10px; border-left: 3px solid #ffa00a; padding-left: 8px;"><strong>${display_title}</strong></h5>
                        <table class="table table-bordered table-condensed table-hover" style="font-size: 12px;">
                            <thead class="history-table-head">
                                <tr class="grid-heading-row">
                                    <th>${__("Invoice")}</th>
                                    ${supplier_th}
                                    <th class="text-right">${__("Qty")}</th>
                                    <th>${__("UOM")}</th>
                                    <th class="text-right">${__("Rate")}</th>
                                    <th class="text-right">${__("Amount")}</th>
                                    <th>${__("Date")}</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rows.map(row => {
                    let rate = format_currency(row.rate, frm.doc.currency);
                    let amount = format_currency(row.amount, frm.doc.currency);
                    let date = frappe.datetime.str_to_user(row.posting_date);
                    let link = type === 'Sales' ? `/app/sales-invoice/${row.invoice_name}` : `/app/purchase-invoice/${row.invoice_name}`;

                    let supplier_td = is_purchase ? `<td>${row.supplier || ''}</td>` : '';

                    return `
                                        <tr>
                                            <td><a href="${link}" target="_blank">${row.invoice_name}</a></td>
                                            ${supplier_td}
                                            <td class="text-right">${row.qty}</td>
                                            <td>${row.uom || ''}</td>
                                            <td class="text-right">${rate}</td>
                                            <td class="text-right">${amount}</td>
                                            <td>${date}</td>
                                        </tr>
                                    `;
                }).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            };

            // Dialog Logic
            let d = new frappe.ui.Dialog({
                title: __('Item History: {0}', [item_name || item_code]),
                fields: [
                    {
                        label: __('Customer'),
                        fieldname: 'customer',
                        fieldtype: 'Link',
                        options: 'Customer',
                        default: default_customer,
                        change: () => {
                            fetch_and_render(d);
                        }
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
            // Initial render
            fetch_and_render(d);
        };
    }
});

// Capture Item Code change to update global active item immediately
frappe.ui.form.on('Sales Invoice Item', {
    item_code: function (frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (row.item_code) {
            frm.active_item_payload = {
                item_code: row.item_code,
                item_name: row.item_name
            };
        }
    }
});
