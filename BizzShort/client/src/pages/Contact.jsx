import { useState } from 'react';
import { motion } from 'framer-motion';

export default function Contact() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: '',
    });
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        // Handle form submission
        console.log('Form submitted:', formData);
        setSubmitted(true);
        setTimeout(() => setSubmitted(false), 3000);
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const contactInfo = [
        { icon: '📍', label: 'Address', value: 'Tech Park, Bangalore, Karnataka 560001' },
        { icon: '📧', label: 'Email', value: 'contact@zplusenews.com' },
        { icon: '📞', label: 'Phone', value: '+91 80 4567 8900' },
        { icon: '🕐', label: 'Hours', value: 'Mon-Fri: 9AM - 6PM IST' },
    ];

    return (
        <motion.div
            className="contact-page"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            {/* Hero */}
            <div className="page-hero contact-hero">
                <div className="container">
                    <h1>Contact Us</h1>
                    <p>We'd love to hear from you. Get in touch with our team.</p>
                </div>
            </div>

            {/* Contact Section */}
            <section className="section">
                <div className="container">
                    <div className="contact-grid">
                        {/* Contact Form */}
                        <motion.div
                            className="contact-form-wrapper"
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                        >
                            <h2>Send us a message</h2>

                            {submitted ? (
                                <div className="success-message">
                                    <span>✓</span>
                                    <p>Thank you! Your message has been sent successfully.</p>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="contact-form">
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label htmlFor="name">Your Name</label>
                                            <input
                                                type="text"
                                                id="name"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleChange}
                                                required
                                                placeholder="John Doe"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="email">Email Address</label>
                                            <input
                                                type="email"
                                                id="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleChange}
                                                required
                                                placeholder="john@example.com"
                                            />
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="subject">Subject</label>
                                        <input
                                            type="text"
                                            id="subject"
                                            name="subject"
                                            value={formData.subject}
                                            onChange={handleChange}
                                            required
                                            placeholder="How can we help?"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="message">Message</label>
                                        <textarea
                                            id="message"
                                            name="message"
                                            value={formData.message}
                                            onChange={handleChange}
                                            required
                                            rows="6"
                                            placeholder="Write your message here..."
                                        ></textarea>
                                    </div>

                                    <button type="submit" className="submit-btn">
                                        Send Message
                                    </button>
                                </form>
                            )}
                        </motion.div>

                        {/* Contact Info */}
                        <motion.div
                            className="contact-info"
                            initial={{ opacity: 0, x: 30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                        >
                            <h2>Get in touch</h2>
                            <p>
                                Have a question or feedback? We're here to help.
                                Reach out to us through any of the following channels.
                            </p>

                            <div className="info-cards">
                                {contactInfo.map((info, index) => (
                                    <div key={index} className="info-card">
                                        <span className="info-icon">{info.icon}</span>
                                        <div>
                                            <h4>{info.label}</h4>
                                            <p>{info.value}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Map placeholder */}
                            <div className="map-placeholder">
                                <img
                                    src="https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?w=600"
                                    alt="Location"
                                />
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            <style>{`
        .contact-hero {
          background: linear-gradient(135deg, var(--accent-teal) 0%, var(--accent-blue) 100%);
        }
        
        .page-hero {
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
        
        .contact-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px;
        }
        
        .contact-form-wrapper h2,
        .contact-info h2 {
          font-size: 1.75rem;
          margin-bottom: 24px;
        }
        
        .contact-info > p {
          color: var(--text-secondary);
          margin-bottom: 32px;
        }
        
        .contact-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .form-group label {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
        }
        
        .form-group input,
        .form-group textarea {
          padding: 14px 16px;
          border: 2px solid var(--light-gray);
          border-radius: var(--radius-md);
          font-size: 15px;
          font-family: inherit;
          transition: var(--transition-fast);
        }
        
        .form-group input:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: var(--primary);
        }
        
        .form-group textarea {
          resize: vertical;
          min-height: 150px;
        }
        
        .submit-btn {
          padding: 16px 32px;
          background: var(--primary);
          color: white;
          font-size: 16px;
          font-weight: 600;
          border-radius: var(--radius-md);
          transition: var(--transition-fast);
          align-self: flex-start;
        }
        
        .submit-btn:hover {
          background: var(--primary-dark);
          transform: translateY(-2px);
        }
        
        .success-message {
          background: #d4edda;
          border: 1px solid #c3e6cb;
          border-radius: var(--radius-md);
          padding: 24px;
          text-align: center;
        }
        
        .success-message span {
          display: block;
          font-size: 48px;
          margin-bottom: 12px;
        }
        
        .success-message p {
          color: #155724;
          font-weight: 500;
        }
        
        .info-cards {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 32px;
        }
        
        .info-card {
          display: flex;
          gap: 16px;
          padding: 20px;
          background: var(--off-white);
          border-radius: var(--radius-md);
          transition: var(--transition-fast);
        }
        
        .info-card:hover {
          background: var(--light-gray);
        }
        
        .info-icon {
          font-size: 24px;
        }
        
        .info-card h4 {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 4px;
        }
        
        .info-card p {
          font-size: 14px;
          color: var(--text-secondary);
          margin: 0;
        }
        
        .map-placeholder {
          border-radius: var(--radius-xl);
          overflow: hidden;
          height: 200px;
        }
        
        .map-placeholder img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        @media (max-width: 1024px) {
          .contact-grid {
            grid-template-columns: 1fr;
            gap: 48px;
          }
        }
        
        @media (max-width: 640px) {
          .form-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
        </motion.div>
    );
}
