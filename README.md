# Alex White — Quiet Ink

A Hugo blog with a custom, responsive theme inspired by Chinese landscape painting: warm paper, ink, jade, a vermilion seal, and quiet serif typography. No frontend framework, external fonts, or JavaScript build step.

## Run

Requires Hugo **0.158 or newer** (built and checked with 0.168).

```sh
hugo server -D
```

Open http://localhost:1313. For production:

```sh
hugo --gc --minify --panicOnWarning
node scripts/audit.cjs
```

Deploy the contents of `public/` to any static host. The configured production URL is `https://thatalexguy.dev/`. The live site and DNS have not been changed.

For Vercel, `vercel.json` runs `scripts/build-vercel.sh`, which downloads Hugo **0.168.0**, builds with `hugo.toml`, runs the migration audit, and publishes `public/`. This follows [Hugo's Vercel deployment approach](https://gohugo.io/host-and-deploy/deploy-to-vercel/). Vercel's legacy default Hugo does not recognize `hugo.toml`, so it can report a successful build while omitting the theme, HTML pages, and CSS and serving RSS at the homepage. Keep the pinned version in the script aligned with the version tested locally. Push these files to the connected repository to apply the fix on the next deployment.

## Writing

```sh
hugo new content cycling/a-new-ride.md
hugo new content books/a-new-book.md
hugo new content games/a-new-game.md
hugo new content posts/a-new-note.md
```

Remove `draft: true` when ready. Posts without an explicit `url` use their section path. Migrated posts explicitly keep their original root-level paths. Optional front matter: `description`, `cover` (a local image path), `tags`, and `comments: true` to enable Pure Comments. Add optimized WebP images under `static/content/images/`; the theme generates card thumbnails and resizes large article images during the Hugo build. Local JPEG and PNG assets have been converted to WebP at quality 82 with dimensions preserved and originals removed.

The homepage includes all four post sections. Each section also has its own archive and RSS feed. Search runs locally in the browser against Hugo’s generated `index.json`. Color mode follows the system until the reader changes it, then saves their preference locally. The site remains readable without JavaScript.

## Migration

Migrated **25 publicly available posts, the About page, and 53 media files** from the public sitemap on October 28, 2026. The original two archive pages were checked against the sitemap. Post dates, titles, tags, body text, image captions, links, and original URL slugs are retained. About’s platform description now reflects Hugo and credits the previous platform. Search was rebuilt for Hugo; `/feed.xml` provides RSS and `/feed/` redirects to it.

- `content/`: editable Markdown, with JSON or YAML front matter.
- `themes/quiet-ink/`: custom layouts, CSS, browser scripts, and landscape illustration.
- `migration/manifest.json`: original URL and asset inventory, with `optimizedAssets` mapping original asset URLs to their WebP replacements.
- `migration/source/`: original public HTML snapshots for comparison.
- `scripts/migrate.cjs`: original import script; needs Node.js plus `cheerio` and `turndown`. Re-running overwrites migrated pages, including subsequent editorial changes.
- `scripts/audit.cjs`: dependency-free build audit of original URLs, assets, internal references, and search coverage. Run after a production build, rather than against Hugo server’s live-reload output.

Pure Comments keeps its existing embed endpoint and post slug identifiers; historical comment data remains on that external service. Actual comment loading and submission should be checked on the production domain, since the service may restrict local origins. No private drafts or server-side comment database were accessible through the public website.

One pre-existing broken reference in “From Omarchy to Pop_OS!” points to `https://thatalexguy.dev/i-dont-know-what-to-do-on-a-computer-anymore` (the original server returns 404). It is preserved as an absolute link; no replacement article has been invented.

## Cycling routes

Drop `.gpx` files directly into `static/routes/` and rebuild Hugo (or restart `hugo server` after adding files). Cards appear automatically above the cycling journal. No extra build tools or API keys are needed. Files are publicly downloadable, so trim private start/end locations before adding them.

Edit `data/cycling_routes.json` to mark favorites and supply optional metadata, using exact filenames:

```json
{
  "sunday-loop.gpx": {
    "title": "Sunday on the towpath",
    "country": "United States",
    "favorite": true
  },
  "baotou.gpx": {
    "country": "China",
    "favorite": true
  }
}
```

The page previews up to three favorites, alphabetically by filename; **View all routes** reveals the full collection. If none are favorites, it previews the first three routes. Titles default to filenames. Country defaults to “Not specified”: GPX has no standard country field, and no coordinates are sent to a geocoding service. For cross-border rides, list both countries.

Distance is calculated in kilometers from GPX track points (or route points if no tracks exist), without joining separate segments. Average speed uses recorded segment elapsed time, including stops and excluding gaps between segments. Missing or non-increasing timestamps make speed unavailable. Invalid coordinates split the track rather than bridging the gap. Maps and statistics require JavaScript; GPX downloads work without it. Maps use OpenStreetMap tiles, loaded only as cards enter the viewport, with visible attribution and normal browser caching; see the [tile usage policy](https://operations.osmfoundation.org/policies/tiles/). A failed map tile request still leaves the route outline visible. No sample rides are published as your own.

## Experiments

Experiment pages live separately in `content/experiments/` and automatically become cards at `/experiments/`. Treat For Treat has a reusable `{{< treat-for-treat >}}` shortcode wrapping its form partial, embedded in both the experiment page and announcement post. See [its implementation notes](experiments/treat-for-treat/README.md) for the BlogExperiments Supabase backend and verification steps.
