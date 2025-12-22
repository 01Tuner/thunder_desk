import frappe
import os
import json
from thunder_desk.patches import (
	zatca_prerequesties_system_config,
	thunder_desk_system_config,
	update_sar_currency_symbol,
	add_payment_modes
)

# import custom purchase invoice  
from thunder_desk.custom.purchase_invoice import custom_purchase_invoice

def after_install():
	zatca_prerequesties_system_config.execute()
	thunder_desk_system_config.execute()
	update_sar_currency_symbol.execute()
	add_payment_modes.execute()
	custom_purchase_invoice.execute()   