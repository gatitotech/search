# Intelligent results

Gatita Search shows a compact answer beside desktop web results and above results on smaller screens. Cards load separately from the AI overview and never block normal results. No new API keys or packages are required; topic synthesis uses the backend's existing `toolcall` model configuration.

## Supported searches

- People: a short biography, supported facts, and up to three images from the matching Wikipedia article.
- Movies, TV shows, books, music, and video games: a quick description and useful facts available in the sources. The prompt avoids story spoilers.
- Places and organizations: basic identity and sourced facts.
- Animals, plants, food, science, history, technology, art, sports, space, language, and definitions: short factual answers when the evidence supports them.
- Arithmetic: parentheses, decimals, percentages, powers, and standard order of operations.
- Algebra: one-variable linear and quadratic equations, including brackets, with visible steps. Quadratics report real solutions. Variable denominators, multiple variables, calculus, and degrees above two are outside the local solver.
- Unit conversions: length, mass, volume, time, speed, area, and temperature. Volume uses explicitly named US cups/gallons to avoid ambiguous regional measures. Currency and live market rates are outside the local converter.

Examples: `Albert Einstein`, `Dune movie`, `The Hobbit book`, `photosynthesis`, `2(x + 1) = 8`, `x² - 5x + 6 = 0`, `5 miles to km`, and `32 fahrenheit to celsius`.

## Official recognition

`Gatito Labs` and `gatito.tech` show a curated organization profile linking to <https://gatito.tech/>. `Gatita`, `Gatita AI`, `Gatita Ask`, and `gatita.tech` show the Gatita AI profile linking to <https://gatita.tech/>. These profiles are deliberately independent of search ranking and model availability. Their descriptions were checked against the official websites on October 16, 2026. Update `recognizeOfficial` in `src/utils/searchIntelligence.js` when the published product information changes.

## Evidence and failure behavior

Each generated answer and fact requires valid numbered references to supplied evidence. The backend supplies search snippets and, when an article clearly matches, the Wikipedia introduction. Generated URLs and image URLs are never accepted from the model. The image gallery uses MediaWiki article files and links to each image's source, author, and license. Image availability varies by subject.

Ambiguous or insufficient answers stay hidden. A model infrastructure failure can fall back to a retrieved Wikipedia introduction. Local calculations and official profiles work even when web search fails. Numbers use JavaScript floating-point arithmetic and are displayed to 12 significant digits; extreme or unsupported expressions are rejected. Source links explain the math/conversion method, while the numerical result is calculated locally.

`GET /search/api/intelligence?q=...` uses the existing legal-version requirement and search session cache. Topic cards require the first results page; local cards do not. Concurrent topic requests share one build, including cached empty answers. API failures leave web results available, and the frontend discards responses from older queries.

## Validation and deployment

Run `npm run test:gatita-search` from the backend workspace. This covers existing search behavior, calculation edge cases, official recognition, article/image safety, citation validation, graceful fallback, route authorization, caching, and Markdown rendering.

Deploy both the backend (`src/routes/gatitaSearchRoutes.js`, `src/utils/searchIntelligence.js`, and `src/utils/searchCalculations.js`) and the frontend (`index.html`, `app.js`, `design.css`, and `intelligence.js`). The HTML versions the updated assets. A frontend-only deployment cannot provide the new endpoint. Existing local frontend changes are preserved.
