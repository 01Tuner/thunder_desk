import frappe
import os
import json
from thunder_desk.patches import (
	zatca_prerequesties_system_config,
	thunder_desk_system_config,
	update_sar_currency_symbol,
	add_payment_modes,
	add_pagedjs_option
)

# import custom purchase invoice  
from thunder_desk.custom.setup import setup_custom_fields

def after_install():
	add_pagedjs_option.execute()
	zatca_prerequesties_system_config.execute()
	thunder_desk_system_config.execute()
	update_sar_currency_symbol.execute()
	setup_custom_fields()   
	add_payment_modes.execute()