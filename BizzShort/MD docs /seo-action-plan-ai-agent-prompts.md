# ZPlusNews.com — Phased SEO Action Plan + AI Agent Prompts
*Goal: India's top-list news site → then global*

How to use this file: each phase has (a) what to fix and why, (b) a ready-to-paste prompt block for your AI agent (Claude Code / dev agent) to execute against your actual codebase/CMS. Do the phases roughly in order — later phases (backlinks, News inclusion) won't work well until the earlier technical/trust foundation is solid.

---

## PHASE 0 — Baseline Audit (Week 1)
**Why:** You can't fix what you haven't measured. Before writing code, get a real data snapshot.

**Tasks**
- Verify/claim Google Search Console (domain property) and Bing Webmaster Tools
- Pull Coverage report, Core Web Vitals, and current indexed-page count
- Export current sitemap.xml and check for errors
- Crawl the site with Screaming Frog / Sitebulb (or agent-built crawler) to list every page's `<title>` and `<meta description>`
- Check current backlink count (Ahrefs/Search Console "Links" report)

**Prompt for your AI agent:**
```
Act as a technical SEO auditor. Crawl the site at https://www.zplusenews.com
(or its sitemap.xml) and produce a CSV/report with, for every URL:
- title tag
- meta description
- H1
- canonical tag
- whether NewsArticle/Organization schema (JSON-LD) is present
- HTTP status code
- word count of main content
Flag any URL whose meta description is byte-for-byte identical to another
URL's meta description — this is the top priority to fix.
Also check /robots.txt and /sitemap.xml for errors, and list all pages
currently NOT in the sitemap but returning 200.
```

---

## PHASE 1 — Fix On-Page Technical Foundation (Weeks 1–3)
**Why:** The duplicate meta description problem (Sports page saying "tech news, startups") is actively hurting relevance signals right now — this is the cheapest, fastest win.

**Tasks**
- Write unique, keyword-relevant `<title>` and `<meta description>` for every template (category, tag, article) — never reuse across pages
- Add unique H1 per page matching actual topic
- Implement canonical tags (especially for Hindi/English duplicate or near-duplicate articles)
- Add `NewsArticle` JSON-LD schema to every article (headline, datePublished, dateModified, author, publisher logo, image)
- Add `Organization` schema to homepage (name, logo, sameAs social links)
- Add `BreadcrumbList` schema to category/article pages
- Fix internal linking so category pages link to their real recent articles, not generic filler

**Prompt for your AI agent:**
```
Audit the CMS templates for zplusenews.com. For each page type
(homepage, category page, article page), do the following:

1. Replace any shared/duplicated <meta name="description"> content with a
   dynamic description generated from that page's actual topic/content
   (max 155 characters, no boilerplate reused across templates).
2. Ensure <title> tags are unique per page and follow the pattern:
   "{Article Headline} | ZPlus News" for articles, and
   "{Category Name} News - Latest {Category} Updates | ZPlus News" for categories.
3. Inject valid schema.org JSON-LD:
   - NewsArticle on every article page (headline, image, datePublished,
     dateModified, author.name, publisher.name, publisher.logo)
   - Organization on the homepage (name, url, logo, sameAs: [social links])
   - BreadcrumbList on category and article pages
4. Add rel="canonical" to every page pointing to its own clean URL,
   and handle Hindi/English article pairs with hreflang tags if they are
   translations of each other.
5. Output a diff/PR of all template changes before applying them.
```

---

## PHASE 2 — E-E-A-T & Trust Signals (Weeks 2–4, parallel with Phase 1)
**Why:** Google ranks news content heavily on Experience, Expertise, Authoritativeness, Trust. Right now there's no visible author, no editorial policy, no ownership transparency — all of which large competitors have in spades.

**Tasks**
- Create a real **About Us** page: who owns/runs ZPlus News, mission, location, contact
- Create **individual author bio pages** with name, photo, credentials, and a link from every article byline
- Add an **Editorial Policy / Corrections Policy** page
- Add a clear **Contact page** with a real email/phone, and physical address if applicable
- Add **Privacy Policy** and **Terms of Service** (required for AdSense/News approval too)
- Ensure HTTPS, no mixed content, no intrusive ad interstitials on article pages

**Prompt for your AI agent:**
```
Create the following new pages/templates for zplusenews.com, following
Google's News/E-E-A-T guidelines:
1. /about-us — company description, mission, founding info, ownership,
   physical location.
2. /author/{slug} — dynamic author page template pulling name, bio,
   photo, and a list of their published articles. Every article byline
   must link to this page.
3. /editorial-policy — describes sourcing standards, correction process,
   fact-checking approach.
4. /contact-us — real contact form + email + (if available) phone/address.
5. /privacy-policy and /terms-of-service — standard legal templates,
   customized with ZPlus News's actual entity name.
Add Person schema to author pages and link them via "author" field in
each article's NewsArticle JSON-LD.
```

---

## PHASE 3 — Google News & Discover Enrollment (Weeks 3–6)
**Why:** This is likely the single highest-leverage move. Competing in plain web search against Times Now/India Today is a losing game for a new domain; Google News/Discover is a separate, more winnable distribution channel with its own carousel and ranking rules.

**Tasks**
- Ensure Phases 1 & 2 are complete (Google requires clean schema, clear authorship, and policy pages before approval)
- Submit to **Google Publisher Center**
- Submit a **News sitemap** (separate from the regular sitemap, updated within minutes of publishing)
- Optimize for **Google Discover**: strong featured images (min 1200px wide), compelling but non-clickbait headlines, fast mobile load
- Set up **AMP or ensure Core Web Vitals pass** on mobile for article pages (mobile-first indexing)

