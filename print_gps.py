#!/usr/bin/env python3
"""
print_gps.py

Walks a directory of photos and prints the filename plus GPS lat/lon
(if present) for each one.

Usage:
    python print_gps.py "D:\path\to\photos"

Requires:
    pip install pillow pillow-heif
"""

import sys
from pathlib import Path

from PIL import Image, ExifTags

try:
    import pillow_heif
    pillow_heif.register_heif_opener()
except ImportError:
    pass  # HEIC files just won't work without this, everything else still will

# Map EXIF tag ids to names once, up front
TAGS = {v: k for k, v in ExifTags.TAGS.items()}
GPS_TAGS = {v: k for k, v in ExifTags.GPSTAGS.items()}

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".heic", ".heif", ".tif", ".tiff"}


def _convert_to_degrees(value):
    """Convert EXIF GPS coordinate (tuple of 3 IFDRational) to decimal degrees."""
    d, m, s = value
    return float(d) + (float(m) / 60.0) + (float(s) / 3600.0)


def get_lat_lon(exif_data):
    """Extract decimal lat/lon from a PIL exif dict, or return (None, None)."""
    if not exif_data:
        return None, None

    gps_info = exif_data.get(TAGS.get("GPSInfo"))
    if not gps_info:
        return None, None

    lat = gps_info.get(GPS_TAGS.get("GPSLatitude"))
    lat_ref = gps_info.get(GPS_TAGS.get("GPSLatitudeRef"))
    lon = gps_info.get(GPS_TAGS.get("GPSLongitude"))
    lon_ref = gps_info.get(GPS_TAGS.get("GPSLongitudeRef"))

    if not (lat and lat_ref and lon and lon_ref):
        return None, None

    lat_deg = _convert_to_degrees(lat)
    if lat_ref != "N":
        lat_deg = -lat_deg

    lon_deg = _convert_to_degrees(lon)
    if lon_ref != "E":
        lon_deg = -lon_deg

    return lat_deg, lon_deg


def process_directory(directory: Path):
    files = sorted(
        p for p in directory.rglob("*")
        if p.is_file() and p.suffix.lower() in IMAGE_EXTENSIONS
    )

    if not files:
        print(f"No image files found in {directory}")
        return

    for path in files:
        try:
            with Image.open(path) as img:
                exif_data = img.getexif()

                # For JPEG/HEIC, GPS/DateTimeOriginal often live in a sub-IFD,
                # not the base exif dict returned by getexif() directly.
                # get_ifd(0x8825) pulls the GPS IFD specifically.
                gps_ifd = exif_data.get_ifd(0x8825) if exif_data else None

                if gps_ifd:
                    # Rebuild in the shape get_lat_lon expects
                    fake_exif = {TAGS.get("GPSInfo"): gps_ifd}
                    lat, lon = get_lat_lon(fake_exif)
                else:
                    lat, lon = get_lat_lon(exif_data)

        except Exception as e:
            print(f"{path.name}: ERROR reading file ({e})")
            continue

        if lat is not None and lon is not None:
            print(f"{path.name}: {lat:.6f}, {lon:.6f}")
        else:
            print(f"{path.name}: no GPS data")


def main():
    if len(sys.argv) != 2:
        print("Usage: python print_gps.py <directory>")
        sys.exit(1)

    directory = Path(sys.argv[1])
    if not directory.is_dir():
        print(f"Not a valid directory: {directory}")
        sys.exit(1)

    process_directory(directory)


if __name__ == "__main__":
    main()
