"""Local preview server for the site: python3 tools/serve.py [port]

The same as `python3 -m http.server`, but with a longer connection queue
(the built-in one drops connections when a browser opens several at once).
Serves the project folder on every network interface, so phones on the same
Wi-Fi can open it.
"""
import functools
import http.server
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class Server(http.server.ThreadingHTTPServer):
    request_queue_size = 128
    daemon_threads = True


class Handler(http.server.SimpleHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'

    def end_headers(self):
        # Always check for fresh copies while previewing. 'no-cache' (not 'no-store'),
        # so Back/Forward can still restore the page from memory (bfcache) as it
        # will on GitHub Pages.
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    def log_message(self, *args):
        pass


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    handler = functools.partial(Handler, directory=ROOT)
    with Server(('0.0.0.0', port), handler) as httpd:
        print(f'Serving {ROOT} on http://localhost:{port}')
        httpd.serve_forever()
