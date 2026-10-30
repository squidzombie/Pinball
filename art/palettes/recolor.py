"""Recolour screenshots of the table into alternate colour schemes (previews only; the game is untouched).

Neutral pixels (concrete, steel, ink, the brain) go through a brightness ramp, so their light and
dark relationships stay as drawn. Coloured pixels keep their own brightness and saturation but
move hue: the red family (lights, caps, the display) to the scheme's light colour, the ochre
family (hazard stripes, brass, orange and yellow lamps) to its stripe colour. Other hues (the
job plaques) are kept. Outside the table (the page and the display's frame) only coloured pixels
change.

Usage (from the repo root):
  python3 art/palettes/recolor.py <screenshot dir> art/palettes/previews   # writes <id>-phone.jpg, <id>-close.jpg, all.jpg
  python3 art/palettes/recolor.py --swatches                                 # prints each scheme's swatches
The screenshots come from capture.cjs (phone.png and close.png).
"""
import json
import os
import sys

import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
SCHEMES = json.load(open(os.path.join(HERE, 'schemes.json')))
# The game's own palette tokens (src/game/tables/psychosis-art.ts and the insert colours), for swatches.
TOKENS = {'floor': '#d8cfbd', 'steel': '#a8a69f', 'ink': '#2a2622', 'lights': '#ff2a2a', 'stripes': '#c79f3b'}


def rgb(h):
    return np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], float) / 255


def hexstr(c):
    return '#' + ''.join(f'{int(round(x * 255)):02x}' for x in c)


def smooth(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def to_hsv(img):
    r, g, b = img[..., 0], img[..., 1], img[..., 2]
    mx, mn = img.max(-1), img.min(-1)
    d = mx - mn
    s = np.where(mx > 1e-6, d / np.maximum(mx, 1e-6), 0)
    dd = np.maximum(d, 1e-6)
    h = np.where(mx == r, ((g - b) / dd) % 6, np.where(mx == g, (b - r) / dd + 2, (r - g) / dd + 4)) * 60
    return np.where(d > 1e-6, h, 0), s, mx


def from_hsv(h, s, v):
    h = (h % 360) / 60
    i = np.floor(h).astype(int) % 6
    f = h - np.floor(h)
    p, q, t = v * (1 - s), v * (1 - s * f), v * (1 - s * (1 - f))
    sel = [i == k for k in range(6)]
    r = np.select(sel, [v, q, p, p, t, v])
    g = np.select(sel, [t, v, v, q, p, p])
    b = np.select(sel, [p, p, t, v, v, q])
    return np.stack([r, g, b], -1)


def hue_dist(h, c):
    return (h - c + 180) % 360 - 180


def table_mask(img):
    """1 inside the table, 0 on the page around it (the display, the buttons, the dark margins)."""
    L = img @ [0.299, 0.587, 0.114]
    bright = L > 0.15
    rows = bright.mean(1) > 0.6
    # the longest run of mostly-bright rows is the table
    best, cur, start = (0, 0), 0, 0
    for y, r in enumerate(rows):
        if r:
            if cur == 0:
                start = y
            cur += 1
            if cur > best[1] - best[0]:
                best = (start, y + 1)
        else:
            cur = 0
    m = np.zeros(L.shape)
    for y in range(*best):
        xs = np.nonzero(bright[y])[0]
        m[y, xs[0]:xs[-1] + 1] = 1
    mi = Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2))
    return np.asarray(mi).astype(float) / 255


def recolor(img, sc, mask=None):
    h, s, v = to_hsv(img)
    L = img @ [0.299, 0.587, 0.114]
    pos = np.array([p for p, _ in sc['ramp']])
    cols = np.array([rgb(c) for _, c in sc['ramp']])
    neutral = np.stack([np.interp(L, pos, cols[:, k]) for k in range(3)], -1)
    if mask is not None:
        neutral = neutral * mask[..., None] + img * (1 - mask[..., None])
    s_eff = s * smooth(0.04, 0.16, v)
    wn = 1 - smooth(0.13, 0.33, s_eff)
    # red family: 0 +-10 deg (lights, caps, glass); ochre family: 12-70 deg (hazard, brass, orange and yellow lamps)
    wr = 1 - smooth(9, 15, np.abs(hue_dist(h, 0)))
    wy = (1 - smooth(24, 32, np.abs(hue_dist(h, 40)))) * (1 - wr)
    A, B = sc['light'], sc['second']
    nh = h + wr * hue_dist(A['hue'], 0) + wy * hue_dist(B['hue'], 40)
    ks = 1 + wr * (A.get('sat', 1) - 1) + wy * (B.get('sat', 1) - 1)
    kv = 1 + wr * (A.get('val', 1) - 1) + wy * (B.get('val', 1) - 1)
    chroma = from_hsv(nh, np.clip(s * ks, 0, 1), np.clip(v * kv, 0, 1))
    return np.clip(neutral * wn[..., None] + chroma * (1 - wn[..., None]), 0, 1)


def swatches():
    px = np.array([[rgb(c) for c in TOKENS.values()]])
    out = {}
    for sc in SCHEMES:
        res = px if sc['id'] == 'current' else recolor(px, sc)
        out[sc['id']] = dict(zip(TOKENS, [hexstr(c) for c in res[0]]))
    return out


def build(src, dst):
    # (name, width of the saved preview)
    views = [('phone', 780), ('close', 980)]
    os.makedirs(dst, exist_ok=True)
    sheet = []
    for name, width in views:
        img = np.asarray(Image.open(os.path.join(src, f'{name}.png')).convert('RGB')).astype(float) / 255
        mask = table_mask(img) if name == 'phone' else None
        for sc in SCHEMES:
            out = img if sc['id'] == 'current' else recolor(img, sc, mask)
            im = Image.fromarray((out * 255 + 0.5).astype(np.uint8))
            im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
            im.save(os.path.join(dst, f"{sc['id']}-{name}.jpg"), quality=86)
            if name == 'phone':
                sheet.append(im)
    # contact sheet of the phone views, three across
    w, h = 390, round(sheet[0].height * 390 / sheet[0].width)
    gap = 16
    cols = 3
    rows = (len(sheet) + cols - 1) // cols
    all_ = Image.new('RGB', (cols * w + (cols - 1) * gap, rows * h + (rows - 1) * gap), '#ffffff')
    for k, im in enumerate(sheet):
        all_.paste(im.resize((w, h), Image.LANCZOS), ((k % cols) * (w + gap), (k // cols) * (h + gap)))
    all_.save(os.path.join(dst, 'all.jpg'), quality=86)


if __name__ == '__main__':
    if sys.argv[1:] == ['--swatches']:
        print(json.dumps(swatches(), indent=1))
    else:
        build(sys.argv[1], sys.argv[2])
