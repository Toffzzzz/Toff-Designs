"""Local preview server for the site: python3 tools/serve.py [port] [--gzip]

The same as `python3 -m http.server`, but with a longer connection queue
(the built-in one drops connections when a browser opens several at once).
Serves the project folder on every network interface, so phones on the same
Wi-Fi can open it.

--gzip compresses text files (HTML, CSS, JavaScript, JSON, SVG, XML, text,
WebAssembly) for browsers that accept it, with Content-Encoding: gzip and
Vary: Accept-Encoding, the way GitHub Pages serves them. Use it when measuring
page weight or running performance checks, so the numbers match the live site.
"""
import email.utils
import functools
import gzip
import http.server
import io
import os
import sys
import threading

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# File types GitHub Pages compresses (images, fonts and video are already compressed).
GZIP_TYPES = {
    '.html', '.htm', '.css', '.js', '.mjs', '.json', '.map', '.svg', '.xml',
    '.txt', '.md', '.csv', '.webmanifest', '.wasm',
}
GZIP_MIN_BYTES = 256  # tiny files aren't worth compressing


class Server(http.server.ThreadingHTTPServer):
    request_queue_size = 128
    daemon_threads = True


class Handler(http.server.SimpleHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'
    use_gzip = False
    _cache = {}  # path -> (mtime, size, compressed bytes)
    _cache_lock = threading.Lock()

    def end_headers(self):
        # Always check for fresh copies while previewing. 'no-cache' (not 'no-store'),
        # so Back/Forward can still restore the page from memory (bfcache) as it
        # will on GitHub Pages.
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    def log_message(self, *args):
        pass

    def _accepts_gzip(self):
        for part in self.headers.get('Accept-Encoding', '').split(','):
            fields = part.strip().split(';')
            if fields[0].strip().lower() in ('gzip', '*'):
                q = 1.0
                for f in fields[1:]:
                    f = f.strip()
                    if f.startswith('q='):
                        try:
                            q = float(f[2:])
                        except ValueError:
                            q = 0.0
                return q > 0
        return False

    def _compressed(self, path, st):
        with self._cache_lock:
            hit = self._cache.get(path)
            if hit and hit[0] == st.st_mtime_ns and hit[1] == st.st_size:
                return hit[2]
        with open(path, 'rb') as f:
            data = gzip.compress(f.read(), compresslevel=6, mtime=0)
        with self._cache_lock:
            self._cache[path] = (st.st_mtime_ns, st.st_size, data)
        return data

    def send_head(self):
        if not self.use_gzip:
            return super().send_head()
        path = self.translate_path(self.path)
        if os.path.isdir(path):
            if not self.path.split('?', 1)[0].split('#', 1)[0].endswith('/'):
                return super().send_head()  # the usual redirect to the trailing slash
            for index in ('index.html', 'index.htm'):
                candidate = os.path.join(path, index)
                if os.path.isfile(candidate):
                    path = candidate
                    break
            else:
                return super().send_head()  # directory listing, uncompressed
        ext = os.path.splitext(path)[1].lower()
        if ext not in GZIP_TYPES or path.endswith('/') or not os.path.isfile(path):
            return super().send_head()
        try:
            st = os.stat(path)
        except OSError:
            return super().send_head()
        if st.st_size < GZIP_MIN_BYTES or not self._accepts_gzip():
            # Same Vary header as Pages, even when the reply isn't compressed.
            self._vary = True
            return super().send_head()
        body = self._compressed(path, st)
        self.send_response(200)
        self.send_header('Content-Type', self.guess_type(path))
        self.send_header('Content-Encoding', 'gzip')
        self.send_header('Vary', 'Accept-Encoding')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Last-Modified', email.utils.formatdate(st.st_mtime, usegmt=True))
        self.end_headers()
        return io.BytesIO(body)

    def send_response(self, code, message=None):
        super().send_response(code, message)
        if getattr(self, '_vary', False):
            self._vary = False
            self.send_header('Vary', 'Accept-Encoding')


def main(argv):
    use_gzip = '--gzip' in argv
    args = [a for a in argv if a != '--gzip']
    port = int(args[0]) if args else 8000
    handler = functools.partial(Handler, directory=ROOT)
    Handler.use_gzip = use_gzip
    with Server(('0.0.0.0', port), handler) as httpd:
        extra = ' (gzip on)' if use_gzip else ''
        print(f'Serving {ROOT} on http://localhost:{port}{extra}')
        httpd.serve_forever()


if __name__ == '__main__':
    main(sys.argv[1:])
