import frappe
from frappe.www.printview import get_rendered_template, get_print_style, get_print_format_doc

def get_context(context):
    context.no_cache = 1
    
    doctype = frappe.form_dict.get('doctype')
    name = frappe.form_dict.get('name')
    print_format = frappe.form_dict.get('print_format')
    
    context.tag = '<style>'
    context.tag_close = '</style>'
    
    if doctype and name:
        doc = frappe.get_doc(doctype, name)
        meta = frappe.get_meta(doctype)
        
        # Resolve the print format document
        pf = get_print_format_doc(print_format, meta=meta)
        
        # Render the template directly using standard Frappe logic
        # avoiding frappe.get_print() which triggers recursion/routing
        html = get_rendered_template(
            doc=doc,
            print_format=pf,
            meta=meta,
            no_letterhead=frappe.form_dict.no_letterhead or False, # Disable standard letterhead to use our Custom Print View header
            trigger_print=False
        )
        

        letterhead = frappe.form_dict.letterhead or None

        # Get styles
        style = get_print_style(print_format=pf)
        
        context.doc = doc
        context.print_content = html
        context.print_styles = style
    else:
        context.doc = None
        context.print_content = None
        context.print_styles = None
