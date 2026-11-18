# Project page: Characterizing Age-Conditioned Affective Reasoning in Vision-Language Models

Live at **https://shahriyar-zaman.github.io/age-conditioned-emotion-reasoning/**
(short link: https://shahriyar-zaman.github.io/age-affect-vlm/, which redirects here).

Static site, no build step. GitHub Pages serves `index.html` from the `main` branch.

```
index.html               the page
static/css/style.css     styles; colour tokens for light and dark at the top
static/js/data.js        every number shown in the interactive charts, copied from the paper's tables
static/js/main.js        theme toggle, charts, persona switch, figure zoom, BibTeX copy
static/images/           figures rendered from the paper; oasis/ holds the three example images
```

## Light / dark

Light is the default. The moon/sun button in the top bar switches theme and remembers the choice.
`?theme=dark` in the URL forces dark (handy for screenshots).

## Things to fill in later

- **Paper / arXiv / Code buttons**: in `index.html`, search for `pill soon`. Replace
  `<span class="pill soon" ...> ... </span>` with `<a class="pill" href="URL" target="_blank" rel="noopener"> ... </a>`
  and delete the `<small>soon</small>`.
- **Venue badge and BibTeX**: after the decision, change the `Preprint · under review` badge and the `@misc` entry.

## Preview locally

```
python -m http.server 8000
# open http://localhost:8000
```

Fonts (Inter, Source Serif 4, JetBrains Mono) load from Google Fonts; equations use MathJax 3.2.2 from jsDelivr.
OASIS images: Kurdi, Lozano & Banaji (2017), https://doi.org/10.3758/s13428-016-0715-3.
