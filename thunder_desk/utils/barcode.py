import frappe

def _map_format(barcode_type: str, value: str) -> str:
    if not barcode_type:
        return "code128"
    t = str(barcode_type).upper()
    if t == "EAN":
        return "ean8" if value and len(value) == 8 else "ean13"
    if t in ("EAN-8", "EAN8"):
        return "ean8"
    if t in ("EAN-12", "EAN-13", "EAN13", "GTIN", "JAN"):
        return "ean13"
    if t in ("UPC-A", "UPC", "UPCA"):
        return "upc"
    if t in ("CODE-39", "CODE39"):
        return "code39"
    if t in ("CODE-128", "CODE128"):
        return "code128"
    return "code128"


@frappe.whitelist()
def get_barcode_svg(barcode_type=None, value=None, width=None, height=None):
    """Return SVG markup for a barcode using python-barcode."""
    if not value:
        return ""
    
    value = str(value).strip()
    
    try:
        import barcode
        from barcode.writer import SVGWriter
        from io import BytesIO
    except ImportError as e:
        frappe.log_error(f"Import error: {e}", "Barcode SVG")
        return "<p style='color:red;'>python-barcode not installed</p>"

    fmt = _map_format(barcode_type, value)

    writer = SVGWriter()
    options = {
        "module_width": 0.3,
        "module_height": float(height) if height else 15.0,
        "quiet_zone": 1.0,
        "font_size": 0,  # Hide text, we'll show it separately
        "text_distance": 1,
        "write_text": False
    }

    try:
        # Get barcode class
        cls = barcode.get_barcode_class(fmt)
        
        # Create barcode instance
        code = cls(str(value), writer=writer)
        
        # Render to BytesIO buffer
        buffer = BytesIO()
        code.write(buffer, options)
        
        # Get SVG content as string
        svg_content = buffer.getvalue().decode('utf-8')
        
        return svg_content
        
    except Exception as e:
        error_msg = f"Barcode generation failed: {str(e)}\nType: {barcode_type}, Value: {value}, Format: {fmt}"
        frappe.log_error(error_msg, "Barcode SVG")
        return f"<p style='color:red; font-size:9px;'>Error: {str(e)}</p>"