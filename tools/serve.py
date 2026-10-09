import http.server, os, sys, threading, time

ROOT = os.getcwd()
WATCH = ["core", "3d", "landing", "levels", "assets", "index.html"]
SKIP = ("vendor", ".pp-profile", "node_modules")
SNIPPET = b"<script>new EventSource('/__reload').onmessage=()=>location.reload()</script>"
state = {"stamp": 0.0}
HOT = "--hot" in sys.argv


def scan():
    latest = 0.0
    for top in WATCH:
        path = os.path.join(ROOT, top)
        if os.path.isfile(path):
            latest = max(latest, os.path.getmtime(path))
            continue
        for d, dirs, files in os.walk(path):
            dirs[:] = [x for x in dirs if not x.startswith(SKIP)]
            for f in files:
                try:
                    latest = max(latest, os.path.getmtime(os.path.join(d, f)))
                except OSError:
                    pass
    return latest


def watch():
    state["stamp"] = scan()
    while True:
        time.sleep(0.4)
        state["stamp"] = max(state["stamp"], scan())


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self):
        if self.path == "/__reload":
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream")
            self.end_headers()
            seen = state["stamp"]
            try:
                while True:
                    time.sleep(0.4)
                    if state["stamp"] > seen:
                        self.wfile.write(b"data: reload\n\n")
                        self.wfile.flush()
                        return
                    self.wfile.write(b": ping\n\n")
                    self.wfile.flush()
            except (BrokenPipeError, ConnectionResetError):
                return
        path = self.translate_path(self.path)
        if os.path.isdir(path):
            path = os.path.join(path, "index.html")
        if path.endswith(".html") and os.path.isfile(path) and HOT and "hot=0" not in self.path:
            with open(path, "rb") as f:
                body = f.read()
            i = body.rfind(b"</body>")
            body = body[:i] + SNIPPET + body[i:] if i >= 0 else body + SNIPPET
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

    def log_message(self, *a):
        pass


if HOT:
    threading.Thread(target=watch, daemon=True).start()
args = [a for a in sys.argv[1:] if not a.startswith("--")]
port = int(args[0]) if args else 8765
http.server.ThreadingHTTPServer(("", port), Handler).serve_forever()
