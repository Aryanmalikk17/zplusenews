import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import '../../styles/navbar.css';

// Icons (using simple SVG for now)
const Icons = {
    Home: () => <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" /></svg>,
    Tech: () => <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M17 1H7c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-2-2-2zm0 18H7V5h10v14z" /></svg>,
    Business: () => <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z" /></svg>,
    Innovation: () => <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z" /></svg>,
    Events: () => <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z" /></svg>,
    About: () => <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" /></svg>,
    Contact: () => <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" /></svg>,
    Search: () => <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" /></svg>,
    ChevronDown: () => <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" /></svg>,
};

const menuItems = [
    { path: '/', label: 'Home', icon: 'Home' },
    {
        path: '/technology',
        label: 'Technology',
        icon: 'Tech',
        submenu: [
            { path: '/technology/ai', label: 'Artificial Intelligence' },
            { path: '/technology/gadgets', label: 'Gadgets & Devices' },
            { path: '/technology/software', label: 'Software & Apps' },
        ]
    },
    {
        path: '/business',
        label: 'Business',
        icon: 'Business',
        submenu: [
            { path: '/business/startups', label: 'Startups' },
            { path: '/business/markets', label: 'Markets' },
            { path: '/business/crypto', label: 'Cryptocurrency' },
        ]
    },
    { path: '/innovation', label: 'Innovation', icon: 'Innovation' },
    { path: '/events', label: 'Events', icon: 'Events' },
    { path: '/about', label: 'About', icon: 'About' },
    { path: '/contact', label: 'Contact', icon: 'Contact' },
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

    return (
        <>
            {/* Top Navbar - Always Visible with Glassmorphism */}
            <header className={`top-navbar glass-navbar ${isScrolled ? 'scrolled' : ''}`}>
                <div className="container">
                    {/* Logo */}
                    <Link to="/" className="top-navbar-logo">
                        <img src="/assets/images/logo.png" alt="ZPluse News" />
                        <span className="brand-name">ZPluse News</span>
                    </Link>

                    {/* Menu */}
                    <nav className="top-navbar-menu">
                        {menuItems.map((item) => (
                            <div
                                key={item.path}
                                className="top-navbar-menu-item"
                                onMouseEnter={() => item.submenu && setOpenDropdown(item.path)}
                                onMouseLeave={() => setOpenDropdown(null)}
                            >
                                <Link
                                    to={item.path}
                                    className={isActive(item.path) ? 'active' : ''}
                                >
                                    {item.label}
                                    {item.submenu && (
                                        <span className="arrow">
                                            <Icons.ChevronDown />
                                        </span>
                                    )}
                                </Link>

                                {/* Dropdown Menu */}
                                {item.submenu && (
                                    <AnimatePresence>
                                        {openDropdown === item.path && (
                                            <motion.div
                                                className="dropdown-menu glass-dropdown"
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 10 }}
                                                transition={{ duration: 0.15 }}
                                            >
                                                {item.submenu.map((subitem) => (
                                                    <Link key={subitem.path} to={subitem.path}>
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
                        <button aria-label="Search" className="search-btn">
                            <Icons.Search />
                        </button>
                        <button
                            className={`mobile-toggle ${isMobileMenuOpen ? 'active' : ''}`}
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            aria-label="Toggle menu"
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
                                {menuItems.map((item) => (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        className={isActive(item.path) ? 'active' : ''}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        {item.label}
                                    </Link>
                                ))}
                            </div>
                        </motion.nav>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
