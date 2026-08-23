#!/usr/bin/env python3
"""Create resized copies of photos/ in thumbs/ for album cards and grids."""

from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent
PHOTOS = ROOT / "photos"
THUMBS = ROOT / "thumbs"
MAX_EDGE = 800
QUALITY = 80
EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def sources():
    if not PHOTOS.is_dir():
        return []
    return sorted(
        path
        for path in PHOTOS.iterdir()
        if path.is_file() and path.suffix.lower() in EXTENSIONS
    )


def needs_update(src, dest):
    if not dest.is_file():
        return True
    return src.stat().st_mtime > dest.stat().st_mtime


def write_thumb(src, dest):
    with Image.open(src) as image:
        image = ImageOps.exif_transpose(image)
        image.thumbnail((MAX_EDGE, MAX_EDGE))
        dest.parent.mkdir(parents=True, exist_ok=True)
        ext = src.suffix.lower()
        if ext in {".jpg", ".jpeg"}:
            if image.mode not in ("RGB", "L"):
                image = image.convert("RGB")
            image.save(dest, "JPEG", quality=QUALITY, optimize=True)
        elif ext == ".png":
            image.save(dest, "PNG", optimize=True)
        else:
            image.save(dest, "WEBP", quality=QUALITY, method=6)


def main():
    made = 0
    skipped = 0
    for src in sources():
        dest = THUMBS / src.name
        if not needs_update(src, dest):
            skipped += 1
            continue
        write_thumb(src, dest)
        made += 1
        print("wrote", dest.name)
    print("created {0}, already up to date {1}".format(made, skipped))


if __name__ == "__main__":
    main()
