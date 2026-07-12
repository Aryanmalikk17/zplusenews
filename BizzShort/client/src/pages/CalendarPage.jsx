import InteractiveCalendar from '../components/ui/InteractiveCalendar';

export default function CalendarPage() {
    return (
        <div className="calendar-page-container container" style={{ padding: '24px 16px', minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="calendar-page-header" style={{ textAlign: 'center', marginBottom: '24px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                    <i className="fa-solid fa-calendar-days"></i> Zplus Event Calendar
                </h1>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                    Track Indian public holidays, Hindu panchang festivals, and moon phases.
                </p>
            </div>
            <div className="calendar-page-card" style={{ width: '100%', maxWidth: '500px', margin: '0 auto' }}>
                <InteractiveCalendar />
            </div>
        </div>
    );
}
