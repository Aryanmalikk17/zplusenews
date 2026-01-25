import { motion } from 'framer-motion';
import '../styles/contests.css';

export default function Contests() {
    return (
        <div className="contests-page">
            <motion.section
                className="contests-hero"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div className="container">
                    <div className="contests-hero-content">
                        <div className="contests-icon">🏆</div>
                        <h1 className="contests-title">Contests & Competitions</h1>
                        <p className="contests-description">
                            Participate in exciting contests, showcase your knowledge, and win amazing prizes!
                        </p>
                    </div>
                </div>
            </motion.section>

            <div className="container">
                <div className="contests-grid">
                    {/* Coming Soon Card */}
                    <motion.div
                        className="contest-card coming-soon"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                    >
                        <div className="contest-badge">Coming Soon</div>
                        <div className="contest-icon">🎯</div>
                        <h2>Quiz Competitions</h2>
                        <p>Test your knowledge on current affairs and news</p>
                        <div className="contest-prize">
                            <span className="prize-label">Prize Pool</span>
                            <span className="prize-amount">₹10,000</span>
                        </div>
                        <button className="contest-btn" disabled>
                            Launching Soon
                        </button>
                    </motion.div>

                    <motion.div
                        className="contest-card coming-soon"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                    >
                        <div className="contest-badge">Coming Soon</div>
                        <div className="contest-icon">✍️</div>
                        <h2>Article Writing</h2>
                        <p>Write compelling articles and get featured</p>
                        <div className="contest-prize">
                            <span className="prize-label">Prize Pool</span>
                            <span className="prize-amount">₹25,000</span>
                        </div>
                        <button className="contest-btn" disabled>
                            Launching Soon
                        </button>
                    </motion.div>

                    <motion.div
                        className="contest-card coming-soon"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                    >
                        <div className="contest-badge">Coming Soon</div>
                        <div className="contest-icon">🎥</div>
                        <h2>Video Creation</h2>
                        <p>Create engaging news content and win prizes</p>
                        <div className="contest-prize">
                            <span className="prize-label">Prize Pool</span>
                            <span className="prize-amount">₹50,000</span>
                        </div>
                        <button className="contest-btn" disabled>
                            Launching Soon
                        </button>
                    </motion.div>
                </div>

                <motion.div
                    className="contests-info"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                >
                    <h3>Stay Tuned!</h3>
                    <p>
                        We're preparing exciting contests for our community.
                        Subscribe to our newsletter to get notified when contests go live!
                    </p>
                    <div className="newsletter-signup">
                        <input
                            type="email"
                            placeholder="Enter your email"
                            className="newsletter-input"
                        />
                        <button className="newsletter-btn">Notify Me</button>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
