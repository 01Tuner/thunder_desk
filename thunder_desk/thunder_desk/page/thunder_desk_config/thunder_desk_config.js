frappe.pages["thunder-desk-config"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Thunder Desk Settings"),
		single_column: true,
	});

	const start = () => new ThunderDeskSettingsPage(page);

	const ensure_assets = (done) => {
		if (!$("link[href*='thunder_desk_settings.css']").length) {
			$("<link>", {
				rel: "stylesheet",
				href: "/assets/thunder_desk/css/thunder_desk_settings.css",
			}).appendTo("head");
		}
		if (frappe.ui.form.ControlThunderIcon) {
			done();
			return;
		}
		frappe.require("/assets/thunder_desk/js/thunder_desk_icon_picker.js", done);
	};

	ensure_assets(start);
};

frappe.pages["thunder-desk-config"].on_page_show = function () {
	if (!$("link[href*='thunder_desk_settings.css']").length) {
		$("<link>", {
			rel: "stylesheet",
			href: "/assets/thunder_desk/css/thunder_desk_settings.css",
		}).appendTo("head");
	}
};

class ThunderDeskSettingsPage {
	constructor(page) {
		this.page = page;
		this.$body = $(page.body);
		this.data = null;
		this.settings = {};
		this.active_tab = "general";
		this.wsm_expanded = null; // Set of menu names; null = init to first only
		this._dialog = null;
		this.render_shell();
		this.load();
	}

	/** Render Lucide Icon or Font Awesome class. */
	render_icon(name, size = "sm") {
		if (frappe.thunder_desk?.icons?.render || (typeof thunder_desk !== "undefined" && thunder_desk.icons?.render)) {
			return thunder_desk.icons.render(name, size);
		}
		const icon = name || "folder-normal";
		if (String(icon).includes("fa-") || String(icon).startsWith("fa ")) {
			return `<i class="${frappe.utils.escape_html(icon)}"></i>`;
		}
		return frappe.utils.icon(frappe.utils.escape_html(icon), size);
	}

	render_shell() {
		this.$body.html(`
			<div class="td-settings-page">
				<div class="td-settings-tabs">
					<button class="td-tab-btn active" data-tab="general">${__("General")}</button>
					<button class="td-tab-btn" data-tab="windows">${__("Windows Style Menu")}</button>
					<button class="td-tab-btn" data-tab="dashboard">${__("Dashboard Menu")}</button>
					<button class="td-tab-btn" data-tab="quick">${__("Quick Actions")}</button>
				</div>
				<div class="td-settings-section active" data-section="general"></div>
				<div class="td-settings-section" data-section="windows"></div>
				<div class="td-settings-section" data-section="dashboard"></div>
				<div class="td-settings-section" data-section="quick"></div>
			</div>
		`);

		this.$body.find(".td-tab-btn").on("click", (e) => {
			const tab = $(e.currentTarget).data("tab");
			this.switch_tab(tab);
		});
	}

	switch_tab(tab) {
		this.active_tab = tab;
		this.$body.find(".td-tab-btn").removeClass("active");
		this.$body.find(`.td-tab-btn[data-tab="${tab}"]`).addClass("active");
		this.$body.find(".td-settings-section").removeClass("active");
		this.$body.find(`.td-settings-section[data-section="${tab}"]`).addClass("active");
	}

	load() {
		frappe.call({
			method: "thunder_desk.menu_api.get_settings_page_data",
			callback: (r) => {
				this.data = r.message || {};
				this.settings = this.data.settings || {};
				this.render_all();
			},
		});
	}

	render_all() {
		this.render_general();
		this.render_windows();
		this.render_dashboard();
		this.render_quick();
	}

	save_settings(fields, done) {
		const payload = {};
		(fields || Object.keys(this.settings)).forEach((key) => {
			if (this.settings[key] !== undefined) {
				payload[key] = this.settings[key];
			}
		});
		frappe.call({
			method: "thunder_desk.menu_api.save_thunder_desk_settings",
			args: { settings: payload },
			freeze: true,
			callback: (r) => {
				this.settings = r.message || this.settings;
				frappe.show_alert({ message: __("Saved"), indicator: "green" });
				if (done) done();
			},
		});
	}

