import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function Astrology() {
    return (
        <div className="page-astrology" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
            <div className="container" style={{ maxWidth: '600px', textAlign: 'center' }}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                >
                    <div style={{ fontSize: '5rem', marginBottom: '1.5rem', filter: 'drop-shadow(0 10px 15px rgba(139, 92, 246, 0.3))' }}>
                        🔮
                    </div>
                    <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.5rem', fontWeight: '800', marginBottom: '1rem', background: 'linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Astrology & Horoscopes
                    </h1>
                    <h2 style={{ fontSize: '1.5rem', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '1rem' }}>
                        Coming Very Soon
                    </h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', lineHeight: '1.6', marginBottom: '2.5rem' }}>
                        Our expert astrologers are aligning the stars to bring you daily horoscopes, zodiac insights, and celestial updates. Stay tuned!
                    </p>
                    <Link to="/" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 28px', background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', color: 'white', textDecoration: 'none', borderRadius: 'var(--radius-lg)', fontWeight: '600', boxShadow: '0 4px 15px rgba(109, 40, 217, 0.35)', transition: 'all 0.3s ease' }}>
                        <i className="fa-solid fa-house"></i> Back to Homepage
                    </Link>
                </motion.div>
            </div>
        </div>
    );
}
