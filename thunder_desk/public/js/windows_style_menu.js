// Windows-Style Dropdown Menu for ERPNext
// Creates traditional desktop application style menus with dropdowns

frappe.provide("frappe.ui.windows_menu");

function td_render_menu_icon(name, size, color) {
	const icon = name || "folder-normal";
	const colorStyle = color
		? `color: ${frappe.utils.escape_html(color)}; --icon-stroke: ${frappe.utils.escape_html(color)};`
		: "";
	if (String(icon).includes("fa-") || String(icon).startsWith("fa ")) {
		return `<i class="${frappe.utils.escape_html(icon)}"${
			colorStyle ? ` style="${colorStyle}"` : ""
		}></i>`;
	}
	return `<span class="td-menu-icon" style="display:inline-flex;align-items:center;${colorStyle}">${frappe.utils.icon(
		frappe.utils.escape_html(icon),
		size || "sm"
	)}</span>`;
}

// ─── Hard-refresh / first-load bootstrap ─────────────────────────────────────
// On a full page reload (e.g. F5 on /app/print) Frappe's SPA events never
// fire.  We poll until frappe.boot is ready, then initialize the menu.
$(document).ready(function () {
	let attempts = 0;
	const maxAttempts = 40; // 40 × 250 ms = 10 s max

	function tryInit() {
		attempts++;
		// frappe.boot signals that Frappe has finished its bootstrap
		if (typeof frappe !== "undefined" && frappe.boot && frappe.boot.user) {
			initializeWindowsStyleMenu();
			// One extra attempt after a short delay for late-rendering pages
			setTimeout(initializeWindowsStyleMenu, 600);
		} else if (attempts < maxAttempts) {
			setTimeout(tryInit, 250);
		}
	}

	tryInit();

	// MutationObserver: catches the case where .navbar is injected into the
	// DOM *after* frappe.boot is already set (common in print / popup views).
	const observer = new MutationObserver(function (mutations) {
		for (const mutation of mutations) {
			for (const node of mutation.addedNodes) {
				if (
					node.nodeType === 1 &&
					(node.classList.contains("navbar") ||
						(node.querySelector && node.querySelector(".navbar")))
				) {
					setTimeout(initializeWindowsStyleMenu, 100);
					observer.disconnect();
					return;
				}
			}
		}
	});
	observer.observe(document.body || document.documentElement, {
		childList: true,
		subtree: true,
	});
});

// ─── SPA navigation hooks ─────────────────────────────────────────────────────
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
	setTimeout(initializeWindowsStyleMenu, 800);
});

