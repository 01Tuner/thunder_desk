import frappe
import os
import json
from thunder_desk.patches import (
	zatca_prerequesties_system_config,
	thunder_desk_system_config,
	update_sar_currency_symbol,
	add_payment_modes,
	add_pagedjs_option,
	add_print_headings,
	remove_report_total
)

# import custom purchase invoice
from thunder_desk.custom.setup import setup_custom_fields
from thunder_desk.setup.seed_menu import seed_menus

def after_install():
	add_pagedjs_option.execute()
	zatca_prerequesties_system_config.execute()
	thunder_desk_system_config.execute()
	update_sar_currency_symbol.execute()
	setup_custom_fields()
	add_payment_modes.execute()
	add_print_headings.execute()
	remove_report_total.execute()
	seed_menus()


def after_migrate():
	setup_custom_fields()
	seed_menus()
