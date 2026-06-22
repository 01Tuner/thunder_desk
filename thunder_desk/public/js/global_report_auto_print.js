// global_report_auto_print.js
(function () {
    const native_open = window.open;
console.log('reprot print')
    window.open = function (...args) {
        const win = native_open.apply(window, args);

        // Only auto-print when we're on a Query/Script Report view
        const on_report_page = frappe.get_route && frappe.get_route()[0] === "query-report";

        if (win && on_report_page) {
            let printed = false;
            const check = setInterval(() => {
                try {
                    if (!printed && win.document.readyState === "complete" &&
                        win.document.body && win.document.body.innerText.trim().length > 0) {
                        printed = true;
                        clearInterval(check);
                        win.focus();
                        win.print();
                    }
                } catch (e) { /* not ready yet */ }
            }, 150);
            setTimeout(() => clearInterval(check), 6000);
        }

        return win;
    };
})();