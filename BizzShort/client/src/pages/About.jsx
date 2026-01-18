import { motion } from 'framer-motion';

export default function About() {
    const teamMembers = [
        { name: 'Rahul Sharma', role: 'Founder & CEO', image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300' },
        { name: 'Priya Patel', role: 'Editor-in-Chief', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300' },
        { name: 'Amit Kumar', role: 'Tech Lead', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300' },
        { name: 'Sneha Reddy', role: 'Senior Reporter', image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300' },
    ];

    const stats = [
        { number: '1M+', label: 'Monthly Readers' },
        { number: '500+', label: 'Articles Published' },
        { number: '50+', label: 'Expert Contributors' },
        { number: '10+', label: 'Industry Awards' },
    ];

    return (
        <motion.div
            className="about-page"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            {/* Hero */}
            <div className="page-hero about-hero">
                <div className="container">
                    <h1>About ZPluse News</h1>
                    <p>Your trusted source for tech news and business insights since 2020</p>
                </div>
            </div>

            {/* Mission Section */}
            <section className="section">
                <div className="container">
                    <div className="about-content">
                        <motion.div
                            className="about-text"
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                        >
                            <h2>Our Mission</h2>
                            <p>
                                ZPluse News was founded with a simple mission: to deliver cutting-edge technology
                                news and business insights to the next generation of leaders and innovators.
                            </p>
                            <p>
                                We believe that access to quality information should be universal. Our team of
                                expert journalists and analysts work around the clock to bring you the most
                                relevant and impactful stories from the world of technology, startups, and finance.
                            </p>
                            <p>
                                From AI breakthroughs to market analysis, from startup funding to policy changes,
                                ZPluse News covers it all with depth, accuracy, and a forward-looking perspective.
                            </p>
                        </motion.div>
                        <motion.div
                            className="about-image"
                            initial={{ opacity: 0, x: 30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                        >
                            <img
                                src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600"
                                alt="Our Team"
                            />
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="section stats-section">
                <div className="container">
                    <div className="stats-grid">
                        {stats.map((stat, index) => (
                            <motion.div
                                key={index}
                                className="stat-item"
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <span className="stat-number">{stat.number}</span>
                                <span className="stat-label">{stat.label}</span>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Team Section */}
            <section className="section">
                <div className="container">
                    <h2 className="section-title">Meet Our Team</h2>
                    <div className="team-grid">
                        {teamMembers.map((member, index) => (
                            <motion.div
                                key={index}
                                className="team-card"
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <div className="team-image">
                                    <img src={member.image} alt={member.name} />
                                </div>
                                <h3>{member.name}</h3>
                                <p>{member.role}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            <style>{`
        .about-hero {
          background: linear-gradient(135deg, var(--accent-blue) 0%, var(--bg-dark) 100%);
        }
        
        .page-hero {
          background: linear-gradient(135deg, var(--primary) 0%, var(--accent-purple) 100%);
          padding: 80px 0;
          text-align: center;
          color: white;
        }
        
        .page-hero h1 {
          font-size: clamp(2rem, 4vw, 3rem);
          margin-bottom: 16px;
          color: white;
        }
        
        .page-hero p {
          font-size: 18px;
          opacity: 0.9;
          color: white;
        }
        
        .about-content {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px;
          align-items: center;
        }
        
        .about-text h2 {
          font-size: 2rem;
          margin-bottom: 24px;
        }
        
        .about-text p {
          font-size: 16px;
          line-height: 1.8;
          color: var(--text-secondary);
          margin-bottom: 20px;
        }
        
        .about-image img {
          width: 100%;
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-lg);
        }
        
        .stats-section {
          background: var(--off-white);
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 40px;
          text-align: center;
        }
        
        .stat-number {
          display: block;
          font-size: 3rem;
          font-weight: 800;
          color: var(--primary);
          font-family: var(--font-heading);
        }
        
        .stat-label {
          font-size: 14px;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .section-title {
          text-align: center;
          font-size: 2rem;
          margin-bottom: 48px;
        }
        
        .team-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 32px;
        }
        
        .team-card {
          text-align: center;
          padding: 24px;
          background: var(--bg-card);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-sm);
          transition: var(--transition-normal);
        }
        
        .team-card:hover {
          transform: translateY(-8px);
          box-shadow: var(--shadow-lg);
        }
        
        .team-image {
          width: 120px;
          height: 120px;
          margin: 0 auto 20px;
          border-radius: 50%;
          overflow: hidden;
          border: 4px solid var(--primary);
        }
        
        .team-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .team-card h3 {
          font-size: 1.1rem;
          margin-bottom: 4px;
        }
        
        .team-card p {
          font-size: 14px;
          color: var(--text-muted);
        }
        
        @media (max-width: 1024px) {
          .about-content {
            grid-template-columns: 1fr;
            gap: 40px;
          }
          
          .stats-grid, .team-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        
        @media (max-width: 640px) {
          .stats-grid, .team-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
        </motion.div>
    );
}
