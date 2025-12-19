
// Sales Invoice Custom Script
// Adds "Item History" feature to view sales rate history for all items in the grid.

frappe.ui.form.on('Sales Invoice', {
    refresh: function (frm) {
        // We ensure the feature is ready, focusing on the grid button
        if (frm.fields_dict.items && frm.fields_dict.items.grid) {
            const grid = frm.fields_dict.items.grid;

            // Function to add the History button next to Download
            const add_bulk_history_button = () => {
                if (!grid.wrapper) return;

                // Find the download button (usually in .grid-footer-toolbar or via class .grid-download)
                // We want it "next to download button in item table"
                let $download_btn = $(grid.wrapper).find('.grid-download');

                // Sometimes download button might be hidden or in a specific toolbar
                if ($download_btn.length > 0 && $(grid.wrapper).find('.btn-bulk-history').length === 0) {
                    let $btn = $(`<button class="btn btn-xs btn-default btn-bulk-history" style="margin-left: 5px;">
                        <i class="fa fa-history"></i> ${__('View History')}
                    </button>`);

                    $btn.on('click', function (e) {
                        e.preventDefault();
                        frm.events.show_bulk_item_history();
                    });

                    // Insert before or after download button
                    $download_btn.after($btn);
                }
            };

            // Add button on refresh and bind observer to ensure it stays if grid re-renders
            add_bulk_history_button();

            // Simple observer to re-add button if grid refreshes completely
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

        // Helper function to show history for ALL items
        frm.events.show_bulk_item_history = function () {
            let current_items = frm.doc.items || [];
            if (current_items.length === 0) {
                frappe.msgprint(__('Please add items first.'));
                return;
            }

            let item_codes = [];
            let item_names = {};
            current_items.forEach(d => {
                if (d.item_code) {
                    item_codes.push(d.item_code);
                    item_names[d.item_code] = d.item_name;
                }
            });
            item_codes = [...new Set(item_codes)];

            if (item_codes.length === 0) {
                frappe.msgprint(__('No valid items to check history for.'));
                return;
            }

            let item_options = [
                { label: __('All Items'), value: __('All Items') }
            ].concat(item_codes.map(code => ({
                label: `${code}: ${item_names[code] || ''}`,
                value: code
            })));

            let default_customer = frm.doc.customer;
            if (!default_customer) {
                frappe.msgprint(__('Please select a Customer first.'));
                return;
            }

            // Function to fetch and render
            const fetch_and_render = (dialog) => {
                let customer = dialog.get_value('customer');
                let selected_items = dialog.get_value('items_filter');

                // If no items selected in filter, treat as "All" if user cleared it? 
                // Or "MultiSelect" usually returns empty list.
                // Requirement: "by default all , provison to select one or multiple"

                // If selected_items is empty, we might want to show nothing or all.
                // Usually empty filter implies "All" is cleaner, but MultiSelect UI might be explicit.
                // Let's assume if empty, we show all (or we pre-fill all).

                // We always fetch from backend for ALL items in the invoice initially (or all items in filter + invoice items?).
                // "item - list of items in current invoice- by default all"
                // So the API call should always be for the *filtered* items + maybe originally invoice items?
                // "based on the above field change should filter below results. no need re call api. use client side filter for item."
                // OK: API Call gets data for ALL invoice items. Client filter hides them.

                dialog.get_field('history_html').$wrapper.html('<div class="text-center text-muted">' + __('Loading...') + '</div>');

                frappe.call({
                    method: "thunder_desk.utils.get_item_rate_history",
                    args: {
                        item_code: item_codes, // Always fetch for all known items in invoice
                        customer: customer
                    },
                    callback: function (r) {
                        if (r.message) {
                            dialog.history_data = r.message; // Store for client-side filtering
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

                let selected_item = dialog.get_value('items_filter');
                if (selected_item == __('All Items')) selected_item = '';
                let filter_list = selected_item ? [selected_item] : item_codes;

                let sales_data = data.sales || {};
                let purchase_data = data.purchase || {};

                // Render HTML
                let html = `
                    <style>
                        .history-table-head th {
                            font-size: 12px !important;
                        }
                        /* Reset sticky/z-index for tabs in this dialog to prevent hiding dropdowns */
                        .history-content .form-tabs-list {
                            z-index: 0 !important;
                            position: static !important;
                        }
                        .items-filter-wrapper { position: relative; }
                        .items-filter-clear {
                            position: absolute;
                            right: 6px;
                            top: 50%;
                            transform: translateY(-50%);
                            cursor: pointer;
                            z-index: 2;
                            color: #8d99a6;
                            font-size: 11px;
                        }
                        .items-filter-clear:hover { color: #000; }
                        .items-filter-open {
                            position: absolute;
                            right: 10px; 
                            top: 50%;
                            transform: translateY(-50%);
                            cursor: pointer;
                            z-index: 2;
                            color: #8d99a6;
                            font-size: 12px;
                        }
                        .items-filter-open:hover { color: #000; }
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
                                ${render_tab_content(sales_data, filter_list, 'Sales')}
                            </div>
                            <div class="tab-pane" id="hist-purchase" style="display: none;">
                                ${render_tab_content(purchase_data, filter_list, 'Purchase')}
                            </div>
                        </div>
                    </div>
                `;

                let $wrapper = dialog.get_field('history_html').$wrapper;
                $wrapper.html(html);

                // Bind Tab Events Manually
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

            const render_tab_content = (data_map, items_to_show, type) => {
                let html = '';
                let has_data = false;

                items_to_show.forEach(code => {
                    // Normalize lookup
                    let rows = data_map[code];
                    if (!rows) {
                        // case insensitive fallback
                        let lower = code.toLowerCase();
                        let key = Object.keys(data_map).find(k => k.toLowerCase() === lower);
                        if (key) rows = data_map[key];
                    }

                    if (rows && rows.length > 0) {
                        has_data = true;

                        let name = item_names[code] || '';
                        let display_title = name ? `${code}: ${name}` : code;

                        html += `
                            <div class="item-history-block" style="margin-bottom: 20px;">
                                <h5 class="text-primary" style="font-size: 14px; margin-bottom: 10px; border-left: 3px solid #ffa00a; padding-left: 8px;"><strong>${display_title}</strong></h5>
                                <table class="table table-bordered table-condensed table-hover" style="font-size: 12px;">
                                    <thead class="history-table-head">
                                        <tr class="grid-heading-row">
                                            <th>${__("Invoice")}</th>
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

                            return `
                                                <tr>
                                                    <td><a href="${link}" target="_blank">${row.invoice_name}</a></td>
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
                    }
                });

                if (!has_data) {
                    return `<div class="text-muted text-center" style="padding: 20px;">${__('No history found for selected items.')}</div>`;
                }
                return html;
            };

            // Dialog Logic
            let d = new frappe.ui.Dialog({
                title: __('Customer Item History'),
                fields: [
                    {
                        label: __('Customer'),
                        fieldname: 'customer',
                        fieldtype: 'Link',
                        options: 'Customer',
                        default: default_customer,
                        change: () => {
                            // "based on the above field change should filter below results. if customer changes re call api."
                            fetch_and_render(d);
                        }
                    },
                    {
                        fieldtype: 'Column Break'
                    },
                    {
                        label: __('Items'),
                        fieldname: 'items_filter',
                        fieldtype: 'Autocomplete',
                        options: item_options,
                        default: __('All Items'),
                        change: () => {
                            // "client side filter"
                            let val = d.get_value('items_filter');
                            let $clear = d.fields_dict.items_filter.$wrapper.find('.items-filter-clear');
                            let $link = d.fields_dict.items_filter.$wrapper.find('.items-filter-open');
                            if (val && val !== __('All Items')) {
                                $clear.removeClass('hidden');
                                $link.removeClass('hidden');
                            } else {
                                $clear.addClass('hidden');
                                $link.addClass('hidden');
                            }
                            render_history(d);
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

            // Items filter uses Autocomplete with local options

            // Inject X button into items autocomplete
            let $input_wrapper = d.fields_dict.items_filter.$wrapper.find('.control-input-wrapper');
            $input_wrapper.addClass('items-filter-wrapper');
            $('<span class="items-filter-clear hidden" title="' + __('Clear') + '"><i class="fa fa-close"></i></span>')
                .appendTo($input_wrapper)
                .on('click', function () {
                    d.set_value('items_filter', __('All Items'));
                });

            d.show();
            // Initial render
            fetch_and_render(d);
        };
    }
});
