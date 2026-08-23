#!/usr/bin/env python3
"""Local static server that can overwrite trip.json (PUT /trip.json)."""

from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import os

ROOT = Path(__file__).resolve().parent
TRIP = ROOT / "trip.json"
HOST = "127.0.0.1"
PORT = 8765


class Handler(SimpleHTTPRequestHandler):
    def do_PUT(self):
        path = self.path.split("?", 1)[0]
        if path not in ("/trip.json", "trip.json"):
            self.send_error(403, "Can only overwrite trip.json")
            return
        length = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(length)
        TRIP.write_bytes(body)
        self.send_response(204)
        self.end_headers()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def main():
    os.chdir(ROOT)
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"Serving {ROOT} at http://{HOST}:{PORT}/")
    print("Admin:  http://{0}:{1}/admin.html".format(HOST, PORT))
    print("Album:  http://{0}:{1}/".format(HOST, PORT))
    server.serve_forever()


if __name__ == "__main__":
    main()
