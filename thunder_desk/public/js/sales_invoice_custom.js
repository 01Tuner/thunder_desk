
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
            let items = frm.doc.items || [];
            if (items.length === 0) {
                frappe.msgprint(__('Please add items first.'));
                return;
            }

            let item_codes = items.map(d => d.item_code).filter(Boolean);
            // Unique item codes
            item_codes = [...new Set(item_codes)];

            if (item_codes.length === 0) {
                frappe.msgprint(__('No valid items to check history for.'));
                return;
            }

            let customer = frm.doc.customer;
            if (!customer) {
                frappe.msgprint(__('Please select a Customer first.'));
                return;
            }

            frappe.call({
                method: "thunder_desk.utils.get_item_rate_history", // Singular (aliased on backend)
                args: {
                    item_code: item_codes, // Passing list/array here, backend will parse
                    customer: customer
                },
                callback: function (r) {
                    console.log("History API response:", r);
                    if (r.message && Object.keys(r.message).length > 0) {
                        let history_data = r.message;
                        let content = `<div style="max-height: 500px; overflow:auto;">`;

                        console.log("Item Codes to check:", item_codes);
                        console.log("History Keys:", Object.keys(history_data));

                        console.log("Full History Data:", history_data);

                        item_codes.forEach(code => {
                            // Robust key lookup (case-insensitive)
                            let data_for_item = history_data[code];

                            if (!data_for_item) {
                                // Try finding key ignoring case
                                let lower_code = code.toLowerCase();
                                let matched_key = Object.keys(history_data).find(k => k.toLowerCase() === lower_code);
                                if (matched_key) {
                                    data_for_item = history_data[matched_key];
                                }
                            }

                            try {
                                if (data_for_item && data_for_item.length > 0) {
                                    content += `
                                        <div style="margin-bottom: 20px;">
                                        <h5 class="text-muted"><strong>${code}</strong></h5>
                                        <table class="table table-bordered table-condensed table-hover">
                                            <thead>
                                                <tr class="active">
                                                    <th>${__("Date")}</th>
                                                    <th>${__("Invoice")}</th>
                                                    <th class="text-right">${__("Qty")}</th>
                                                    <th class="text-right">${__("Rate")}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                ${data_for_item.map(h => {
                                        let rate_disp = h.rates;
                                        try {
                                            rate_disp = format_currency(h.rate, frm.doc.currency);
                                        } catch (e) {
                                            console.warn("Currency format failed", e);
                                            rate_disp = h.rate;
                                        }
                                        return `
                                                    <tr>
                                                        <td>${frappe.datetime.str_to_user(h.posting_date)}</td>
                                                        <td><a href="/app/sales-invoice/${h.invoice_name}" target="_blank">${h.invoice_name}</a></td>
                                                        <td class="text-right">${h.qty}</td>
                                                        <td class="text-right">${rate_disp}</td>
                                                    </tr>
                                                `}).join("")}
                                            </tbody>
                                        </table>
                                        </div>
                                    `;
                                } else {
                                    content += `
                                        <div style="margin-bottom: 20px;">
                                            <h5 class="text-muted"><strong>${code}</strong></h5>
                                            <p class="text-muted small">${__('No previous sales history found for this customer.')}</p>
                                        </div>
                                    `;
                                }
                            } catch (err) {
                                console.error("Error generating history for item " + code, err);
                                content += `<div class="text-danger">Error for ${code}: ${err.message}</div>`;
                            }
                        });
                        console.log("Final Content Length:", content.length);
                        console.log("Content Preview:", content.substring(0, 500));

                        content += `</div>`;

                        let d = new frappe.ui.Dialog({
                            title: __('Customer Item History'),
                            fields: [
                                {
                                    fieldname: 'history_html',
                                    fieldtype: 'HTML',
                                    options: content
                                }
                            ],
                            primary_action_label: __('Close'),
                            primary_action: () => d.hide(),
                            size: "large"
                        });
                        d.show();
                    } else {
                        console.log("No message or empty message keys");
                        frappe.msgprint(__("No history found for any of the items using Customer {0}", [customer]));
                    }
                }
            });
        };
    }
});