$(document).on("app_ready", function () {
	setTimeout(initializeWindowsStyleMenu, 300);
	setTimeout(initializeWindowsStyleMenu, 1000);

	if (typeof frappe !== "undefined" && frappe.router) {
		frappe.router.on("change", function () {
			setTimeout(initializeWindowsStyleMenu, 300);
			setTimeout(initializeWindowsStyleMenu, 800);
		});
	}
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

	applyWindowsMenuAppearance();
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

function applyWindowsMenuAppearance() {
	const settings = (frappe.boot && frappe.boot.thunder_desk && frappe.boot.thunder_desk.settings) || {};
	const root = document.documentElement;
	root.style.setProperty("--td-wsm-bg", settings.wsm_light_bg || "#f0f0f0");
	root.style.setProperty("--td-wsm-hover-bg", settings.wsm_light_hover_bg || "#e1e1e1");
	root.style.setProperty("--td-wsm-bg-dark", settings.wsm_dark_bg || "#2d2d2d");
	root.style.setProperty("--td-wsm-hover-bg-dark", settings.wsm_dark_hover_bg || "#3d3d3d");
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
                ${td_render_menu_icon("website", "sm", "#3498db")}
                <span>${__("Home")}</span>
            </button>
        </div>
    `;
}

function getSubmenuItemHTML(submenu, isTabApp, isDesktopApp) {
	const contextData = `data-tab-app="${isTabApp}" data-desktop-app="${isDesktopApp}"`;
	const children = submenu.children || [];

	if (submenu.is_group || submenu.item_type === "Group" || children.length) {
		const nestedHTML = children.map((child) => getSubmenuItemHTML(child, isTabApp, isDesktopApp)).join("");
		return `
			<div class="windows-submenu-group dropdown-item">
				<div class="windows-submenu-group-label" tabindex="0">
					<span>${frappe.utils.escape_html(submenu.label)}</span>
					<i class="fa fa-chevron-right"></i>
				</div>
				<div class="dropdown-menu windows-dropdown-menu windows-nested-menu">
					${nestedHTML}
				</div>
			</div>
		`;
	}

	const route =
		submenu.route ||
		(submenu.doctype ? `/app/${frappe.router.slug(submenu.doctype)}` : "#");
	return `
		<a class="dropdown-item windows-submenu-item" href="${frappe.utils.escape_html(route)}"
		   data-doctype="${frappe.utils.escape_html(submenu.doctype || "")}"
		   data-route="${frappe.utils.escape_html(submenu.route || "")}"
		   ${contextData}
		   tabindex="0">
			<span>${frappe.utils.escape_html(submenu.label)}</span>
		</a>
	`;
}

function getMenuItemHTML(menu, isTabApp, isDesktopApp) {
	const submenuHTML = (menu.submenus || [])
		.map((submenu) => getSubmenuItemHTML(submenu, isTabApp, isDesktopApp))
		.join("");

	const buttonId = `windows-menu-${String(menu.name || menu.title || "menu")
		.replace(/\s+/g, "-")
		.toLowerCase()}`;

	return `
        <div class="windows-menu-item dropdown">
            <button class="windows-menu-button dropdown-toggle"
                    type="button"
                    id="${buttonId}"
                    style="border-left: 4px solid ${menu.color || "#999"};"
                    aria-haspopup="true"
                    aria-expanded="false"
                    tabindex="0">
                ${td_render_menu_icon(menu.icon || "folder-normal", "sm", menu.color || "#999")}
                <span>${frappe.utils.escape_html(menu.title || "")}</span>
            </button>
            <div class="dropdown-menu windows-dropdown-menu" aria-labelledby="${buttonId}">
                ${submenuHTML}
            </div>
        </div>
    `;
}

function getERPNextMenuStructure() {
	const fromBoot =
		(frappe.boot && frappe.boot.thunder_desk && frappe.boot.thunder_desk.windows_menu) || [];
	return Array.isArray(fromBoot) ? fromBoot : [];
}

function setupWindowsMenuHandlers() {
	$(document).off(".windowsMenu");

	// Hover to open
	$(document).on("mouseenter.windowsMenu", ".windows-menu-item", function () {
		const $item = $(this);
		$(".windows-menu-item > .windows-dropdown-menu").removeClass("show");
		$(".windows-menu-button").removeClass("show").attr("aria-expanded", "false");
		$item.children(".windows-dropdown-menu").addClass("show");
		$item.children(".windows-menu-button").addClass("show").attr("aria-expanded", "true");
	});

	$(document).on("mouseenter.windowsMenu", ".windows-submenu-group", function (e) {
		e.stopPropagation();
		const $group = $(this);
		// Close only sibling flyouts at this level (keep ancestors open)
		$group.siblings(".windows-submenu-group").each(function () {
			$(this).find(".windows-nested-menu").removeClass("show");
		});
		$group.children(".windows-nested-menu").addClass("show");
	});

	$(document).on("mouseleave.windowsMenu", ".windows-submenu-group", function (e) {
		const $group = $(this);
		const related = e.relatedTarget;
		// Keep open when moving into nested flyout
		if (related && $group[0].contains(related)) {
			return;
		}
		setTimeout(() => {
			if (!$group.is(":hover")) {
				$group.children(".windows-nested-menu").removeClass("show");
			}
		}, 120);
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
