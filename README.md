# Ten Tors Route I Dashboard - Team IF

A mobile-friendly, live-updating dashboard for **Polar Explorer Scouts (Team IF)** on Ten Tors Route I.

## Features
- **Live Tracking:** Fetches data directly from the [Ten Tors Route I source](https://www.tentors.org.uk/eventdata/routei.html).
- **Mobile First:** Designed for quick glances in the field.
- **Offline Resilience:** Shows the last good data if the network fails.
- **Automated Updates:** GitHub Actions pipeline scrapes data every 5 minutes during the event.
- **Route Map:** Stylized SVG map showing team progress across Dartmoor.

## Project Structure
- `public/`: The static website.
  - `index.html`: Main dashboard UI.
  - `app.js`: Frontend logic (polling, rendering).
  - `data.json`: Latest parsed team data.
  - `images/`: Checkpoint images (cached).
- `scripts/`: Server-side automation.
  - `update-route-i-data.mjs`: Node.js script to scrape source HTML and generate `data.json`.
- `.github/workflows/`: Automation pipelines.
  - `update-route-i.yml`: Scheduled scraping and data commits.
  - `deploy-pages.yml`: GitHub Pages deployment.

## How it Works
1. **GitHub Action (Server-side):** Runs every 5 minutes (or on trigger).
2. **Parser:** Scrapes the official Ten Tors HTML, extracts row for team **IF**, and saves to `public/data.json`.
3. **Deployment:** Pushes the updated JSON to the `main` branch, triggering a Pages deploy.
4. **Browser (Client-side):** Visitors load the static site. `app.js` polls `./data.json` every 60 seconds and updates the UI without refreshing the page.

## Operating During the Event

### Manual Update Trigger
If you need to force an update immediately:
1. Go to the **Actions** tab in this repo.
2. Select **Update Route I Data**.
3. Click **Run workflow** -> **Run workflow**.

### Repository Dispatch (Webhook)
You can trigger an update from an external tool using a POST request:
```bash
curl -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer <YOUR_PAT>" \
  https://api.github.com/repos/<owner>/tt-dashboard/dispatches \
  -d '{"event_type": "ten-tors-route-i-update"}'
```

### Event Window
Updates are constrained to the event weekend (May 9-10, 2026). To adjust this, modify `EVENT_WINDOW` in `scripts/update-route-i-data.mjs`.

### Refreshing Images
Checkpoint images are cached as SVGs to save bandwidth. To force a refresh:
1. Run the **Update Route I Data** workflow.
2. Check the **Force refresh checkpoint images** box.

## Setup Instructions
1. **Create Repository:** Create a repo named `tt-dashboard`.
2. **Enable Pages:**
   - Go to **Settings** -> **Pages**.
   - Select **GitHub Actions** as the source.
3. **Configure Permissions:**
   - Go to **Settings** -> **Actions** -> **General**.
   - Ensure "Read and write permissions" is selected for `GITHUB_TOKEN`.
4. **Initial Run:** Run the **Update Route I Data** workflow manually once to generate the initial data.

## Verification Checklist
- [x] Site serves locally (`npx serve public`).
- [x] Parser correctly identifies Team IF.
- [x] `data.json` is generated with coordinates and times.
- [x] Map renders correctly based on normalized coordinates.
- [x] Dashboard polls locally and doesn't flash on refresh.

## Credits
Dashboard created for Polar Explorer Scouts.
Data provided by [Ten Tors](https://www.tentors.org.uk).
