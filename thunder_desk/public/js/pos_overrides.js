
// Inject Custom CSS for Item Group Menu Card
const css = `
.pos-item-group-container {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    margin: 8px 0;
    background-color: var(--card-bg);
    border-bottom: 1px solid var(--border-color);
}

.item-group-menu-card {
    display: flex;
    overflow-x: auto;
    gap: 8px;
    white-space: nowrap;
    -ms-overflow-style: none;
    scrollbar-width: none;
    flex: 1;
    scroll-behavior: smooth;
}

.item-group-menu-card::-webkit-scrollbar {
    display: none;
}

.item-group-card {
    display: inline-flex;
    align-items: center;
    padding: 6px 12px;
    border-radius: var(--border-radius-md, 8px);
    background-color: var(--gray-100);
    border: 1px solid var(--gray-200);
    cursor: pointer;
    font-size: var(--text-sm);
    font-weight: normal;
    color: var(--text-color);
    transition: all 0.2s ease;
    user-select: none;
    flex-shrink: 0;
}

.item-group-card:hover {
    background-color: var(--gray-200);
    text-decoration: none;
}

.item-group-card.active {
    background-color: var(--primary);
    color: white;
    border-color: var(--primary);
    font-weight: 500;
}

.pos-group-arrow {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background-color: var(--gray-100);
    cursor: pointer;
    color: var(--text-color);
    flex-shrink: 0;
}

.pos-group-arrow:hover {
    background-color: var(--gray-200);
}

.pinned-all-section {
    display: flex;
    padding-right: 8px;
    border-right: 1px solid var(--border-color);
    margin-right: 8px;
    gap: 8px;
}

.items-selector .search-field {
    grid-column: span 8 / span 8 !important;
}
`;

const style = document.createElement('style');
style.type = 'text/css';
style.appendChild(document.createTextNode(css));
document.head.appendChild(style);

frappe.provide('erpnext.PointOfSale');

// We use a timeout or wait for the bundle implementation
// We do NOT want to overwrite on_page_load, as that starts the POS app.
// Instead, we just wait for the bundle to be active.

frappe.require("point-of-sale.bundle.js", function () {
    if (erpnext.PointOfSale && erpnext.PointOfSale.ItemSelector) {
        overrideItemSelector();
    }
});

