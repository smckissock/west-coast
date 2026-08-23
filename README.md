# West Coast Trip

A static photo album for GitHub Pages, plus a local admin page that writes `trip.json`.

The album and the admin are separate. The public site has no admin menu. Open `admin.html` on your computer, save `trip.json`, commit it with the files in `photos/`, and GitHub Pages serves the album.

## Album (GitHub Pages)

Visitors open `index.html`. It reads `trip.json` and images in `photos/`.

- Home: one card per trip leg (title + hero photo)
- Leg: thumbnails with date/time from `trip.json`
- Photo: fullscreen view with a back button

Turn on Pages: **Settings → Pages → Deploy from branch `main` / root**.

## Admin (local only)

1. Put JPEG, WebP, or PNG files in `photos/` (flat folder, not nested). Convert HEIC first — browsers will not display it.
2. From this folder run `python serve.py`, then open `http://127.0.0.1:8765/admin.html`.
3. Existing legs appear in the left list — click one to edit its title, photos, and hero.
4. Select a leg, then **Add photos** — files go straight onto that leg.
5. **Save trip.json** writes the file. If the local server cannot overwrite it, a save dialog asks you to replace `trip.json` in this repo.
6. Commit `trip.json` and the images in `photos/`.

Date/time is read from JPEG EXIF (`DateTimeOriginal`) in the admin and stored on each image in `trip.json`. The album never reads EXIF.

## `trip.json`

```json
{
  "title": "West Coast Trip",
  "legs": [
    {
      "title": "Pacific Coast Highway",
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

`filename` is the file name inside `photos/`.
