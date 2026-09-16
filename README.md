# thecosmiclab.github.io

Source for the [COSMIC Lab](https://thecosmiclab.github.io) homepage. Built with
Jekyll and deployed by GitHub Actions.

## Editing content

Almost everything on the site is data, not markup. Each fact lives in one
place, and every page that shows it reads it from there.

| File | What it drives |
| --- | --- |
| `_config.yml` → `lab:` | PI details and links, office, email, recruiting banner, admissions link, email subject tag, feature flags |
| `_data/news.yml` | News on the homepage. Newest first; five show, the rest sit behind "Show earlier items". Empty hides the section |
| `_data/thrusts.yml` | Research directions: Home cards, Research page sections and tabs, the Publications Area filter |
| `_data/publications.yml` | Publications page, per-entry and bulk BibTeX, and each direction's "Selected work" |
| `_data/people.yml` | Member groups and alumni. Empty groups do not render |
| `_data/faq.yml` | The FAQ on Join |
| `_data/projects.yml` | The Projects page (off by default) |

Page intros (`lede`) and the homepage intro (`intro_body`) are in each page's
front matter.

### Publications

`_data/publications.yml` is in display order, newest first. Put a new entry at
the top; nothing re-sorts it. Papers and patents are interleaved by date, and
entries from the same venue and year are ordered alphabetically by title.

- `thrust:` lists the directions an entry belongs to. Values must match a
  `key:` in `_data/thrusts.yml`. This drives the Area filter.
- `selected:` names the one direction whose "Selected work" features the entry.
  It must be one of the entry's own `thrust` values, and no entry is featured
  under more than one direction. Leave it empty for most entries.
- `type:` (conference, journal, chapter, patent, …) builds the Type filter.
- Mark the PI with `me: true` and the name is bolded.
- `bibtex:` is handed out verbatim. Papers use DBLP's record with readable
  citation keys (`firstauthor` + year + short name).

### Research directions

Each entry in `_data/thrusts.yml` has a `title` (section heading), `nav_label`
(tab and filter chip), `desc` (the one line on Home), `lead` and `p1` (the
section prose), and optionally `ongoing` (a list of in-progress items).

- `figure:` is a PNG under `assets/img/research/`. Leave it empty and no figure
  frame is drawn. `diagram` is the figure's alt text.
- `on_research: false` makes an entry filter-only: it appears as an Area chip on
  Publications but gets no section on Research (used for AI Algorithm).

### Navigation

There is no nav file. Each page declares its own `nav_label` and `nav_order` in
front matter, so its URL, label, position and feature flag stay together.

### Feature flags

Under `lab:` in `_config.yml`:

- `show_join`: the Join tab and every site-wide link to it.
- `show_projects`: the Projects tab. Off by default. When turning it on, also
  remove `sitemap: false` from `projects.html`.
- `recruiting_open`: the Join banner, its button, and the footer line.

A page whose flag is off still builds, but redirects to the homepage and is
marked not to be indexed.

### Photos and figures

- Portraits: `assets/img/people/`, set `photo:` to the path. Cropped to 4:5.
  Without a photo the frame shows initials. About 800px wide is plenty.
- Research figures: PNG in `assets/img/research/`, about 1600px wide. Export
  the shapes from PowerPoint rather than the whole slide. For a PDF,
  `./tools/figures.sh` renders it to PNG.

Links to other sites open in a new tab automatically.

### Link preview card

The image shown when a link is pasted into KakaoTalk, Slack, X and so on is
`assets/img/og-image.png`. Its source is `tools/og-image.html`; after editing
it, run `./tools/og-image.sh` (uses the installed Chrome and needs a network
connection for the font).

## Running it locally

Needs Ruby 3 or newer. macOS ships 2.6, which is too old for Jekyll 4, so
`brew install ruby` first.

```
bundle install
bundle exec jekyll serve --livereload
```

Then open http://127.0.0.1:4000. Changes to `_data/` and pages reload on their
own; changes to `_config.yml` need the server restarted.

## Deployment

Pushing to `main` runs `.github/workflows/pages.yml`, which builds the site and
publishes it to GitHub Pages.

**One-time setup:** in the repository's Settings → Pages, set *Source* to
**GitHub Actions**. Without that the workflow builds but nothing is published.

## Design conventions

The layout follows a design handoff kept locally in `_design-ref/` (not in the
repository). Worth keeping when adding anything new:

- No CSS borders. Every edge is an inner shadow, so it never shifts layout.
- Black marks the current selection, blue marks an action. The brand navy is
  for identity only, never for links, buttons or focus rings.
- Hover and press paint a light scrim over the surface instead of changing
  colour.
- Body copy is weight 500, not 400.
- Visible copy avoids em and en dashes.
