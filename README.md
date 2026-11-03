# Project Click & Time Tracker

A small Chrome / Edge extension that logs **clicks and time per project session**, so the data can be harvested for development / effort prediction.

Example: the user selects **ODOO TO CARGOSON**, presses **Start**, works normally in Odoo, Cargoson or any other browser tab, then presses **End**. The session is logged as e.g. `ODOO TO CARGOSON — 65 clicks, 4:32`.

## Why an extension and not a plain web page?

A web page can only see clicks made *on that page*. The work happens in other tabs (Odoo, Cargoson, …), so counting "in the background" needs a browser extension. The extension adds a tiny listener to every tab that reports clicks only while a session is running.

## Features

- Project picker. Add or remove projects from the popup or the log page.
- Start / End with a live timer and click counter. The click count also shows on the toolbar badge.
- Counts left and right clicks in **all tabs and frames**, broken down by website.
- Optional user name and a note per session.
- Session log page with a per-project summary: sessions, total and average time, average clicks, clicks/min.
- **Export CSV** (Excel-friendly, UTF-8), **Export JSON**, and **Import JSON** to merge data from colleagues.
- All data stays local in the browser (`chrome.storage.local`). Nothing is sent anywhere.

## Install (developer mode)

1. Clone or download this repo.
2. Open `chrome://extensions` (Chrome) or `edge://extensions` (Edge).
3. Turn on **Developer mode**.
4. Click **Load unpacked** and select the `extension/` folder.
5. Pin the extension to the toolbar.
6. **Reload any tabs that were already open** (e.g. Odoo) so the click counter is injected into them.

## Usage

1. Click the extension icon, enter your name and choose a project (or add one).
2. Press **Start**, then work as usual.
3. Press **End**. The session is saved.
4. Open **Session log & export** to see the data and download a CSV or JSON file.

## Data format

Each session in the CSV export:

| column | example |
|---|---|
| id | `3f1c…` |
| project | `ODOO TO CARGOSON` |
| user | `Karl` |
| started_at / ended_at | ISO 8601 UTC |
| duration_sec | `272` |
| duration | `4:32` |
| clicks | `65` |
| clicks_per_min | `14.34` |
| clicks_by_host | `{"odoo.silen.com":43,"app.cargoson.com":22}` |
| note | free text |

## Limitations

- Only clicks inside the browser are counted, not clicks in desktop apps.
- Browser-internal pages (`chrome://…`, the Web Store, PDF viewer) can't be counted.
- Data lives in one browser profile. Use Export/Import JSON to collect it from several people.

## Project structure

```
extension/
  manifest.json   Manifest V3 config
  background.js   Session state, click counting, storage
  content.js      Click listener injected into every page
  popup.html/js   Start / End UI
  log.html/js     Session log, summary, export/import
  common.js       Shared helpers
  styles.css      Shared styles (light/dark)
```
