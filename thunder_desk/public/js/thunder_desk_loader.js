
frappe.provide('thunder_desk');

$(document).on('app_ready', function () {
    // Load Thunder Desk Settings
    const settings = frappe.boot.thunder_desk?.settings || {};

    // 1. Hide Sidebar
    if (settings.hide_side_bar) {
        frappe.require('/assets/thunder_desk/css/global_no_sidebar.css');
        // Fallback or additional logic if CSS is not enough to hide it properly
        $('body').addClass('thunder-desk-no-sidebar');
    }

    // 2. Windows Style Menu
    if (settings.enable_top_menu) {
        frappe.require([
            '/assets/thunder_desk/css/windows_style_menu.css',
            '/assets/thunder_desk/js/windows_style_menu.js'
        ], function () {
            // Re-trigger global refresh or specific event if needed
            // windows_style_menu.js typically initializes itself on load or app_ready
            // Since we are in app_ready, we might need to manually trigger it if it missed the event
            // But usually scripts are written to run on load. 
        });
    }
});
