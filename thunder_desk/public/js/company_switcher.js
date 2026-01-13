frappe.provide("frappe.ui.company_switcher");

frappe.ui.company_switcher = {
    render: function () {
        if (this.rendering) return;
        this.rendering = true;

        // Remove any existing company switcher
        $(".company-switcher-navbar, .company-switcher-nav").remove();

        this.fetch_companies().then((companies) => {
            this.rendering = false;
            if (companies && companies.length > 1) {
                this.render_dropdown(companies);
            }
        }).catch(() => {
            this.rendering = false;
        });
    },

    fetch_companies: function () {
        return new Promise((resolve) => {
            frappe.call({
                method: "frappe.client.get_list",
                args: {
                    doctype: "Company",
                    fields: ["name"],
                    filters: {
                        is_group: 0
                    }
                },
                callback: (r) => {
                    resolve(r.message || []);
                }
            });
        });
    },

    get_current_company: function () {
        return frappe.defaults.get_user_default("company");
    },

    set_current_company: function (company) {
        frappe.call({
            method: "thunder_desk.api.set_session_company",
            args: {
                company: company
            },
            callback: (r) => {
                if (r.message) {
                    frappe.show_alert({ message: __("Switched to {0}", [company]), indicator: "green" });

                    // Set flag to force filter update on next load
                    localStorage.setItem('company_switched_flag', '1');
                    cur_list.filter_area.clear();

                    setTimeout(() => {
                        window.location.reload();
                    }, 500);
                }
            }
        });
    },

    render_dropdown: function (companies) {
        const current_company = this.get_current_company() || companies[0].name;

        const $dropdown = $(`
            <li class="nav-item dropdown dropdown-navbar-user dropdown-mobile company-switcher-navbar">
                <a class="nav-link dropdown-toggle" 
                   data-toggle="dropdown" 
                   href="#" 
                   onclick="return false;"
                   style="padding: 0.5rem 1rem; display: flex; align-items: center;">
                    <i class="fa fa-building" style="margin-right: 5px;"></i>
                    <span class="company-name" style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${current_company}
                    </span>
                </a>
                <div class="dropdown-menu dropdown-menu-right" role="menu">
                    ${companies.map(c => `
                        <a class="dropdown-item company-item ${c.name === current_company ? 'active' : ''}" 
                           href="#" 
                           data-company="${c.name}">
                            ${c.name === current_company ? '<i class="fa fa-check" style="margin-right: 5px;"></i>' : ''}
                            ${c.name}
                        </a>
                    `).join("")}
                </div>
            </li>
        `);

        // Clean up any stray duplicates before appending
        $(".company-switcher-navbar").remove();

        // Position: Try to find the search bar area
        const $search_container = $(".navbar .search-bar, #navbar-search").closest("form, .search-bar, .input-group");

        if ($search_container.length) {
            // Find or create a UL to hold our nav item to the left of the search
            let $nav = $(".company-switcher-nav");
            if (!$nav.length) {
                $nav = $('<ul class="navbar-nav company-switcher-nav" style="flex-direction: row;"></ul>');
                $nav.insertBefore($search_container);
            }
            $nav.append($dropdown);
        } else {
            // Fallback: prepend to the right-most navbar (user menu side)
            const $navbar = $(".navbar .navbar-nav:last");
            $navbar.prepend($dropdown);
        }

        // Event handlers
        $dropdown.on('click', '.company-item', (e) => {
            e.preventDefault();
            const company = $(e.currentTarget).data('company');
            if (company !== current_company) {
                this.set_current_company(company);
            }
        });
    }
};

// Initialize on app ready
$(document).on("app_ready", function () {
    setTimeout(() => {
        if (frappe.ui.company_switcher) {
            frappe.ui.company_switcher.render();
        }
    }, 500);
});
