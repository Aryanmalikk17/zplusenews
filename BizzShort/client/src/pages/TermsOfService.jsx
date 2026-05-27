import { motion } from 'framer-motion';

export default function TermsOfService() {
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
                    <h1>Terms of Service</h1>
                    <p>Last Updated: {lastUpdated}</p>
                </div>
            </div>

            {/* Content Section */}
            <section className="section">
                <div className="container">
                    <div className="policy-container">
                        <h2>1. Agreement to Terms</h2>
                        <p>
                            Welcome to ZPluse News (https://www.zplusenews.com). These Terms of Service ("Terms") 
                            govern your access to and use of the website, mobile applications, API integrations, and 
                            other digital services (collectively, the "Services") operated by ZPluse News.
                        </p>
                        <p>
                            By accessing or using our Services, you agree to be bound by these Terms and our Privacy Policy. 
                            If you do not agree to all of these Terms, you are prohibited from using our Services and must 
                            discontinue use immediately.
                        </p>

                        <h2>2. Intellectual Property Rights</h2>
                        <p>
                            Unless otherwise indicated, the Services and all source code, databases, functionality, 
                            software, website designs, audio, video, text, photographs, and graphics on the site (collectively, the "Content") 
                            and the trademarks, service marks, and logos contained therein (the "Marks") are owned or controlled by 
                            ZPluse News or licensed to us, and are protected by copyright, trademark laws, and other intellectual 
                            property rights in India and internationally.
                        </p>
                        <p>
                            The Content and Marks are provided on the site "AS IS" for your information and personal use only. 
                            Except as expressly provided in these Terms, no part of the Services or Content may be copied, reproduced, 
                            aggregated, republished, uploaded, posted, publicly displayed, encoded, translated, transmitted, 
                            distributed, sold, licensed, or otherwise exploited for any commercial purpose whatsoever, without 
                            our express prior written permission.
                        </p>

                        <h2>3. User Representation & Conduct</h2>
                        <p>
                            By using the Services, you represent and warrant that: (a) all registration information you submit will 
                            be true, accurate, current, and complete; (b) you will maintain the accuracy of such information; 
                            (c) you have the legal capacity and agree to comply with these Terms; and (d) your use of the Services 
                            will not violate any applicable law or regulation.
                        </p>
                        <p>
                            As a user of the Services, you agree not to:
                        </p>
                        <ul>
                            <li>Systematically retrieve data or other content from the site to create or compile, directly or indirectly, a collection, compilation, database, or directory without written permission from us.</li>
                            <li>Trick, defraud, or mislead us and other users, especially in any attempt to learn sensitive account information.</li>
                            <li>Circumvent, disable, or otherwise interfere with security-related features of the Services.</li>
                            <li>Engage in unauthorized framing of or linking to the Services.</li>
                            <li>Use the Services to advertise or offer to sell goods and services.</li>
                            <li>Harass, abuse, or harm another person, or post comments containing defamation, hate speech, or explicit material.</li>
                        </ul>

                        <h2>4. User Generated Contributions</h2>
                        <p>
                            The Services may invite you to chat, contribute to, or participate in blogs, message boards, and online 
                            comments. Any contributions you submit (including text, photos, video, audio) will be treated as 
                            non-confidential and non-proprietary. By submitting contributions, you grant us a perpetual, worldwide, 
                            royalty-free, irrevocable, non-exclusive license to use, host, copy, reproduce, publish, modify, and 
                            distribute your contributions in any media format.
                        </p>

                        <h2>5. Third-Party Links & Advertising</h2>
                        <p>
                            Our Services contain links to other websites ("Third-Party Websites") as well as articles, photographs, 
                            text, graphics, pictures, designs, music, sound, video, information, applications, software, and other 
                            content belonging to or originating from third parties. We are not responsible for any Third-Party Websites 
                            accessed through the Services or any third-party content posted on the site.
                        </p>

                        <h2>6. Disclaimer of Warranties</h2>
                        <p>
                            THE SERVICES ARE PROVIDED ON AN AS-IS AND AS-AVAILABLE BASIS. YOU AGREE THAT YOUR USE OF THE SERVICES 
                            WILL BE AT YOUR SOLE RISK. TO THE FULLEST EXTENT PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, EXPRESS OR 
                            IMPLIED, IN CONNECTION WITH THE SERVICES AND YOUR USE THEREOF, INCLUDING, WITHOUT LIMITATION, THE IMPLIED 
                            WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE MAKE NO WARRANTIES 
                            OR REPRESENTATIONS ABOUT THE ACCURACY OR COMPLETENESS OF THE SITE'S CONTENT.
                        </p>

                        <h2>7. Limitation of Liability</h2>
                        <p>
                            IN NO EVENT WILL ZPLUSE NEWS OR OUR DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE TO YOU OR ANY THIRD PARTY FOR 
                            ANY DIRECT, INDIRECT, CONSEQUENTIAL, EXEMPLARY, INCIDENTAL, SPECIAL, OR PUNITIVE DAMAGES, INCLUDING LOST 
                            PROFIT, LOST REVENUE, LOSS OF DATA, OR OTHER DAMAGES ARISING FROM YOUR USE OF THE SERVICES, EVEN IF WE HAVE 
                            BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
                        </p>

                        <h2>8. Governing Law & Dispute Resolution</h2>
                        <p>
                            These Terms and your use of the Services are governed by and construed in accordance with the laws of 
                            India, without regard to its conflict of law principles. You agree that any legal action or proceeding 
                            arising out of or relating to these Terms shall be brought exclusively in the courts located in New Delhi, 
                            Delhi, India.
                        </p>

                        <h2>9. Corrections & Modifications</h2>
                        <p>
                            There may be information on the Services that contains typographical errors, inaccuracies, or omissions, 
                            including descriptions, pricing, and availability. We reserve the right to correct any errors, inaccuracies, 
                            or omissions and to change or update the information on the Services at any time, without prior notice. 
                            We also reserve the right to modify or discontinue any part of the Services at any time.
                        </p>

                        <h2>10. Contact Us</h2>
                        <p>
                            In order to resolve a complaint regarding the Services or to receive further information regarding 
                            use of the Services, please contact us at:
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
