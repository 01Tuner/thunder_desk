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
				const voucher_subtype = frappe.query_report.get_filter_value("voucher_subtype");
				if (voucher_subtype) {
					let allowed = [];
					if (entry_type === "Accounting Entries") {
						allowed = [
							"Payment",
							"Receipt",
							"Contra",
							"Sales Invoice",
							"Credit Note",
							"Purchase Invoice",
							"Debit Note",
							"Journal Entry",
							"Period Closing Voucher"
						];
					} else if (entry_type === "Inventory Entries") {
						allowed = [
							"Delivery Note",
							"Sales Return",
							"Purchase Receipt",
							"Purchase Return",
							"Stock Entry",
							"Stock Reconciliation",
							"Asset Depreciation Ledger",
							"Asset Value Adjustment"
						];
					} else {
						allowed = [
							"Payment",
							"Receipt",
							"Contra",
							"Sales Invoice",
							"Credit Note",
							"Purchase Invoice",
							"Debit Note",
							"Journal Entry",
							"Delivery Note",
							"Sales Return",
							"Purchase Receipt",
							"Purchase Return",
							"Stock Entry",
							"Stock Reconciliation",
							"Asset Depreciation Ledger",
							"Asset Value Adjustment",
							"Period Closing Voucher"
						];
					}
					if (!allowed.includes(voucher_subtype)) {
						frappe.query_report.set_filter_value("voucher_subtype", "");
					}
				}
				frappe.query_report.refresh();
			}
		},
		{
			fieldname: "voucher_subtype",
			label: __("Voucher Type"),
			fieldtype: "Select",
			options: [
				"",
				"Payment",
				"Receipt",
				"Contra",
				"Sales Invoice",
				"Credit Note",
				"Purchase Invoice",
				"Debit Note",
				"Journal Entry",
				"Delivery Note",
				"Sales Return",
				"Purchase Receipt",
				"Purchase Return",
				"Stock Entry",
				"Stock Reconciliation",
				"Asset Depreciation Ledger",
				"Asset Value Adjustment",
				"Period Closing Voucher"
			],
			default: "",
			on_change: function () {
				frappe.query_report.refresh();
			}
		},
	],
	tree: true,
	name_field: "row_id",
	parent_field: "parent_row_id",
	initial_depth: 0,
	formatter: function (value, row, column, data, default_formatter) {
		value = default_formatter(value, row, column, data);
		if (column.fieldname === "voucher_type" && data && value && typeof value === "string") {
			const subtype = data.voucher_subtype;
			if (subtype === "Receive") {
				value = value.replace(/Payment Entry/g, __("Receipt"));
			} else if (subtype === "Pay") {
				value = value.replace(/Payment Entry/g, __("Payment"));
			} else if (subtype === "Internal Transfer") {
				value = value.replace(/Payment Entry/g, __("Contra"));
			} else if (subtype === "Credit Note") {
				value = value.replace(/Sales Invoice/g, __("Credit Note"));
			} else if (subtype === "Debit Note") {
				value = value.replace(/Purchase Invoice/g, __("Debit Note"));
			} else if (subtype && subtype !== data.voucher_type) {
				value = value.replace(new RegExp(data.voucher_type, "g"), __(subtype));
			}
		}

		return value;
	},
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
