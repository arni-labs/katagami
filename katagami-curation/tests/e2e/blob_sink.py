"""Local S3-shaped asset storage for pipeline and browser verification.

PUT /<bucket>/<key> persists bytes; GET/HEAD /public/<key> serves them.
The old discard-only sink could report publication success with broken images.
This test server is loopback-only and is not a production S3 implementation.
"""

import mimetypes
import os
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(os.environ.get("E2E_BLOB_ROOT", "/tmp/katagami-e2e-assets"))


class Sink(BaseHTTPRequestHandler):
    def object_path(self) -> Path | None:
        parts = unquote(urlsplit(self.path).path).lstrip("/").split("/")
        if len(parts) < 2 or any(part in ("", ".", "..") for part in parts):
            return None
        candidate = ROOT.joinpath(*parts[1:]).resolve()
        return candidate if candidate.is_relative_to(ROOT.resolve()) else None

    def do_PUT(self) -> None:
        path = self.object_path()
        if path is None:
            self.send_error(400, "Invalid object key")
            return
        length = int(self.headers.get("Content-Length", "0"))
        payload = self.rfile.read(length)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(payload)
        self.send_response(200)
        self.end_headers()

    def do_GET(self) -> None:
        self.serve_object(head=False)

    def do_HEAD(self) -> None:
        self.serve_object(head=True)

    def serve_object(self, *, head: bool) -> None:
        path = self.object_path()
        if path is None or not path.is_file():
            self.send_error(404, "Object not found")
            return
        self.send_response(200)
        self.send_header(
            "Content-Type", mimetypes.guess_type(path)[0] or "application/octet-stream"
        )
        self.send_header("Content-Length", str(path.stat().st_size))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        if not head:
            self.wfile.write(path.read_bytes())

    def log_message(self, format: str, *args: object) -> None:
        pass


if __name__ == "__main__":
    HTTPServer(("127.0.0.1", 3910), Sink).serve_forever()
