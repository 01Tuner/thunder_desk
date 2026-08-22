/**
 * Thunder Icon — hybrid Frappe Lucide + curated Font Awesome picker.
 * Use fieldtype: "Thunder Icon" in dialogs / forms.
 */
frappe.provide("thunder_desk.icons");

thunder_desk.icons.FA_CURATED = [
	"fa fa-home",
	"fa fa-dashboard",
	"fa fa-th",
	"fa fa-th-large",
	"fa fa-bars",
	"fa fa-list",
	"fa fa-list-ul",
	"fa fa-list-ol",
	"fa fa-table",
	"fa fa-search",
	"fa fa-user",
	"fa fa-user-plus",
	"fa fa-users",
	"fa fa-user-secret",
	"fa fa-id-card",
	"fa fa-address-book",
	"fa fa-phone",
	"fa fa-envelope",
	"fa fa-comments",
	"fa fa-comment",
	"fa fa-bell",
	"fa fa-star",
	"fa fa-heart",
	"fa fa-flag",
	"fa fa-bookmark",
	"fa fa-tag",
	"fa fa-tags",
	"fa fa-folder",
	"fa fa-folder-open",
	"fa fa-file",
	"fa fa-file-o",
	"fa fa-file-text",
	"fa fa-file-text-o",
	"fa fa-files-o",
	"fa fa-clipboard",
	"fa fa-copy",
	"fa fa-paste",
	"fa fa-print",
	"fa fa-download",
	"fa fa-upload",
	"fa fa-cloud",
	"fa fa-cloud-upload",
	"fa fa-cloud-download",
	"fa fa-shopping-cart",
	"fa fa-shopping-bag",
	"fa fa-shopping-basket",
	"fa fa-credit-card",
	"fa fa-money",
	"fa fa-dollar",
	"fa fa-eur",
	"fa fa-calculator",
	"fa fa-percent",
	"fa fa-balance-scale",
	"fa fa-bank",
	"fa fa-university",
	"fa fa-briefcase",
	"fa fa-building",
	"fa fa-building-o",
	"fa fa-industry",
	"fa fa-hospital-o",
	"fa fa-truck",
	"fa fa-car",
	"fa fa-plane",
	"fa fa-ship",
	"fa fa-cubes",
	"fa fa-cube",
	"fa fa-archive",
	"fa fa-inbox",
	"fa fa-database",
	"fa fa-server",
	"fa fa-barcode",
	"fa fa-qrcode",
	"fa fa-exchange",
	"fa fa-refresh",
	"fa fa-undo",
	"fa fa-repeat",
	"fa fa-share",
	"fa fa-share-alt",
	"fa fa-link",
	"fa fa-unlink",
	"fa fa-external-link",
	"fa fa-globe",
	"fa fa-map-marker",
	"fa fa-map",
	"fa fa-compass",
	"fa fa-clock-o",
	"fa fa-calendar",
	"fa fa-calendar-check-o",
	"fa fa-history",
	"fa fa-hourglass-o",
	"fa fa-check",
	"fa fa-check-circle",
	"fa fa-check-square",
	"fa fa-times",
	"fa fa-times-circle",
	"fa fa-ban",
	"fa fa-exclamation-triangle",
	"fa fa-exclamation-circle",
	"fa fa-info-circle",
	"fa fa-question-circle",
	"fa fa-plus",
	"fa fa-plus-circle",
	"fa fa-minus",
	"fa fa-minus-circle",
	"fa fa-edit",
	"fa fa-pencil",
	"fa fa-pencil-square-o",
	"fa fa-trash",
	"fa fa-trash-o",
	"fa fa-lock",
	"fa fa-unlock",
	"fa fa-key",
	"fa fa-shield",
	"fa fa-eye",
	"fa fa-eye-slash",
	"fa fa-cog",
	"fa fa-cogs",
	"fa fa-wrench",
	"fa fa-sliders",
	"fa fa-filter",
	"fa fa-sort",
	"fa fa-sort-amount-asc",
	"fa fa-sort-amount-desc",
	"fa fa-bar-chart",
	"fa fa-line-chart",
	"fa fa-pie-chart",
	"fa fa-area-chart",
	"fa fa-sitemap",
	"fa fa-code",
	"fa fa-terminal",
	"fa fa-laptop",
	"fa fa-desktop",
	"fa fa-mobile",
	"fa fa-tablet",
	"fa fa-camera",
	"fa fa-picture-o",
	"fa fa-video-camera",
	"fa fa-microphone",
	"fa fa-music",
	"fa fa-gift",
	"fa fa-trophy",
	"fa fa-bolt",
	"fa fa-fire",
	"fa fa-leaf",
	"fa fa-sun-o",
	"fa fa-moon-o",
	"fa fa-book",
	"fa fa-graduation-cap",
	"fa fa-handshake-o",
	"fa fa-id-badge",
	"fa fa-ticket",
	"fa fa-cutlery",
	"fa fa-coffee",
	"fa fa-magic",
	"fa fa-lightbulb-o",
	"fa fa-rocket",
	"fa fa-paper-plane",
	"fa fa-bullhorn",
	"fa fa-newspaper-o",
	"fa fa-rss",
	"fa fa-wifi",
	"fa fa-signal",
	"fa fa-power-off",
	"fa fa-plug",
	"fa fa-battery-full",
	"fa fa-recycle",
	"fa fa-tint",
	"fa fa-thumb-tack",
	"fa fa-thumbs-up",
	"fa fa-thumbs-down",
	"fa fa-smile-o",
	"fa fa-meh-o",
	"fa fa-frown-o",
	"fa fa-arrow-up",
	"fa fa-arrow-down",
	"fa fa-arrow-left",
	"fa fa-arrow-right",
	"fa fa-arrow-circle-up",
	"fa fa-arrow-circle-down",
	"fa fa-arrow-circle-left",
	"fa fa-arrow-circle-right",
	"fa fa-chevron-up",
	"fa fa-chevron-down",
	"fa fa-chevron-left",
	"fa fa-chevron-right",
	"fa fa-angle-double-right",
	"fa fa-ellipsis-h",
	"fa fa-ellipsis-v",
	"fa fa-circle",
	"fa fa-circle-o",
	"fa fa-dot-circle-o",
	"fa fa-square",
	"fa fa-square-o",
	"fa fa-toggle-on",
	"fa fa-toggle-off",
];

