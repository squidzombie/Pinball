"""Cut the manual's close-ups and full-table picture from the flat render (table-flat.png).

Usage, from the repo root: python3 docs/manual/tools/crop.py <dir with table-flat.png> docs/manual/img
"""
import sys

from PIL import Image

# (left, top, right, bottom) in table units; the table is 600 x 1200
CROPS = {
    'breach': (40, 380, 320, 640),
    'reactor': (290, 420, 480, 680),
    'vault': (20, 40, 330, 440),
    'pops': (290, 0, 600, 420),
    'market': (400, 360, 600, 760),
    'impound': (0, 250, 160, 470),
}

src, dst = sys.argv[1], sys.argv[2]
im = Image.open(f'{src}/table-flat.png').convert('RGB')
k = im.width / 600
for name, (x0, y0, x1, y1) in CROPS.items():
    c = im.crop((int(x0 * k), int(y0 * k), int(x1 * k), int(y1 * k)))
    c.thumbnail((900, 900))
    c.save(f'{dst}/{name}.jpg', quality=85)
full = im.copy()
full.thumbnail((1200, 2400))
full.save(f'{dst}/table.jpg', quality=86)
