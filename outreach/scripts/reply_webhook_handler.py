:#!/usr/bin/env python3
"""Minimal Flask/FastAPI-style webhook handler for Resend inbound emails.

Next: integrate into the main Collectly app as POST /api/inbound.
For now, this is a reference implementation and test harness.

Resend will POST a JSON payload to this endpoint when a reply arrives at davie@getcollectly.app.
"""
import json
import os
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

from process_inbound import handle_resend_webhook

WEBHOOK_SECRET = os.environ.get("RESEND_INBOUND_WEBHOOK_SECRET", "").strip()


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path != "/api/inbound":
            self.send_response(404)
            self.end_headers()
            return

        content_len = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_len)

        # Optional: verify Resend signature if available
        # For now we just process the payload
        try:
            payload = json.loads(body.decode("utf-8"))
        except Exception as e:
            self.send_response(400)
            self.end_headers()
            self.wfile.write(f"Bad JSON: {e}".encode())
            return

        result = handle_resend_webhook(payload)
        print(f"Inbound processed: {payload.get('from')} -> {result}")

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps({"ok": True, "result": result}).encode())

    def log_message(self, format, *args):
        # Reduce noise
        print(f"[webhook] {self.address_string()} - {format % args}")


def main():
    port = int(os.environ.get("PORT", "8787"))
    server = HTTPServer(("0.0.0.0", port), Handler)
    print(f"Listening on 0.0.0.0:{port} for inbound Resend webhooks...")
    server.serve_forever()


if __name__ == "__main__":
    main()
