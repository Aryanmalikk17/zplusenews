import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import Article from './pages/Article';
import Events from './pages/Events';
import About from './pages/About';
import Contact from './pages/Contact';
import Videos from './pages/Videos';

// New Category Pages
import PositiveNews from './pages/PositiveNews';
import FakeNews from './pages/FakeNews';
import InternationalNews from './pages/InternationalNews';
import NationalNews from './pages/NationalNews';
import StateNews from './pages/StateNews';
import Economics from './pages/Economics';
import Polity from './pages/Polity';
import Technology from './pages/Technology';
import Environment from './pages/Environment';
import Sports from './pages/Sports';
import Contests from './pages/Contests';

// Admin Pages
import AdminLogin from './pages/AdminLogin';
import AdminPanel from './pages/AdminPanel';

// Import global styles
import './styles/index.css';

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Main Website Routes */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="article/:slug" element={<Article />} />

          {/* Special Categories */}
          <Route path="positive-news" element={<PositiveNews />} />
          <Route path="fake-news" element={<FakeNews />} />

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

          {/* Other Pages */}
          <Route path="contests" element={<Contests />} />
          <Route path="events" element={<Events />} />
          <Route path="about" element={<About />} />
          <Route path="contact" element={<Contact />} />
          <Route path="videos" element={<Videos />} />
        </Route>

        {/* Admin Routes (No Layout) */}
        <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/panel" element={<AdminPanel />} />
      </Routes>
    </Router>
  );
}