thunder_desk.icons.is_fa = function (name) {
	const v = String(name || "");
	return v.includes("fa-") || v.startsWith("fa ");
};

thunder_desk.icons.render = function (name, size) {
	const icon = name || "folder-normal";
	if (thunder_desk.icons.is_fa(icon)) {
		return `<i class="${frappe.utils.escape_html(icon)}"></i>`;
	}
	return frappe.utils.icon(frappe.utils.escape_html(icon), size || "sm");
};

thunder_desk.icons.get_desk_symbols = function () {
	if (!frappe.symbols || !frappe.symbols.length) {
		frappe.symbols = [];
		$("#all-symbols > svg > symbol[id]").each(function () {
			if (this.id.includes("icon-")) {
				frappe.symbols.push(this.id.replace("icon-", ""));
			}
		});
	}
	return frappe.symbols || [];
};

thunder_desk.icons.ensure_fa_css = function () {
	if (!$("link[href*='font-awesome']").length) {
		$("<link>", {
			rel: "stylesheet",
			href: "/assets/frappe/css/fonts/fontawesome/font-awesome.min.css",
		}).appendTo("head");
	}
	// Ensure picker layout CSS is present even if page stylesheet missed/cached
	if (!$("link[href*='thunder_desk_settings.css']").length) {
		$("<link>", {
			rel: "stylesheet",
			href: "/assets/thunder_desk/css/thunder_desk_settings.css",
		}).appendTo("head");
	}
};

class ThunderIconPicker {
	constructor(opts) {
		this.parent = opts.parent;
		this.icon = opts.icon || "";
		this.on_change = opts.on_change;
		this.active_tab = thunder_desk.icons.is_fa(this.icon) ? "fa" : "desk";
		this.setup();
	}

	setup() {
		this.$wrapper = $(`
			<div class="td-icon-picker icon-picker">
				<div class="td-icon-tabs">
					<button type="button" class="td-icon-tab active" data-tab="desk">${__("Desk")}</button>
					<button type="button" class="td-icon-tab" data-tab="fa">${__("Font Awesome")}</button>
				</div>
				<div class="search-icons">
					<span class="search-icon">${frappe.utils.icon("search", "sm")}</span>
					<input type="search" class="form-control" placeholder="${__("Search for icons...")}">
				</div>
				<div class="icon-section">
					<div class="icons td-icon-grid"></div>
				</div>
			</div>
		`);
		this.parent.append(this.$wrapper);
		this.$icons = this.$wrapper.find(".td-icon-grid");
		this.$search = this.$wrapper.find("input[type='search']");

		this.$wrapper.on("click", ".td-icon-tab", (e) => {
			e.preventDefault();
			e.stopPropagation();
			this.active_tab = $(e.currentTarget).data("tab");
			this.render_grid();
		});

		this.$search.on("keyup search", () => this.filter_icons());

		this.render_grid();
	}