	render_general() {
		const s = this.settings;
		const $el = this.$body.find('[data-section="general"]');
		$el.html(`
			<div class="td-card">
				<h4>${__("Layout")}</h4>
				<label class="td-check-row"><input type="checkbox" data-field="enable_top_menu" ${s.enable_top_menu ? "checked" : ""}> ${__("Enable Top Menu")}</label>
				<label class="td-check-row"><input type="checkbox" data-field="hide_side_bar" ${s.hide_side_bar ? "checked" : ""}> ${__("Hide Side Bar")}</label>
			</div>
			<div class="td-card">
				<h4>${__("Multi Company")}</h4>
				<label class="td-check-row"><input type="checkbox" data-field="customer_default_company" ${s.customer_default_company ? "checked" : ""}> ${__("Customer - Set active company as default")}</label>
				<label class="td-check-row"><input type="checkbox" data-field="supplier_default_company" ${s.supplier_default_company ? "checked" : ""}> ${__("Supplier - Set active company as default")}</label>
				<label class="td-check-row"><input type="checkbox" data-field="item_default_company" ${s.item_default_company ? "checked" : ""}> ${__("Item - Set active company as default")}</label>
			</div>
			<div class="td-card">
				<h4>${__("Item Search")}</h4>
				<label class="td-check-row"><input type="checkbox" data-field="show_item_qty_in_search" ${s.show_item_qty_in_search ? "checked" : ""}> ${__("Show Available Qty in Item Search")}</label>
				<label class="td-check-row"><input type="checkbox" data-field="show_item_valuation_rate_in_search" ${s.show_item_valuation_rate_in_search ? "checked" : ""}> ${__("Show Valuation Rate in Item Search")}</label>
			</div>
			<button class="btn btn-primary btn-sm" data-action="save-general">${__("Save")}</button>
		`);

		$el.find("input[data-field]").on("change", (e) => {
			const $input = $(e.currentTarget);
			this.settings[$input.data("field")] = $input.is(":checked") ? 1 : 0;
		});
		$el.find('[data-action="save-general"]').on("click", () => {
			this.save_settings([
				"enable_top_menu",
				"hide_side_bar",
				"customer_default_company",
				"supplier_default_company",
				"item_default_company",
				"show_item_qty_in_search",
				"show_item_valuation_rate_in_search",
			]);
		});
	}

	appearance_fields_html(prefix, title) {
		const s = this.settings;
		const fields = [
			[`${prefix}_light_bg`, __("Light Background")],
			[`${prefix}_light_hover_bg`, __("Light Hover Background")],
			[`${prefix}_dark_bg`, __("Dark Background")],
			[`${prefix}_dark_hover_bg`, __("Dark Hover Background")],
		];
		return `
			<div class="td-card">
				<h4>${title}</h4>
				<div class="td-form-grid">
					${fields
						.map(
							([field, label]) => `
						<div>
							<label class="td-muted">${label}</label>
							<input type="color" class="form-control" data-color="${field}" value="${s[field] || "#ffffff"}">
						</div>`
						)
						.join("")}
				</div>
				<div style="margin-top:12px">
					<button class="btn btn-primary btn-sm" data-action="save-appearance" data-prefix="${prefix}">${__("Save Appearance")}</button>
				</div>
			</div>
		`;
	}

	bind_appearance($el, prefix) {
		$el.find("input[data-color]").on("change", (e) => {
			const $input = $(e.currentTarget);
			this.settings[$input.data("color")] = $input.val();
		});
		$el.find(`[data-action="save-appearance"][data-prefix="${prefix}"]`).on("click", () => {
			this.save_settings([
				`${prefix}_light_bg`,
				`${prefix}_light_hover_bg`,
				`${prefix}_dark_bg`,
				`${prefix}_dark_hover_bg`,
			]);
		});
	}

