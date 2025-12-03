// Windows-Style Dropdown Menu for ERPNext
// Creates traditional desktop application style menus with dropdowns

frappe.provide("frappe.ui.windows_menu");

// Initialization hooks
frappe.ui.form.on("Main", {
	refresh: function () {
		setTimeout(initializeWindowsStyleMenu, 100);
	},
	onload: function () {
		setTimeout(initializeWindowsStyleMenu, 200);
	},
});

$(document).on("page-change", function () {
	setTimeout(initializeWindowsStyleMenu, 150);
});

$(document).on("app_ready", function () {
	setTimeout(initializeWindowsStyleMenu, 300);
});

$(window).on("focus", function () {
	if (window.opener || window.parent !== window) {
		setTimeout(refreshMenuIfNeeded, 100);
	}
});

function initializeWindowsStyleMenu() {
	// Don't show menu on setup-wizard page
	const currentPath = window.location.pathname;
	if (currentPath && currentPath.includes("/app/setup-wizard")) {
		$("#windows-style-menu").remove();
		return;
	}

	const isTabApp = window.opener || window.parent !== window;
	const isDesktopApp = !isTabApp && (window.process || window.require);

	window.thunderDeskContext = {
		isTabApp,
		isDesktopApp,
		initialized: true,
	};

	$("#windows-style-menu").remove();

	hideTraditionalERPNextHeader(isTabApp, isDesktopApp);

	const menuStructure = getERPNextMenuStructure();
	const windowsMenuHTML = getWindowsMenuHTML(menuStructure, isTabApp, isDesktopApp);

	if ($(".navbar").length && !$("#windows-style-menu").length) {
		$(windowsMenuHTML).insertAfter(".navbar");
	} else if (!$(".navbar").length && !$("#windows-style-menu").length) {
		$("body").prepend(windowsMenuHTML);
	}

	setupWindowsMenuHandlers();
	addContextSpecificStyling(isTabApp, isDesktopApp);
}

function refreshMenuIfNeeded() {
	if ($("#windows-style-menu").length === 0) {
		initializeWindowsStyleMenu();
	}
}

function hideTraditionalERPNextHeader(isTabApp, isDesktopApp) {
	// $('.navbar-brand, .navbar-home, .app-logo, #navbar-breadcrumbs').hide();

	$(".navbar .nav-item:not(.dropdown-navbar-user)").each(function () {
		if (!$(this).hasClass("windows-menu-item")) {
			$(this).hide();
		}
	});

	$("body").addClass("windows-menu-active");

	if (isTabApp) {
		$(".navbar-nav, .navbar-toggler").hide();
	}

	if (isDesktopApp) {
		$(".container-fluid").addClass("desktop-app-mode");
	}
}

function addContextSpecificStyling(isTabApp, isDesktopApp) {
	$("body").addClass("thunder-desk-active");

	if (isTabApp) {
		$("body").addClass("thunder-desk-tab-app");
		$("#windows-style-menu").addClass("tab-app-menu");
	}

	if (isDesktopApp) {
		$("body").addClass("thunder-desk-desktop-app");
		$("#windows-style-menu").addClass("desktop-app-menu");
	}
}

function getWindowsMenuHTML(menuStructure, isTabApp, isDesktopApp) {
	const contextClass = isTabApp ? "tab-app" : isDesktopApp ? "desktop-app" : "web-app";

	return `
        <div id="windows-style-menu" class="windows-menu-container ${contextClass}">
            <div class="container">
                <div class="windows-menu-bar">
                    ${getHomeButtonHTML(isTabApp, isDesktopApp)}
                    ${menuStructure
						.map((menu) => getMenuItemHTML(menu, isTabApp, isDesktopApp))
						.join("")}
                </div>
            </div>
        </div>
    `;
}

function getHomeButtonHTML(isTabApp, isDesktopApp) {
	const contextData = `data-tab-app="${isTabApp}" data-desktop-app="${isDesktopApp}"`;

	return `
        <div class="windows-menu-item">
            <button class="windows-menu-button home-button"
                    type="button"
                    tabindex="0"
                    ${contextData}>
                <i class="fa fa-home" style="color: #3498db;"></i>
                <span>${__("Home")}</span>
            </button>
        </div>
    `;
}

