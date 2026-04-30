
class CSPMiddleware:
    """
    Simple middleware to add Content-Security-Policy headers.
    Specifically allows the React frontend on port 3000 to iframe resources (like PDFs).
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # ── DOCUMENT PREVIEW EXEMPTION ────────────────────────
        # For /media/ resources (PDF previews in iframes), we need to bypass
        # the global X_FRAME_OPTIONS = 'DENY' and use CSP instead.
        if request.path.startswith('/media/'):
            # 1. Remove legacy header entirely to avoid browser conflicts
            if 'X-Frame-Options' in response:
                del response['X-Frame-Options']

            # 2. Add modern CSP (Comprehensive protection)
            # - frame-ancestors: allows React frontend to iframe the document
            # - default-src 'self': restricts all other resource loading to our origin
            # - img-src 'self' data: blob:: allows images and our preview blobs
            csp = (
                "default-src 'self'; "
                "frame-ancestors 'self' http://localhost:3000 http://127.0.0.1:3000; "
                "img-src 'self' data: blob:; "
                "style-src 'self' 'unsafe-inline'; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval';"
            )
            response['Content-Security-Policy'] = csp

        return response
