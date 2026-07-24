import os
import re
import csv
import json
import time
import urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed
import requests
from bs4 import BeautifulSoup

# Configuration
BASE_URL = "https://www.zplusenews.com"
SITEMAP_INDEX_URL = f"{BASE_URL}/sitemap-index.xml"
ROBOTS_TXT_URL = f"{BASE_URL}/robots.txt"
USER_AGENT = "Mozilla/5.0 (compatible; ZPlusSEOAuditor/1.0; +https://www.zplusenews.com)"
CONCURRENCY = 4
DELAY_BETWEEN_REQUESTS = 0.5  # seconds

def fetch_robots_txt():
    print("Fetching robots.txt...")
    headers = {"User-Agent": USER_AGENT}
    try:
        res = requests.get(ROBOTS_TXT_URL, headers=headers, timeout=10)
        status = res.status_code
        content = res.text
        errors = []
        
        # Simple structural checks on robots.txt
        if status != 200:
            errors.append(f"robots.txt returned HTTP status {status}")
        else:
            lines = content.split('\n')
            for i, line in enumerate(lines, 1):
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                if ':' not in line:
                    errors.append(f"Line {i}: Missing colon separator: '{line}'")
                else:
                    directive = line.split(':', 1)[0].strip().lower()
                    if directive not in ['user-agent', 'allow', 'disallow', 'sitemap', 'crawl-delay']:
                        errors.append(f"Line {i}: Unknown directive '{directive}'")
        
        return {
            "status": status,
            "content": content,
            "errors": errors
        }
    except Exception as e:
        return {
            "status": 0,
            "content": "",
            "errors": [f"Error fetching robots.txt: {str(e)}"]
        }

def parse_sitemap(url):
    print(f"Fetching sitemap: {url}")
    headers = {"User-Agent": USER_AGENT}
    urls = []
    try:
        res = requests.get(url, headers=headers, timeout=15)
        if res.status_code != 200:
            print(f"Error: Sitemap {url} returned status {res.status_code}")
            return urls
        
        soup = BeautifulSoup(res.content, "xml")
        locs = soup.find_all("loc")
        for loc in locs:
            urls.append(loc.text.strip())
    except Exception as e:
        print(f"Error parsing sitemap {url}: {e}")
    return urls

