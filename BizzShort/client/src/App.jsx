import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';

// === Lazily-loaded routes (code-split from the main bundle) ===

// Content Pages
const Article = lazy(() => import('./pages/Article'));
const Events = lazy(() => import('./pages/Events'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const Videos = lazy(() => import('./pages/Videos'));

// Category Pages
const FakeNews = lazy(() => import('./pages/FakeNews'));
const InternationalNews = lazy(() => import('./pages/InternationalNews'));
const NationalNews = lazy(() => import('./pages/NationalNews'));
const StateNews = lazy(() => import('./pages/StateNews'));
const Economics = lazy(() => import('./pages/Economics'));
const Polity = lazy(() => import('./pages/Polity'));
const Technology = lazy(() => import('./pages/Technology'));
const Environment = lazy(() => import('./pages/Environment'));
const Sports = lazy(() => import('./pages/Sports'));
const Contests = lazy(() => import('./pages/Contests'));
const LatestNews = lazy(() => import('./pages/LatestNews'));
const Health = lazy(() => import('./pages/Health'));
const Defence = lazy(() => import('./pages/Defence'));
const Culture = lazy(() => import('./pages/Culture'));
const Spirituality = lazy(() => import('./pages/Spirituality'));
const Agriculture = lazy(() => import('./pages/Agriculture'));
const Geography = lazy(() => import('./pages/Geography'));
const Religion = lazy(() => import('./pages/Religion'));
const AI = lazy(() => import('./pages/AI'));
const PositiveNews = lazy(() => import('./pages/PositiveNews'));
const Astrology = lazy(() => import('./pages/Astrology'));
const Science = lazy(() => import('./pages/Science'));
const Tourism = lazy(() => import('./pages/Tourism'));
const Others = lazy(() => import('./pages/Others'));

// Admin Pages (separate chunk — heavy, admin-only)
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));

// Import global styles
import './styles/index.css';
import './styles/mobile-fixes.css';

const PageLoader = () => (
  <div className="page-loading" aria-label="Loading page">
    <div className="page-loading-spinner" />
  </div>
);

export default function App() {
  return (
    <Router>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Main Website Routes */}
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="latest" element={<LatestNews />} />
            <Route path="article/:slug" element={<Article />} />
            <Route path="video/:videoId" element={<Article />} />

            {/* Special Categories */}
            <Route path="fake-news" element={<FakeNews />} />
            <Route path="positive-news" element={<PositiveNews />} />
            <Route path="astrology" element={<Astrology />} />

            {/* Level-based News */}
            <Route path="international-news" element={<InternationalNews />} />
            <Route path="national-news" element={<NationalNews />} />
            <Route path="state-news" element={<StateNews />} />

            {/* Interest-based Categories */}
            <Route path="economics" element={<Economics />} />
            <Route path="polity" element={<Polity />} />
            <Route path="technology" element={<Technology />} />
            <Route path="environment" element={<Environment />} />
            <Route path="sports" element={<Sports />} />
            <Route path="health" element={<Health />} />
            <Route path="defence" element={<Defence />} />
            <Route path="culture" element={<Culture />} />
            <Route path="spirituality" element={<Spirituality />} />
            <Route path="agriculture" element={<Agriculture />} />
            <Route path="geography" element={<Geography />} />
            <Route path="religion" element={<Religion />} />
            <Route path="ai" element={<AI />} />
            <Route path="science" element={<Science />} />
            <Route path="tourism" element={<Tourism />} />
            <Route path="others" element={<Others />} />

            {/* Other Pages */}
            <Route path="contests" element={<Contests />} />
            <Route path="events" element={<Events />} />
            <Route path="about" element={<About />} />
            <Route path="contact" element={<Contact />} />
            <Route path="videos" element={<Videos />} />
            <Route path="privacy" element={<PrivacyPolicy />} />
            <Route path="terms" element={<TermsOfService />} />
          </Route>

          {/* Admin Routes (No Layout) */}
          <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/panel" element={<AdminPanel />} />
        </Routes>
      </Suspense>
    </Router>
  );
}
