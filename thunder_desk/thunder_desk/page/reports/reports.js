frappe.pages['reports'].on_page_load = function (wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Reports & Analytics',
		single_column: true
	});

	// // Load Windows Style Menu
	// $.getScript('/assets/thunder_desk/js/windows_style_menu.js', function() {
	// 	setTimeout(function() {
	// 		if (typeof initializeWindowsStyleMenu === 'function') {
	// 			initializeWindowsStyleMenu();
	// 		}
	// 	}, 100);
	// });

	$('<style>#page-reports .page-head { display: none !important; }</style>').appendTo('head');
	// Render the page directly
	render_reports_page(page);


};

function render_reports_page(page) {
	var modules = [
		{
			name: "SalesReports",
			title: "Sales Reports",
			icon: "fa fa-shopping-cart",
			color: "#2ecc71",
			initial_items: [
				{ name: "Sales Analytics", label: "Sales Analytics", icon: "fa fa-line-chart" },
				{ name: "Sales Register", label: "Sales Register", icon: "fa fa-file-text" },
				{ name: "Sales Invoice Trends", label: "Sales Invoice Trends", icon: "fa fa-bar-chart" },
				{ name: "Item-wise Sales History", label: "Item-wise Sales History", icon: "fa fa-history" }
			],
			more_items: [
				{ name: "Sales Person-wise Transaction Summary", label: "Sales Person Summary", icon: "fa fa-user" },
				{ name: "Territory-wise Sales", label: "Territory Sales", icon: "fa fa-map-marker" },
				{ name: "Customer Acquisition and Loyalty", label: "Customer Acquisition", icon: "fa fa-users" },
				{ name: "Inactive Customers", label: "Inactive Customers", icon: "fa fa-user-times" },
				{ name: "POS Register", label: "POS Register", icon: "fa fa-credit-card" },
				{ name: "Sales Partners Commission", label: "Partner Commission", icon: "fa fa-handshake-o" }
			],
			has_more_items: true
		},
		{
			name: "PurchaseReports",
			title: "Purchase Reports",
			icon: "fa fa-shopping-bag",
			color: "#e74c3c",
			initial_items: [
				{ name: "Purchase Analytics", label: "Purchase Analytics", icon: "fa fa-line-chart" },
				{ name: "Purchase Register", label: "Purchase Register", icon: "fa fa-file-text" },
				{ name: "Purchase Invoice Trends", label: "Purchase Invoice Trends", icon: "fa fa-bar-chart" },
				{ name: "Item-wise Purchase History", label: "Item-wise Purchase History", icon: "fa fa-history" }
			],
			more_items: [
				{ name: "Supplier Quotation Comparison", label: "Supplier Quotation Comparison", icon: "fa fa-balance-scale" },
				{ name: "Procurement Tracker", label: "Procurement Tracker", icon: "fa fa-truck" },
				{ name: "Requested Items To Order And Receive", label: "Items to Order", icon: "fa fa-list" }
			],
			has_more_items: true
		},
		{
			name: "InventoryReports",
			title: "Inventory & Stock Reports",
			icon: "fa fa-cubes",
			color: "#f39c12",
			initial_items: [
				{ name: "Stock Balance", label: "Stock Balance", icon: "fa fa-cubes" },
				{ name: "Stock Ledger", label: "Stock Ledger", icon: "fa fa-book" },
				{ name: "Stock Analytics", label: "Stock Analytics", icon: "fa fa-line-chart" },
				{ name: "Stock Ageing", label: "Stock Ageing", icon: "fa fa-clock-o" }
			],
			more_items: [
				{ name: "Stock Projected Qty", label: "Stock Projected Qty", icon: "fa fa-calculator" },
				{ name: "Warehouse-wise Stock Balance", label: "Warehouse Stock Balance", icon: "fa fa-building" },
				{ name: "Item-wise Reorder Level", label: "Reorder Level", icon: "fa fa-exclamation-triangle" },
				{ name: "Serial and Batch Summary", label: "Serial & Batch Summary", icon: "fa fa-list-ol" },
				{ name: "Batch-wise Balance History", label: "Batch Balance History", icon: "fa fa-history" },
				{ name: "Delivery Note Trends", label: "Delivery Note Trends", icon: "fa fa-truck" },
				{ name: "Purchase Receipt Trends", label: "Purchase Receipt Trends", icon: "fa fa-inbox" }
			],
			has_more_items: true
		},
		{
			name: "FinancialReports",
			title: "Financial Reports",
			icon: "fa fa-money",
			color: "#3498db",
			initial_items: [
				{ name: "Balance Sheet", label: "Balance Sheet", icon: "fa fa-file-text" },
				{ name: "Profit and Loss Statement", label: "Profit & Loss Statement", icon: "fa fa-calculator" },
				{ name: "General Ledger", label: "General Ledger", icon: "fa fa-book" },
				{ name: "Trial Balance", label: "Trial Balance", icon: "fa fa-balance-scale" }
			],
			more_items: [
				{ name: "Cash Flow", label: "Cash Flow", icon: "fa fa-money" },
				{ name: "Accounts Receivable", label: "Accounts Receivable", icon: "fa fa-arrow-circle-left" },
				{ name: "Accounts Payable", label: "Accounts Payable", icon: "fa fa-arrow-circle-right" },
				{ name: "Accounts Receivable Summary", label: "AR Summary", icon: "fa fa-file-o" },
				{ name: "Accounts Payable Summary", label: "AP Summary", icon: "fa fa-file-o" },
				{ name: "Payment Ledger", label: "Payment Ledger", icon: "fa fa-credit-card" },
				{ name: "Gross and Net Profit Report", label: "Gross & Net Profit", icon: "fa fa-line-chart" },
				{ name: "Financial Ratios", label: "Financial Ratios", icon: "fa fa-percent" }
			],
			has_more_items: true
		},
		{
			name: "CustomerReports",
			title: "Customer Reports",
			icon: "fa fa-users",
			color: "#9b59b6",
			initial_items: [
				{ name: "Customer Ledger Summary", label: "Customer Ledger Summary", icon: "fa fa-book" },
				{ name: "Customer Credit Balance", label: "Customer Credit Balance", icon: "fa fa-credit-card" },
				{ name: "Customer-wise Item Price", label: "Customer Item Prices", icon: "fa fa-tags" },
				{ name: "Customers Without Any Sales Transactions", label: "Inactive Customers", icon: "fa fa-user-times" }
			],
			more_items: [],
			has_more_items: false
		},
		{
			name: "SupplierReports",
			title: "Supplier Reports",
			icon: "fa fa-truck",
			color: "#1abc9c",
			initial_items: [
				{ name: "Supplier Ledger Summary", label: "Supplier Ledger Summary", icon: "fa fa-book" },
				{ name: "Supplier-wise Sales Analytics", label: "Supplier Sales Analytics", icon: "fa fa-line-chart" }
			],
			more_items: [],
			has_more_items: false
		},
		{
			name: "TaxReports",
			title: "Tax & Compliance Reports",
			icon: "fa fa-gavel",
			color: "#e67e22",
			initial_items: [
				{ name: "Tax Withholding Details", label: "Tax Withholding Details", icon: "fa fa-file-text-o" },
				{ name: "TDS Computation Summary", label: "TDS Computation", icon: "fa fa-calculator" },
				{ name: "VAT Payable Report", label: "KSA VAT Report", icon: "fa fa-file-text" },
				// {name: "Item Wise Sales Register", label: "Sales Register", icon: "fa fa-file-text"}
			],
			more_items: [],
			has_more_items: false
		},
		// {
		// 	name: "ProductionReports",
		// 	title: "Production & Manufacturing",
		// 	icon: "fa fa-cogs",
		// 	color: "#34495e",
		// 	initial_items: [
		// 		{name: "BOM Search", label: "BOM Search", icon: "fa fa-search"},
		// 		{name: "Work Order", route: "/app/work-order", label: "Work Orders", icon: "fa fa-cogs"},
		// 		{name: "Production Analytics", route: "/app/query-report/Production%20Analytics", label: "Production Analytics", icon: "fa fa-line-chart"}
		// 	],
		// 	more_items: [],
		// 	has_more_items: false
		// }
	];

	var html = `
		<div class="reports-container">
			<div class="reports-header">
				<div class="container">
					<h1 class="reports-title">
						<i class="fa fa-bar-chart"></i>
						Reports & Analytics
					</h1>
				</div>
			</div>

			<div class="container">
				<div class="quick-reports-section">
					<h2 class="quick-reports-title">Quick Access Reports</h2>
					<div class="quick-reports-grid">
						<a href="/app/query-report/Sales%20Analytics" class="quick-report-btn">
							<i class="fa fa-line-chart"></i>
							<span>Sales Analytics</span>
						</a>
						<a href="/app/query-report/Stock%20Balance" class="quick-report-btn">
							<i class="fa fa-cubes"></i>
							<span>Stock Balance</span>
						</a>
						<a href="/app/query-report/General%20Ledger" class="quick-report-btn">
							<i class="fa fa-book"></i>
							<span>General Ledger</span>
						</a>
						<a href="/app/query-report/Profit%20and%20Loss%20Statement" class="quick-report-btn">
							<i class="fa fa-calculator"></i>
							<span>P&L Statement</span>
						</a>
					</div>
				</div>

				<div class="report-categories">
	`;

	modules.forEach(function (module) {
		html += `
			<div class="category-card">
				<div class="category-header">
					<div class="category-icon" style="color: ${module.color}">
						<i class="${module.icon}"></i>
					</div>
					<h3 class="category-title">${module.title}</h3>
				</div>

				<ul class="report-list">
		`;

		// Initial items (first 4)
		module.initial_items.forEach(function (item) {
			var route = item.route || `/app/query-report/${encodeURIComponent(item.name)}`;
			html += `
				<li class="report-item">
					<a href="${route}" class="report-link">
						<i class="${item.icon}"></i>
						<span>${item.label}</span>
						<i class="fa fa-external-link" style="font-size: 12px; color: #adb5bd;"></i>
					</a>
				</li>
			`;
		});

		// Hidden more items
		if (module.has_more_items) {
			html += `<div class="more-reports" id="moreItems${module.name}" style="display: none;">`;
			module.more_items.forEach(function (item) {
				var route = item.route || `/app/query-report/${encodeURIComponent(item.name)}`;
				html += `
					<li class="report-item">
						<a href="${route}" class="report-link">
							<i class="${item.icon}"></i>
							<span>${item.label}</span>
							<i class="fa fa-external-link" style="font-size: 12px; color: #adb5bd;"></i>
						</a>
					</li>
				`;
			});
			html += `</div>`;

			// View More Button
			html += `
				<div style="text-align: center; margin-top: 15px;">
					<button class="view-more-btn" onclick="toggleCardItems('${module.name}')">
						<i class="fa fa-plus-circle"></i>
						<span>View More</span>
					</button>
				</div>
			`;
		}

		html += `
				</ul>
			</div>
		`;
	});

	html += `
				</div>
			</div>
		</div>
	`;

	// Add CSS
	var css = `
		<style>
		.reports-container {
			padding: 20px;
			max-width: 1200px;
			margin: 0 auto;
		}

		.reports-header {
			margin-bottom: 30px;
			padding-bottom: 15px;
			border-bottom: 1px solid #d1ecf1;
		}

		.reports-title {
			color: #2c3e50;
			font-size: 24px;
			font-weight: 600;
			margin: 0;
			display: flex;
			align-items: center;
			gap: 10px;
		}

		.reports-title i {
			color: #3498db;
		}

		.report-categories {
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
			gap: 20px;
			margin-bottom: 30px;
		}

		.category-card {
			background: white;
			border: 1px solid #e9ecef;
			border-radius: 8px;
			padding: 20px;
			box-shadow: 0 2px 4px rgba(0,0,0,0.1);
			transition: box-shadow 0.3s ease;
		}

		.category-card:hover {
			box-shadow: 0 4px 8px rgba(0,0,0,0.15);
		}

		.category-header {
			display: flex;
			align-items: center;
			gap: 12px;
			margin-bottom: 15px;
			padding-bottom: 10px;
			border-bottom: 1px solid #f8f9fa;
		}

		.category-icon {
			font-size: 20px;
			width: 24px;
			text-align: center;
		}

		.category-title {
			margin: 0;
			font-size: 16px;
			font-weight: 600;
			color: #2c3e50;
		}

		.report-list {
			list-style: none;
			padding: 0;
			margin: 0;
		}

		.report-item {
			padding: 8px 0;
			border-bottom: 1px solid #f8f9fa;
		}

		.report-item:last-child {
			border-bottom: none;
		}

		.report-link {
			display: flex;
			align-items: center;
			gap: 10px;
			text-decoration: none;
			color: #495057;
			padding: 8px 12px;
			border-radius: 4px;
			transition: all 0.2s ease;
			font-size: 14px;
		}

		.report-link:hover {
			background-color: #f8f9fa;
			color: #2c3e50;
			text-decoration: none;
		}

		.report-link i {
			width: 16px;
			color: #6c757d;
		}

		.report-link span {
			flex: 1;
		}

		.view-more-btn {
			background: #007bff;
			color: white;
			border: none;
			padding: 8px 16px;
			border-radius: 4px;
			font-size: 13px;
			cursor: pointer;
			display: inline-flex;
			align-items: center;
			gap: 6px;
			margin-top: 10px;
			transition: background-color 0.3s ease;
		}

		.view-more-btn:hover {
			background: #0056b3;
		}

		.more-reports {
			display: none;
		}

		.quick-reports-section {
			background: #f8f9fa;
			border: 1px solid #e9ecef;
			border-radius: 8px;
			padding: 20px;
			margin-bottom: 30px;
		}

		.quick-reports-title {
			font-size: 18px;
			font-weight: 600;
			color: #2c3e50;
			margin: 0 0 15px 0;
		}

		.quick-reports-grid {
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
			gap: 15px;
		}

		.quick-report-btn {
			display: flex;
			align-items: center;
			gap: 10px;
			padding: 12px 16px;
			background: white;
			border: 1px solid #dee2e6;
			border-radius: 6px;
			text-decoration: none;
			color: #495057;
			transition: all 0.3s ease;
			font-weight: 500;
		}

		.quick-report-btn:hover {
			background: #007bff;
			color: white;
			text-decoration: none;
			border-color: #007bff;
			box-shadow: 0 2px 4px rgba(0,123,255,0.2);
		}

		.quick-report-btn i {
			font-size: 16px;
		}

		@media (max-width: 768px) {
			.reports-container {
				padding: 15px;
			}

			.report-categories {
				grid-template-columns: 1fr;
			}

			.quick-reports-grid {
				grid-template-columns: 1fr;
			}
		}
		</style>
	`;

	page.main.html(css + html);
}

function toggleCardItems(moduleName) {
	var moreItems = document.getElementById('moreItems' + moduleName);
	var viewMoreBtn = event.target.closest('.view-more-btn');

	if (moreItems.style.display === 'none' || moreItems.style.display === '') {
		moreItems.style.display = 'block';
		viewMoreBtn.innerHTML = '<i class="fa fa-minus-circle"></i><span>View Less</span>';
	} else {
		moreItems.style.display = 'none';
		viewMoreBtn.innerHTML = '<i class="fa fa-plus-circle"></i><span>View More</span>';
	}
}
