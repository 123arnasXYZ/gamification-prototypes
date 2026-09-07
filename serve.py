"""Static dev server for the prototypes.

Python's stock `python -m http.server` sends no Cache-Control header at all,
so Chrome caches JS and CSS heuristically. The practical effect is that you
edit a file, reload, and see the old version — sometimes for minutes.

This is the same server with no-store headers bolted on, so every reload
picks up whatever is on disk.

    python serve.py          # port 8123
    python serve.py 9000     # some other port
"""

import http.server
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8123


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def send_head(self):
        # SimpleHTTPRequestHandler answers If-Modified-Since with a 304, which
        # would hand back the stale copy even with no-store set. Drop the
        # header so every request is served fresh.
        del self.headers["If-Modified-Since"]
        return super().send_head()


class DevServer(http.server.ThreadingHTTPServer):
    # Threaded: a browser opens several connections at once for the module
    # graph, and a single-threaded server makes them queue up and time out.
    daemon_threads = True

    # Deliberately off. On Windows this lets a second process bind a port that
    # is already in use instead of failing, so you end up with two servers on
    # 8123 and connections landing on either one.
    allow_reuse_address = False


if __name__ == "__main__":
    try:
        httpd = DevServer(("", PORT), NoCacheHandler)
    except OSError as err:
        print(f"Could not start on port {PORT}: {err}")
        print(f"Something is already serving {PORT}. Stop it, or run: python serve.py {PORT + 1}")
        raise SystemExit(1)

    with httpd:
        print(f"Serving http://localhost:{PORT} with caching disabled. Ctrl+C to stop.")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nStopped.")
