
import frappe
import requests

@frappe.whitelist()
def get_arabic_translation(text):
	if not text:
		return ""
	
	try:
		url = "https://translate.googleapis.com/translate_a/single"
		params = {
			"client": "gtx",
			"sl": "auto",
			"tl": "ar",
			"dt": "t",
			"q": text
		}
		response = requests.get(url, params=params)
		if response.status_code == 200:
			result = response.json()
			# Result format: [[['translated_text', 'original_text', ...], ...], ...]
			if result and result[0] and result[0][0] and result[0][0][0]:
				return result[0][0][0]
	except Exception as e:
		frappe.log_error(message=str(e), title="Thunder Desk Translation Error")
	
	return ""
