"""Generate the Anatomy Lab icon: three exploded isometric slabs with an orbit ring.
Writes Android vector drawables (adaptive foreground/background/monochrome, splash) and
marketing/icon.svg. Coordinates are in the 108x108 adaptive-icon viewport."""
import math, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RES = os.path.join(ROOT, "app", "src", "main", "res", "drawable")
A, B, T = 20.0, 11.55, 6.5
CENTERS = [37.0, 51.0, 65.0]
COLORS = [("#FF6A3D", "#E2451F", "#B8351A"), ("#FFD066", "#E9A93A", "#C2852A"), ("#43D3D6", "#1FA6AC", "#14797F")]
CX = 54.0

def slab(cy):
    T_ = (CX, cy - B); R = (CX + A, cy); Bt = (CX, cy + B); L = (CX - A, cy)
    top = [T_, R, Bt, L]
    left = [L, Bt, (Bt[0], Bt[1] + T), (L[0], L[1] + T)]
    right = [Bt, R, (R[0], R[1] + T), (Bt[0], Bt[1] + T)]
    return top, left, right

def d(pts):
    return "M" + " L".join(f"{x:.2f},{y:.2f}" for x, y in pts) + " Z"

def ellipse_arc(cx, cy, rx, ry, rot, a0, a1, n=40):
    r = math.radians(rot); pts = []
    for i in range(n + 1):
        t = math.radians(a0 + (a1 - a0) * i / n)
        x, y = rx * math.cos(t), ry * math.sin(t)
        pts.append((cx + x * math.cos(r) - y * math.sin(r), cy + x * math.sin(r) + y * math.cos(r)))
    return pts

def polyline(pts):
    return "M" + " L".join(f"{x:.2f},{y:.2f}" for x, y in pts)

ORB = (54.0, 54.0, 33.0, 10.5, -24.0)
back_arc = polyline(ellipse_arc(*ORB, 180, 360))
front_arc = polyline(ellipse_arc(*ORB, 0, 180))
ex, ey = ellipse_arc(*ORB, 38, 38, 1)[0]

def shapes(mono=None):
    out = []  # (kind, d, fill/stroke)
    out.append(("stroke", back_arc, mono or "#9FB4FF", 1.6, 0.55))
    for cy, (ct, cl, cr) in reversed(list(zip(CENTERS, COLORS))):
        top, left, right = slab(cy)
        out.append(("fill", d(left), mono or cl)); out.append(("fill", d(right), mono or cr)); out.append(("fill", d(top), mono or ct))
        # inset groove on each top face
        k = 0.62
        inner = [(CX + (x - CX) * k, cy + (y - cy) * k) for x, y in top]
        out.append(("stroke", d(inner), mono or "#FFFFFF", 0.7, 0.45))
    out.append(("stroke", front_arc, mono or "#E8EEFF", 2.0, 0.95))
    out.append(("dot", (ex, ey, 2.6), mono or "#FFF4D6"))
    return out

def vector(items, scale=1.0, name=""):
    body = []
    for it in items:
        if it[0] == "fill":
            body.append(f'<path android:fillColor="{it[2]}" android:pathData="{it[1]}"/>')
        elif it[0] == "stroke":
            body.append(f'<path android:strokeColor="{it[2]}" android:strokeWidth="{it[3]}" android:strokeAlpha="{it[4]}" android:strokeLineCap="round" android:fillColor="#00000000" android:pathData="{it[1]}"/>')
        else:
            x, y, r = it[1]
            body.append(f'<path android:fillColor="{it[2]}" android:pathData="M{x-r:.2f},{y:.2f} a{r},{r} 0 1,0 {2*r},0 a{r},{r} 0 1,0 {-2*r},0"/>')
    return ('<?xml version="1.0" encoding="utf-8"?>\n<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108">\n'
            f'<group android:scaleX="{scale}" android:scaleY="{scale}" android:pivotX="54" android:pivotY="54">\n' + "\n".join(body) + "\n</group>\n</vector>\n")

BG = '''<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android" xmlns:aapt="http://schemas.android.com/aapt" android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108">
<path android:pathData="M0,0h108v108h-108z"><aapt:attr name="android:fillColor"><gradient android:type="radial" android:centerX="54" android:centerY="44" android:gradientRadius="80"><item android:offset="0" android:color="#FF2A3F7A"/><item android:offset="0.55" android:color="#FF132048"/><item android:offset="1" android:color="#FF080D1F"/></gradient></aapt:attr></path>
<path android:strokeColor="#1FFFFFFF" android:strokeWidth="0.35" android:fillColor="#00000000" android:pathData="M0,27 L108,27 M0,54 L108,54 M0,81 L108,81 M27,0 L27,108 M54,0 L54,108 M81,0 L81,108"/>
</vector>
'''
open(os.path.join(RES, "ic_launcher_background.xml"), "w").write(BG)
open(os.path.join(RES, "ic_launcher_foreground.xml"), "w").write(vector(shapes(), 0.92))
open(os.path.join(RES, "ic_launcher_monochrome.xml"), "w").write(vector(shapes("#FFFFFFFF"), 0.92))
open(os.path.join(RES, "ic_splash_logo.xml"), "w").write(vector(shapes(), 1.0))

def svg(items, size=512, bg=True):
    s = size / 108.0
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 108 108">']
    if bg:
        parts.append('<defs><radialGradient id="g" cx="54" cy="44" r="80" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#2A3F7A"/><stop offset=".55" stop-color="#132048"/><stop offset="1" stop-color="#080D1F"/></radialGradient></defs><rect width="108" height="108" fill="url(#g)"/>')
        parts.append('<path stroke="#ffffff" stroke-opacity=".12" stroke-width=".35" fill="none" d="M0,27 L108,27 M0,54 L108,54 M0,81 L108,81 M27,0 L27,108 M54,0 L54,108 M81,0 L81,108"/>')
    parts.append('<g transform="translate(54 54) scale(1.05) translate(-54 -54)">')
    for it in items:
        if it[0] == "fill": parts.append(f'<path fill="{it[2]}" d="{it[1]}"/>')
        elif it[0] == "stroke": parts.append(f'<path fill="none" stroke="{it[2]}" stroke-width="{it[3]}" stroke-opacity="{it[4]}" stroke-linecap="round" d="{it[1]}"/>')
        else:
            x, y, r = it[1]; parts.append(f'<circle cx="{x:.2f}" cy="{y:.2f}" r="{r}" fill="{it[2]}"/>')
    parts.append("</g></svg>")
    return "".join(parts)

open(os.path.join(ROOT, "marketing", "icon.svg"), "w").write(svg(shapes()))
open(os.path.join(ROOT, "app", "src", "main", "assets", "brand-mark.svg"), "w").write(svg(shapes(), 256, bg=False))
print("icon written")
