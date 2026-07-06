import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CATEGORIES, GET_CATEGORIES_BY_GROUP } from '../../config/categories';
import '../../styles/navbar.css';

// Icons (using simple SVG)
const Icons = {
    Home: () => <i className="fa-solid fa-house header-icon"></i>,
    ChevronDown: () => <i className="fa-solid fa-chevron-down dropdown-arrow-icon"></i>,
    Search: () => <i className="fa-solid fa-magnifying-glass action-icon"></i>,
    Trophy: () => <i className="fa-solid fa-trophy trophy-icon"></i>,
};

const menuItems = [
    { path: '/', label: 'Home', icon: 'Home' },
    { path: '/fake-news', label: 'Fake News' },
    { path: '/positive-news', label: 'Positive News' },
    {
        label: 'Levels News',
        submenu: GET_CATEGORIES_BY_GROUP('levels').map(cat => ({
            path: cat.path,
            label: cat.label,
            icon: cat.icon
        }))
    },
    { path: '/astrology', label: 'Astrology' }
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
                <div className="main-nav-row" style={{ width: '100%' }}>
                    <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
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
                                                            className={`dropdown-item-link ${isActive(subitem.path) ? 'active' : ''}`}
                                                        >
                                                            {subitem.icon && <i className={`${subitem.icon} dropdown-item-icon`} aria-hidden="true"></i>}
                                                            <span>{subitem.label}</span>
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
                </div>

                {/* Sub-Navbar for Interested Fields */}
                <div className="sub-navbar">
                    <div className="container">
                        <div className="sub-nav-links">
                            {GET_CATEGORIES_BY_GROUP('interests').map((cat) => (
                                <Link
                                    key={cat.path}
                                    to={cat.path}
                                    className={`sub-nav-link ${isActive(cat.path) ? 'active' : ''}`}
                                >
                                    {cat.icon && <i className={`${cat.icon} sub-nav-icon`} aria-hidden="true"></i>}
                                    <span>{cat.label}</span>
                                </Link>
                            ))}
                        </div>
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
                            <div className="mobile-menu-links" style={{ overflowY: 'auto', flex: 1, paddingBottom: '24px' }}>
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
                                                            className={`mobile-submenu-item ${isActive(subitem.path) ? 'active' : ''}`}
                                                            onClick={() => setIsMobileMenuOpen(false)}
                                                        >
                                                            {subitem.icon && <i className={`${subitem.icon} mobile-item-icon`} aria-hidden="true"></i>}
                                                            <span>{subitem.label}</span>
                                                        </Link>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}

                                <div className="mobile-menu-section">
                                    <div className="mobile-submenu-title">Topics</div>
                                    <div className="mobile-submenu">
                                        {GET_CATEGORIES_BY_GROUP('interests').map((subitem) => (
                                            <Link
                                                key={subitem.path}
                                                to={subitem.path}
                                                className={`mobile-submenu-item ${isActive(subitem.path) ? 'active' : ''}`}
                                                onClick={() => setIsMobileMenuOpen(false)}
                                            >
                                                {subitem.icon && <i className={`${subitem.icon} mobile-item-icon`} aria-hidden="true"></i>}
                                                <span>{subitem.label}</span>
                                            </Link>
                                        ))}
                                    </div>
                                </div>

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
