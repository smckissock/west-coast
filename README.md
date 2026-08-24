# West Coast Trip

**Live album:** [https://smckissock.github.io/west-coast/](https://smckissock.github.io/west-coast/#/)

A static photo album for GitHub Pages, plus a local admin page that writes `trip.json`.

The album and the admin are separate. The public site has no admin menu. Open `admin.html` on your computer, save `trip.json`, commit it with the files in `photos/`, and GitHub Pages serves the album.

## Album (GitHub Pages)

Visitors open `index.html`. It reads `trip.json`. Home cards and site grids use smaller images in `thumbs/`. Fullscreen photos still come from `photos/`.

- Home: trip date range under the title, a calendar of the weeks that have photos above a western US map with straight lines between stops, then one card per site (title, state, date range, hero photo). Hovering a calendar day, a map stop, or a card highlights the matching days, stops, and cards together, and scrolls the map and the card grid so the matching stop and card are in view. Clicking a calendar day opens the first site of that day. The calendar and map are hidden on narrow screens.
- Site: title with state to the right, date range, optional description, then thumbnails with date/time from `trip.json`
- Photo: fullscreen view with a back button

Turn on Pages: **Settings → Pages → Deploy from branch `main` / root**.

## Admin (local only)

1. Put JPEG, WebP, or PNG files in `photos/` (flat folder, not nested). Convert HEIC first — browsers will not display it.
2. From this folder run `python serve.py`, then open `http://127.0.0.1:8765/admin.html`.
3. Existing sites appear in the left list, sorted by the earliest photo time — click one to edit its title, state, description, photos, and hero.
4. Select a site, then **Add photos** — files go straight onto that site. Put the same files in `photos/`.
5. **Save trip.json** writes the file. If the local server cannot overwrite it, a save dialog asks you to replace `trip.json` in this repo.
6. From this folder run `uv run python make_thumbs.py`. The first run creates a `.venv` and installs Pillow. It writes missing or updated files into `thumbs/`. The admin shows a banner if any originals have no thumbnail.
7. Commit `trip.json` and the images in `photos/` and `thumbs/`.

Date/time is read from JPEG EXIF (`DateTimeOriginal`) in the admin and stored on each image in `trip.json`. Each leg also gets `startDate` and `endDate` (`YYYY-MM-DD`) from the earliest and latest photo times. Those dates are not editable — they update when photos are added or moved. The album and admin show a single date when start and end are the same day, otherwise a range. The album never reads EXIF. Legs are sorted by the earliest photo datetime.

## `trip.json`

```json
{
  "title": "West Coast Trip",
  "legs": [
    {
      "title": "Pacific Coast Highway",
      "state": "California",
      "description": "Overlooks along the coast.",
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

`filename` is the file name inside `photos/`. `state` is the US state for that site. `description` is optional site text shown above the thumbnails. `startDate` and `endDate` are written on save from the photos in that site. Empty sites omit both date fields and sort last.
