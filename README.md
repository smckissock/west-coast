# West Coast Trip

A static photo album for GitHub Pages, plus a local admin page that writes `trip.json`.

The album and the admin are separate. The public site has no admin menu. Open `admin.html` on your computer, save `trip.json`, commit it with the files in `photos/`, and GitHub Pages serves the album.

## Album (GitHub Pages)

Visitors open `index.html`. It reads `trip.json` and images in `photos/`.

- Home: trip date range under the title, then one card per trip leg (title, date range, hero photo)
- Leg: date range under the title, then thumbnails with date/time from `trip.json`
- Photo: fullscreen view with a back button

Turn on Pages: **Settings → Pages → Deploy from branch `main` / root**.

## Admin (local only)

1. Put JPEG, WebP, or PNG files in `photos/` (flat folder, not nested). Convert HEIC first — browsers will not display it.
2. From this folder run `python serve.py`, then open `http://127.0.0.1:8765/admin.html`.
3. Existing legs appear in the left list, sorted by the earliest photo time — click one to edit its title, photos, and hero.
4. Select a leg, then **Add photos** — files go straight onto that leg.
5. **Save trip.json** writes the file. If the local server cannot overwrite it, a save dialog asks you to replace `trip.json` in this repo.
6. Commit `trip.json` and the images in `photos/`.

Date/time is read from JPEG EXIF (`DateTimeOriginal`) in the admin and stored on each image in `trip.json`. Each leg also gets `startDate` and `endDate` (`YYYY-MM-DD`) from the earliest and latest photo times. Those dates are not editable — they update when photos are added or moved. The album and admin show a single date when start and end are the same day, otherwise a range. The album never reads EXIF. Legs are sorted by the earliest photo datetime.

## `trip.json`

```json
{
  "title": "West Coast Trip",
  "legs": [
    {
      "title": "Pacific Coast Highway",
      "startDate": "2026-08-10",
      "endDate": "2026-08-12",
      "images": [
        {
          "filename": "pch-overlook.jpg",
          "datetime": "2026-08-10T14:32:00",
          "hero": true
        }
      ]
    }
  ]
}
```

`filename` is the file name inside `photos/`. `startDate` and `endDate` are written on save from the photos in that leg. Empty legs omit both fields and sort last.