function overrideItemSelector() {
    console.log("Applying Item Group Menu Card Overrides");
    const original_make_search_bar = erpnext.PointOfSale.ItemSelector.prototype.make_search_bar;


    erpnext.PointOfSale.ItemSelector.prototype.make_search_bar = function () {
        const me = this;
        this.$component.find(".search-field").html("");
        this.$component.find(".item-group-field").html(""); // Clear original if any

        // Standard Search
        this.search_field = frappe.ui.form.make_control({
            df: {
                label: __("Search"),
                fieldtype: "Data",
                placeholder: __("Search by item code, serial number or barcode"),
            },
            parent: this.$component.find(".search-field"),
            render_input: true,
        });

        this.search_field.toggle_label(false);
        this.attach_clear_btn();

        // --- CUSTOM ITEM GROUP MENU CARD ---
        const $item_group_hidden = this.$component.find(".item-group-field");
        $item_group_hidden.hide();

        // Mock the item_group_field to satisfy attach_shortcuts and other dependencies
        this.item_group_field = {
            parent: $item_group_hidden,
            set_focus: function () {
                // Focus the search field instead or do nothing
                me.search_field.set_focus();
            },
            toggle_label: function () { } // Mocked as make_search_bar calls this
        };

        if (this.$pos_item_group_container) {
            this.$pos_item_group_container.remove();
        }

        // Navigation Stack for Drill-down
        this.group_stack = [];
        this.current_group = null;

        // Container Structure: [Pin: All/Back] | (<) [Scrollable List] (>)
        this.$pos_item_group_container = $(`<div class="pos-item-group-container"></div>`);

        // Pinned Section
        this.$pinned_section = $(`<div class="pinned-all-section"></div>`);
        this.$pos_item_group_container.append(this.$pinned_section);

        // Arrows and List Wrapper
        const $arrow_left = $(`<div class="pos-group-arrow">${frappe.utils.icon('left', 'xs')}</div>`);
        const $arrow_right = $(`<div class="pos-group-arrow">${frappe.utils.icon('right', 'xs')}</div>`);
        this.$item_group_menu = $(`<div class="item-group-menu-card"></div>`);

        $arrow_left.click(() => {
            this.$item_group_menu[0].scrollBy({ left: -150, behavior: 'smooth' });
        });

        $arrow_right.click(() => {
            this.$item_group_menu[0].scrollBy({ left: 150, behavior: 'smooth' });
        });

        this.$pos_item_group_container.append($arrow_left);
        this.$pos_item_group_container.append(this.$item_group_menu);
        this.$pos_item_group_container.append($arrow_right);

        // Insert after the filter-section (search bar) and before items-container
        this.$component.find(".filter-section").after(this.$pos_item_group_container);

        this.load_item_groups();
    };

    erpnext.PointOfSale.ItemSelector.prototype.load_item_groups = function (parent) {
        const me = this;
        // If parent provided, use it. Else use default parent or root.
        // Logic: 
        // 1. Initial Load: parent undefined. Fetch root/default.
        // 2. Drill Down: parent provided. Fetch children of that parent.

        if (parent) {
            me.current_group = parent;
        } else if (!me.current_group && me.parent_item_group) {
            me.current_group = me.parent_item_group;
        }

        const fetch_groups = (group_to_fetch_children_of) => {
            frappe.call({
                method: "frappe.client.get_list",
                args: {
                    doctype: "Item Group",
                    fields: ["name", "is_group"],
                    filters: {
                        parent_item_group: group_to_fetch_children_of
                    },
                    limit_page_length: 100,
                    order_by: "name asc"
                },
                callback: function (r) {
                    if (r.message) {
                        me.render_item_group_menu(r.message);
                    }
                }
            });
        };

        if (me.current_group) {
            fetch_groups(me.current_group);
        } else {
            // Initial Fetch if no parent known
            frappe.call({
                method: "erpnext.selling.page.point_of_sale.point_of_sale.get_parent_item_group",
                callback: (r) => {
                    if (r.message) {
                        me.parent_item_group = r.message;
                        me.current_group = r.message;
                        fetch_groups(me.current_group);
                    }
                },
            });
        }
    };

    erpnext.PointOfSale.ItemSelector.prototype.render_item_group_menu = function (item_groups) {
        const me = this;
        this.$item_group_menu.empty();
        this.$pinned_section.empty();

        // Pinned Button Logic (Back vs All)
        let $pinned_btn;
        const is_root = me.group_stack.length === 0;

        if (is_root) {
            // "All" Button
            $pinned_btn = $(`<div class="item-group-card active" data-group="">${__("All")}</div>`);
            $pinned_btn.click(function () {
                me.$pos_item_group_container.find(".item-group-card").removeClass("active");
                $(this).addClass("active");
                me.item_group = me.parent_item_group;
                me.filter_items();
            });
            this.$pinned_section.append($pinned_btn);
        } else {
            // "Back" Button
            $pinned_btn = $(`<div class="item-group-card" style="background-color: var(--gray-300); font-weight: bold;">
                ${frappe.utils.icon('arrow-left', 'sm')}
             </div>`);
            $pinned_btn.click(function () {
                const prev_group = me.group_stack.pop();
                me.load_item_groups(prev_group);
                me.item_group = prev_group;
                me.filter_items();
            });
            this.$pinned_section.append($pinned_btn);

            // Current Group Name Label
            if (me.current_group) {
                const $group_label = $(`<div class="item-group-card active" style="cursor: pointer;">
                    ${me.current_group}
                 </div>`);
                $group_label.click(function () {
                    me.$pos_item_group_container.find(".item-group-card").removeClass("active");
                    $(this).addClass("active");
                    me.item_group = me.current_group;
                    me.filter_items();
                });
                this.$pinned_section.append($group_label);
            }
        }

        item_groups.forEach(group => {
            const is_group_node = group.is_group;
            // Visual indicator for group? Maybe a folder icon or bold text?
            const label = is_group_node ? `<b>${group.name}</b>` : group.name;

            const $card = $(`<div class="item-group-card" data-group="${group.name}">${label}</div>`);

            $card.click(function () {
                me.$pos_item_group_container.find(".item-group-card").removeClass("active");
                $(this).addClass("active");

                // Select formatting logic
                me.item_group = $(this).data("group");
                me.filter_items();

                // Navigation Logic
                if (is_group_node) {
                    // It's a group, drill down!
                    // Push OLD parent to stack
                    me.group_stack.push(me.current_group);
                    // Load children of NEW group
                    me.load_item_groups(group.name);
                }
            });
            this.$item_group_menu.append($card);
        });
    };
}
