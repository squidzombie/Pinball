"""Inline the Vite build into one HTML page, for publishing the game as a single file (the private
phone link). The manual stays a separate file: publish dist/manual.pdf beside the page.

  npm run build && python3 scripts/single-file.py dist /path/to/page.html
"""
import pathlib
import re
import sys

dist = pathlib.Path(sys.argv[1])
out = pathlib.Path(sys.argv[2])
html = (dist / 'index.html').read_text()
title = re.search(r'<title>(.*?)</title>', html).group(1)
css = ''.join((dist / m).read_text() for m in re.findall(r'<link rel="stylesheet"[^>]*href="\./([^"]+)"', html))
js = ''.join((dist / m).read_text() for m in re.findall(r'<script type="module"[^>]*src="\./([^"]+)"', html))
body = re.search(r'<body>(.*)</body>', html, re.S).group(1)
body = re.sub(r'\s*<script[^>]*src=[^>]*></script>', '', body)
page = f'<title>{title}</title>\n<style>\n/* Single dark look: a cabinet in a dark room. */\n:root {{ color-scheme: dark; }}\n{css}\n</style>\n{body.strip()}\n<script type="module">\n{js}\n</script>\n'
out.write_text(page)
print(title, len(page))
