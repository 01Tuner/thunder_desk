console.log("Thunder Desk: print_polyfill.js loaded. URL:", window.location.href);

// 1. Hijack window.print to prevent ERPNext from triggering it too early
const originalPrint = window.print;
window.print = function () {
    console.log("Thunder Desk: window.print() intercepted. Waiting for Paged.js...");
};

// Configuration for Paged.js
window.PagedConfig = {
    auto: false, // We will trigger it manually to avoid race conditions
    after: (flow) => {
        console.log("Thunder Desk: Paged.js rendering completed.");
        // Restore print and trigger it
        window.print = originalPrint;
        // Small delay to ensure rendering is visible
        setTimeout(() => {
            console.log("Thunder Desk: Triggering final print dialog.");
            window.print();
        }, 500);
    }
};

function loadPagedJs() {
    if (document.querySelector('script[src*="paged.polyfill.js"]')) {
        console.log("Thunder Desk: Paged.js script already present.");
        return;
    }

    console.log("Thunder Desk: Injecting Paged.js Polyfill");
    var script = document.createElement("script");
    script.src = "https://unpkg.com/pagedjs/dist/paged.polyfill.js";
    script.onload = function () {
        console.log("Thunder Desk: Paged.js loaded. Waiting for content...");
        waitForContentAndRender();
    };
    script.onerror = function () {
        console.error("Thunder Desk: Failed to load Paged.js");
    };
    document.head.appendChild(script);
}

function waitForContentAndRender() {
    // ERPNext print formats usually live in .print-format
    // We wait for it to have substantial content
    const checkInterval = setInterval(() => {
        const printFormat = document.querySelector('.print-format');
        if (printFormat && printFormat.innerText.length > 50) {
            clearInterval(checkInterval);
            console.log("Thunder Desk: Content detected. Starting Paged.js preview...");

            // Give a small buffer for images/styles to settle
            setTimeout(() => {
                if (window.PagedPolyfill) {
                    window.PagedPolyfill.preview();
                } else {
                    console.error("Thunder Desk: window.PagedPolyfill is missing!");
                }
            }, 500);
        }
    }, 500);

    // Safety timeout to stop checking
    setTimeout(() => clearInterval(checkInterval), 10000);
}

function init() {
    if (window.location.href.includes("printview") || window.location.href.includes("print-format")) {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", loadPagedJs);
        } else {
            loadPagedJs();
        }
    } else {
        console.log("Thunder Desk: Not a print view, skipping Paged.js injection");
    }
}

init();
