import { motion } from 'framer-motion';

export default function EditorialPolicy() {
    const lastUpdated = "May 27, 2026";

    return (
        <motion.div
            className="policy-page"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            {/* Hero */}
            <div className="page-hero policy-hero" style={{ background: 'linear-gradient(135deg, #aa2123 0%, #330002 100%)' }}>
                <div className="container" style={{ textAlign: 'center', padding: '60px 20px', color: '#fff' }}>
                    <h1 style={{ color: '#fff', fontSize: '2.5rem', marginBottom: '10px' }}>Editorial & Corrections Policy</h1>
                    <p style={{ color: 'rgba(255, 255, 255, 0.9)' }}>Last Updated: {lastUpdated}</p>
                </div>
            </div>

            {/* Content Section */}
            <section className="section" style={{ padding: '60px 0' }}>
                <div className="container" style={{ maxWidth: '800px', margin: '0 auto', padding: '0 20px' }}>
                    <div className="policy-container" style={{ fontSize: '1.1rem', lineHeight: '1.8', color: '#333' }}>
                        <h2 style={{ fontSize: '1.8rem', color: '#111', marginTop: '30px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>1. Editorial Standards and Integrity</h2>
                        <p>
                            ZPlus News is dedicated to reporting news with accuracy, fairness, independence, and integrity. Our mission is to provide clear, reliable information regarding national and global affairs, polity, defence, technology, and business.
                        </p>
                        <p>
                            Our writers and editors must verify all information before publishing. We seek primary sources whenever possible and avoid rumors, unsourced speculation, or clickbait reporting.
                        </p>

                        <h2 style={{ fontSize: '1.8rem', color: '#111', marginTop: '30px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>2. Verification and Fact-Checking</h2>
                        <p>
                            We apply strict fact-checking procedures. Every claim of fact in our articles is cross-referenced with multiple reputable sources or official statements. Quotes are checked for accuracy and context. If an article presents opinion or analysis, it is clearly labeled as such to distinguish it from straight news reporting.
                        </p>

                        <h2 style={{ fontSize: '1.8rem', color: '#111', marginTop: '30px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>3. Editorial Independence and Conflicts of Interest</h2>
                        <p>
                            ZPlus News operates independently from any political party, corporate lobby, or special interest group. Our editorial decisions are guided strictly by public relevance and journalistic value.
                        </p>
                        <p>
                            Our editorial staff must disclose any potential conflicts of interest. No writer or editor is permitted to write about companies, products, or political campaigns in which they have a personal financial interest without clear disclosure.
                        </p>

                        <h2 style={{ fontSize: '1.8rem', color: '#111', marginTop: '30px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>4. Corrections Policy</h2>
                        <p>
                            ZPlus News strives for 100% accuracy, but when errors occur, we are committed to correcting them promptly and transparently.
                        </p>
                        <ul>
                            <li><strong>Minor Corrections:</strong> Typographical errors, minor spelling mistakes, or grammar fixes that do not change the meaning of the article are corrected without a formal note.</li>
                            <li><strong>Substantive Corrections:</strong> Errors of fact, incorrect quotes, or misleading headlines will be corrected immediately. A formal correction note will be appended to the bottom of the article explaining what was changed, when it was changed, and the correct information.</li>
                            <li><strong>Retractions:</strong> In rare cases where an article fails to meet our fundamental editorial standards or contains fatal errors of fact, we will retract the article and replace it with a statement explaining the retraction.</li>
                        </ul>
                        <p>
                            To report an error or request a correction, please contact our editorial desk at <strong>editor@zplusenews.com</strong> with the article link and specific details of the error.
                        </p>
                    </div>
                </div>
            </section>
        </motion.div>
    );
}
