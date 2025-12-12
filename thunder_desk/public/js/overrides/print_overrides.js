// This script is loaded when 'print' page opens.
// We need to wait for print.js to define frappe.ui.form.PrintView

const overridePrintView = () => {
    if (frappe.ui && frappe.ui.form && frappe.ui.form.PrintView) {
        frappe.ui.form.PrintView.prototype.render_page = function (method, printit = false) {
            if (method === "/printview?" && this.selected_format() !== "Standard" && !this.is_raw_printing()) {
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

overridePrintView();