	render_windows() {
		const $el = this.$body.find('[data-section="windows"]');
		const menus = this.data.windows_menus || [];
		const items = this.data.windows_items || [];

		if (!this.wsm_expanded) {
			this.wsm_expanded = new Set(menus[0] ? [menus[0].name] : []);
		}

		$el.html(`
			${this.appearance_fields_html("wsm", __("Appearance"))}
			<div class="td-card">
				<div class="td-toolbar">
					<h4 style="margin:0">${__("Menu Modules")}</h4>
					<button class="btn btn-default btn-sm" data-action="add-wsm">${__("Add Module")}</button>
				</div>
				<ul class="td-list" id="td-wsm-list"></ul>
			</div>
		`);
		this.bind_appearance($el, "wsm");

		const $list = $el.find("#td-wsm-list");
		menus.forEach((menu, idx) => {
			const menuItems = items.filter((i) => i.menu === menu.name && !i.parent_item);
			$list.append(this.wsm_menu_row(menu, menuItems, items, idx, menus.length));
		});

		// off first — load() re-renders and was stacking handlers (dialogs reopen)
		$el.off(".tdwsm");
		$el.on("click.tdwsm", "[data-action='add-wsm']", (e) => {
			e.preventDefault();
			e.stopPropagation();
			this.edit_wsm_menu();
		});
		$el.on("click.tdwsm", "[data-toggle-wsm]", (e) => {
			e.preventDefault();
			e.stopPropagation();
			const name = $(e.currentTarget).data("toggle-wsm");
			if (this.wsm_expanded.has(name)) {
				this.wsm_expanded.delete(name);
			} else {
				this.wsm_expanded.add(name);
			}
			$el.find(`[data-wsm-body="${name}"]`).toggleClass("hidden", !this.wsm_expanded.has(name));
			$el.find(`[data-toggle-wsm="${name}"] .td-chevron`).text(this.wsm_expanded.has(name) ? "▼" : "▶");
		});
		$el.on("click.tdwsm", "[data-edit-wsm]", (e) => {
			e.preventDefault();
			e.stopPropagation();
			const name = $(e.currentTarget).data("edit-wsm");
			this.edit_wsm_menu(menus.find((m) => m.name === name));
		});
		$el.on("click.tdwsm", "[data-del-wsm]", (e) => {
			e.preventDefault();
			e.stopPropagation();
			this.delete_doc("Windows Style Menu", $(e.currentTarget).data("del-wsm"));
		});
		$el.on("click.tdwsm", "[data-add-wsi]", (e) => {
			e.preventDefault();
			e.stopPropagation();
			const $btn = $(e.currentTarget);
			this.edit_wsm_item({
				menu: $btn.data("add-wsi"),
				parent_item: $btn.data("parent") || "",
			});
		});
		$el.on("click.tdwsm", "[data-edit-wsi]", (e) => {
			e.preventDefault();
			e.stopPropagation();
			const name = $(e.currentTarget).data("edit-wsi");
			this.edit_wsm_item(items.find((i) => i.name === name));
		});
		$el.on("click.tdwsm", "[data-del-wsi]", (e) => {
			e.preventDefault();
			e.stopPropagation();
			this.delete_doc("Windows Style Menu Item", $(e.currentTarget).data("del-wsi"));
		});
		$el.on("click.tdwsm", "[data-move-wsm]", (e) => {
			e.preventDefault();
			e.stopPropagation();
			const $btn = $(e.currentTarget);
			this.move_in_list(
				"Windows Style Menu",
				menus.map((m) => m.name),
				$btn.data("move-wsm"),
				$btn.data("dir")
			);
		});
		$el.on("click.tdwsm", "[data-move-wsi]", (e) => {
			e.preventDefault();
			e.stopPropagation();
			const $btn = $(e.currentTarget);
			const name = $btn.data("move-wsi");
			const item = items.find((i) => i.name === name);
			if (!item) return;
			const siblings = items
				.filter((i) => i.menu === item.menu && (i.parent_item || "") === (item.parent_item || ""))
				.sort((a, b) => (a.idx || 0) - (b.idx || 0))
				.map((i) => i.name);
			this.move_in_list("Windows Style Menu Item", siblings, name, $btn.data("dir"));
		});
	}

	is_wsm_group(item) {
		return item.item_type === "Group" || Number(item.is_group);
	}

