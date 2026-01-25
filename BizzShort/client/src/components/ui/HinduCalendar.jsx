import { useState, useEffect } from 'react';
import '../../styles/calendar.css';

// Hindu festivals for 2026 (sample data - you can expand this)
const hinduFestivals2026 = {
    '2026-01-14': { name: 'Makar Sankranti', type: 'major' },
    '2026-01-26': { name: 'Republic Day', type: 'national' },
    '2026-02-17': { name: 'Maha Shivaratri', type: 'major' },
    '2026-03-14': { name: 'Holi', type: 'major' },
    '2026-03-30': { name: 'Ram Navami', type: 'major' },
    '2026-04-14': { name: 'Baisakhi', type: 'regional' },
    '2026-04-21': { name: 'Hanuman Jayanti', type: 'major' },
    '2026-08-15': { name: 'Independence Day', type: 'national' },
    '2026-08-27': { name: 'Janmashtami', type: 'major' },
    '2026-09-05': { name: 'Ganesh Chaturthi', type: 'major' },
    '2026-10-02': { name: 'Gandhi Jayanti', type: 'national' },
    '2026-10-17': { name: 'Dussehra', type: 'major' },
    '2026-11-05': { name: 'Diwali', type: 'major' },
    '2026-11-19': { name: 'Guru Nanak Jayanti', type: 'major' },
    '2026-12-25': { name: 'Christmas', type: 'national' },
};

export default function HinduCalendar() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedMonth, setSelectedMonth] = useState(new Date());

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        return new Date(year, month, 1).getDay();
    };

    const formatDate = (year, month, day) => {
        const m = String(month + 1).padStart(2, '0');
        const d = String(day).padStart(2, '0');
        return `${year}-${m}-${d}`;
    };

    const getFestival = (year, month, day) => {
        const dateKey = formatDate(year, month, day);
        return hinduFestivals2026[dateKey];
    };

    const isToday = (year, month, day) => {
        const today = new Date();
        return (
            today.getFullYear() === year &&
            today.getMonth() === month &&
            today.getDate() === day
        );
    };

    const previousMonth = () => {
        setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1));
    };

    const renderCalendar = () => {
        const year = selectedMonth.getFullYear();
        const month = selectedMonth.getMonth();
        const daysInMonth = getDaysInMonth(selectedMonth);
        const firstDay = getFirstDayOfMonth(selectedMonth);

        const days = [];

        // Empty cells for days before month starts
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
        }

        // Days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const festival = getFestival(year, month, day);
            const today = isToday(year, month, day);

            days.push(
                <div
                    key={day}
                    className={`calendar-day ${today ? 'today' : ''} ${festival ? 'festival' : ''} ${festival?.type || ''}`}
                    title={festival?.name || ''}
                >
                    <span className="day-number">{day}</span>
                    {festival && (
                        <div className="festival-indicator">
                            <span className="festival-dot"></span>
                        </div>
                    )}
                </div>
            );
        }

        return days;
    };

    const getUpcomingFestivals = () => {
        const today = new Date();
        const upcoming = [];

        for (const [dateStr, festival] of Object.entries(hinduFestivals2026)) {
            const festivalDate = new Date(dateStr);
            if (festivalDate >= today) {
                upcoming.push({ date: festivalDate, ...festival });
            }
        }

        return upcoming.sort((a, b) => a.date - b.date).slice(0, 3);
    };

    const upcomingFestivals = getUpcomingFestivals();

    return (
        <div className="hindu-calendar-widget">
            <div className="calendar-header">
                <h3 className="calendar-title">
                    <span>🕉️</span> Hindu Calendar
                </h3>
            </div>

            <div className="calendar-month-selector">
                <button onClick={previousMonth} className="month-nav-btn" aria-label="Previous month">
                    ‹
                </button>
                <div className="current-month">
                    {monthNames[selectedMonth.getMonth()]} {selectedMonth.getFullYear()}
                </div>
                <button onClick={nextMonth} className="month-nav-btn" aria-label="Next month">
                    ›
                </button>
            </div>

            <div className="calendar-weekdays">
                <div>Sun</div>
                <div>Mon</div>
                <div>Tue</div>
                <div>Wed</div>
                <div>Thu</div>
                <div>Fri</div>
                <div>Sat</div>
            </div>

            <div className="calendar-grid">
                {renderCalendar()}
            </div>

            <div className="calendar-legend">
                <div className="legend-item">
                    <span className="legend-dot major"></span>
                    <span>Major Festival</span>
                </div>
                <div className="legend-item">
                    <span className="legend-dot national"></span>
                    <span>National Holiday</span>
                </div>
            </div>

            <div className="upcoming-festivals">
                <h4>Upcoming Festivals</h4>
                {upcomingFestivals.map((festival, index) => (
                    <div key={index} className={`festival-item ${festival.type}`}>
                        <div className="festival-date">
                            {festival.date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                        </div>
                        <div className="festival-name">{festival.name}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}
