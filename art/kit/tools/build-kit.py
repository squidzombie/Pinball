"""Builds the playfield drawing kit from render-guides.cjs's renders.

  python3 art/kit/tools/build-kit.py <renders dir> art/kit

Writes, at the art's size (1800 x 3600, 3 pixels per table unit):
  layers/game-on-top.png   what the game draws over the art (rails, toys, ramps, lights), on transparent
  layers/labels.png        names of the features, on transparent
  layers/current-look.png  the table as the code draws it today
  guide-preview.png        the two guides over grey, to look at
  Cyber-Psychosis-Playfield.psd  all of it as layers, plus a grey background and an empty layer to
                                 paint on (needs psd-tools)
"""
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

K = 3  # pixels per table unit
W, H = 600 * K, 1200 * K

# Where to put each label, in table units (from psychosis-layout.ts; move them if the layout moves).
LABELS = [
    ('BACK ALLEY', 196, 48), ('BACK DOOR', 84, 188), ('TUMBLERS', 187, 163), ('THE VAULT', 182, 262),
    ('VAULT LANE', 86, 420), ('IMPOUND', 42, 352), ('CAM LANES', 381, 98), ('POP BUMPERS', 400, 250),
    ('SAFE', 98, 567), ('BREACH', 150, 462), ('B-R-E', 112, 532), ('A-C-H', 222, 500),
    ('BLACK MARKET RAMP', 272, 520), ('BLACK MARKET', 536, 438), ('REACTOR', 380, 481),
    ('DROP TARGETS', 352, 566), ('VENT', 412, 613), ('SKYWAY', 505, 735), ('SPINNER', 524, 652),
    ('SHOP MENU', 278, 664), ('HEIST MAP', 278, 780), ('BONUS X', 278, 952), ('R-A-G-E', 70, 905),
    ('R-A-G-E', 486, 905), ('SLING', 140, 948), ('SLING', 420, 948), ('FLIPPERS', 278, 1060),
    ('SHOOTER LANE', 557, 1020), ('SHOOT AGAIN', 278, 1128),
]
INK = (255, 47, 210, 255)  # hot magenta: shows over any art
OUTLINE = (0, 0, 0, 255)


def matte(black, white):
    """The layer over the art, from renders over black and over white: alpha from the difference."""
    b = np.asarray(black.convert('RGB')).astype(np.float32) / 255
    w = np.asarray(white.convert('RGB')).astype(np.float32) / 255
    a = np.clip(1 - (w - b).mean(axis=2), 0, 1)
    rgb = np.where(a[..., None] > 0.004, b / np.maximum(a[..., None], 0.004), 0)
    out = np.dstack([np.clip(rgb, 0, 1), a]) * 255
    return Image.fromarray((out + 0.5).astype(np.uint8), 'RGBA')


def font(size):
    for f in ('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/Library/Fonts/Arial Bold.ttf'):
        if os.path.exists(f):
            return ImageFont.truetype(f, size)
    return ImageFont.load_default()


def labels():
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    f = font(30)
    for text, x, y in LABELS:
        X, Y = x * K, y * K
        d.ellipse((X - 7, Y - 7, X + 7, Y + 7), fill=INK, outline=OUTLINE, width=3)
        tw = d.textlength(text, font=f)
        tx = min(max(X - tw / 2, 70), W - 70 - tw)
        d.text((tx, Y + 12), text, font=f, fill=INK, stroke_width=4, stroke_fill=OUTLINE)
    # the playfield's edge: outside it is the cabinet's steel
    x0, y0, x1, y1 = 20 * K, 18 * K, 580 * K, H - 1
    for i in range(0, H, 40):
        d.line((x0, max(i, y0), x0, min(i + 20, y1)), fill=INK, width=4)
        d.line((x1, max(i, y0), x1, min(i + 20, y1)), fill=INK, width=4)
    for i in range(x0, x1, 40):
        d.line((i, y0, min(i + 20, x1), y0), fill=INK, width=4)
    note = 'PLAYFIELD EDGE: outside the dashed line is the cabinet'
    d.text((x0 + 16, y0 + 10), note, font=font(24), fill=INK, stroke_width=3, stroke_fill=OUTLINE)
    return im


def main(src, dst):
    os.makedirs(os.path.join(dst, 'layers'), exist_ok=True)
    on_top = matte(Image.open(os.path.join(src, 'on-top-black.png')), Image.open(os.path.join(src, 'on-top-white.png')))
    current = Image.open(os.path.join(src, 'reference.png')).convert('RGB')
    lab = labels()
    on_top.save(os.path.join(dst, 'layers', 'game-on-top.png'), optimize=True)
    lab.save(os.path.join(dst, 'layers', 'labels.png'), optimize=True)
    current.save(os.path.join(dst, 'layers', 'current-look.png'), optimize=True)

    preview = Image.new('RGBA', (W, H), (118, 120, 124, 255))
    preview.alpha_composite(on_top)
    preview.alpha_composite(lab)
    preview.convert('RGB').resize((W // 2, H // 2), Image.LANCZOS).save(os.path.join(dst, 'guide-preview.png'), optimize=True)

    try:
        from psd_tools import PSDImage
        from psd_tools.api.layers import PixelLayer
        from psd_tools.constants import Compression
    except ImportError:
        print('psd-tools not installed: skipped the PSD (pip install psd-tools)')
        return
    psd = PSDImage.new('RGBA', (W, H))
    layers = [
        ('Background (grey; hide or paint over)', Image.new('RGBA', (W, H), (118, 120, 124, 255)), True, 255),
        ('Reference: the current look', current.convert('RGBA'), False, 255),
        ('PAINT THE PLAYFIELD HERE', Image.new('RGBA', (W, H), (0, 0, 0, 0)), True, 255),
        ('Guide: the game draws this on top', on_top, True, 190),
        ('Guide: labels', lab, True, 255),
    ]
    for name, img, visible, opacity in layers:
        layer = PixelLayer.frompil(img, psd, name, compression=Compression.RLE)
        layer.visible = visible
        layer.opacity = opacity
        psd.append(layer)
    # The flattened picture that previews (Finder, Quick Look) show; psd-tools rebuilds it from the
    # visible layers on save, but stores it uncompressed (26 MB more) unless told otherwise.
    psd._record.image_data.compression = Compression.RLE
    psd.save(os.path.join(dst, 'Cyber-Psychosis-Playfield.psd'))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