function getMenuItemHTML(menu, isTabApp, isDesktopApp) {
	const submenuHTML = menu.submenus
		.map((submenu) => {
			const route = submenu.route || `/app/${frappe.router.slug(submenu.doctype)}`;
			const contextData = `data-tab-app="${isTabApp}" data-desktop-app="${isDesktopApp}"`;

			return `
            <a class="dropdown-item windows-submenu-item" href="${route}"
               data-doctype="${submenu.doctype || ""}"
               data-route="${submenu.route || ""}"
               ${contextData}
               tabindex="0">
                <span>${submenu.label}</span>
            </a>
        `;
		})
		.join("");

	const buttonId = `windows-menu-${menu.name.replace(/\s+/g, "-").toLowerCase()}`;

	return `
        <div class="windows-menu-item dropdown">
            <button class="windows-menu-button dropdown-toggle"
                    type="button"
                    id="${buttonId}"
                    style="border-left: 4px solid ${menu.color};"
                    aria-haspopup="true"
                    aria-expanded="false"
                    tabindex="0">
                <i class="${menu.icon}" style="color: ${menu.color};"></i>
                <span>${menu.title}</span>
            </button>
            <div class="dropdown-menu windows-dropdown-menu" aria-labelledby="${buttonId}">
                ${submenuHTML}
            </div>
        </div>
    `;
}

function getERPNextMenuStructure() {
	// Define all modules with their details
	const allModules = [
		{
			name: "Customer",
			title: __("Customer Management"),
			icon: "fa fa-users",
			color: "#3498db",
			submenus: [
				{ label: __("Customer"), doctype: "Customer", icon: "fa fa-user" },
				{ label: __("Customer Group"), doctype: "Customer Group", icon: "fa fa-users" },
				{ label: __("Territory"), doctype: "Territory", icon: "fa fa-map-marker" },
				{ label: __("Address"), doctype: "Address", icon: "fa fa-home" },
				{ label: __("Contact"), doctype: "Contact", icon: "fa fa-phone" },
			],
		},
		{
			name: "Selling",
			title: __("Sales & Selling"),
			icon: "fa fa-shopping-cart",
			color: "#2ecc71",
			submenus: [
				{ label: __("Quotation"), doctype: "Quotation", icon: "fa fa-file-text" },
				{ label: __("Sales Order"), doctype: "Sales Order", icon: "fa fa-file-text-o" },
				{ label: __("Sales Invoice"), doctype: "Sales Invoice", icon: "fa fa-file" },
				{ label: __("POS Invoice"), doctype: "POS Invoice", icon: "fa fa-credit-card" },
				{
					label: __("Point of Sale"),
					route: "/app/point-of-sale",
					required_doctype: "POS Invoice",
					icon: "fa fa-th",
				},
			],
		},
		{
			name: "Buying",
			title: __("Purchase & Buying"),
			icon: "fa fa-shopping-bag",
			color: "#e74c3c",
			submenus: [
				{ label: __("Supplier"), doctype: "Supplier", icon: "fa fa-truck" },
				{
					label: __("Request for Quotation"),
					doctype: "Request for Quotation",
					icon: "fa fa-file-o",
				},
				{
					label: __("Purchase Order"),
					doctype: "Purchase Order",
					icon: "fa fa-file-text",
				},
				{
					label: __("Purchase Invoice"),
					doctype: "Purchase Invoice",
					icon: "fa fa-dollar",
				},
				{
					label: __("Purchase Receipt"),
					doctype: "Purchase Receipt",
					icon: "fa fa-inbox",
				},
			],
		},
		{
			name: "Stock",
			title: __("Inventory & Stock"),
			icon: "fa fa-cubes",
			color: "#f39c12",
			submenus: [
				{ label: __("Item"), doctype: "Item", icon: "fa fa-cube" },
				{ label: __("Item Group"), doctype: "Item Group", icon: "fa fa-cubes" },
				{
					label: __("Item Barcode Print"),
					doctype: "Barcode Print",
					route: "/app/barcode-print/new",
					icon: "fa fa-qrcode",
				},
				{ label: __("Warehouse"), doctype: "Warehouse", icon: "fa fa-building" },
				{ label: __("Stock Entry"), doctype: "Stock Entry", icon: "fa fa-exchange" },
				{ label: __("Delivery Note"), doctype: "Delivery Note", icon: "fa fa-truck" },
				{
					label: __("Stock Reconciliation"),
					doctype: "Stock Reconciliation",
					icon: "fa fa-balance-scale",
				},
			],
		},
		{
			name: "Reports",
			title: __("Reports & Analytics"),
			icon: "fa fa-bar-chart",
			color: "#9b59b6",
			submenus: [
				{ label: __("All Reports"), route: "/app/reports", icon: "fa fa-list" },
				{
					label: __("Sales Analytics"),
					route: "/app/query-report/Sales%20Analytics",
					report_name: "Sales Analytics",
					icon: "fa fa-line-chart",
				},
				{
					label: __("Purchase Analytics"),
					route: "/app/query-report/Purchase%20Analytics",
					report_name: "Purchase Analytics",
					icon: "fa fa-line-chart",
				},
				{
					label: __("Stock Balance"),
					route: "/app/query-report/Stock%20Balance",
					report_name: "Stock Balance",
					icon: "fa fa-cubes",
				},
				{
					label: __("Profit and Loss Statement"),
					route: "/app/query-report/Profit%20and%20Loss%20Statement",
					report_name: "Profit and Loss Statement",
					icon: "fa fa-calculator",
				},
				{
					label: __("Balance Sheet"),
					route: "/app/query-report/Balance%20Sheet",
					report_name: "Balance Sheet",
					icon: "fa fa-file-text",
				},
				{
					label: __("POS Register"),
					route: "/app/query-report/POS%20Register",
					report_name: "POS Register",
					icon: "fa fa-book",
				},
			],
		},
		{
			name: "Setup",
			title: __("Settings & Setup"),
			icon: "fa fa-cog",
			color: "#34495e",
			submenus: [
				{ label: __("Company"), doctype: "Company", icon: "fa fa-building-o" },
				{ label: __("User"), doctype: "User", icon: "fa fa-user" },
				{ label: __("Role"), doctype: "Role", icon: "fa fa-shield" },
				{ label: __("Print Format"), doctype: "Print Format", icon: "fa fa-print" },
				{ label: __("System Settings"), doctype: "System Settings", icon: "fa fa-wrench" },
			],
		},
	];

	// Filter modules and submenus based on user permissions
	const filteredModules = [];
	for (const module of allModules) {
		// Filter submenus based on permissions
		const filteredSubmenus = [];
		for (const submenu of module.submenus) {
			// Handle permission checking based on item type
			can_access = false;

			if (submenu.report_name) {
				// Check report permission - get the ref_doctype first
				can_access = true;
			} else {
				// Check doctype permission (could be 'doctype' or 'required_doctype')
				const doctype_to_check = submenu.doctype || submenu.required_doctype;
				if (doctype_to_check) {
					try {
						can_access = frappe.model.can_read(doctype_to_check);
					} catch (e) {
						// Skip doctypes that don't exist or have permission issues
						console.warn(
							`Permission check failed for doctype: ${doctype_to_check}`,
							e
						);
					}
				} else {
					can_access = true;
				}
			}

			if (can_access) {
				filteredSubmenus.push(submenu);
			}
		}

		// Only include modules that have at least one accessible submenu
		if (filteredSubmenus.length > 0) {
			const moduleCopy = { ...module };
			moduleCopy.submenus = filteredSubmenus;
			filteredModules.push(moduleCopy);
		}
	}

	return filteredModules;
}

