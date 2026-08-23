#!/usr/bin/env python3
"""Local static server that can overwrite trip.json (PUT /trip.json)."""

from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json
import os

ROOT = Path(__file__).resolve().parent
TRIP = ROOT / "trip.json"
PHOTOS = ROOT / "photos"
THUMBS = ROOT / "thumbs"
HOST = "127.0.0.1"
PORT = 8765
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def missing_thumbs():
    missing = []
    if not PHOTOS.is_dir():
        return missing
    for path in PHOTOS.iterdir():
        if not path.is_file() or path.suffix.lower() not in IMAGE_EXTENSIONS:
            continue
        if not (THUMBS / path.name).is_file():
            missing.append(path.name)
    return sorted(missing)


class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path in ("/thumb-status", "/thumb-status/"):
            body = json.dumps({"missing": missing_thumbs()}).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        return SimpleHTTPRequestHandler.do_GET(self)

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
