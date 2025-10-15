import requests
import frappe
from typing import Dict, Any
import json
from datetime import datetime


AIRTABLE_CONFIG = {
    "base_id": "apptxh5U6Mdtl9LK0",
    "api_key": "patbQf8w9L2U5o0PW.ea9594520e4b917c1d7396dc1c0ea98f8717e694a837cd47835a8a7da6c12a66",
    "table_name": "thunder_desk_logs",
    "enabled": True
}


class CompanyLogger:
    """Simplified Thunder Desk Company Logger"""

    def __init__(self):
        self.base_url = f"https://api.airtable.com/v0/{AIRTABLE_CONFIG['base_id']}/{AIRTABLE_CONFIG['table_name']}"
        self.api_key = AIRTABLE_CONFIG.get('api_key')
        self.enabled = AIRTABLE_CONFIG.get('enabled', True)

    def log_company_changes(self, doc, action: str = 'update'):
        """Log company changes to Thunder Desk Airtable table"""
        try:
            if not self.enabled:
                return

            # Get company name
            company_name = getattr(doc, 'company_name', None) or getattr(doc, 'name', None) or "Unknown"

            # Get current URL
            current_url = self._get_current_url()

            # Get timestamp
            timestamp = datetime.now().isoformat()

            # Get company details as JSON
            company_details = ''

            # Enhanced payload with all required fields
            log_data = {
                "fields": {
                    "Action": action,
                    "Company Name": company_name,
                    "Current URL": current_url,
                    "Timestamp": timestamp,
                    "Company Details": json.dumps(company_details, default=str)
                }
            }

            self._send_to_airtable(log_data)

        except Exception as e:
            frappe.msgprint(f"Company update failed str(e)", alert=True)


    def _send_to_airtable(self, data: Dict[str, Any]):
        """Send data to Thunder Desk Airtable table"""
        headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json'
        }

        response = requests.post(
            self.base_url,
            headers=headers,
            json=data,
            timeout=30
        )


    def _extract_company_details(self, doc) -> dict:
        """Extract company details for logging"""
        company_details = {}

        try:
            # Safely get all fields from the document
            if hasattr(doc, 'meta') and hasattr(doc.meta, 'fields'):
                for field_name in doc.meta.fields:
                    if field_name:
                        field_value = getattr(doc, field_name, None)
                        # Include all fields except name (already logged separately)
                        if field_name != 'name' and field_name != 'company_name':
                            company_details[field_name] = field_value
        except Exception as e:
            # If there's any error extracting fields, log it but continue
            company_details['_field_extraction_error'] = str(e)

        # Add tracking info safely
        company_details['_modified'] = getattr(doc, 'modified', None)
        company_details['_modified_by'] = getattr(doc, 'modified_by', None)
        if hasattr(doc, 'creation'):
            company_details['_created'] = doc.creation
        if hasattr(doc, 'owner'):
            company_details['_created_by'] = doc.owner

        return company_details

    def _get_current_url(self) -> str:
        """Get current request URL"""
        try:
            if frappe.request and frappe.request.url:
                return frappe.request.url
            elif frappe.request and frappe.request.host:
                protocol = "https" if frappe.request.is_secure else "http"
                host = frappe.request.host
                path = getattr(frappe.request, 'path', '')
                return f"{protocol}://{host}{path}"
            else:
                return frappe.utils.get_url()
        except Exception:
            return "Unknown"


def log_company_update(doc, method=None):
    """Hook for company update events"""
    logger = CompanyLogger()
    logger.log_company_changes(doc, 'update')

def log_company_insert(doc, method=None):
    """Hook for company insert events"""
    logger = CompanyLogger()
    logger.log_company_changes(doc, 'insert')

def log_company_delete(doc, method=None):
    """Hook for company delete events"""
    logger = CompanyLogger()
    logger.log_company_changes(doc, 'delete')