function setupWindowsMenuHandlers() {
	$(document).off(".windowsMenu");

	// Hover to open
	$(document).on("mouseenter.windowsMenu", ".windows-menu-item", function () {
		const $item = $(this);
		$(".windows-dropdown-menu").removeClass("show");
		$(".windows-menu-button").removeClass("show").attr("aria-expanded", "false");
		$item.find(".windows-dropdown-menu").addClass("show");
		$item.find(".windows-menu-button").addClass("show").attr("aria-expanded", "true");
	});

	$(document).on("mouseenter.windowsMenu", ".windows-dropdown-menu", function (e) {
		e.stopPropagation();
		$(this)
			.addClass("show")
			.siblings(".windows-menu-button")
			.addClass("show")
			.attr("aria-expanded", "true");
	});

	$(document).on("mouseleave.windowsMenu", ".windows-menu-item", function () {
		const $item = $(this);
		setTimeout(() => {
			if (!$item.is(":hover")) {
				$item.find(".windows-dropdown-menu").removeClass("show");
				$item
					.find(".windows-menu-button")
					.removeClass("show")
					.attr("aria-expanded", "false");
			}
		}, 100);
	});

	// Click for touch
	$(document).on("click.windowsMenu", ".windows-menu-button.dropdown-toggle", function (e) {
		e.preventDefault();
		e.stopPropagation();
		const $button = $(this);
		const $dropdown = $button.next(".windows-dropdown-menu");
		const isOpen = $dropdown.hasClass("show");
		$(".windows-dropdown-menu").removeClass("show");
		$(".windows-menu-button").removeClass("show").attr("aria-expanded", "false");
		if (!isOpen) {
			$dropdown.addClass("show");
			$button.addClass("show").attr("aria-expanded", "true");
		}
	});

	// Home button click
	$(document).on("click.windowsMenu", ".home-button", function (e) {
		e.preventDefault();
		const $button = $(this);
		const isTabApp = $button.data("tab-app") === "true";

		frappe.show_alert({ message: __("Loading Dashboard..."), indicator: "blue" });
		$("#windows-style-menu").addClass("windows-menu-loading");

		window.location.href = "/dashboard";
		// setTimeout(() => {
		//     const setRoute = isTabApp && window.opener ? window.opener.frappe.set_route : frappe.set_route;
		//     frappe.set_route('dashboard');
		//     if (isTabApp && window.opener) {
		//         window.opener.focus();
		//     }

		//     setTimeout(() => {
		//         $('#windows-style-menu').removeClass('windows-menu-loading');
		//     }, 300);
		// }, 100);
	});

	// Submenu clicks
	$(document).on("click.windowsMenu", ".windows-submenu-item", function (e) {
		e.preventDefault();
		e.stopPropagation();
		const $item = $(this);
		const doctype = $item.data("doctype");
		const route = $item.data("route");
		const isTabApp = $item.data("tab-app") === "true";

		$item.addClass("clicked");
		frappe.show_alert({
			message: __("Loading {0}...", [$item.find("span").text()]),
			indicator: "blue",
		});
		$("#windows-style-menu").addClass("windows-menu-loading");

        if (route && route === "/app/point-of-sale") {
            window.location.href = route;
        }

		setTimeout(() => {
			const setRoute =
				isTabApp && window.opener ? window.opener.frappe.set_route : frappe.set_route;
			if (route) {
					setRoute(route);
			} else if (doctype) {
				setRoute("List", doctype);
			}
			if (isTabApp && window.opener) {
				window.opener.focus();
			}

			setTimeout(() => {
				$(".windows-dropdown-menu").removeClass("show");
				$(".windows-menu-button").removeClass("show").attr("aria-expanded", "false");
				$("#windows-style-menu").removeClass("windows-menu-loading");
				$item.removeClass("clicked");
			}, 300);
		}, 100);
	});

	// Close on outside click
	$(document).on("click.windowsMenu", function (e) {
		if (!$(e.target).closest(".windows-menu-item").length) {
			$(".windows-dropdown-menu").removeClass("show");
			$(".windows-menu-button").removeClass("show").attr("aria-expanded", "false");
		}
	});

	// Keyboard navigation
	$(document).on("keydown.windowsMenu", function (e) {
		if (e.altKey && !e.ctrlKey && !e.shiftKey && e.which !== 18) {
			e.preventDefault();
			$(".windows-menu-button:first").focus();
		}
		if (e.which === 27) {
			$(".windows-dropdown-menu").removeClass("show");
			$(".windows-menu-button").removeClass("show").attr("aria-expanded", "false");
		}
	});

	$(document).on("keydown.windowsMenu", ".windows-menu-button", function (e) {
		const $current = $(this);
		if (e.which === 37) {
			const $prev = $current
				.closest(".windows-menu-item")
				.prev()
				.find(".windows-menu-button");
			if ($prev.length) $prev.focus();
		} else if (e.which === 39) {
			const $next = $current
				.closest(".windows-menu-item")
				.next()
				.find(".windows-menu-button");
			if ($next.length) $next.focus();
		} else if (e.which === 40 && $current.hasClass("dropdown-toggle")) {
			e.preventDefault();
			const $dropdown = $current.next(".windows-dropdown-menu");
			if (!$dropdown.hasClass("show")) {
				$dropdown.addClass("show");
				$current.addClass("show").attr("aria-expanded", "true");
			}
			setTimeout(() => $dropdown.find(".windows-submenu-item:first").focus(), 50);
		} else if (e.which === 13) {
			e.preventDefault();
			$current.click();
		}
	});

	$(document).on("keydown.windowsMenu", ".windows-submenu-item", function (e) {
		const $current = $(this);
		if (e.which === 40) {
			e.preventDefault();
			const $next = $current.next(".windows-submenu-item");
			if ($next.length) $next.focus();
		} else if (e.which === 38) {
			e.preventDefault();
			const $prev = $current.prev(".windows-submenu-item");
			if ($prev.length) {
				$prev.focus();
			} else {
				$current.closest(".windows-dropdown-menu").prev(".windows-menu-button").focus();
			}
		} else if (e.which === 13) {
			e.preventDefault();
			$current.click();
		}
	});
}

frappe.ui.windows_menu = {
	refresh: initializeWindowsStyleMenu,
	hide: function () {
		$("#windows-style-menu").hide();
	},
	show: function () {
		$("#windows-style-menu").show();
	},
	close_all_dropdowns: function () {
		$(".windows-dropdown-menu.show").removeClass("show");
	},
};

$(document).on("route_change", function () {
	if (frappe.ui.windows_menu) {
		frappe.ui.windows_menu.close_all_dropdowns();
	}
});