	wsm_menu_row(menu, roots, allItems, idx, total) {
		const expanded = this.wsm_expanded.has(menu.name);
		const $row = $(`
			<li class="td-list-item td-wsm-module" style="flex-direction:column;align-items:stretch">
				<div class="td-wsm-module-head" style="display:flex;justify-content:space-between;gap:12px;align-items:center">
					<button type="button" class="td-collapse-btn" data-toggle-wsm="${menu.name}" title="${__("Expand / Collapse")}">
						<span class="td-chevron">${expanded ? "▼" : "▶"}</span>
						<span class="meta" style="display:inline-flex;align-items:center;gap:10px">
							<span style="width:10px;height:10px;border-radius:50%;background:${frappe.utils.escape_html(menu.color || "#999")}"></span>
							${this.render_icon(menu.icon || "folder-normal")}
							<strong>${frappe.utils.escape_html(menu.title)}</strong>
							<span class="td-badge">${menu.enabled ? __("Enabled") : __("Disabled")}</span>
						</span>
					</button>
					<div class="actions">
						<button type="button" class="btn btn-xs btn-default" data-move-wsm="${menu.name}" data-dir="-1" ${idx === 0 ? "disabled" : ""} title="${__("Move up")}">▲</button>
						<button type="button" class="btn btn-xs btn-default" data-move-wsm="${menu.name}" data-dir="1" ${idx >= total - 1 ? "disabled" : ""} title="${__("Move down")}">▼</button>
						<button type="button" class="btn btn-xs btn-default" data-add-wsi="${menu.name}">${__("Add Item")}</button>
						<button type="button" class="btn btn-xs btn-default" data-edit-wsm="${menu.name}">${__("Edit")}</button>
						<button type="button" class="btn btn-xs btn-danger" data-del-wsm="${menu.name}">${__("Delete")}</button>
					</div>
				</div>
				<div class="td-nested td-wsm-body ${expanded ? "" : "hidden"}" data-wsm-body="${menu.name}" style="margin-top:8px"></div>
			</li>
		`);
		const $children = $row.find(".td-wsm-body");
		roots
			.slice()
			.sort((a, b) => (a.idx || 0) - (b.idx || 0))
			.forEach((item, i, arr) => $children.append(this.wsm_item_row(item, allItems, 0, i, arr.length)));
		return $row;
	}

	wsm_item_path_label(item, allItems) {
		const parts = [item.label];
		let parent = item.parent_item;
		const byName = Object.fromEntries((allItems || []).map((i) => [i.name, i]));
		let guard = 0;
		while (parent && byName[parent] && guard < 10) {
			parts.unshift(byName[parent].label);
			parent = byName[parent].parent_item;
			guard += 1;
		}
		return parts.join(" / ");
	}

	wsm_item_row(item, allItems, depth, idx, total) {
		const children = allItems
			.filter((i) => i.parent_item === item.name)
			.sort((a, b) => (a.idx || 0) - (b.idx || 0));
		const indent = Math.min(depth, 4) * 12;
		const isGroup = this.is_wsm_group(item);
		const typeLabel = item.item_type || (isGroup ? "Group" : "");
		const $row = $(`
			<li class="td-list-item" style="margin-left:${indent}px">
				<div class="meta">
					<span class="td-badge">${frappe.utils.escape_html(typeLabel)}</span>
					<span>${frappe.utils.escape_html(item.label)}</span>
					<span class="td-muted">${frappe.utils.escape_html(item.link_doctype || item.report_name || item.route || "")}</span>
				</div>
				<div class="actions">
					<button class="btn btn-xs btn-default" data-move-wsi="${item.name}" data-dir="-1" ${idx === 0 ? "disabled" : ""} title="${__("Move up")}">▲</button>
					<button class="btn btn-xs btn-default" data-move-wsi="${item.name}" data-dir="1" ${idx >= total - 1 ? "disabled" : ""} title="${__("Move down")}">▼</button>
					${isGroup ? `<button class="btn btn-xs btn-default" data-add-wsi="${item.menu}" data-parent="${item.name}">${__("Add Item")}</button>` : ""}
					<button class="btn btn-xs btn-default" data-edit-wsi="${item.name}">${__("Edit")}</button>
					<button class="btn btn-xs btn-danger" data-del-wsi="${item.name}">${__("Delete")}</button>
				</div>
			</li>
		`);
		if (children.length) {
			const $wrap = $("<div></div>").append($row);
			children.forEach((child, i, arr) =>
				$wrap.append(this.wsm_item_row(child, allItems, depth + 1, i, arr.length))
			);
			return $wrap;
		}
		return $row;
	}

