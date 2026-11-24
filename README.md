# Key Shelf – Price Watch

A Firefox extension for comparing digital game-key prices and seller offers across five stores. Save searches, compare editions, and track price and stock changes. Your watchlist and backups are stored locally.

To try the source, visit `about:debugging#/runtime/this-firefox` in Firefox, select **Load Temporary Add-on**, and open `manifest.json` from this folder. Run `npm install` and `npm test` to run the tests.

Licensed under the [MIT License](LICENSE).

## Changes in 0.1.10

- All earlier dates now sit inside a single collapsed **Previous days** section, below today. The section shows total days and changes. Individual dates can still be expanded inside it. Today stays directly visible above the section regardless of sorting direction.
- Opening Previous days is retained during normal redraws in the same tab. Reloading starts it collapsed; a date rollover resets its collapsed state. If there are only older entries, No changes today appears above the section. Archived changes use the same grouping.

## Changes in 0.1.9

- Previous days in Recent changes and archived changes start collapsed automatically. Today starts expanded. Click a date to expand or collapse it; each date shows its number of changes. Days use Europe/Dublin.
- Manually opened days stay open during normal redraws in the current page. Reloading resets to today's expanded / earlier days collapsed. When the date changes, the old Today group collapses on the next redraw or when returning to the tab.

## Changes in 0.1.8

- Instant Gaming can begin reading when its search area is ready, without waiting for unrelated resources to finish loading the entire tab.
- Empty-search detection also recognises No results, No games found, 0 games and No matching products. Real product cards take priority over empty placeholders; a visible search loading indicator prevents an empty snapshot.
- A short settling window of about 2.8 seconds is retained for delayed results. Unrecognised/stuck search content uses roughly 8.4 seconds of polling instead of 21 seconds. Initial Instant Gaming navigation is capped at 15 seconds instead of 45 seconds. These are separate navigation and content limits; browser/tool overhead can add time.
- Ambiguous pages or timeouts remain failures and retain last known prices; only confirmed empty results count as successful empty searches.

## Changes in 0.1.7

- Settings now has **Check first page only (all stores)**, enabled by default on upgrade and new installation. The initially loaded results are read without clicking Next/Load more. Eneba/Gamivo seller pages are limited to currently discovered first-page products and their initially loaded seller offers. Known pages absent from those results are not revisited in this mode.
- Intentionally limited scans are labelled on the shelf and do not count as pagination failures or generate failure notifications. They never infer missing-offer stock loss. Unseen offers retain last-known prices and become stale when their source is refreshed incompletely. Explicit unavailable listings still update stock. Turn the setting off to collect all pages up to the configured limit.
- Recent changes and archived changes share a saved sort control: newest/oldest dates, biggest drop, lowest price, game A–Z or Z–A. Price/drop/name sorts apply within each day, keeping chronological day groups intact. Days use Europe/Dublin.
- Events matching the current lowest eligible price for their game, edition and product type have a green highlight and Current lowest badge. A prior price that is no longer the current lowest is not highlighted. Highlighting uses last-known eligible offer data; check the listing stale indicator when coverage is limited.

## Changes in 0.1.6

- Game templates in Add/Manage can be created, updated, deleted and set as the default. Template 1 automatically uses blank exclusions and blank regions for new games. Blank regions compare all regions, including Unknown. Templates save exclusions, regions, Xbox filtering, Keys/Accounts selection, primary/additional editions, enabled stores and the search suffix. They do not copy game-specific names, URLs or queries. Additional edition queries reuse the main query until edited. Applying a template explicitly replaces the editor's filter options; editing a game never applies one automatically.
- To make a template: choose the options below Game templates, enter its name, choose Default for new games if wanted, then Save as new. Update selected replaces that template. The last remaining template cannot be deleted. Backups include templates and the default selection.
- Product type filter now offers Keys, Accounts, or Keys and Accounts. Existing games migrate to Keys, so account rows are no longer added on discovery. Select Accounts explicitly when needed. Keys and Accounts remain separate comparisons. Cached account history is retained.
- Exclusions hide offers immediately, block new excluded offers from being stored and stop their seller-page visits. PC and (PC) are treated equivalently as whole title words, avoiding substring matches inside unrelated words. Cached excluded offers are hidden while their historical data is retained.
- More compact headers, statistics, table rows, controls, dialogs and recent changes.

