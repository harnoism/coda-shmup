"""Recolors the blue player ships of assets-src/sprites into pink ones: python3 tools/recolor-player-ships.py
Only the saturated pixels change (blue -> pink, yellow accents -> violet): the white and grey hull is kept.
Then run `npm run atlas` to repack the spritesheet. Requires Pillow."""
import colorsys
from pathlib import Path
from PIL import Image

SPRITES_DIR = Path("assets-src/sprites")
SOURCES = ["playerShip1_blue", "playerShip2_blue", "playerShip3_blue", "playerLife1_blue"]

PINK_HUE = 328 / 360       # blue parts
ACCENT_HUE = 285 / 360     # yellow accents
MIN_SATURATION = 0.2


def recolor_pixel(r, g, b, a):
    h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    if s < MIN_SATURATION:
        return r, g, b, a
    degrees = h * 360
    if 170 <= degrees <= 270:       # blue family -> pink
        h = PINK_HUE
        s = min(1.0, s * 0.95)
    elif 30 <= degrees <= 70:       # yellow accents -> violet
        h = ACCENT_HUE
    else:
        return r, g, b, a
    nr, ng, nb = colorsys.hsv_to_rgb(h, s, v)
    return round(nr * 255), round(ng * 255), round(nb * 255), a


for name in SOURCES:
    image = Image.open(SPRITES_DIR / f"{name}.png").convert("RGBA")
    image.putdata([recolor_pixel(*pixel) for pixel in image.getdata()])
    image.save(SPRITES_DIR / f"{name.replace('_blue', '_pink')}.png")
    print("wrote", name.replace('_blue', '_pink'))