	close_dialog() {
		if (this._dialog) {
			try {
				this._dialog.hide();
			} catch (e) {
				/* ignore */
			}
			this._dialog = null;
		}
	}

	open_dialog(d) {
		this.close_dialog();
		this._dialog = d;
		d.$wrapper.on("hidden.bs.modal", () => {
			if (this._dialog === d) {
				this._dialog = null;
			}
		});
		d.show();
		return d;
	}

	edit_wsm_menu(doc) {
		const d = new frappe.ui.Dialog({
			title: doc ? __("Edit Module") : __("Add Module"),
			fields: [
				{ fieldname: "title", label: __("Title"), fieldtype: "Data", reqd: 1, default: doc?.title },
				{ fieldname: "menu_key", label: __("Menu Key"), fieldtype: "Data", reqd: 1, default: doc?.menu_key },
				{ fieldname: "icon", label: __("Icon"), fieldtype: "Thunder Icon", default: doc?.icon || "folder-normal" },
				{ fieldname: "color", label: __("Color"), fieldtype: "Color", default: doc?.color || "#3498db" },
				{ fieldname: "enabled", label: __("Enabled"), fieldtype: "Check", default: doc ? doc.enabled : 1 },
			],
			primary_action_label: __("Save"),
			primary_action: (values) => {
				const payload = { ...values };
				if (doc?.name) payload.name = doc.name;
				this.close_dialog();
				this.save_doc("Windows Style Menu", payload);
			},
		});
		this.open_dialog(d);
	}

	edit_wsm_item(doc) {
		const menus = (this.data.windows_menus || []).map((m) => m.name);
		const allItems = this.data.windows_items || [];
		const defaultType =
			doc?.item_type || (Number(doc?.is_group) ? "Group" : "DocType");

		const parentChoicesFor = (menu) =>
			allItems
				.filter(
					(i) =>
						this.is_wsm_group(i) &&
						i.menu === menu &&
						(!doc?.name || i.name !== doc.name)
				)
				.map((i) => ({
					label: this.wsm_item_path_label(i, allItems),
					value: i.name,
				}));

		const d = new frappe.ui.Dialog({
			title: doc?.name ? __("Edit Item") : __("Add Item"),
			fields: [
				{
					fieldname: "menu",
					label: __("Menu"),
					fieldtype: "Select",
					options: menus.join("\n"),
					reqd: 1,
					default: doc?.menu,
					onchange: () => {
						d.set_df_property("parent_item", "options", parentChoicesFor(d.get_value("menu")));
					},
				},
				{
					fieldname: "parent_item",
					label: __("Parent Item"),
					fieldtype: "Autocomplete",
					options: parentChoicesFor(doc?.menu || menus[0]),
					default: doc?.parent_item || "",
					description: __("Optional. Pick a Group-type item to nest under it."),
				},
				{ fieldname: "label", label: __("Label"), fieldtype: "Data", reqd: 1, default: doc?.label },
				{
					fieldname: "item_type",
					label: __("Type"),
					fieldtype: "Select",
					options: "Group\nDocType\nReport\nRoute",
					reqd: 1,
					default: defaultType,
				},
				{
					fieldname: "link_doctype",
					label: __("DocType"),
					fieldtype: "Link",
					options: "DocType",
					default: doc?.link_doctype,
					depends_on: "eval:doc.item_type=='DocType'",
				},
				{
					fieldname: "report_name",
					label: __("Report"),
					fieldtype: "Link",
					options: "Report",
					default: doc?.report_name,
					depends_on: "eval:doc.item_type=='Report'",
				},
				{
					fieldname: "route",
					label: __("Route"),
					fieldtype: "Data",
					default: doc?.route,
					depends_on: "eval:doc.item_type=='Route'",
					reqd: 1,
				},
				{ fieldname: "icon", label: __("Icon"), fieldtype: "Thunder Icon", default: doc?.icon || "file" },
				{ fieldname: "enabled", label: __("Enabled"), fieldtype: "Check", default: doc?.name ? doc.enabled : 1 },
			],
			primary_action_label: __("Save"),
			primary_action: (values) => {
				const payload = { ...values };
				if (doc?.name) payload.name = doc.name;
				const parentChoices = parentChoicesFor(payload.menu);
				if (payload.parent_item) {
					const match = parentChoices.find(
						(o) => o.value === payload.parent_item || o.label === payload.parent_item
					);
					payload.parent_item = match ? match.value : null;
				} else {
					payload.parent_item = null;
				}
				if (payload.item_type === "Group") {
					payload.link_doctype = "";
					payload.report_name = "";
					payload.route = "";
					payload.is_group = 1;
				} else {
					payload.is_group = 0;
				}
				this.close_dialog();
				this.save_doc("Windows Style Menu Item", payload);
			},
		});
		this.open_dialog(d);
	}

