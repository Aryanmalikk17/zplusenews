import { useNavigate } from 'react-router-dom';
import InteractiveCalendar from '../components/ui/InteractiveCalendar';

export default function CalendarPage() {
    const navigate = useNavigate();

    return (
        <div className="calendar-page-container container" style={{ padding: '24px 16px', minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* Back Button Row */}
            <div style={{ width: '100%', maxWidth: '500px', display: 'flex', justifyContent: 'flex-start', marginBottom: '16px' }}>
                <button 
                    onClick={() => navigate(-1)} 
                    className="calendar-back-btn"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 14px',
                        borderRadius: '20px',
                        background: 'rgba(0, 0, 0, 0.04)',
                        color: 'var(--text-secondary)',
                        fontWeight: '600',
                        fontSize: '13px',
                        transition: 'all 0.2s ease',
                        border: 'none',
                        cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(170, 33, 35, 0.1)';
                        e.currentTarget.style.color = 'var(--primary)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(0, 0, 0, 0.04)';
                        e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                >
                    <i className="fa-solid fa-arrow-left"></i> Back
                </button>
            </div>

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
