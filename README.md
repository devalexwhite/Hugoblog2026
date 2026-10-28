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

## Writing

```sh
hugo new content cycling/a-new-ride.md
hugo new content books/a-new-book.md
hugo new content games/a-new-game.md
hugo new content posts/a-new-note.md
```

Remove `draft: true` when ready. Posts without an explicit `url` use their section path. Migrated posts explicitly keep their original root-level paths. Optional front matter: `description`, `cover` (a local image path), `tags`, and `comments: true` to enable Pure Comments. Add images under `static/content/images/`; the theme generates card thumbnails and resizes large article images during the Hugo build while preserving originals.

The homepage includes all four post sections. Each section also has its own archive and RSS feed. Search runs locally in the browser against Hugo’s generated `index.json`. Color mode follows the system until the reader changes it, then saves their preference locally. The site remains readable without JavaScript.

## Migration

Migrated **25 publicly available posts, the About page, and 53 media files** from the public sitemap on October 28, 2026. The original two archive pages were checked against the sitemap. Post dates, titles, tags, body text, image captions, links, and original URL slugs are retained. About’s platform description now reflects Hugo and credits the previous platform. Search was rebuilt for Hugo; `/feed.xml` provides RSS and `/feed/` redirects to it.

- `content/`: editable Markdown, with JSON or YAML front matter.
- `themes/quiet-ink/`: custom layouts, CSS, browser scripts, and landscape illustration.
- `migration/manifest.json`: original URL and asset inventory.
- `migration/source/`: original public HTML snapshots for comparison.
- `scripts/migrate.cjs`: original import script; needs Node.js plus `cheerio` and `turndown`. Re-running overwrites migrated pages, including subsequent editorial changes.
- `scripts/audit.cjs`: dependency-free build audit of original URLs, assets, internal references, and search coverage. Run after a production build, rather than against Hugo server’s live-reload output.

Pure Comments keeps its existing embed endpoint and post slug identifiers; historical comment data remains on that external service. Actual comment loading and submission should be checked on the production domain, since the service may restrict local origins. No private drafts or server-side comment database were accessible through the public website.

One pre-existing broken reference in “From Omarchy to Pop_OS!” points to `https://thatalexguy.dev/i-dont-know-what-to-do-on-a-computer-anymore` (the original server returns 404). It is preserved as an absolute link; no replacement article has been invented.