	move_in_list(doctype, orderedNames, name, dir) {
		const names = (orderedNames || []).slice();
		const from = names.indexOf(name);
		const to = from + Number(dir);
		if (from < 0 || to < 0 || to >= names.length) return;
		const tmp = names[from];
		names[from] = names[to];
		names[to] = tmp;
		frappe.call({
			method: "thunder_desk.menu_api.reorder_documents",
			args: { doctype, ordered_names: names },
			freeze: true,
			callback: () => {
				frappe.show_alert({ message: __("Order updated"), indicator: "green" });
				this.load();
			},
		});
	}

	render_dashboard() {
		const $el = this.$body.find('[data-section="dashboard"]');
		const menus = this.data.dashboard_menus || [];
		$el.html(`
			${this.appearance_fields_html("dm", __("Appearance"))}
			<div class="td-card">
				<div class="td-toolbar">
					<h4 style="margin:0">${__("Dashboard Modules")}</h4>
					<button class="btn btn-default btn-sm" data-action="add-dm">${__("Add Module")}</button>
				</div>
				<ul class="td-list" id="td-dm-list"></ul>
			</div>
		`);
		this.bind_appearance($el, "dm");
		const $list = $el.find("#td-dm-list");
		menus.forEach((menu, idx) => {
			$list.append(`
				<li class="td-list-item" style="flex-direction:column;align-items:stretch">
					<div style="display:flex;justify-content:space-between;gap:12px;align-items:center">
						<div class="meta">
							${this.render_icon(menu.icon || "folder-normal")}
							<strong>${frappe.utils.escape_html(menu.title)}</strong>
							<span class="td-muted">${(menu.items || []).length} ${__("items")}</span>
						</div>
						<div class="actions">
							<button type="button" class="btn btn-xs btn-default" data-move-dm="${menu.name}" data-dir="-1" ${idx === 0 ? "disabled" : ""} title="${__("Move up")}">▲</button>
							<button type="button" class="btn btn-xs btn-default" data-move-dm="${menu.name}" data-dir="1" ${idx >= menus.length - 1 ? "disabled" : ""} title="${__("Move down")}">▼</button>
							<button type="button" class="btn btn-xs btn-default" data-edit-dm="${menu.name}">${__("Edit")}</button>
							<button type="button" class="btn btn-xs btn-danger" data-del-dm="${menu.name}">${__("Delete")}</button>
						</div>
					</div>
				</li>
			`);
		});
		$el.off(".tddm");
		$el.on("click.tddm", "[data-action='add-dm']", (e) => {
			e.preventDefault();
			e.stopPropagation();
			this.edit_dashboard_menu();
		});
		$el.on("click.tddm", "[data-edit-dm]", (e) => {
			e.preventDefault();
			e.stopPropagation();
			const name = $(e.currentTarget).data("edit-dm");
			this.edit_dashboard_menu(menus.find((m) => m.name === name));
		});
		$el.on("click.tddm", "[data-del-dm]", (e) => {
			e.preventDefault();
			e.stopPropagation();
			this.delete_doc("Dashboard Menu", $(e.currentTarget).data("del-dm"));
		});
		$el.on("click.tddm", "[data-move-dm]", (e) => {
			e.preventDefault();
			e.stopPropagation();
			const $btn = $(e.currentTarget);
			this.move_in_list(
				"Dashboard Menu",
				menus.map((m) => m.name),
				$btn.data("move-dm"),
				$btn.data("dir")
			);
		});
	}

