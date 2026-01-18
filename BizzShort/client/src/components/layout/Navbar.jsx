import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import '../../styles/navbar.css';

// Icons (using simple SVG for now, can replace with react-icons)
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
    Facebook: () => <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 2.04C6.5 2.04 2 6.53 2 12.06C2 17.06 5.66 21.21 10.44 21.96V14.96H7.9V12.06H10.44V9.85C10.44 7.34 11.93 5.96 14.22 5.96C15.31 5.96 16.45 6.15 16.45 6.15V8.62H15.19C13.95 8.62 13.56 9.39 13.56 10.18V12.06H16.34L15.89 14.96H13.56V21.96A10 10 0 0 0 22 12.06C22 6.53 17.5 2.04 12 2.04Z" /></svg>,
    Twitter: () => <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z" /></svg>,
    LinkedIn: () => <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" /></svg>,
    Instagram: () => <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6m9.65 1.5a1.25 1.25 0 0 1 1.25 1.25A1.25 1.25 0 0 1 17.25 8 1.25 1.25 0 0 1 16 6.75a1.25 1.25 0 0 1 1.25-1.25M12 7a5 5 0 0 1 5 5 5 5 0 0 1-5 5 5 5 0 0 1-5-5 5 5 0 0 1 5-5m0 2a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3z" /></svg>,
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

const socialLinks = [
    { href: 'https://facebook.com/zplusenews', icon: 'Facebook', label: 'Facebook' },
    { href: 'https://twitter.com/zplusenews', icon: 'Twitter', label: 'Twitter' },
    { href: 'https://linkedin.com/company/zplusenews', icon: 'LinkedIn', label: 'LinkedIn' },
    { href: 'https://instagram.com/zplusenews', icon: 'Instagram', label: 'Instagram' },
];

export default function Navbar() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [openDropdown, setOpenDropdown] = useState(null);
    const location = useLocation();

    // Format current date
    const currentDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });

    // Detect when Business & Markets section is in view using IntersectionObserver
    useEffect(() => {
        const businessSection = document.getElementById('business');

        if (!businessSection) {
            // Fallback to scroll-based detection if section not found
            const handleScroll = () => {
                setIsScrolled(window.scrollY > 100);
            };
            window.addEventListener('scroll', handleScroll);
            return () => window.removeEventListener('scroll', handleScroll);
        }

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    // When business section enters viewport, show top navbar
                    if (entry.isIntersecting) {
                        setIsScrolled(true);
                    } else {
                        // Check if we're above the section (scrolled back up)
                        const rect = businessSection.getBoundingClientRect();
                        if (rect.top > window.innerHeight) {
                            setIsScrolled(false);
                        }
                    }
                });
            },
            {
                root: null,
                rootMargin: '-100px 0px 0px 0px', // Trigger slightly before reaching section
                threshold: 0
            }
        );

        observer.observe(businessSection);

        return () => observer.disconnect();
    }, [location.pathname]);

    // Close mobile menu on route change
    useEffect(() => {
        setIsMobileMenuOpen(false);
        setOpenDropdown(null);
    }, [location]);

    const isActive = (path) => {
        if (path === '/') return location.pathname === '/';
        return location.pathname.startsWith(path);
    };

    const renderIcon = (iconName) => {
        const IconComponent = Icons[iconName];
        return IconComponent ? <IconComponent /> : null;
    };

    return (
        <>
            {/* Sidebar Navigation (visible at top of page) */}
            <aside className={`sidebar ${isScrolled ? 'hidden' : ''}`}>
                {/* Sidebar Top */}
                <div className="sidebar-top">
                    <span className="sidebar-date">{currentDate}</span>
                    <div className="sidebar-social">
                        {socialLinks.map((social) => (
                            <a
                                key={social.label}
                                href={social.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={social.label}
                            >
                                {renderIcon(social.icon)}
                            </a>
                        ))}
                    </div>
                </div>

                {/* Sidebar Logo */}
                <div className="sidebar-logo">
                    <Link to="/">
                        <img src="/assets/images/logo.png" alt="ZPluse News" />
                        <span className="brand-name">ZPluse News</span>
                        <span className="tagline">Next-Gen Digital Magazine</span>
                    </Link>
                </div>

                {/* Sidebar Menu */}
                <nav className="sidebar-menu">
                    {menuItems.map((item) => (
                        <div key={item.path} className="sidebar-menu-item">
                            <Link
                                to={item.path}
                                className={isActive(item.path) ? 'active' : ''}
                            >
                                <span className="icon">{renderIcon(item.icon)}</span>
                                {item.label}
                            </Link>
                        </div>
                    ))}
                </nav>

                {/* Sidebar Footer */}
                <div className="sidebar-footer">
                    <p>© 2026 ZPluse News</p>
                </div>
            </aside>

            {/* Top Navbar (visible when reaching Business & Markets section) */}
            <header className={`top-navbar glassmorphic ${isScrolled ? 'visible' : ''}`}>
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
                                                className="dropdown-menu"
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
                        <button aria-label="Search">
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

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        className="mobile-menu-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsMobileMenuOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* Advertisement Banner (appears in sidebar position when scrolled) */}
            <AnimatePresence>
                {isScrolled && (
                    <motion.div
                        className="ad-banner"
                        initial={{ x: -100, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -100, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                    >
                        <div className="ad-banner-content">
                            <span className="ad-label">Advertisement</span>
                            <div className="ad-placeholder">
                                <div className="ad-text">
                                    <span className="ad-title">Your Ad Here</span>
                                    <span className="ad-subtitle">Premium Placement</span>
                                </div>
                                <button className="ad-cta">Learn More</button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
