import { motion } from 'framer-motion';

export default function PrivacyPolicy() {
    const lastUpdated = "May 27, 2026";

    return (
        <motion.div
            className="policy-page"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            {/* Hero */}
            <div className="page-hero policy-hero">
                <div className="container">
                    <h1>Privacy Policy</h1>
                    <p>Last Updated: {lastUpdated}</p>
                </div>
            </div>

            {/* Content Section */}
            <section className="section">
                <div className="container">
                    <div className="policy-container">
                        <h2>1. Introduction</h2>
                        <p>
                            Welcome to ZPluse News (collectively referred to as "ZPluse News", "we", "us", or "our"). 
                            We are committed to protecting your personal data and respecting your privacy. 
                            This Privacy Policy explains how we collect, use, disclose, and safeguard your information 
                            when you visit our website (https://www.zplusenews.com) and use our services.
                        </p>
                        <p>
                            By accessing or using our services, you consent to the collection, transfer, manipulation, 
                            storage, disclosure, and other uses of your information as described in this Privacy Policy. 
                            We comply with global data protection frameworks, including the General Data Protection Regulation (GDPR), 
                            California Consumer Privacy Act (CCPA), and the Digital Personal Data Protection Act (DPDP) of India.
                        </p>

                        <h2>2. Information We Collect</h2>
                        <p>
                            We collect information in three ways: information you provide to us directly, information collected 
                            automatically, and information from third parties.
                        </p>
                        <h3>A. Information You Provide</h3>
                        <ul>
                            <li><strong>Account Data:</strong> When you register an account, subscribe to newsletters, or comment on articles, you provide your name, email address, password, and profile information.</li>
                            <li><strong>Correspondence:</strong> If you contact us directly for customer support or feedback, we collect your name, email, and the contents of your message.</li>
                            <li><strong>Submissions:</strong> Content you post, such as comments, user profiles, or contributor articles.</li>
                        </ul>
                        <h3>B. Automatically Collected Information</h3>
                        <ul>
                            <li><strong>Log and Usage Data:</strong> Server log data including IP address, browser type, operating system, referring URLs, pages viewed, and device type.</li>
                            <li><strong>Cookies and Tracking:</strong> We use cookies, web beacons, and similar tracking technologies to customize your experience and analyze traffic. Refer to our Cookie Policy for details.</li>
                        </ul>

                        <h2>3. How We Use Your Information</h2>
                        <p>
                            We process your information for purposes based on legitimate business interests, the fulfillment of 
                            our contract with you, compliance with our legal obligations, and/or your consent. Specifically, we use it to:
                        </p>
                        <ul>
                            <li>Deliver, operate, and maintain our news services and website.</li>
                            <li>Personalize your experience by displaying content tailored to your location or preferences.</li>
                            <li>Monitor and analyze usage trends, traffic, and platform activity.</li>
                            <li>Send editorial newsletters, security alerts, and promotional correspondence (subject to opt-out preferences).</li>
                            <li>Prevent fraud, enforce our Terms of Service, and comply with applicable laws.</li>
                        </ul>

                        <h2>4. Sharing of Information</h2>
                        <p>
                            We do not sell, rent, or trade your personal information. We may share information with:
                        </p>
                        <ul>
                            <li><strong>Service Providers:</strong> Third-party vendors who perform services for us, including database hosting, analytics (Google Analytics), newsletter delivery, and security operations.</li>
                            <li><strong>Legal Obligations:</strong> Compliance with courts, law enforcement agency requests, or other government bodies in accordance with governing legislation.</li>
                            <li><strong>Business Transfers:</strong> In connection with or during negotiations of any merger, sale of company assets, financing, or acquisition.</li>
                        </ul>

                        <h2>5. Security of Your Data</h2>
                        <p>
                            We use industry-standard administrative, technical, and physical security measures to protect 
                            your personal information. While we take reasonable steps to secure the data you transmit to us, 
                            please be aware that no transmission method over the internet is 100% secure, and we cannot guarantee 
                            absolute security.
                        </p>

                        <h2>6. Your Data Rights</h2>
                        <p>
                            Depending on your location, you may have specific rights regarding your personal information:
                        </p>
                        <ul>
                            <li><strong>Access and Portability:</strong> The right to request copies of your personal data.</li>
                            <li><strong>Rectification:</strong> The right to request that we correct inaccurate or incomplete info.</li>
                            <li><strong>Erasure (Deletion):</strong> The right to request deletion of your personal data, subject to certain exceptions.</li>
                            <li><strong>Object/Restrict Processing:</strong> The right to object to or request restriction of our processing under certain conditions.</li>
                            <li><strong>Consent Withdrawal:</strong> The right to withdraw consent at any time where we rely on consent to process your information.</li>
                        </ul>
                        <p>
                            To exercise these rights, please contact our Data Protection Officer at <strong>privacy@zplusenews.com</strong>.
                        </p>

                        <h2>7. Children's Privacy</h2>
                        <p>
                            Our services are not intended for use by children under the age of 13. We do not knowingly collect 
                            personal data from children under 13. If we discover that a child under 13 has provided us with 
                            personal data, we will delete it immediately.
                        </p>

                        <h2>8. Changes to this Policy</h2>
                        <p>
                            We may update this Privacy Policy from time to time. The updated version will be indicated by the 
                            "Last Updated" date at the top. We encourage you to review this policy periodically to stay informed of 
                            how we protect your data.
                        </p>

                        <h2>9. Contact Us</h2>
                        <p>
                            If you have questions or comments about this Privacy Policy, please contact us at:
                        </p>
                        <p style={{ marginLeft: '20px' }}>
                            <strong>ZPluse News Team</strong><br />
                            Email: contact@zplusenews.com<br />
                            Address: New Delhi, Delhi, India - 110001
                        </p>
                    </div>
                </div>
            </section>

            <style>{`
                .policy-hero {
                    background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
                    margin-bottom: 40px;
                }
                .page-hero {
                    padding: 80px 0;
                    text-align: center;
                    color: white;
                }
                .page-hero h1 {
                    font-size: clamp(2rem, 4vw, 3rem);
                    margin-bottom: 16px;
                    color: white !important;
                }
                .page-hero p {
                    font-size: 18px;
                    opacity: 0.9;
                    color: white !important;
                }
                .policy-container {
                    max-width: 900px;
                    margin: 0 auto;
                    background: var(--white);
                    padding: 40px 30px;
                    border-radius: var(--radius-xl);
                    box-shadow: var(--shadow-md);
                    border: 1px solid var(--light-gray);
                }
                .policy-container h2 {
                    font-size: 1.8rem;
                    margin: 2rem 0 1rem 0;
                    color: var(--text-primary);
                    border-bottom: 1px solid var(--light-gray);
                    padding-bottom: 8px;
                }
                .policy-container h3 {
                    font-size: 1.3rem;
                    margin: 1.5rem 0 0.8rem 0;
                    color: var(--primary);
                }
                .policy-container p {
                    font-size: 16px;
                    line-height: 1.8;
                    color: var(--text-secondary);
                    margin-bottom: 1.2rem;
                }
                .policy-container ul {
                    margin-bottom: 1.5rem;
                    padding-left: 1.5rem;
                }
                .policy-container li {
                    font-size: 16px;
                    line-height: 1.8;
                    color: var(--text-secondary);
                    margin-bottom: 0.6rem;
                }
                
                @media (max-width: 768px) {
                    .policy-container {
                        padding: 24px 16px;
                    }
                }
            `}</style>
        </motion.div>
    );
}