## Changes in 0.1.5

- Gamivo SMART prices are red in individual listing cards, store price summaries and the overall cheapest-price summary. Regular prices keep their usual appearance; discovery-only search prices are not presented as confirmed SMART offers.
- Every product listing and seller offer has a separate **Price history** expander, beside **Listing details**. It shows all retained changes (up to 250), newest first, with date, raw store price and stock status, in a compact scrollable table. History is retained across updates and backups; it records changes and the initial baseline rather than repeating unchanged checks.
- New history records include the price basis, so recorded SMART entries stay red even if the current offer later uses regular prices. Older records keep their existing price and stock data and are labelled as previously recorded prices.

## Changes in 0.1.4

- Titles such as **Priest Simulator x Crime Simulator** are recognised as Bundles even without the word Bundle. Cross-title `x`, `×` and `+` separators are recognised before the platform suffix; Xbox Series X alone remains Standard.
- Matching accepts those separator variants while still requiring both game names, preventing standalone Priest Simulator or Crime Simulator results from entering that bundle.
- Cached product editions are recalculated on reload without losing their price history. New cross-title game names default to Bundles. Existing game edition selections remain yours: for this bundle, open **Manage**, select **Bundles** as the primary edition, save, then **Check game**.
- Matching listings from all regions remain recorded. The normal region comparison filter and unavailable-product skipping still apply.

## Changes in 0.1.3

- Compact listing cards show the title, price, region, seller and stock status. Expand **Details & history** for price history, price basis, timestamps and ignore controls.
- **Bundles** is available in the primary and additional edition selectors. Bundle titles are grouped independently, including bundles mentioning Deluxe.
- Account listings get separate edition rows with their own lowest prices, price changes and next-lowest stock alerts. Accounts cannot replace keys in comparisons.
- All required matching words must occur as whole words in the product title. Search query parameters cannot make unrelated products match. Unrelated results are discarded before storage or seller-page visits. Existing unrelated cached entries are cleaned up on reload while matching price histories remain intact.
- Result-page completeness still uses the retailer's raw card count, so filtering unrelated cards does not manufacture stock alerts or layout errors.

### Scan efficiency

Gameseal, Loaded and Instant Gaming prices are collected directly from search cards without opening each product. Eneba and Gamivo product pages expose the individual seller offers; those pages are still checked to detect any seller's price drop and stock changes, even if the headline minimum is unchanged. Each matching product URL is visited once per store; unavailable and unrelated products are skipped. Identical edition queries run once. Broad retailer searches can still require multiple results pages to ensure later matching products are not missed. Use more precise search words or custom filtered URLs to reduce that work; retain the shared base title in **Words every listing must contain**.

## Changes in 0.1.2

- New games start with one selected primary edition. Deluxe is no longer added automatically, even when a search returns Deluxe listings.
- **Track multiple editions** in Add/Manage enables additional edition rows. Add or remove Deluxe, Ultimate, Premium, Gold and other supported editions, and edit each edition's search query.
- Blank edition queries reuse the main query. Identical queries run once per store. Separate query results are combined before checking stock; a failed query retains prior offers rather than creating false stock alerts.
- Each query retains your custom store filters. Disabled stores remain disabled. Only selected editions enter comparisons, alerts and seller-page scans.
- Existing edition selections and price histories migrate intact. For a game with an unwanted Deluxe row, open **Manage**, untick **Track multiple editions**, and save. Old cached history is retained, while the inactive edition is no longer displayed or scanned.
- Gamivo's reader targets the All offers container directly, supports native/accessible supplier names and alternate price markup, and expands a lazy/collapsed offers section when its rows are missing. Regular and SMART prices stay separate; promoted rows are excluded.
- A continuing seller-read failure includes a link to its specific product page on the dashboard.

