import { Link } from 'react-router-dom';
import '../../styles/footer.css';

const footerLinks = {
    categories: [
        { path: '/technology', label: 'Technology' },
        { path: '/business', label: 'Business' },
        { path: '/business/startups', label: 'Startups' },
        { path: '/business/markets', label: 'Markets' },
        { path: '/innovation', label: 'Innovation' },
    ],
    company: [
        { path: '/about', label: 'About Us' },
        { path: '/contact', label: 'Contact' },
        { path: '/advertise', label: 'Advertise' },
        { path: '/events', label: 'Events' },
    ],
    legal: [
        { path: '/privacy', label: 'Privacy Policy' },
        { path: '/terms', label: 'Terms of Service' },
        { path: '/cookies', label: 'Cookie Policy' },
    ],
};

const socialLinks = [
    { href: 'https://facebook.com/zplusenews', icon: 'facebook', label: 'Facebook' },
    { href: 'https://twitter.com/zplusenews', icon: 'twitter', label: 'Twitter' },
    { href: 'https://linkedin.com/company/zplusenews', icon: 'linkedin', label: 'LinkedIn' },
    { href: 'https://instagram.com/zplusenews', icon: 'instagram', label: 'Instagram' },
    { href: 'https://youtube.com/@zplusenews', icon: 'youtube', label: 'YouTube' },
];

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="footer">
            <div className="container">
                <div className="footer-grid">
                    {/* Brand Column */}
                    <div className="footer-brand">
                        <Link to="/" className="footer-logo">
                            <img src="/assets/images/logo.png" alt="ZPluse News" />
                            <span>ZPluse News</span>
                        </Link>
                        <p className="footer-description">
                            Your trusted source for cutting-edge tech news, startup insights, and business analysis.
                            Stay ahead with ZPluse News - your next-gen digital magazine.
                        </p>
                        <div className="footer-social">
                            {socialLinks.map((social) => (
                                <a
                                    key={social.label}
                                    href={social.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={social.label}
                                    className={`social-icon ${social.icon}`}
                                >
                                    <i className={`fab fa-${social.icon}`}></i>
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Categories Column */}
                    <div className="footer-column">
                        <h4>Categories</h4>
                        <ul>
                            {footerLinks.categories.map((link) => (
                                <li key={link.path}>
                                    <Link to={link.path}>{link.label}</Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Company Column */}
                    <div className="footer-column">
                        <h4>Company</h4>
                        <ul>
                            {footerLinks.company.map((link) => (
                                <li key={link.path}>
                                    <Link to={link.path}>{link.label}</Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Legal Column */}
                    <div className="footer-column">
                        <h4>Legal</h4>
                        <ul>
                            {footerLinks.legal.map((link) => (
                                <li key={link.path}>
                                    <Link to={link.path}>{link.label}</Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Footer Bottom */}
                <div className="footer-bottom">
                    <p>© {currentYear} ZPluse News. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
}
