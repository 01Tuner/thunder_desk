// This script is loaded when 'print' page opens.
// We need to wait for print.js to define frappe.ui.form.PrintView

const overridePrintView = () => {
    if (frappe.ui && frappe.ui.form && frappe.ui.form.PrintView) {
        frappe.ui.form.PrintView.prototype.render_page = function (method, printit = false) {

            // Logic:
            // Check if the selected format has pdf_generator set to "PagedJS".
            // If yes -> Thunder Print View.
            // If no (or Standard) -> Standard Print View.

            const use_pagedjs = this.get_print_format().pdf_generator === 'PagedJS';

            // If PagedJS is selected and not raw printing, redirect to thunder_print_view
            if (method === "/printview?" && use_pagedjs && !this.is_raw_printing()) {
                method = "/thunder_print_view?";
            }

            let w = window.open(
                frappe.urllib.get_full_url(
                    method +
                    "doctype=" +
                    encodeURIComponent(this.frm.doc.doctype) +
                    "&name=" +
                    encodeURIComponent(this.frm.doc.name) +
                    (printit ? "&trigger_print=1" : "") +
                    "&format=" +
                    encodeURIComponent(this.selected_format()) +
                    "&no_letterhead=" +
                    (this.with_letterhead() ? "0" : "1") +
                    "&letterhead=" +
                    encodeURIComponent(this.get_letterhead()) +
                    "&settings=" +
                    encodeURIComponent(JSON.stringify(this.additional_settings)) +
                    (this.lang_code ? "&_lang=" + this.lang_code : "")
                )
            );
            if (!w) {
                frappe.msgprint(__("Please enable pop-ups"));
                return;
            }
        };
        // console.log("Thunder Desk: PrintView overridden successfully applied.");
    } else {
        // console.log("Thunder Desk: PrintView not found yet, retrying...");
        setTimeout(overridePrintView, 100);
    }
};



const hidePrintButtons = () => {
    const style = document.createElement("style");
    style.innerHTML = `
        a[href*="print-designer"],
        a[href*="print_designer"] {
            display: none !important;
        }
    `;
    document.head.appendChild(style);

    const hidePdfButton = () => {
        const buttons = document.querySelectorAll('button');
        buttons.forEach(btn => {
            if (btn.querySelector('use[href="#icon-small-file"]')) {
                btn.style.setProperty('display', 'none', 'important');
            }
        });
    };

    // Check periodically for the button as it might be added dynamically
    const interval = setInterval(hidePdfButton, 500);

    // Stop checking after 10 seconds to avoid infinite background work
    setTimeout(() => clearInterval(interval), 10000);

    // Also run immediately
    hidePdfButton();
};

hidePrintButtons();
overridePrintView();