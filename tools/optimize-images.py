#!/usr/bin/env python3
"""Make web-sized WebP copies of every photo and point the pages at them.

    python3 tools/optimize-images.py

1. For each image in assets/img/ it writes assets/img/opt/<name>-<width>.webp
   at 640, 1280 and 1920px wide (never wider than the original). Existing copies are reused.
2. In every page, each <img src=".../assets/img/<name>.jpg"> gets src/srcset/sizes pointing
   at those copies plus decoding="async", and gallery links (<a href=".../assets/img/...">,
   used by the lightbox) point at the 1920px copy.

The originals in assets/img/ are never changed, so the script can be re-run any time a new
photo is added: put the photo in assets/img/, reference it normally, run the script.
Needs Pillow (pip3 install pillow).
"""
import os
import re
import sys

from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "assets", "img")
OUT = os.path.join(SRC, "opt")
WIDTHS = (640, 1280, 1920)
QUALITY = 78

# sizes hints: how wide the image is shown, by context
SIZES = {
    "hero": "100vw",
    "card": "(min-width: 1100px) 40vw, (min-width: 810px) 50vw, 100vw",
    "thumb": "(min-width: 1100px) 25vw, (min-width: 600px) 33vw, 50vw",
    "logo": "120px",
    "default": "(min-width: 900px) 50vw, 100vw",
}


def make_copies(name):
    """Return {width: filename} for the web copies of one source image."""
    src = os.path.join(SRC, name)
    stem = os.path.splitext(name)[0]
    with Image.open(src) as im:
        w0 = im.size[0]
        targets = [w for w in WIDTHS if w < w0] or [w0]
        if w0 > WIDTHS[-1] and WIDTHS[-1] not in targets:
            targets.append(WIDTHS[-1])
        out = {}
        im_loaded = None
        for w in targets:
            fn = f"{stem}-{w}.webp"
            dst = os.path.join(OUT, fn)
            if not (os.path.exists(dst) and os.path.getmtime(dst) >= os.path.getmtime(src)):
                if im_loaded is None:
                    im_loaded = ImageOps.exif_transpose(im)
                    if im_loaded.mode not in ("RGB", "RGBA"):
                        im_loaded = im_loaded.convert("RGBA" if "A" in im_loaded.getbands() or "transparency" in im.info else "RGB")
                h = round(im_loaded.size[1] * w / im_loaded.size[0])
                im_loaded.resize((w, h), Image.LANCZOS).save(dst, "WEBP", quality=QUALITY, method=6)
            out[w] = fn
        return out


def context(tag, before):
    cls = re.search(r'class="([^"]*)"', tag)
    cls = cls.group(1) if cls else ""
    if "hero" in cls:
        return "hero"
    if "card__img" in cls:
        return "card"
    wm = re.search(r'width="(\d+)"', tag)
    if wm and int(wm.group(1)) <= 200:
        return "logo"
    # thumbnail when the img sits directly inside a gallery link to a big image
    if re.search(r'<a [^>]*href="[^"]*assets/img/[^"]+"[^>]*>\s*$', before[-400:]):
        return "thumb"
    return "default"


def main():
    os.makedirs(OUT, exist_ok=True)
    names = sorted(f for f in os.listdir(SRC) if re.search(r"\.(jpe?g|png)$", f, re.I))
    copies = {}
    for i, n in enumerate(names, 1):
        copies[n] = make_copies(n)
        sys.stdout.write(f"\r  images {i}/{len(names)}")
    print()

    pages = []
    for d, _, files in os.walk(ROOT):
        if any(part in d for part in ("/.git", "/assets", "/partials", "/tools", "/node_modules")):
            continue
        pages += [os.path.join(d, f) for f in files if f.endswith(".html")]

    img_re = re.compile(r'<img\b[^>]*\bsrc="([^"]*?)assets/img/([^"/]+\.(?:jpe?g|png))"[^>]*>', re.I)
    a_re = re.compile(r'(<a\b[^>]*\bhref=")([^"]*?)assets/img/([^"/]+\.(?:jpe?g|png))(")', re.I)
    for page in pages:
        html = open(page, encoding="utf-8").read()
        orig = html

        def fix_img(m):
            tag, prefix, name = m.group(0), m.group(1), m.group(2)
            if name not in copies or "srcset=" in tag:
                return tag
            c = copies[name]
            ws = sorted(c)
            mid = next((w for w in ws if w >= 1280), ws[-1])
            ctx = context(tag, html[: m.start()])
            srcset = ", ".join(f"{prefix}assets/img/opt/{c[w]} {w}w" for w in ws)
            new = tag.replace(f'src="{prefix}assets/img/{name}"',
                              f'src="{prefix}assets/img/opt/{c[mid]}" srcset="{srcset}" sizes="{SIZES[ctx]}"')
            if "decoding=" not in new:
                new = new.replace("<img ", '<img decoding="async" ', 1)
            return new

        html = img_re.sub(fix_img, html)

        def fix_a(m):
            name = m.group(3)
            if name not in copies:
                return m.group(0)
            big = copies[name][max(copies[name])]
            return f"{m.group(1)}{m.group(2)}assets/img/opt/{big}{m.group(4)}"

        html = a_re.sub(fix_a, html)
        if html != orig:
            open(page, "w", encoding="utf-8").write(html)
            print("  updated", os.path.relpath(page, ROOT))

    src_mb = sum(os.path.getsize(os.path.join(SRC, n)) for n in names) / 1e6
    opt_mb = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT)) / 1e6
    print(f"  originals {src_mb:.0f} MB  ->  web copies {opt_mb:.0f} MB (all sizes together)")


if __name__ == "__main__":
    main()