**Prompt for your AI agent:**
```
1. Generate a Google News-compliant sitemap (news-sitemap.xml) that lists
   only articles published in the last 2 days, with <news:publication>,
   <news:publication_date>, and <news:title> tags, and submit instructions
   for me to add it in Search Console.
2. Audit all article pages for Google Discover readiness: confirm each
   has a high-resolution lead image (>=1200px wide) with proper
   max-image-preview:large meta robots tag, and that headlines are
   descriptive (not clickbait per Google's policies).
3. Run PageSpeed Insights / Core Web Vitals checks on the top 20
   article URLs (mobile) and list any LCP, CLS, or INP failures with
   fixes (image compression, lazy loading, removing render-blocking JS).
```

---

## PHASE 4 — Topical Authority & Content Strategy (Weeks 4–10, ongoing)
**Why:** Once technically sound, you need Google to see you as a reliable, consistent source on specific beats — not a generic aggregator of everything.

**Tasks**
- Pick 2–4 core beats to dominate first (e.g., "Uttar Pradesh/regional politics," "national politics," "business/economy") rather than spreading thin across tech+sports+health+national with equal effort
- Publish consistently (daily) on those beats with original reporting/analysis, not just wire rewrites
- Build **topic hub pages** that interlink all articles on a theme (e.g., an election-tracker hub linking every related article)
- Add FAQ/explainer content for evergreen search queries in your niche (schema: `FAQPage`)

**Prompt for your AI agent:**
```
Analyze the last 90 days of published articles on zplusenews.com and
categorize them by topic/beat. Identify the 3 beats with the most
consistent publishing volume. For those 3 beats, generate:
1. A "hub page" template that automatically lists and interlinks all
   articles tagged to that beat, ordered by recency.
2. Internal linking suggestions: for each of the last 20 articles in
   that beat, suggest 3 other same-beat articles it should link to.
3. A content calendar template encouraging daily publishing cadence
   on these 3 priority beats.
```

---

## PHASE 5 — Backlinks & Off-Site Authority (Weeks 6–16, ongoing)
**Why:** Domain authority is still the strongest predictor of ranking for competitive queries. Zero backlinks = Google has no external validation that anyone trusts you.

**Tasks**
- Get listed in Indian news-aggregator directories and news-app feeds
- Pitch original/exclusive stories to get picked up (and linked back) by bigger outlets
- Guest contributions / press-release syndication with a link back
- Build out real social profiles (currently ~2.3K Instagram followers) with consistent posting driving traffic and social signals
- Digital PR: HARO-style journalist requests, expert quote contributions

**Prompt for your AI agent:**
```
Draft an outreach tracking sheet (CSV) for backlink acquisition:
columns for target site, contact email, pitch angle, status, link
acquired (Y/N), date. Pre-fill 20 realistic Indian news
aggregators/directories and regional news blogs relevant to ZPlus
News's core beats as starting outreach targets. Also draft 3 reusable
outreach email templates (exclusive story pitch, guest contribution
pitch, correction/fact source pitch).
```

---

## PHASE 6 — Brand & Entity Building (Weeks 8–20, ongoing)
**Why:** This is what fixes the Image-1 problem — Google not recognizing "zplusenews" as a brand at all.

**Tasks**
- Create/claim a **Wikidata** entry once notable enough (or a well-sourced Wikipedia draft, if genuinely notable)
- Ensure `Organization` schema + `sameAs` links to every real social profile (Instagram, YouTube, X/Twitter, Facebook, LinkedIn) are consistent across ALL platforms (same name, same logo, same description — NAP consistency)
- Get business listed in Google Business Profile if there's a physical office
- Encourage direct/branded searches through consistent, repeatable branding in videos, social captions, and offline material ("Search 'ZPlus News' for more")

**Prompt for your AI agent:**
```
Generate a brand-consistency checklist and script that checks whether
"ZPlus News" — name, logo, and one-line description — is presented
identically across: website footer, Instagram bio, YouTube about page,
Facebook page, and Google Business Profile (if applicable). Flag any
mismatches. Also generate the Organization JSON-LD block with a
complete "sameAs" array of all verified social profile URLs.
```

---

## PHASE 7 — Scale Nationally, Then Globally (Month 5+)
**Why:** Once Indian rankings, News inclusion, and backlink profile are solid, expand deliberately rather than diluting effort.

**Tasks**
- Only after Phase 3–5 show measurable traction (organic traffic growth, Discover impressions, News Publisher Center approval): expand language editions or regional editions (state-specific hubs) inside India first
- Then consider English-first global expansion with a distinct international content strategy (avoid diluting the India-focused domain authority — consider a subdomain or separate international-focused content silo with its own hub structure)
- Track rankings/traffic monthly against a fixed KPI dashboard, not sporadically

**Prompt for your AI agent:**
```
Build a monthly SEO KPI dashboard (Google Sheets/Looker Studio spec)
tracking: organic sessions, Google News Publisher Center approval
status, Discover impressions, referring domains count, top 20 keyword
rankings (India), and Core Web Vitals pass rate. Alert me if any metric
drops >15% month over month.
```

---

## Priority Order Cheat Sheet
1. Phase 1 (on-page/meta fixes) — do this **immediately**, it's free and fast
2. Phase 2 (E-E-A-T pages) — required before Phase 3 will succeed
3. Phase 3 (Google News enrollment) — highest leverage single move
4. Phase 4 (topical focus) — stop spreading thin across every category
5. Phase 5 & 6 (backlinks + brand entity) — long game, start early, compounds over months
6. Phase 7 (scale) — only after the above show real traction