	set_icon(icon) {
		this.icon = icon || "";
		this.active_tab = thunder_desk.icons.is_fa(this.icon) ? "fa" : "desk";
	}

	refresh() {
		this.render_grid();
	}

	render_grid() {
		this.$wrapper.find(".td-icon-tab").removeClass("active");
		this.$wrapper.find(`.td-icon-tab[data-tab="${this.active_tab}"]`).addClass("active");
		this.$icons.empty();

		const query = (this.$search.val() || "").toLowerCase().trim();
		let items = [];

		if (this.active_tab === "fa") {
			items = thunder_desk.icons.FA_CURATED.filter((name, idx, arr) => arr.indexOf(name) === idx).map(
				(name) => ({
					id: name,
					html: `<i class="${name}"></i>`,
					search: name,
				})
			);
		} else {
			items = thunder_desk.icons.get_desk_symbols().map((name) => ({
				id: name,
				html: frappe.utils.icon(name, "md"),
				search: name,
			}));
		}

		if (query) {
			items = items.filter((it) => it.search.toLowerCase().includes(query));
		}

		items.forEach((it) => {
			const selected = this.icon === it.id ? " selected" : "";
			const $el = $(
				`<div class="td-icon-cell icon-wrapper${selected}" data-icon="${frappe.utils.escape_html(
					it.id
				)}">${it.html}</div>`
			);
			$el.attr("aria-label", it.id);
			$el.on("click", (e) => {
				e.preventDefault();
				e.stopPropagation();
				this.icon = it.id;
				this.$icons.find(".td-icon-cell").removeClass("selected");
				$el.addClass("selected");
				if (this.on_change) this.on_change(it.id);
			});
			this.$icons.append($el);
		});
	}

	filter_icons() {
		this.render_grid();
	}
}

frappe.ui.form.ControlThunderIcon = class ControlThunderIcon extends frappe.ui.form.ControlData {
	make_input() {
		thunder_desk.icons.ensure_fa_css();
		this.df.placeholder = __(this.df.placeholder) || __("Choose an icon");
		super.make_input();
		this.make_icon_input();
	}

	make_icon_input() {
		const picker_wrapper = $("<div>");
		this.picker = new ThunderIconPicker({
			parent: picker_wrapper,
			icon: this.get_value() || "",
			on_change: (icon) => {
				this.set_value(icon);
				this.$wrapper.popover("hide");
			},
		});

		this.$wrapper
			.popover({
				trigger: "manual",
				container: "body",
				sanitize: false,
				offset: "0, 8",
				boundary: "viewport",
				placement: "bottom",
				template: `
					<div class="popover icon-picker-popover td-icon-picker-popover">
						<div class="picker-arrow arrow"></div>
						<div class="popover-body popover-content"></div>
					</div>
				`,
				content: () => picker_wrapper,
				html: true,
			})
			.on("show.bs.popover", () => {
				setTimeout(() => {
					this.picker.set_icon(this.get_value() || "");
					this.picker.refresh();
					// Keep popover wide even when opened from a narrow grid cell
					const tip = this.$wrapper.data("bs.popover")?.tip || this.$wrapper.data("bs.popover")?.getTipElement?.();
					const $tip = tip ? $(tip) : $(".td-icon-picker-popover:visible").last();
					$tip.css({ width: "300px", maxWidth: "300px" });
				}, 10);
			})
			.on("hidden.bs.popover", () => {
				$("body").off("click.td-icon-popover");
				$(window).off("hashchange.td-icon-popover");
			});

		if (!this.selected_icon) {
			this.selected_icon = $(`<div class="selected-icon td-selected-icon"></div>`);
			this.selected_icon.insertAfter(this.$input);
			this.update_preview(this.get_value());
		}

		this.$wrapper
			.find(".selected-icon")
			.parent()
			.on("click", (e) => {
				if ($(e.target).closest(".popover").length) return;
				this.$wrapper.popover("toggle");
				e.stopPropagation();
				$("body").on("click.td-icon-popover", (ev) => {
					if (!$(ev.target).closest(".popover, .selected-icon, .td-selected-icon").length) {
						this.$wrapper.popover("hide");
					}
				});
				$(window).on("hashchange.td-icon-popover", () => {
					this.$wrapper.popover("hide");
				});
			});
	}

	update_preview(value) {
		if (!this.selected_icon) return;
		const icon = value || "folder-normal";
		this.selected_icon.html(thunder_desk.icons.render(icon, "md"));
		this.selected_icon.toggleClass("no-value", !value);
	}

	set_formatted_input(value) {
		super.set_formatted_input(value);
		this.$input.val(value);
		this.update_preview(value);
		if (this.picker) {
			this.picker.set_icon(value || "");
		}
	}
};
