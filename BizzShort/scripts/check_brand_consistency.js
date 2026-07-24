const fs = require('fs');
const path = require('path');

function checkBrandConsistency() {
    console.log('==================================================');
    console.log('       ZPLUS NEWS BRAND CONSISTENCY CHECKER       ');
    console.log('==================================================\n');

    // 1. Check index.html
    const indexPath = path.join(__dirname, '..', 'client', 'index.html');
    if (!fs.existsSync(indexPath)) {
        console.error('❌ client/index.html not found!');
        return;
    }

    const indexHtml = fs.readFileSync(indexPath, 'utf8');

    console.log('Checking client/index.html metadata & schemas...');
    
    // Check old spelling leaks
    const legacyMatches = indexHtml.match(/ZPluse\s+News/ig);
    if (legacyMatches) {
        console.warn(`⚠️ Found ${legacyMatches.length} legacy spelling leaks (ZPluse News) in index.html!`);
    } else {
        console.log('✅ No legacy spelling leaks found in index.html.');
    }

    // Check policy links updated
    const oldPolicyMatches = indexHtml.match(/"[^"]*\/about"/g);
    if (oldPolicyMatches) {
        console.warn('⚠️ Organization schema contains unstandardized policy links referring to "/about":');
        oldPolicyMatches.forEach(m => console.log(`  - ${m}`));
    } else {
        console.log('✅ All Organization schema policies link to standard URLs (/about-us, /editorial-policy).');
    }

    // 2. Output Organization JSON-LD
    console.log('\n--------------------------------------------------');
    console.log('Standard Organization JSON-LD block (sameAs array):');
    console.log('--------------------------------------------------');
    const orgSchema = {
        "@context": "https://schema.org",
        "@type": "NewsMediaOrganization",
        "@id": "https://www.zplusenews.com/#organization",
        "name": "ZPlus News",
        "url": "https://www.zplusenews.com",
        "logo": {
            "@type": "ImageObject",
            "url": "https://www.zplusenews.com/assets/images/logo.png",
            "width": "192",
            "height": "192"
        },
        "foundingDate": "2020",
        "address": {
            "@type": "PostalAddress",
            "addressLocality": "New Delhi",
            "addressRegion": "Delhi",
            "postalCode": "110001",
            "addressCountry": "IN"
        },
        "sameAs": [
            "https://facebook.com/zplusenews",
            "https://twitter.com/zplusenews",
            "https://instagram.com/zplusenews",
            "https://linkedin.com/company/zplusenews",
            "https://youtube.com/@zplusenews"
        ],
        "ethicsPolicy": "https://www.zplusenews.com/editorial-policy",
        "masthead": "https://www.zplusenews.com/about-us",
        "missionCoveragePrioritiesPolicy": "https://www.zplusenews.com/about-us",
        "verificationFactCheckingPolicy": "https://www.zplusenews.com/editorial-policy",
        "correctionsPolicy": "https://www.zplusenews.com/editorial-policy"
    };
    console.log(JSON.stringify(orgSchema, null, 2));

    // 3. Brand consistency checklist output
    console.log('\n--------------------------------------------------');
    console.log('          BRAND CONSISTENCY CHECKLIST             ');
    console.log('--------------------------------------------------');
    console.log('Verify that the following values match EXACTLY across all digital surfaces:');
    console.log('\n[ ] Brand Name: "ZPlus News"');
    console.log('    - Currently set in: Website Title, Open Graph, Organization Schema, Footer.');
    console.log('    - Action: Check Instagram bio, YouTube page, Facebook page.');
    console.log('\n[ ] Brand Logo: RED Square/Circle ZPlus Icon (logo.png)');
    console.log('    - Currently set in: Website asset (/assets/images/logo.png), Schema logo.');
    console.log('    - Action: Ensure all social profile pictures use the exact same logo file.');
    console.log('\n[ ] Brand Description / Tagline:');
    console.log('    - Official Description: "ZPlus News is India\'s leading digital platform for breaking news, latest national updates, politics, business trends, defense, technology and state news."');
    console.log('    - Action: Keep the first sentence identical in YouTube About page, Facebook Page description, and Instagram bio header to reinforce NAP.');
    console.log('\n[ ] Social URL Mappings:');
    console.log('    - Facebook:  https://facebook.com/zplusenews');
    console.log('    - Twitter:   https://twitter.com/zplusenews');
    console.log('    - Instagram: https://instagram.com/zplusenews');
    console.log('    - LinkedIn:  https://linkedin.com/company/zplusenews');
    console.log('    - YouTube:   https://youtube.com/@zplusenews');
    console.log('    - Action: Confirm no usernames are typoed or lead to 404 pages.');
    console.log('==================================================');
}

checkBrandConsistency();
