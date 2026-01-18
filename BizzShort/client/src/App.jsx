import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import Article from './pages/Article';
import Events from './pages/Events';
import About from './pages/About';
import Contact from './pages/Contact';

// Import global styles
import './styles/index.css';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="article/:slug" element={<Article />} />
          <Route path="events" element={<Events />} />
          <Route path="about" element={<About />} />
          <Route path="contact" element={<Contact />} />
          <Route path="technology" element={<Home />} />
          <Route path="technology/:category" element={<Home />} />
          <Route path="business" element={<Home />} />
          <Route path="business/:category" element={<Home />} />
          <Route path="innovation" element={<Home />} />
        </Route>
      </Routes>
    </Router>
  );
}
