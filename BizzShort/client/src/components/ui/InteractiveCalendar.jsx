import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { calendarAPI } from '../../services/api';
import '../../styles/calendar.css';

export default function InteractiveCalendar() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(null);
    const [highlights, setHighlights] = useState([]);
    const [dayContent, setDayContent] = useState({ articles: [], videos: [], events: [] });
    const [loadingContent, setLoadingContent] = useState(false);
    const [showDrawer, setShowDrawer] = useState(false);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth(); // 0-indexed

    // Fetch highlights for the current month
    useEffect(() => {
        const fetchHighlights = async () => {
            try {
                // Backend expects month 1-12
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

    // Fetch articles/videos/events when selectedDate changes
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
        // Pad month and date for YYYY-MM-DD format
        const pad = (num) => String(num).padStart(2, '0');
        const dateStr = `${year}-${pad(month + 1)}-${pad(dayNum)}`;
        setSelectedDate(dateStr);
        setShowDrawer(true);
    };

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
            const hasHighlight = highlights.includes(dateStr);

            days.push(
                <button
                    key={`day-${day}`}
                    className={`calendar-day-cell active-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${hasHighlight ? 'highlighted' : ''}`}
                    onClick={() => handleDateClick(day)}
                    aria-label={`Select ${day} ${formatMonthName(month)} ${year}`}
                >
                    <span className="day-number">{day}</span>
                    {hasHighlight && <span className="highlight-dot"></span>}
                </button>
            );
        }

        return days;
    };

    return (
        <div className="interactive-calendar-widget glass-card">
            <div className="calendar-header">
                <h3 className="widget-title">
                    <i className="fa-solid fa-calendar-days widget-icon"></i>
                    News Archive & Events
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
                        {loadingContent ? (
                            <div className="drawer-loader">
                                <div className="spinner"></div>
                                <p>Loading articles & events...</p>
                            </div>
                        ) : (
                            <div className="drawer-lists">
                                {dayContent.events.length === 0 && dayContent.articles.length === 0 && dayContent.videos.length === 0 ? (
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
                                                    Scheduled Events
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
                                                        <Link key={vid._id} to={`/video/${vid.videoId}`} className="archive-item-link">
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
