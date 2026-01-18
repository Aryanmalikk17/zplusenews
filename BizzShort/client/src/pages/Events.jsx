import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { eventsAPI } from '../services/api';

export default function Events() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const data = await eventsAPI.getAll();
                setEvents(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error('Error fetching events:', error);
                // Demo events
                setEvents([
                    {
                        _id: 1,
                        name: "E-Summit 2026: Asia's Largest Business Conclave",
                        date: '2026-02-15',
                        location: 'IIT Bombay, Mumbai',
                        description: 'A premier summit bringing together entrepreneurs, investors, and industry leaders.',
                        image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600',
                    },
                    {
                        _id: 2,
                        name: 'Tech Conference 2026',
                        date: '2026-03-20',
                        location: 'Bangalore Palace Grounds',
                        description: 'Technology summit covering AI, IoT, and digital transformation.',
                        image: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=600',
                    },
                    {
                        _id: 3,
                        name: 'Startup India Summit',
                        date: '2026-04-10',
                        location: 'Pragati Maidan, New Delhi',
                        description: 'Connect with leading startups and venture capitalists.',
                        image: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=600',
                    },
                ]);
            } finally {
                setLoading(false);
            }
        };

        fetchEvents();
    }, []);

    return (
        <motion.div
            className="events-page"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            {/* Hero */}
            <div className="page-hero">
                <div className="container">
                    <h1>Upcoming Events</h1>
                    <p>Join us at leading tech and business events across India</p>
                </div>
            </div>

            {/* Events Grid */}
            <section className="section">
                <div className="container">
                    <div className="events-grid">
                        {loading ? (
                            [...Array(3)].map((_, i) => (
                                <div key={i} className="event-card">
                                    <div className="skeleton" style={{ height: 200 }}></div>
                                    <div style={{ padding: 24 }}>
                                        <div className="skeleton" style={{ height: 28, marginBottom: 12 }}></div>
                                        <div className="skeleton" style={{ height: 16, width: '60%' }}></div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            events.map((event, index) => (
                                <motion.article
                                    key={event._id}
                                    className="event-card"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                >
                                    <div className="event-image">
                                        <img src={event.image} alt={event.name} />
                                        <div className="event-date-badge">
                                            {new Date(event.date).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </div>
                                    </div>
                                    <div className="event-content">
                                        <h3>{event.name}</h3>
                                        <div className="event-meta">
                                            <span className="event-location">
                                                📍 {event.location}
                                            </span>
                                            <span className="event-time">
                                                🗓️ {new Date(event.date).toLocaleDateString('en-US', {
                                                    weekday: 'long',
                                                    month: 'long',
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                })}
                                            </span>
                                        </div>
                                        <p>{event.description}</p>
                                        <button className="register-btn">Register Now</button>
                                    </div>
                                </motion.article>
                            ))
                        )}
                    </div>
                </div>
            </section>

            <style>{`
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
        
        .events-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 32px;
        }
        
        .event-card {
          background: var(--bg-card);
          border-radius: var(--radius-xl);
          overflow: hidden;
          box-shadow: var(--shadow-md);
          transition: var(--transition-normal);
        }
        
        .event-card:hover {
          transform: translateY(-8px);
          box-shadow: var(--shadow-xl);
        }
        
        .event-image {
          position: relative;
          height: 200px;
        }
        
        .event-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .event-date-badge {
          position: absolute;
          top: 16px;
          right: 16px;
          background: var(--primary);
          color: white;
          padding: 12px 16px;
          border-radius: var(--radius-md);
          font-weight: 700;
          font-size: 14px;
          text-align: center;
        }
        
        .event-content {
          padding: 24px;
        }
        
        .event-content h3 {
          font-size: 1.25rem;
          margin-bottom: 12px;
          color: var(--text-primary);
        }
        
        .event-meta {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 16px;
          font-size: 14px;
          color: var(--text-secondary);
        }
        
        .event-content p {
          font-size: 14px;
          color: var(--text-muted);
          margin-bottom: 20px;
        }
        
        .register-btn {
          width: 100%;
          padding: 14px 24px;
          background: var(--primary);
          color: white;
          font-size: 14px;
          font-weight: 600;
          border-radius: var(--radius-md);
          transition: var(--transition-fast);
        }
        
        .register-btn:hover {
          background: var(--primary-dark);
          transform: translateY(-2px);
        }
        
        @media (max-width: 768px) {
          .events-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
        </motion.div>
    );
}
