import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { calendarAPI } from '../../services/api';
import { DataCoordinator, EventProcessor } from '../../services/calendarService';
import '../../styles/calendar.css';

// Initialize the DataCoordinator
const coordinator = new DataCoordinator({
    providerType: 'prokerala',
    providerConfig: { apiEndpoint: '/api/prokerala' }
});

export default function InteractiveCalendar() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(null);
    
    // Core content hooks
    const [highlights, setHighlights] = useState([]);
    const [dayContent, setDayContent] = useState({ articles: [], videos: [], events: [] });
    
    // External calendar events (holidays, moon phases, Hindu festivals)
    const [externalEvents, setExternalEvents] = useState({});
    const [isLoadingExternal, setIsLoadingExternal] = useState(false);
    const [externalError, setExternalError] = useState(null);
    
    // Role-based state simulation (Guest vs. Subscriber)
    const [userRole, setUserRole] = useState(() => {
        return localStorage.getItem('user_sim_role') || 'Guest';
    });

    const [loadingContent, setLoadingContent] = useState(false);
    const [showDrawer, setShowDrawer] = useState(false);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth(); // 0-indexed

    // Save selected role to local storage for persistent testing
    const handleRoleChange = (role) => {
        setUserRole(role);
        localStorage.setItem('user_sim_role', role);
    };

    // 1. Fetch Backend News Highlights
    useEffect(() => {
        const fetchHighlights = async () => {
            try {
                const response = await calendarAPI.getHighlights(year, month + 1);
                if (response?.success && Array.isArray(response?.data)) {
                    setHighlights(response.data);
                }
            } catch (err) {
                console.error('Error fetching calendar highlights:', err);
            }
        };
        fetchHighlights();
    }, [year, month]);

    // 2. Fetch Resilient External Calendar Data (Holidays, Hindu Calendar, Moon Phases)
    useEffect(() => {
        const fetchExternalCalendar = async () => {
            setIsLoadingExternal(true);
            setExternalError(null);
            try {
                // Fetch using our data coordinator (respects caching & TTL strategy)
                const result = await coordinator.getEvents(year, month + 1, 'IN');
                
                // PERFORMANCE OPTIMIZATION: Process data in requestIdleCallback to keep navigation buttery smooth (60fps)
                const runIdleProcess = () => {
                    const grouped = EventProcessor.groupEventsByDate(result.events);
                    setExternalEvents(grouped);
                    if (result.error) {
                        setExternalError(result.error);
                    }
                };

                if (window.requestIdleCallback) {
                    window.requestIdleCallback(runIdleProcess);
                } else {
                    setTimeout(runIdleProcess, 1);
                }
            } catch (err) {
                console.error("Critical error in calendar coordinator:", err);
                setExternalError("Calendar events temporarily unavailable.");
            } finally {
                setIsLoadingExternal(false);
            }
        };

        fetchExternalCalendar();
    }, [year, month]);

    // 3. Fetch News/Video/Event details for the selected date
    useEffect(() => {
        if (!selectedDate) return;

        const fetchDateContent = async () => {
            setLoadingContent(true);
            try {
                const response = await calendarAPI.getContent(selectedDate);
                if (response?.success && response?.data) {
                    setDayContent({
                        articles: response.data.articles || [],
                        videos: response.data.videos || [],
                        events: response.data.events || []
                    });
                }
            } catch (err) {
                console.error('Error fetching calendar content:', err);
                setDayContent({ articles: [], videos: [], events: [] });
            } finally {
                setLoadingContent(false);
            }
        };

        fetchDateContent();
    }, [selectedDate]);

    // Calendar Calculations
    const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
    const getFirstDayOfMonth = (y, m) => new Date(y, m, 1).getDay();

    const daysInMonth = getDaysInMonth(year, month);
    const firstDayIndex = getFirstDayOfMonth(year, month);

    const prevMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
        setShowDrawer(false);
        setSelectedDate(null);
    };

    const nextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
        setShowDrawer(false);
        setSelectedDate(null);
    };

    const formatMonthName = (mIndex) => {
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        return months[mIndex];
    };

    const handleDateClick = (dayNum) => {
        const pad = (num) => String(num).padStart(2, '0');
        const dateStr = `${year}-${pad(month + 1)}-${pad(dayNum)}`;
        setSelectedDate(dateStr);
        setShowDrawer(true);
    };

    // Render calendar day cells with markers
    const renderDays = () => {
        const days = [];
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        // Empty cells for alignment before first day of month
        for (let i = 0; i < firstDayIndex; i++) {
            days.push(<div key={`empty-${i}`} className="calendar-day-cell empty"></div>);
        }

        // Days of current month
        for (let day = 1; day <= daysInMonth; day++) {
            const pad = (num) => String(num).padStart(2, '0');
            const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`;
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;
            const hasNewsHighlight = highlights.includes(dateStr);
            
            // Extract external events for this day
            const dayExternalList = externalEvents[dateStr] || [];
            const classification = EventProcessor.classifyDayStyles(dayExternalList);

            // Construct style classes based on classification
            let markerClass = '';
            if (classification.hasHoliday) markerClass += ' day-holiday';
            if (classification.hasFestival) markerClass += ' day-festival';
            if (classification.hasMoon) markerClass += ' day-moon';
            if (classification.hasPremium) markerClass += ' day-premium';

            days.push(
                <button
                    key={`day-${day}`}
                    className={`calendar-day-cell active-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${hasNewsHighlight ? 'highlighted' : ''} ${markerClass}`}
                    onClick={() => handleDateClick(day)}
                    aria-label={`Select ${day} ${formatMonthName(month)} ${year}`}
                >
                    <span className="day-number">{day}</span>
                    
                    {/* Visual Markers container to avoid DOM reflows */}
                    <div className="markers-wrapper">
                        {hasNewsHighlight && <span className="marker-dot news-dot" title="News updates available"></span>}
                        {classification.hasFestival && <span className="marker-dot festival-dot" title="Hindu festival/event"></span>}
                        {classification.hasHoliday && <span className="marker-dot holiday-dot" title="Public Holiday"></span>}
                        {classification.hasMoon && <span className="marker-dot moon-dot" title="Moon Phase event"></span>}
                    </div>
                </button>
            );
        }

        return days;
    };

    const selectedDayExternal = selectedDate ? (externalEvents[selectedDate] || []) : [];

    return (
        <div className="interactive-calendar-widget glass-card">
            {/* Role Simulator Switcher for testing */}
            <div className="role-simulator-bar">
                <span className="role-label">User View:</span>
                <button 
                    className={`role-btn ${userRole === 'Guest' ? 'active' : ''}`}
                    onClick={() => handleRoleChange('Guest')}
                >
                    Guest
                </button>
                <button 
                    className={`role-btn ${userRole === 'Subscriber' ? 'active' : ''}`}
                    onClick={() => handleRoleChange('Subscriber')}
                >
                    Subscriber
                </button>
            </div>

            <div className="calendar-header">
                <h3 className="widget-title">
                    <i className="fa-solid fa-calendar-days widget-icon"></i>
                    News Archive & Events
                    {isLoadingExternal && <span className="header-loading-spinner" title="Syncing external calendar data..."></span>}
                </h3>
                <div className="calendar-nav">
                    <button onClick={prevMonth} aria-label="Previous Month" className="nav-btn">
                        <i className="fa-solid fa-chevron-left"></i>
                    </button>
                    <span className="current-month-display">
                        {formatMonthName(month)} {year}
                    </span>
                    <button onClick={nextMonth} aria-label="Next Month" className="nav-btn">
                        <i className="fa-solid fa-chevron-right"></i>
                    </button>
                </div>
            </div>

            {/* Expired/API Warning Message */}
            {externalError && (
                <div className="calendar-warning-alert">
                    <i className="fa-solid fa-triangle-exclamation"></i>
                    <span>{externalError}</span>
                </div>
            )}

            <div className="calendar-weekdays">
                <div>Su</div>
                <div>Mo</div>
                <div>Tu</div>
                <div>We</div>
                <div>Th</div>
                <div>Fr</div>
                <div>Sa</div>
            </div>

            <div className="calendar-grid">
                {renderDays()}
            </div>

            {/* Custom Visual Legend to make user interface highly aesthetic */}
            <div className="calendar-legend-bar">
                <div className="legend-item"><span className="legend-marker news"></span>News</div>
                <div className="legend-item"><span className="legend-marker festival"></span>Festival</div>
                <div className="legend-item"><span className="legend-marker holiday"></span>Holiday</div>
                <div className="legend-item"><span className="legend-marker moon"></span>Moon Phase</div>
            </div>

            {/* Event & News Content Drawer */}
            {showDrawer && (
                <div className="calendar-drawer glass-drawer">
                    <div className="drawer-header">
                        <h4 className="drawer-title">
                            <i className="fa-solid fa-folder-open"></i>
                            {selectedDate ? new Date(selectedDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                        </h4>
                        <button className="close-btn" onClick={() => setShowDrawer(false)} aria-label="Close drawer">
                            <i className="fa-solid fa-xmark"></i>
                        </button>
                    </div>

                    <div className="drawer-content">
                        {/* 1. Hindu Calendar & Holiday Events (Highest Priority Overlay) */}
                        {selectedDayExternal.length > 0 && (
                            <div className="drawer-section external-events-section">
                                <h5>
                                    <i className="fa-solid fa-om section-icon"></i>
                                    Astrology & Holiday details
                                </h5>
                                <div className="external-events-list">
                                    {selectedDayExternal.map((event) => {
                                        const isGated = event.isPremium && userRole !== 'Subscriber';
                                        
                                        return (
                                            <div key={event.id} className={`ext-event-card type-${event.type} ${isGated ? 'gated-card' : ''}`}>
                                                <div className="ext-event-header">
                                                    <span className="ext-event-badge">{event.type}</span>
                                                    <span className="ext-event-title">{event.title}</span>
                                                </div>
                                                <p className="ext-event-desc">{event.description}</p>
                                                
                                                {/* Premium Muhurta details gating */}
                                                {event.isPremium && (
                                                    <div className="premium-muhurta-wrapper">
                                                        {isGated ? (
                                                            <div className="muhurta-lock-overlay">
                                                                <div className="lock-icon-container">
                                                                    <i className="fa-solid fa-lock"></i>
                                                                </div>
                                                                <div className="lock-content">
                                                                    <h6>Muhurta Ritual & Auspiciousness</h6>
                                                                    <p>Upgrade to a Subscriber to unlock deep auspicious timings & specialized ritual directions.</p>
                                                                    <button className="unlock-btn-cta" onClick={() => alert("Subscription page loading...")}>
                                                                        <i className="fa-solid fa-gem"></i> Subscribe to Unlock
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="muhurta-details-panel">
                                                                <div className="panel-header">
                                                                    <i className="fa-solid fa-wand-magic-sparkles"></i>
                                                                    <span>Auspicious Muhurta Analysis</span>
                                                                </div>
                                                                <div className="panel-grid">
                                                                    <div className="grid-item">
                                                                        <span className="label">Auspiciousness</span>
                                                                        <span className="value text-success">{event.muhurtaDetails?.auspiciousness}</span>
                                                                    </div>
                                                                    <div className="grid-item">
                                                                        <span className="label">Duration</span>
                                                                        <span className="value">{event.muhurtaDetails?.duration}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="panel-ritual">
                                                                    <strong>Ritual Guidelines:</strong>
                                                                    <p>{event.muhurtaDetails?.ritual}</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* 2. Standard News Content Details */}
                        {loadingContent ? (
                            <div className="drawer-loader">
                                <div className="spinner"></div>
                                <p>Loading articles & events...</p>
                            </div>
                        ) : (
                            <div className="drawer-lists">
                                {dayContent.events.length === 0 && dayContent.articles.length === 0 && dayContent.videos.length === 0 && selectedDayExternal.length === 0 ? (
                                    <p className="no-content-message">
                                        <i className="fa-solid fa-box-open empty-icon"></i>
                                        No articles or scheduled events archived for this date.
                                    </p>
                                ) : (
                                    <>
                                        {/* Scheduled Events */}
                                        {dayContent.events.length > 0 && (
                                            <div className="drawer-section">
                                                <h5>
                                                    <i className="fa-solid fa-circle-exclamation section-icon"></i>
                                                    Local Scheduled Events
                                                </h5>
                                                <ul className="calendar-event-list">
                                                    {dayContent.events.map((event) => (
                                                        <li key={event._id} className="event-item">
                                                            <div className="event-time">
                                                                <i className="fa-solid fa-clock"></i>
                                                                {event.time || 'All Day'}
                                                            </div>
                                                            <div className="event-title">{event.title}</div>
                                                            {event.description && <div className="event-desc">{event.description}</div>}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {/* Articles */}
                                        {dayContent.articles.length > 0 && (
                                            <div className="drawer-section">
                                                <h5>
                                                    <i className="fa-solid fa-newspaper section-icon"></i>
                                                    Articles
                                                </h5>
                                                <div className="archive-articles-list">
                                                    {dayContent.articles.map((art) => (
                                                        <Link key={art._id} to={`/article/${art.slug}`} className="archive-item-link">
                                                            <div className="archive-item-title">{art.title}</div>
                                                            <div className="archive-item-meta">
                                                                <span className="category-badge">{art.category}</span>
                                                                <span><i className="fa-solid fa-eye"></i> {art.views || 0}</span>
                                                            </div>
                                                        </Link>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Videos */}
                                        {dayContent.videos.length > 0 && (
                                            <div className="drawer-section">
                                                <h5>
                                                    <i className="fa-solid fa-circle-play section-icon"></i>
                                                    Videos
                                                </h5>
                                                <div className="archive-articles-list">
                                                    {dayContent.videos.map((vid) => (
                                                        <Link key={vid._id} to={`/video/${vid.slug || vid.videoId}`} className="archive-item-link">
                                                            <div className="archive-item-title">
                                                                <i className="fa-brands fa-youtube play-btn-mini"></i>
                                                                {vid.title}
                                                            </div>
                                                            <div className="archive-item-meta">
                                                                <span className="category-badge">{vid.category}</span>
                                                            </div>
                                                        </Link>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
