"""Local-only host for testing two GitHub-style project paths on one origin."""
import argparse
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

parser = argparse.ArgumentParser()
parser.add_argument('--production', default=str(Path(__file__).resolve().parent.parent / 'dist'))
parser.add_argument('--test', required=True)
parser.add_argument('--port', type=int, default=5187)
args = parser.parse_args()
roots = {'/baustellenbegehung-app/': Path(args.production).resolve(), '/baustellenbegehung-test/site/': Path(args.test).resolve()}
for root in roots.values():
    if not (root / 'index.html').is_file():
        parser.error('Both directories must contain a built index.html')

class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if urlsplit(self.path).path == '/seed.html':
            body = b'<!doctype html><html><body>Isolated test fixture</body></html>'
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

    def translate_path(self, path):
        path = unquote(urlsplit(path).path)
        for prefix, root in roots.items():
            if path.startswith(prefix):
                target = (root / path[len(prefix):]).resolve()
                try:
                    target.relative_to(root)
                    return str(target)
                except ValueError:
                    break
        return str(next(iter(roots.values())) / '__not_found__')

print('Isolation fixture ready on local port', args.port, flush=True)
ThreadingHTTPServer(('127.0.0.1', args.port), Handler).serve_forever()
