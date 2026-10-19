# Search updates · October 18, 2026

The search bar stays centered on the home page and moves into alignment with the results after a search. Results reserve their desktop space before an intelligent card arrives. Reduced-motion preferences disable the movement. The extra captions and eyebrows have been removed, and the summary is now called “Gatita’s Results.”

## Spelling

A background spelling check suggests common corrections and close matches from search evidence or autocomplete. It never silently changes a query. For example, searching `hillo` offers `Did you mean hello?`. Accepting the suggestion keeps a `Search instead for hillo` link. That link searches literal terms, and summaries, intelligent cards, and follow-up answers use the same literal result session. Correction state survives bookmarks and browser navigation.

Spelling checks skip quoted searches, URLs, operators, equations, numbers, and unsupported scripts. Ambiguous candidates are left alone. This is a conservative English correction system, not a complete multilingual dictionary. Failed checks do not interrupt web results.

## Appearance and news

Appearance settings include generated backdrops, locally stored images, blur, dimming, reading size, spacing, corners, and motion. Dimming defaults to 0% and only applies to an active backdrop; solid colors stay unchanged even with an older dimming preference saved. Uploaded images are resized locally and stored as blobs in IndexedDB; they are never uploaded to the search API. Storage failures fall back to the current session.

The home grid progressively loads recent stories from seven RSS sources. It stops when the available feed is exhausted rather than repeating stories. Scrolling requests one cached, source-linked briefing for that feed snapshot. The footer stays fixed on the home page. Searches with recency intent can show a horizontal news strip with relative publication times and absolute times on hover. Stable snapshot cursors prevent duplicates during a refresh, and the mobile strip stays within the viewport.

## Validation and deployment

Run `npm run test:gatita-search` from the backend workspace. It includes search routes, intelligent results, news pagination and summaries, appearance settings, spelling controls, literal-query isolation, and Markdown rendering. Browser checks cover the correction/original-query flow, navigation, search alignment, and the mobile carousel.

Deploy the frontend and backend together. New frontend modules are `appearance.js`, `news.js`, and `spelling.js`; new backend modules are `searchNews.js`, `searchNewsSummary.js`, and `searchSpelling.js`. They use the existing AI configuration. The spelling system itself does not call an AI model. These changes have been integrated locally; deployment is separate.
