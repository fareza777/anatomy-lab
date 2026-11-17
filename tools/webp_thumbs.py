"""Convert captured thumbnail PNGs to compact WebP (alpha kept), trimmed to content."""
import glob, os
from PIL import Image
D = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "app", "src", "main", "assets", "thumbs")
for p in glob.glob(os.path.join(D, "*.png")):
    im = Image.open(p).convert("RGBA")
    bbox = im.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
    if bbox: im = im.crop(bbox)
    im.thumbnail((720, 720), Image.LANCZOS)
    out = p[:-4] + ".webp"
    im.save(out, "WEBP", quality=86, method=6)
    os.remove(p)
    print(os.path.basename(out), im.size, os.path.getsize(out) // 1024, "KB")