## Changes in 0.1.1

- Out-of-stock search listings no longer trigger seller-page visits. Historical products with no available sellers are also skipped. They stay recorded and the search can rediscover them if stock returns.
- Explicit product unavailability updates cached seller stock and preserves the cheapest-offer loss alert and next available price.
- Instant Gaming recognises both Standard and Deluxe result cards, including an alternate search container. A transient zero-result placeholder cannot override real result cards.
- Found-but-region-excluded results are identified clearly in the shelf instead of looking like missing results.
- Two quick toggles above the shelf: **Gameseal: use normal prices** and **Show lowest price regardless of region**. They are also in Settings.
- The all-regions toggle updates cached comparisons immediately and includes Unknown regions. Xbox key checks, ignored listings and currency matching still apply.
- Switching Gameseal prices resets only Gameseal's baseline. The next scan reads the selected price without generating artificial discount alerts.

## Update without losing your watchlist

Export a backup first. Stop any current scan, extract this build over the previous extension folder, then use **Reload** for Key Shelf in `about:debugging#/runtime/this-firefox`. Keep the same extension identifier; do not remove the old add-on first. Existing settings, listings and history migrate automatically. If your temporary add-on was already removed, load this version and restore your backup.

To show Instant Gaming in the cheapest-price comparison, enable **Show lowest price regardless of region**, or add **Unknown** to the game's region list. Its region remains visibly labelled Unknown; the tracker does not assume Global availability.

## Install