	edit_dashboard_menu(doc) {
		const item_rows = (doc?.items || [])
			.slice()
			.sort((a, b) => (a.idx || 0) - (b.idx || 0))
			.map((i) => ({
				name: i.name,
				label: i.label,
				item_type: i.item_type || "DocType",
				link_doctype: i.link_doctype,
				report_name: i.report_name,
				route: i.route,
				icon: i.icon,
				enabled: i.enabled,
				idx: i.idx,
			}));
		const d = new frappe.ui.Dialog({
			title: doc ? __("Edit Dashboard Module") : __("Add Dashboard Module"),
			fields: [
				{ fieldname: "title", label: __("Title"), fieldtype: "Data", reqd: 1, default: doc?.title },
				{ fieldname: "menu_key", label: __("Menu Key"), fieldtype: "Data", reqd: 1, default: doc?.menu_key },
				{ fieldname: "icon", label: __("Icon"), fieldtype: "Thunder Icon", default: doc?.icon || "folder-normal" },
				{ fieldname: "color", label: __("Color"), fieldtype: "Color", default: doc?.color || "#3498db" },
				{ fieldname: "enabled", label: __("Enabled"), fieldtype: "Check", default: doc ? doc.enabled : 1 },
				{
					fieldname: "items",
					label: __("Items"),
					fieldtype: "Table",
					cannot_add_rows: false,
					cannot_reorder_rows: false,
					in_place_edit: true,
					data: item_rows,
					description: __("Drag rows using the handle to reorder items."),
					fields: [
						{ fieldname: "label", label: __("Label"), fieldtype: "Data", in_list_view: 1, reqd: 1 },
						{
							fieldname: "item_type",
							label: __("Type"),
							fieldtype: "Select",
							options: "DocType\nReport\nRoute",
							in_list_view: 1,
						},
						{ fieldname: "link_doctype", label: __("DocType"), fieldtype: "Link", options: "DocType", in_list_view: 1 },
						{ fieldname: "report_name", label: __("Report"), fieldtype: "Link", options: "Report", in_list_view: 1 },
						{ fieldname: "route", label: __("Route"), fieldtype: "Data", in_list_view: 1 },
						{ fieldname: "icon", label: __("Icon"), fieldtype: "Thunder Icon", in_list_view: 1 },
						{ fieldname: "enabled", label: __("Enabled"), fieldtype: "Check", default: 1, in_list_view: 1 },
					],
				},
			],
			size: "extra-large",
			primary_action_label: __("Save"),
			primary_action: (values) => {
				// Use grid order (Frappe Sortable / idx), not original load order
				const grid = d.fields_dict.items?.grid;
				const ordered =
					grid && grid.get_data
						? grid.get_data()
						: (values.items || []).slice().sort((a, b) => (a.idx || 0) - (b.idx || 0));
				const payload = {
					title: values.title,
					menu_key: values.menu_key,
					icon: values.icon,
					color: values.color,
					enabled: values.enabled,
					items: (ordered || [])
						.filter((r) => r && !r.__deleted && r.label)
						.map((r, idx) => ({
							label: r.label,
							item_type: r.item_type,
							link_doctype: r.link_doctype,
							report_name: r.report_name,
							route: r.route,
							icon: r.icon,
							enabled: r.enabled,
							idx: idx + 1,
						})),
				};
				if (doc?.name) payload.name = doc.name;
				this.close_dialog();
				this.save_doc("Dashboard Menu", payload);
			},
		});
		this.open_dialog(d);
	}

