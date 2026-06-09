// Copyright (c) 2026, Muhammed Rafeeq and Contributors
// License: GNU General Public License v3. See license.txt

frappe.query_reports["Day Book"] = {
	filters: [
		{
			fieldname: "company",
			label: __("Company"),
			fieldtype: "Link",
			options: "Company",
			default: frappe.defaults.get_user_default("Company"),
			reqd: 1,
		},
		{
			fieldname: "from_date",
			label: __("From Date"),
			fieldtype: "Date",
			default: frappe.datetime.get_today(),
			reqd: 1,
		},
		{
			fieldname: "to_date",
			label: __("To Date"),
			fieldtype: "Date",
			default: frappe.datetime.get_today(),
			reqd: 1,
		},
		{
			fieldname: "entry_type",
			label: __("Entry Type"),
			fieldtype: "Select",
			options: ["All", "Accounting Entries", "Inventory Entries"],
			default: "All",
			on_change: function () {
				const entry_type = frappe.query_report.get_filter_value("entry_type");
				const voucher_type = frappe.query_report.get_filter_value("voucher_type");
				if (voucher_type) {
					let allowed = [];
					if (entry_type === "Accounting Entries") {
						allowed = [
							"Journal Entry",
							"Payment Entry",
							"Sales Invoice",
							"Purchase Invoice",
							"Period Closing Voucher"
						];
					} else if (entry_type === "Inventory Entries") {
						allowed = [
							"Stock Entry",
							"Stock Reconciliation",
							"Delivery Note",
							"Purchase Receipt",
							"Asset Depreciation Ledger",
							"Asset Value Adjustment"
						];
					} else {
						allowed = [
							"Journal Entry",
							"Payment Entry",
							"Sales Invoice",
							"Purchase Invoice",
							"Delivery Note",
							"Purchase Receipt",
							"Stock Entry",
							"Stock Reconciliation",
							"Asset Depreciation Ledger",
							"Asset Value Adjustment",
							"Period Closing Voucher"
						];
					}
					if (!allowed.includes(voucher_type)) {
						frappe.query_report.set_filter_value("voucher_type", "");
					}
				}
				frappe.query_report.refresh();
			}
		},
		{
			fieldname: "voucher_type",
			label: __("Voucher Type"),
			fieldtype: "Link",
			options: "DocType",
			get_query: function () {
				const entry_type = frappe.query_report.get_filter_value("entry_type") || "All";
				let allowed_doctypes = [];
				if (entry_type === "Accounting Entries") {
					allowed_doctypes = [
						"Journal Entry",
						"Payment Entry",
						"Sales Invoice",
						"Purchase Invoice",
						"Period Closing Voucher"
					];
				} else if (entry_type === "Inventory Entries") {
					allowed_doctypes = [
						"Stock Entry",
						"Stock Reconciliation",
						"Delivery Note",
						"Purchase Receipt",
						"Asset Depreciation Ledger",
						"Asset Value Adjustment"
					];
				} else {
					allowed_doctypes = [
						"Journal Entry",
						"Payment Entry",
						"Sales Invoice",
						"Purchase Invoice",
						"Delivery Note",
						"Purchase Receipt",
						"Stock Entry",
						"Stock Reconciliation",
						"Asset Depreciation Ledger",
						"Asset Value Adjustment",
						"Period Closing Voucher"
					];
				}
				return {
					filters: {
						name: ["in", allowed_doctypes]
					}
				};
			}
		},
	],
	tree: true,
	name_field: "row_id",
	parent_field: "parent_row_id",
	initial_depth: 0,
	after_datatable_render: function (datatable_obj) {
		if (datatable_obj && datatable_obj.columnmanager && !datatable_obj.columnmanager.applyFilter._wrapped) {
			const original_applyFilter = datatable_obj.columnmanager.applyFilter;
			datatable_obj.columnmanager.applyFilter = function (filters) {
				const has_filter = Object.values(filters).some(val => val !== "");
				if (!has_filter) {
					datatable_obj.rowmanager.setTreeDepth(0);
					datatable_obj.datamanager._filteredRows = null;
					return;
				}

				datatable_obj.datamanager.filterRows(filters)
					.then(({ rowsToShow }) => {
						const rows = datatable_obj.datamanager.rows;
						const finalRowsToShow = new Set(rowsToShow);

						rowsToShow.forEach(rowIndex => {
							let currentIndent = rows[rowIndex].meta.indent;
							if (typeof currentIndent === 'number') {
								for (let j = rowIndex - 1; j >= 0; j--) {
									const parentIndent = rows[j].meta.indent;
									if (typeof parentIndent === 'number' && parentIndent < currentIndent) {
										finalRowsToShow.add(j);
										rows[j].meta.isTreeNodeClose = false;
										currentIndent = parentIndent;
										if (currentIndent === 0) break;
									}
								}
							}
						});

						const sortedRowsToShow = Array.from(finalRowsToShow).sort((a, b) => a - b);
						datatable_obj.rowmanager.showRows(sortedRowsToShow);
					});
			};
			datatable_obj.columnmanager.applyFilter._wrapped = true;
		}
	}
};