1. Extract this ZIP into a folder you will keep.
2. In Firefox open `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on…** and select the extracted **manifest.json**.
4. Click Key Shelf in the toolbar, then **Open your shelf**.
5. The Legacy of the Dark Knight example is already configured. Click **Check prices**.

This is an unsigned development build. Temporary add-ons are removed when Firefox closes. Export a backup before closing Firefox or removing it. A permanent install will need Mozilla signing.

## What is included

- Eneba, Gameseal, Gamivo, Loaded and Instant Gaming.
- A Game Shelf-style edition grid and eBay Watch-style search discovery and change history.
- One primary edition by default; optionally select multiple editions with their own rows and editable search queries.
- Search URLs generated from game words, with optional custom filtered URLs and per-store switches.
- Xbox Live filter for Eneba and Microsoft Store filter for Instant Gaming. Each listing is also checked for Xbox/Microsoft Store wording, with accounts, DLC and upgrade packs excluded from comparison.
- All discovered listings remembered, including seller offers, stock status, regions, excluded listings and price histories.
- Gameseal Seal Pass prices by default. A missing pass price is shown as unknown rather than silently switching to the regular price.
- Regular Gamivo seller prices by default; optional SMART prices. Search “from” prices do not enter Gamivo comparisons.
- Available Eneba seller-page scans enabled by default. Disable them for faster product-level tracking; Available Gamivo seller pages are read to resolve its subscription prices; unavailable products are retained without seller-page visits.
- Price-drop alerts, new-offer alerts only when cheaper than the previous lowest, and loss of the cheapest offer with the next available price/store/seller.
- Quiet first baseline and unchanged/increased prices. The current shelf still refreshes after each check.
- Complete pagination/load-more scans up to the page limit, progress, stop, per-game checks and retry of failed searches.
- Daily, twice-daily, weekly, twice-weekly, selected-days and manual schedules; Irish time; one missed scheduled scan caught up when Firefox starts.
- Notification toggles, adjustable minimum drop, colours, listing density, JSON restore/export and automatic dated backups.
- Optional fixed and percentage fees per store for estimated totals. No cashback deducted.

## Regions and currencies

With the all-regions toggle off, the example initially compares **Global and Europe** offers. All other regions remain visible in each expanded store but are excluded from lowest-price alerts until you add them under **Manage → Regions to compare**. Enable **Show lowest price regardless of region** above the shelf to compare **all regions** immediately without deleting the saved filters. Turn it off to restore those filters. Clearing the per-game field also compares all regions for that game. You can also ignore individual unwanted offers.

Instant Gaming search cards do not expose an activation region. They are labelled **Unknown**. Enable the all-regions toggle, add **Unknown** to the region list, or clear it to include those offers, and verify the activation restrictions on their product page before buying. Nothing is silently labelled Global.

Use the same currency in each store's Firefox settings. EUR is selected in Key Shelf by default. GBP and USD can also be selected. Other currencies stay visible and are not mixed into comparisons; no exchange-rate estimates are used in this first build.

## Stock confirmation

An explicitly sold-out listing or verified product page is unavailable immediately. A listing/seller that merely disappears needs **two complete successful snapshots of its source** before being considered unavailable. This is an observed availability change, not a guarantee about the seller's inventory.

Partial scans, a page limit, layout changes, page timeouts and website verification failures do not mark missing offers out of stock. Previously known offers are retained and marked stale. The next lowest offer shown may also be stale if its store could not be checked; confirm it on the site.

Changing currency, subscription-price options or seller-scan mode resets the relevant store baseline. New readings restore comparisons; the settings change itself does not manufacture a price drop.

## Prices and speed

Each selected edition can reuse the main search or use its own query. Identical queries run once per store; separate query results are combined into one store snapshot. Search pages are the discovery starting point. Seller scans add product-page visits because seller names and individual prices are not available on search pages. Only enabled editions cause seller-page visits; identical searches are reused within the same run. Each page is allowed to settle before prices are read.

The prices can exclude payment/service fees or tax. Enter known fees for an **estimated total**, and always check the actual checkout amount. The extension never adds items to a cart, makes purchases or accepts subscriptions. It clicks only pagination and seller “load more” controls.

Firefox must remain open for scheduled scans. Some stores may need the scan window in the foreground; the optional setting can interrupt your current window. Website verification blocks are reported for inspection and are not bypassed.

## Verification and limitations

39 automated tests cover alert logic, stock confirmation, failed/partial scans, currency separation, locale parsing, subscriptions, DOM readers, dashboard/popup rendering, installation state, background scan orchestration and notification routing. Store selectors were inspected on the live example pages, including Eneba seller offers and Gamivo regular versus SMART prices. The 0.1.2 Gamivo container/price logic was checked on the live Legacy of the Dark Knight Europe product page; another product or Firefox session can expose different markup. If one still fails, use the product link shown with its warning to identify the exact page. Gameseal pagination was inspected with a larger search.

The extension has **not been installed and exercised end to end in Firefox** here, and its visual layout has not been rendered in a local browser. Store layouts, signed-in account discounts and loading behaviour can differ. Use this as a first test build and check its first results against the sites before relying on scheduled alerts.

To run the source tests with Node.js 22 or newer: run `npm install`, then `npm test` from this folder. Runtime extension code has no dependencies.

## Data and permissions

Watchlists, prices, seller names, histories and preferences are stored in Firefox local storage. Backups are saved through Firefox Downloads. The extension accesses only its five listed stores during scans, using normal Firefox website sessions. It reads product/search content; it does not inspect browser passwords, export cookies or collect payment details. No analytics or developer server is used.

The optional Ko-fi support link opens only when clicked. Your watchlist is not sent to Ko-fi.

## Relationship to existing extensions

Key Shelf is a separate extension with a separate identifier and data store. It does not replace or modify Game Shelf or eBay Evening Watch. Its schedule implementation is adapted from eBay Evening Watch's existing local scheduling source, and its layout and workflow follow the two existing extensions.