	render_quick() {
		const $el = this.$body.find('[data-section="quick"]');
		const actions = this.data.quick_actions || [];
		$el.html(`
			${this.appearance_fields_html("qa", __("Appearance"))}
			<div class="td-card">
				<div class="td-toolbar">
					<h4 style="margin:0">${__("Quick Actions")}</h4>
					<button class="btn btn-default btn-sm" data-action="add-qa">${__("Add Action")}</button>
				</div>
				<ul class="td-list" id="td-qa-list"></ul>
			</div>
		`);
		this.bind_appearance($el, "qa");
		const $list = $el.find("#td-qa-list");
		actions.forEach((action, idx) => {
			$list.append(`
				<li class="td-list-item">
					<div class="meta">
						${this.render_icon(action.icon || "shortcut")}
						<strong>${frappe.utils.escape_html(action.label)}</strong>
						<span class="td-muted">${frappe.utils.escape_html(action.route || "")}</span>
					</div>
					<div class="actions">
						<button type="button" class="btn btn-xs btn-default" data-move-qa="${action.name}" data-dir="-1" ${idx === 0 ? "disabled" : ""} title="${__("Move up")}">▲</button>
						<button type="button" class="btn btn-xs btn-default" data-move-qa="${action.name}" data-dir="1" ${idx >= actions.length - 1 ? "disabled" : ""} title="${__("Move down")}">▼</button>
						<button type="button" class="btn btn-xs btn-default" data-edit-qa="${action.name}">${__("Edit")}</button>
						<button type="button" class="btn btn-xs btn-danger" data-del-qa="${action.name}">${__("Delete")}</button>
					</div>
				</li>
			`);
		});
		$el.off(".tdqa");
		$el.on("click.tdqa", "[data-action='add-qa']", (e) => {
			e.preventDefault();
			e.stopPropagation();
			this.edit_quick_action();
		});
		$el.on("click.tdqa", "[data-edit-qa]", (e) => {
			e.preventDefault();
			e.stopPropagation();
			const name = $(e.currentTarget).data("edit-qa");
			this.edit_quick_action(actions.find((a) => a.name === name));
		});
		$el.on("click.tdqa", "[data-del-qa]", (e) => {
			e.preventDefault();
			e.stopPropagation();
			this.delete_doc("Dashboard Quick Action", $(e.currentTarget).data("del-qa"));
		});
		$el.on("click.tdqa", "[data-move-qa]", (e) => {
			e.preventDefault();
			e.stopPropagation();
			const $btn = $(e.currentTarget);
			this.move_in_list(
				"Dashboard Quick Action",
				actions.map((a) => a.name),
				$btn.data("move-qa"),
				$btn.data("dir")
			);
		});
	}

	edit_quick_action(doc) {
		const d = new frappe.ui.Dialog({
			title: doc ? __("Edit Quick Action") : __("Add Quick Action"),
			fields: [
				{ fieldname: "label", label: __("Label"), fieldtype: "Data", reqd: 1, default: doc?.label },
				{ fieldname: "icon", label: __("Icon"), fieldtype: "Thunder Icon", default: doc?.icon || "shortcut" },
				{ fieldname: "route", label: __("Route"), fieldtype: "Data", reqd: 1, default: doc?.route },
				{ fieldname: "css_class", label: __("CSS Class"), fieldtype: "Data", default: doc?.css_class },
				{ fieldname: "enabled", label: __("Enabled"), fieldtype: "Check", default: doc ? doc.enabled : 1 },
			],
			primary_action_label: __("Save"),
			primary_action: (values) => {
				const payload = { ...values };
				if (doc?.name) payload.name = doc.name;
				this.close_dialog();
				this.save_doc("Dashboard Quick Action", payload);
			},
		});
		this.open_dialog(d);
	}

	save_doc(doctype, doc, done) {
		this.close_dialog();
		frappe.call({
			method: "thunder_desk.menu_api.save_menu_document",
			args: { doctype, doc },
			freeze: true,
			callback: () => {
				frappe.show_alert({ message: __("Saved"), indicator: "green" });
				if (done) done();
				this.load();
			},
		});
	}

	delete_doc(doctype, name) {
		frappe.confirm(__("Delete {0}?", [name]), () => {
			frappe.call({
				method: "thunder_desk.menu_api.delete_menu_document",
				args: { doctype, name },
				freeze: true,
				callback: () => {
					frappe.show_alert({ message: __("Deleted"), indicator: "green" });
					this.load();
				},
			});
		});
	}
}
