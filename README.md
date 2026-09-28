# ASNK Trading — website redesign

A redesign of [asnktrading.com](https://asnktrading.com) by [Vexon Labs](https://perryop12.github.io/vexon-labs/work/asnk-trading/). The site is plain HTML, CSS and JavaScript, with no build step.

- `index.html`, `products.html`, `product.html?p=<slug>`, `about.html`, `contact.html`, `brands/*.html`
- Products live in `assets/data/products.js` (one entry per product). To add a product, add an entry and put its photo in `assets/img/products/`.
- Pages are marked `noindex`, with canonical links pointing to asnktrading.com, until the redesign replaces the live site.

Preview locally with `python3 -m http.server`, then open http://localhost:8000.
