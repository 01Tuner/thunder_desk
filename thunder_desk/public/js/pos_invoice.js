
const IS_TAURI = typeof __TAURI__ === 'undefined' ? false : true 

frappe.ui.form.on("POS Invoice", {
	onload: function (frm) {
		if (IS_TAURI) {
			setThunderPosHeader();
			setTauriPrintPolyfill();
		}
	},
	refresh: function (frm) {
		if (window.RELOAD_THUNDER_POS_HEADER) {
			window.location.reload();
			window.RELOAD_THUNDER_POS_HEADER = false;
		}

		if (IS_TAURI) {
			hideStandardMenu();
		}

		// Add Silent Print button
		if (IS_TAURI) {
			frm.add_custom_button(__("Silent Print"), function () {
				silentPrintPosInvoice(frm);
			});
		}
	},
});


function silentPrintPosInvoice(frm) {
	if (!frm.doc.name) {
		frappe.msgprint(__("Please save the document first"));
		return;
	}

	// Generate print URL
	const print_url = frappe.urllib.get_full_url(
		`/printview?doctype=${frm.doctype}&name=${
			frm.doc.name
		}&format=POS Invoice&no_letterhead=0&letterhead=${frm.doc.letter_head || ""}&settings={}`
	);

	// Use Tauri's silent print
	if (window.__TAURI__ && window.__TAURI__.core) {
		window.__TAURI__.core
			.invoke("silent_print", {
				url: print_url,
				copies: 1,
			})
			.then(() => {
				frappe.show_alert(__("Document sent to printer"));
			})
			.catch((err) => {
				console.error("Silent print failed:", err);
				frappe.msgprint(__("Print failed: {0}", [err]));
			});
	} else {
		frappe.msgprint(__("Silent print is only available in desktop app"));
	}
}

function setThunderPosHeader() {
	if (window.thunder_pos_header_set) return;

	document
		.querySelectorAll(
			"header.navbar:not(.thunder-pos-header), .page-container .page-head, .breadcrumb, .navbar-brand, .pos-page .page-head .sidebar-toggle-btn"
		)
		.forEach((el) => {
			el.style.display = "none";
		});

	const userMenu = document.querySelector("header .dropdown-navbar-user");
	const actionMenu = document.querySelector(".page-container .page-head .standard-actions");
	const pageHead = document.querySelector(".page-container .page-head");
	const stickyHeader = document.querySelector(".sticky-top");

	// Remove existing
	const existing = document.querySelector("header.thunderpos");
	if (existing) existing.remove();

	// Create new header
	const container = document.createElement("div");
	container.className = "container";
	window.pos_profile_name = cur_pos.pos_profile;
	container.innerHTML = `
        <div class="left-section">
            <div class="flex">
                <button class="btn btn-sm btn-secondary mr-2" onclick="frappe.set_route('point-of-sale')" title="Go to Home">
                    <i class="fa fa-home"></i>
                </button>
                ${
					window.history.length > 1 && frappe.get_route_str() !== "point-of-sale"
						? '<button class="btn btn-sm btn-secondary mr-2" onclick="window.history.back()" title="Go Back"><i class="fa fa-arrow-left"></i></button>'
						: ""
				}
                <h3 class="ellipsis title-text mb-0 mr-2" title="Point of Sale">Thunder POS</h3>
                <span class="indicator-pill no-indicator-dot whitespace-nowrap blue">
                    <span>${cur_pos.pos_profile}</span>
                </span>
            </div>
        </div>
        <div class="right-section row flex align-center flex-row-reverse">
        </div>
    `;

	// Add user menu clone
	const userMenuClone = userMenu.cloneNode(true);
	userMenuClone.className = "flex nav-item dropdown dropdown-navbar-user dropdown-mobile";
	container.querySelector(".right-section").appendChild(userMenuClone);

	userMenuClone.querySelectorAll("button.dropdown-item, a.dropdown-item").forEach((btn) => {
		!["Log out", "Reload", "Toggle Theme"].includes(btn?.textContent.trim()) &&
			btn.classList.add("hide");
	});
	const newHeader = document.createElement("header");
	newHeader.className = "navbar thunderpos";
	newHeader.appendChild(container);

	actionMenu.querySelectorAll("ul.dropdown-menu li.user-action").forEach((li) => {
		["Full Screen", "Open Form View"].includes(
			li.querySelector(".menu-item-label")?.textContent.trim()
		) && li.classList.add("hide");
	});
	//   pageHead.remove();
	stickyHeader.innerHTML = "";
	stickyHeader.appendChild(newHeader);
	stickyHeader.querySelector(".right-section").appendChild(actionMenu);

	window.thunder_pos_header_set = true;
}

