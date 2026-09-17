import os
import frappe
from werkzeug.wrappers import Response
from frappe.website.page_renderers.base_renderer import BaseRenderer


class PWARenderer(BaseRenderer):
    """
    Page renderer to serve PWA assets from root:
    - /manifest.json
    - /sw.js
    - /offline
    """
    __slots__ = ("path", "http_status_code", "file_path", "mimetype", "headers")

    ROUTE_MAP = {
        "manifest.json": {
            "file": "manifest.json",
            "mimetype": "application/manifest+json",
            "headers": {
                "Cache-Control": "public, max-age=3600",
                "Access-Control-Allow-Origin": "*",
            }
        },
        "manifest.webmanifest": {
            "file": "manifest.json",
            "mimetype": "application/manifest+json",
            "headers": {
                "Cache-Control": "public, max-age=3600",
                "Access-Control-Allow-Origin": "*",
            }
        },
        "sw.js": {
            "file": "sw.js",
            "mimetype": "application/javascript",
            "headers": {
                "Service-Worker-Allowed": "/",
                "Cache-Control": "no-cache, no-store, must-revalidate",
            }
        },
        "service-worker.js": {
            "file": "sw.js",
            "mimetype": "application/javascript",
            "headers": {
                "Service-Worker-Allowed": "/",
                "Cache-Control": "no-cache, no-store, must-revalidate",
            }
        },
        "offline": {
            "file": "offline.html",
            "mimetype": "text/html; charset=utf-8",
            "headers": {
                "Cache-Control": "public, max-age=3600",
            }
        },
        "offline.html": {
            "file": "offline.html",
            "mimetype": "text/html; charset=utf-8",
            "headers": {
                "Cache-Control": "public, max-age=3600",
            }
        },
    }

    def __init__(self, path, http_status_code=None):
        super().__init__(path=path, http_status_code=http_status_code)
        self.clean_path = (self.path or "").strip("/ ")
        self.config = self.ROUTE_MAP.get(self.clean_path)

    def can_render(self):
        return bool(self.config)

    def render(self):
        if not self.config:
            return None

        file_name = self.config["file"]
        file_path = frappe.get_app_path("thunder_desk", "public", file_name)

        if not os.path.exists(file_path):
            return Response("Not Found", status=404)

        with open(file_path, "rb") as f:
            content = f.read()

        response = Response(
            content,
            mimetype=self.config["mimetype"],
            status=self.http_status_code or 200
        )

        for header_name, header_value in self.config.get("headers", {}).items():
            response.headers[header_name] = header_value

        return response


def update_website_context(context):
    """
    Hook to automatically inject PWA meta and link tags into all Frappe web pages.
    """
    pwa_meta = """
<!-- Thunder Desk PWA -->
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#2563eb">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="Thunder Desk">
<link rel="apple-touch-icon" href="/assets/thunder_desk/images/icons/icon-180x180.png">
<link rel="icon" type="image/png" sizes="32x32" href="/assets/thunder_desk/images/icons/icon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/assets/thunder_desk/images/icons/icon-16x16.png">
"""
    existing_head = context.get("head_include") or ""
    if "/manifest.json" not in existing_head:
        context["head_include"] = existing_head + "\n" + pwa_meta


@frappe.whitelist(allow_guest=True)
def get_manifest():
    """Whitelisted endpoint to fetch manifest JSON"""
    manifest_path = frappe.get_app_path("thunder_desk", "public", "manifest.json")
    with open(manifest_path, "r", encoding="utf-8") as f:
        return frappe.parse_json(f.read())
