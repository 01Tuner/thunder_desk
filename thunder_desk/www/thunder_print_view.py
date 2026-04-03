import frappe
from frappe.www.printview import get_rendered_template, get_print_style, get_print_format_doc

# Extra padding (px) added around the image height
# IMAGE_MARGIN_PADDING_PX = 2


def _get_letterhead_margins(letterhead_name):
    """
    Return (margin_top(px), margin_bottom(px)) based on the Letter Head 
    custom height fields: 'custom_header_height' and 'custom_footer_height'.
    """
    if not letterhead_name:
        return None, None

    lh = frappe.db.get_value(
        "Letter Head",
        letterhead_name,
        ["custom_header_height", "custom_footer_height"],
        as_dict=True,
    )
    
    if not lh:
        return None, None

    margin_top = lh.get("custom_header_height")
    margin_bottom = lh.get("custom_footer_height")

    return margin_top, margin_bottom


def get_context(context):
    context.no_cache = 1

    doctype = frappe.form_dict.get("doctype")
    name = frappe.form_dict.get("name")
    print_format = frappe.form_dict.get("print_format")

    context.tag = "<style>"
    context.tag_close = "</style>"

    if doctype and name:
        doc = frappe.get_doc(doctype, name)
        meta = frappe.get_meta(doctype)

        # Resolve the print format document
        pf = get_print_format_doc(print_format, meta=meta)

        # Resolve letterhead: URL param → doc field → system default (mirrors Frappe's get_letter_head)
        letterhead_name = (
            frappe.form_dict.get("letterhead")
            or doc.get("letter_head")
            or frappe.db.get_value("Letter Head", {"is_default": 1}, "name")
            or None
        )

        # Calculate @page margins from the custom height fields
        margin_top, margin_bottom = _get_letterhead_margins(letterhead_name)

        # Render the template directly using standard Frappe logic
        # avoiding frappe.get_print() which triggers recursion/routing
        html = get_rendered_template(
            doc=doc,
            print_format=pf,
            meta=meta,
            no_letterhead=frappe.form_dict.no_letterhead or False,
            letterhead=frappe.form_dict.letterhead or None,
            trigger_print=False,
        )

        # Get styles
        style = get_print_style(print_format=pf)

        context.doc = doc
        context.print_content = html
        context.print_styles = style
        # Pass computed margins to the outer thunder_print_view.html
        context.page_margin_top = margin_top or 80
        context.page_margin_bottom = margin_bottom or 80
    else:
        context.doc = None
        context.print_content = None
        context.print_styles = None
        context.page_margin_top = None
        context.page_margin_bottom = None