function hideStandardMenu() {
	document
		.querySelectorAll("header .standard-actions ul.dropdown-menu li.user-action")
		?.forEach((li) => {
			["Full Screen", "Open Form View"].includes(
				li.querySelector(".menu-item-label")?.textContent.trim()
			) && li.classList.add("hide");
		});
}

function setTauriPrintPolyfill() {
	if (window.tauri_print_polyfill_set) return;

	// Polyfill for Tauri print function
	window.print = () => {
		window.__TAURI__.invoke("print");
	};

	window.open = function (url, name, features) {
		console.log("🖨️ Thunder POS: Opening window:", url);

		// Create mock window for popup blocker detection
		const mockWindow = {
			closed: false,
			location: { href: url || "about:blank" },
			name: name || "",
			opener: window,
			parent: window,
			close: function () {
				this.closed = true;
			},
			focus: function () {
				return true;
			},
			print: function () {
				return true;
			},
		};
		mockWindow.self = mockWindow;
		mockWindow.window = mockWindow;

		// Create actual window through Tauri if URL provided
		if (url && window.__TAURI__ && window.__TAURI__.core) {
			window.__TAURI__.core
				.invoke("open_print_window", {
					url: url,
					window_features: features || "width=800,height=600",
				})
				.then((windowId) => {
					console.log("✅ Print window created:", windowId);
				})
				.catch((err) => {
					console.error("❌ Print window failed:", err);
					// Fallback to original window.open
					originalWindowOpen(url, name, features);
				});
		}

		return mockWindow;
	};

	applyPopupBlockerOverrides();

	window.tauri_print_polyfill_set = true;
}

// Enhanced window.open polyfill for Tauri
const originalWindowOpen = window.open.bind(window);

window.open = function (url, name, features) {
	console.log("🖨️ Thunder POS: Opening window:", url);

	// Create mock window for popup blocker detection
	const mockWindow = {
		closed: false,
		location: { href: url || "about:blank" },
		name: name || "",
		opener: window,
		parent: window,
		close: function () {
			this.closed = true;
		},
		focus: function () {
			return true;
		},
		print: function () {
			return true;
		},
	};
	mockWindow.self = mockWindow;
	mockWindow.window = mockWindow;

	// Create actual window through Tauri if URL provided
	if (url && window.__TAURI__ && window.__TAURI__.core) {
		window.__TAURI__.core
			.invoke("open_print_window", {
				url: url,
				window_features: features || "width=800,height=600",
			})
			.then((windowId) => {
				console.log("✅ Print window created:", windowId);
			})
			.catch((err) => {
				console.error("❌ Print window failed:", err);
				// Fallback to original window.open
				originalWindowOpen(url, name, features);
			});
	}

	return mockWindow;
};

// Simple popup blocker prevention
function applyPopupBlockerOverrides() {
	// Set essential popup blocker properties
	Object.defineProperty(window, "popup_blocker_detected", {
		value: false,
		writable: false,
	});

	window.isPopupBlocked = () => false;

	// ERPNext specific overrides
	if (window.frappe && window.frappe.utils) {
		window.frappe.utils.is_popup_blocked = () => false;
	}
}