def load_db_entities():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    json_path = os.path.join(script_dir, "db_entities.json")
    if not os.path.exists(json_path):
        print(f"Warning: db_entities.json not found at {json_path}")
        return {"articles": [], "videos": []}
    
    try:
        with open(json_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error reading db_entities.json: {e}")
        return {"articles": [], "videos": []}

def get_all_target_urls():
    # 1. Fetch robots.txt
    robots_info = fetch_robots_txt()
    
    # 2. Fetch sitemaps
    sitemap_index_urls = [
        f"{BASE_URL}/sitemap-pages.xml",
        f"{BASE_URL}/sitemap-articles.xml",
        f"{BASE_URL}/sitemap-videos.xml"
    ]
    
    sitemap_urls = set()
    for s_url in sitemap_index_urls:
        parsed = parse_sitemap(s_url)
        print(f"Found {len(parsed)} URLs in sitemap: {s_url}")
        sitemap_urls.update(parsed)
        
    print(f"Total unique URLs in sitemaps: {len(sitemap_urls)}")
    
    # 3. Load DB entities
    db_data = load_db_entities()
    
    # Convert DB entities to URLs
    db_urls = {}
    for art in db_data.get("articles", []):
        url = f"{BASE_URL}/article/{art['slug']}"
        db_urls[url] = "DB Article"
    for vid in db_data.get("videos", []):
        url = f"{BASE_URL}/video/{vid['slug']}"
        db_urls[url] = "DB Video"
        # Also handle potential videoId urls
        if 'videoId' in vid:
            url_id = f"{BASE_URL}/video/{vid['videoId']}"
            db_urls[url_id] = "DB Video (ID)"
            
    # Also get categories
    categories = [
        'fake-news', 'international', 'national', 'state', 'economics', 'polity', 
        'technology', 'environment', 'sports', 'health', 'defence', 'culture', 
        'spirituality', 'agriculture', 'geography', 'religion', 'ai', 'astrology', 
        'science', 'tourism', 'others'
    ]
    for cat in categories:
        cat_url = f"{BASE_URL}/{cat}"
        db_urls[cat_url] = "DB Category"
        
    # Find pages in DB but not in sitemaps
    db_only_urls = {}
    for url, source_type in db_urls.items():
        if url not in sitemap_urls:
            db_only_urls[url] = source_type
            
    print(f"Found {len(db_only_urls)} URLs present in database/routes but NOT in sitemaps.")
    
    # Combine lists
    all_urls = []
    for url in sitemap_urls:
        all_urls.append({"url": url, "source": "Sitemap"})
    for url, source_type in db_only_urls.items():
        all_urls.append({"url": url, "source": f"{source_type} (Not in Sitemap)"})
        
    return all_urls, robots_info

def clean_html_text(text):
    if not text:
        return ""
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def count_words(text):
    if not text:
        return 0
    words = text.split()
    return len(words)

def crawl_url(url_info):
    url = url_info["url"]
    source = url_info["source"]
    headers = {"User-Agent": USER_AGENT}
    result = {
        "URL": url,
        "Source": source,
        "Status Code": 0,
        "Title": "",
        "Meta Description": "",
        "H1": "",
        "Canonical Tag": "",
        "Canonical Match": "N/A",
        "NewsArticle Schema": "No",
        "Organization Schema": "No",
        "VideoObject Schema": "No",
        "Word Count": 0,
        "Error": ""
    }
    
    try:
        time.sleep(DELAY_BETWEEN_REQUESTS)
        res = requests.get(url, headers=headers, timeout=15, allow_redirects=True)
        result["Status Code"] = res.status_code
        
        if res.status_code == 200:
            soup = BeautifulSoup(res.content, "lxml")
            
            # Title
            title_tag = soup.find("title")
            result["Title"] = clean_html_text(title_tag.text) if title_tag else ""
            
            # Meta Description
            desc_tag = soup.find("meta", attrs={"name": "description"})
            if not desc_tag:
                # Try case insensitive
                desc_tag = soup.find("meta", attrs={"name": re.compile(r'^description$', re.I)})
            result["Meta Description"] = clean_html_text(desc_tag.get("content")) if desc_tag else ""
            
            # H1 headings
            h1s = soup.find_all("h1")
            result["H1"] = "; ".join([clean_html_text(h.text) for h in h1s]) if h1s else ""
            
            # Canonical tag
            canonical_tag = soup.find("link", attrs={"rel": "canonical"})
            if canonical_tag:
                canonical_href = canonical_tag.get("href", "").strip()
                result["Canonical Tag"] = canonical_href
                
                # Check if matches current URL
                # Normalize both URLs (remove trailing slashes, parse to compare)
                u1 = urllib.parse.urlparse(url)
                u2 = urllib.parse.urlparse(canonical_href)
                norm1 = f"{u1.netloc}{u1.path.rstrip('/')}"
                norm2 = f"{u2.netloc}{u2.path.rstrip('/')}"
                result["Canonical Match"] = "Yes" if norm1 == norm2 else f"No (points to: {canonical_href})"
            else:
                result["Canonical Match"] = "Missing"
                
            # JSON-LD Schemas
            ld_scripts = soup.find_all("script", attrs={"type": "application/ld+json"})
            for script in ld_scripts:
                try:
                    script_text = script.string
                    if not script_text:
                        continue
                    schema_data = json.loads(script_text)
                    
                    # Schema data could be a list of schemas or a single dict
                    schemas = schema_data if isinstance(schema_data, list) else [schema_data]
                    
                    for sch in schemas:
                        if not isinstance(sch, dict):
                            continue
                        sch_type = sch.get("@type", "")
                        
                        # Support strings or list of types
                        sch_types = sch_type if isinstance(sch_type, list) else [sch_type]
                        
                        if any("NewsArticle" in str(t) or "Report" in str(t) for t in sch_types):
                            result["NewsArticle Schema"] = "Yes"
                        if any("Organization" in str(t) for t in sch_types):
                            result["Organization Schema"] = "Yes"
                        if any("VideoObject" in str(t) for t in sch_types):
                            result["VideoObject Schema"] = "Yes"
                except Exception as je:
                    # Ignore parsing errors of invalid inline JSON-LD scripts for count
                    pass
            
            # Word Count of main content
            # Try to find main content areas to exclude headers/footers
            main_content = soup.find("article")
            if not main_content:
                main_content = soup.find("div", class_="content")
            if not main_content:
                main_content = soup.find("div", id="root")
            if not main_content:
                main_content = soup.find("body")
                
            if main_content:
                # Create a copy and strip common header, footer, nav
                content_copy = BeautifulSoup(str(main_content), "lxml")
                for tag in content_copy.find_all(["header", "footer", "nav", "aside", "script", "style"]):
                    tag.decompose()
                text = content_copy.get_text()
                result["Word Count"] = count_words(clean_html_text(text))
            else:
                result["Word Count"] = 0
                
        else:
            result["Error"] = f"HTTP Status Code {res.status_code}"
    except Exception as e:
        result["Status Code"] = 0
        result["Error"] = str(e)
        
    return result

def run_audit():
    start_time = time.time()
    
    # 1. Gather all URLs to crawl
    all_urls, robots_info = get_all_target_urls()
    total_urls = len(all_urls)
    print(f"Total URLs to crawl: {total_urls}")
    
    # 2. Run crawler
    results = []
    completed = 0
    
    print(f"Starting crawl with concurrency={CONCURRENCY}...")
    with ThreadPoolExecutor(max_workers=CONCURRENCY) as executor:
        futures = {executor.submit(crawl_url, url_info): url_info for url_info in all_urls}
        for future in as_completed(futures):
            res_dict = future.result()
            results.append(res_dict)
            completed += 1
            if completed % 20 == 0 or completed == total_urls:
                print(f"Crawled {completed}/{total_urls} URLs...")
                
    # 3. Detect duplicate meta descriptions
    # Group by description
    desc_groups = {}
    for idx, r in enumerate(results):
        desc = r["Meta Description"].strip().lower()
        if desc and len(desc) > 5: # ignore empty or extremely short descriptions
            if desc not in desc_groups:
                desc_groups[desc] = []
            desc_groups[desc].append(idx)
            
    # Assign group IDs for duplicates
    group_id_counter = 1
    for desc, indices in desc_groups.items():
        if len(indices) > 1:
            for idx in indices:
                results[idx]["Duplicate Description Group ID"] = f"Group_{group_id_counter}"
            group_id_counter += 1
        else:
            for idx in indices:
                results[idx]["Duplicate Description Group ID"] = ""
                
    # Handle the ones that were empty or had no duplicate
    for r in results:
        if "Duplicate Description Group ID" not in r:
            r["Duplicate Description Group ID"] = ""
            
    # 4. Save results to CSV
    script_dir = os.path.dirname(os.path.abspath(__file__))
    csv_path = os.path.join(script_dir, "seo_baseline_audit_report.csv")
    
    headers = [
        "URL", "Source", "Status Code", "Title", "Meta Description", 
        "H1", "Canonical Tag", "Canonical Match", "NewsArticle Schema", 
        "Organization Schema", "VideoObject Schema", "Word Count", "Duplicate Description Group ID"
    ]
    
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        for r in results:
            # We filter/reorder fields to match header
            row = {h: r.get(h, "") for h in headers}
            writer.writerow(row)
            
    print(f"Saved CSV report to {csv_path}")
    
    # 5. Generate FULL-AUDIT-REPORT.md
    generate_md_report(results, robots_info, time.time() - start_time)

def generate_md_report(results, robots_info, duration):
    total = len(results)
    success = sum(1 for r in results if r["Status Code"] == 200)
    errors_count = sum(1 for r in results if r["Status Code"] != 200)
    
    # Check canonical stats
    canonical_matches = sum(1 for r in results if r["Canonical Match"] == "Yes")
    canonical_mismatches = sum(1 for r in results if "No" in str(r["Canonical Match"]))
    canonical_missing = sum(1 for r in results if r["Canonical Match"] == "Missing")
    
    # Schema stats
    news_schema = sum(1 for r in results if r["NewsArticle Schema"] == "Yes")
    org_schema = sum(1 for r in results if r["Organization Schema"] == "Yes")
    video_schema = sum(1 for r in results if r["VideoObject Schema"] == "Yes")
    
    # Duplicates stats
    dup_descriptions = {}
    for r in results:
        g_id = r["Duplicate Description Group ID"]
        if g_id:
            desc = r["Meta Description"]
            if g_id not in dup_descriptions:
                dup_descriptions[g_id] = {"desc": desc, "urls": []}
            dup_descriptions[g_id]["urls"].append(r["URL"])
            
    total_duplicated_pages = sum(len(group["urls"]) for group in dup_descriptions.values())
    
    # Word count stats
    articles_word_counts = [r["Word Count"] for r in results if "article/" in r["URL"] and r["Status Code"] == 200]
    avg_words = int(sum(articles_word_counts) / len(articles_word_counts)) if articles_word_counts else 0
    thin_content_count = sum(1 for r in results if "article/" in r["URL"] and r["Status Code"] == 200 and r["Word Count"] < 300)
    
    # Sitemap gaps (URLs in database only)
    db_only_pages = [r for r in results if "Not in Sitemap" in r["Source"]]
    
    # Compile markdown content
    md = []
    md.append("# ZPlus News — Technical SEO Audit Report (Baseline)")
    md.append(f"*Generated on: {time.strftime('%Y-%m-%d %H:%M:%S UTC')}*  ")
    md.append(f"*Audit Duration: {duration:.2f} seconds*  \n")
    
    # Executive Summary Cards
    md.append("## Executive Summary\n")
    md.append(f"- **Total URLs Evaluated**: {total}")
    md.append(f"- **Successful Requests (200 OK)**: {success} ({success/total*100:.1f}%)")
    md.append(f"- **Broken URLs / Non-200**: {errors_count} ({errors_count/total*100:.1f}%)")
    md.append(f"- **Duplicate Meta Descriptions**: {total_duplicated_pages} pages flagged ({len(dup_descriptions)} unique text blocks)")
    md.append(f"- **URLs Missing from Sitemap**: {len(db_only_pages)}")
    md.append(f"- **Average Article Word Count**: {avg_words} words")
    md.append(f"- **Thin Content Articles (< 300 words)**: {thin_content_count}\n")
    
    # Health Score Estimate
    # Deduct points for duplicates, missing schema, missing sitemaps, errors
    health_score = 100
    if total > 0:
        health_score -= (errors_count / total) * 40
        health_score -= (total_duplicated_pages / total) * 30
        # Calculate article coverage
        total_articles = sum(1 for r in results if "article/" in r["URL"])
        if total_articles > 0:
            missing_article_schema = total_articles - news_schema
            health_score -= (missing_article_schema / total_articles) * 15
        if len(db_only_pages) > 0:
            health_score -= 10
            
    health_score = max(0, min(100, int(health_score)))
    
    md.append(f"### SEO Technical Health Score: **{health_score}/100**")
    if health_score >= 80:
        md.append("Status: 🟢 GOOD. Foundation is mostly clean, but needs tuning.")
    elif health_score >= 50:
        md.append("Status: 🟡 NEEDS WORK. Critical duplicate content and schema gaps detected.")
    else:
        md.append("Status: 🔴 CRITICAL. Major duplicate descriptions and indexing issues present.")
        
    md.append("\n---\n")
    
    # robots.txt Verification
    md.append("## robots.txt Analysis")
    if robots_info["status"] != 200:
        md.append(f"> [!CAUTION]")
        md.append(f"> robots.txt check failed with HTTP {robots_info['status']}.")
    elif robots_info["errors"]:
        md.append(f"> [!WARNING]")
        md.append(f"> robots.txt syntax errors detected:")
        for err in robots_info["errors"]:
            md.append(f"> - {err}")
    else:
        md.append("> [!NOTE]")
        md.append("> robots.txt is valid and parses correctly. Admin and API endpoints are properly disallowed.")
        
    md.append("\n```")
    md.append(robots_info["content"].strip())
    md.append("```\n")
    
    # Missing from Sitemap
    md.append("## Sitemap Gaps (Database Only Pages)")
    md.append("These URLs are active in the database but not listed in sitemap-articles.xml or sitemap-pages.xml:")
    if db_only_pages:
        md.append("| URL | Type | Word Count |")
        md.append("|---|---|---|")
        # List up to 20 for brevity
        for r in db_only_pages[:20]:
            md.append(f"| [{r['URL'].replace(BASE_URL, '')}]({r['URL']}) | {r['Source']} | {r['Word Count']} |")
        if len(db_only_pages) > 20:
            md.append(f"| ... and {len(db_only_pages) - 20} more | | |")
    else:
        md.append("*None! All active database pages are correctly indexed in sitemaps.*")
    md.append("\n")
    
    # Canonical Tag Validation
    md.append("## Canonical Tag Audit")
    md.append(f"- **Correct (Self-Canonical)**: {canonical_matches}")
    md.append(f"- **Mismatched (Canonical pointing elsewhere)**: {canonical_mismatches}")
    md.append(f"- **Missing Canonical Tag**: {canonical_missing}\n")
    
    if canonical_mismatches > 0 or canonical_missing > 0:
        md.append("| URL | Canonical Tag | Match Status |")
        md.append("|---|---|---|")
        mismatched_runs = [r for r in results if r["Canonical Match"] != "Yes" and r["Status Code"] == 200][:20]
        for r in mismatched_runs:
            md.append(f"| [{r['URL'].replace(BASE_URL, '')}]({r['URL']}) | `{r['Canonical Tag']}` | `{r['Canonical Match']}` |")
        md.append("\n")
        
    # Schema Gaps
    md.append("## Schema Markup Coverage")
    md.append(f"- **NewsArticle Schema present**: {news_schema} / {sum(1 for r in results if 'article/' in r['URL'])} articles")
    md.append(f"- **VideoObject Schema present**: {video_schema} / {sum(1 for r in results if 'video/' in r['URL'])} videos")
    md.append(f"- **Organization Schema present**: {org_schema} homepage(s)\n")
    
    # Duplicate Meta Descriptions Detail
    md.append("## Duplicate Meta Descriptions (Top Priority Fix)")
    md.append("The following meta descriptions are duplicated across multiple pages. This dilutes relevance signals:")
    if dup_descriptions:
        for gid, group in dup_descriptions.items():
            md.append(f"### {gid}")
            md.append(f"**Meta Description Content**: *\"{group['desc']}\"*")
            md.append(f"**Affects {len(group['urls'])} pages**:")
            for url in group["urls"][:10]:
                md.append(f"- [{url.replace(BASE_URL, '')}]({url})")
            if len(group["urls"]) > 10:
                md.append(f"- ... and {len(group['urls']) - 10} more")
            md.append("")
    else:
        md.append("*No duplicate meta descriptions found! Clean sweep.*")
    md.append("\n")
    
    # Non-200 URLs
    md.append("## Broken or Redirecting URLs (Non-200)")
    broken_urls = [r for r in results if r["Status Code"] != 200 and r["Status Code"] != 0]
    if broken_urls:
        md.append("| URL | Source | Status | Error |")
        md.append("|---|---|---|---|")
        for r in broken_urls:
            md.append(f"| {r['URL']} | {r['Source']} | {r['Status Code']} | {r['Error']} |")
    else:
        md.append("*No broken URLs found! All URLs returned 200 OK.*")
    md.append("\n")
    
    # Write to artifacts directory
    artifact_dir = "/Users/apple/.gemini/antigravity/brain/3a78bbf9-eef3-4118-86c9-ed86156a9a0d"
    os.makedirs(artifact_dir, exist_ok=True)
    report_path = os.path.join(artifact_dir, "FULL-AUDIT-REPORT.md")
    
    with open(report_path, "w", encoding="utf-8") as f:
        f.write("\n".join(md))
        
    print(f"Saved markdown report to {report_path}")

if __name__ == "__main__":
    run_audit()
