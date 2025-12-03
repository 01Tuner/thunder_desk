def update_website_context(context):
    """
    Inject print_polyfill.js into the website context.
    This ensures it's available in print views.
    """
    if "web_include_js" not in context:
        context["web_include_js"] = []
    
    context["web_include_js"].append("/assets/thunder_desk/js/print_polyfill.js")
