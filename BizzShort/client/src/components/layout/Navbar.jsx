import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import '../../styles/navbar.css';

// Icons (using simple SVG)
const Icons = {
    Home: () => <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" /></svg>,
    ChevronDown: () => <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" /></svg>,
    Search: () => <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" /></svg>,
    Trophy: () => <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" /></svg>,
};

const menuItems = [
    { path: '/', label: 'Home', icon: 'Home' },
    { path: '/positive-news', label: 'Positive News' },
    { path: '/fake-news', label: 'Fake News' },
    {
        label: 'Levels News',
        submenu: [
            { path: '/international-news', label: 'International News' },
            { path: '/national-news', label: 'National News' },
            { path: '/state-news', label: 'State News' },
        ]
    },
    {
        label: 'Interested Field',
        submenu: [
            { path: '/economics', label: 'Economics' },
            { path: '/polity', label: 'Polity' },
            { path: '/technology', label: 'Technology' },
            { path: '/environment', label: 'Environment' },
            { path: '/sports', label: 'Sports' },
        ]
    },
];

export default function Navbar() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [openDropdown, setOpenDropdown] = useState(null);
    const [isScrolled, setIsScrolled] = useState(false);
    const location = useLocation();

    // Detect scroll for navbar shadow effect
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Close mobile menu on route change
    useEffect(() => {
        setIsMobileMenuOpen(false);
        setOpenDropdown(null);
    }, [location]);

    const isActive = (path) => {
        if (path === '/') return location.pathname === '/';
        return location.pathname.startsWith(path);
    };

    const isDropdownActive = (submenu) => {
        return submenu.some(item => location.pathname === item.path);
    };

    return (
        <>
            {/* Top Navbar - Always Visible with Glassmorphism */}
            <header className={`top-navbar glass-navbar ${isScrolled ? 'scrolled' : ''}`}>
                <div className="container">
                    {/* Logo & Brand */}
                    <Link to="/" className="top-navbar-logo">
                        <img src="/assets/images/logo.png" alt="ZPluse News" />
                        <span className="brand-name">ZPluse News</span>
                    </Link>

                    {/* Menu */}
                    <nav className="top-navbar-menu" aria-label="Main navigation">
                        {menuItems.map((item, index) => (
                            <div
                                key={item.path || index}
                                className="top-navbar-menu-item"
                                onMouseEnter={() => item.submenu && setOpenDropdown(item.label)}
                                onMouseLeave={() => setOpenDropdown(null)}
                            >
                                {item.path ? (
                                    <Link
                                        to={item.path}
                                        className={isActive(item.path) ? 'active' : ''}
                                    >
                                        {item.label}
                                    </Link>
                                ) : (
                                    <span className={`dropdown-trigger ${isDropdownActive(item.submenu) ? 'active' : ''}`}>
                                        {item.label}
                                        <span className="arrow">
                                            <Icons.ChevronDown />
                                        </span>
                                    </span>
                                )}

                                {/* Dropdown Menu */}
                                {item.submenu && (
                                    <AnimatePresence>
                                        {openDropdown === item.label && (
                                            <motion.div
                                                className="dropdown-menu glass-dropdown"
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 10 }}
                                                transition={{ duration: 0.15 }}
                                            >
                                                {item.submenu.map((subitem) => (
                                                    <Link
                                                        key={subitem.path}
                                                        to={subitem.path}
                                                        className={isActive(subitem.path) ? 'active' : ''}
                                                    >
                                                        {subitem.label}
                                                    </Link>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                )}
                            </div>
                        ))}
                    </nav>

                    {/* Actions */}
                    <div className="top-navbar-actions">
                        <Link to="/contests" className="contests-btn">
                            <Icons.Trophy />
                            <span>Contests</span>
                        </Link>
                        <button aria-label="Search" className="search-btn">
                            <Icons.Search />
                        </button>
                        <button
                            className={`mobile-toggle ${isMobileMenuOpen ? 'active' : ''}`}
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            aria-label="Toggle menu"
                            aria-expanded={isMobileMenuOpen}
                        >
                            <span></span>
                            <span></span>
                            <span></span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Mobile Menu */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <>
                        <motion.div
                            className="mobile-menu-overlay"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMobileMenuOpen(false)}
                        />
                        <motion.nav
                            className="mobile-menu glass-mobile-menu"
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'tween', duration: 0.3 }}
                        >
                            <div className="mobile-menu-header">
                                <Link to="/" className="mobile-logo">
                                    <img src="/assets/images/logo.png" alt="ZPluse News" />
                                    <span>ZPluse News</span>
                                </Link>
                                <button
                                    className="close-btn"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    aria-label="Close menu"
                                >
                                    ✕
                                </button>
                            </div>
                            <div className="mobile-menu-links">
                                {menuItems.map((item, index) => (
                                    <div key={item.path || index} className="mobile-menu-section">
                                        {item.path ? (
                                            <Link
                                                to={item.path}
                                                className={isActive(item.path) ? 'active' : ''}
                                                onClick={() => setIsMobileMenuOpen(false)}
                                            >
                                                {item.label}
                                            </Link>
                                        ) : (
                                            <>
                                                <div className="mobile-submenu-title">{item.label}</div>
                                                <div className="mobile-submenu">
                                                    {item.submenu.map((subitem) => (
                                                        <Link
                                                            key={subitem.path}
                                                            to={subitem.path}
                                                            className={isActive(subitem.path) ? 'active' : ''}
                                                            onClick={() => setIsMobileMenuOpen(false)}
                                                        >
                                                            {subitem.label}
                                                        </Link>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}
                                <Link
                                    to="/contests"
                                    className="mobile-contests-link"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    <Icons.Trophy />
                                    <span>Contests</span>
                                </Link>
                            </div>
                        </motion.nav>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
