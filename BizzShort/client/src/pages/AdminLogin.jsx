import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../services/api';
import '../styles/admin.css';

export default function AdminLogin() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        username: '',
        password: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Auth migration reminder
    useEffect(() => {
        // eslint-disable-next-line no-console
        console.log('Please clear your browser cookies and localStorage before logging in again.');
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // adminAPI.login uses the Axios instance with withCredentials:true
            // The server sets the httpOnly adminToken cookie on success
            const data = await adminAPI.login(formData);

            if (data.success) {
                // Token is managed via httpOnly cookie set by the server.
                // Only store non-sensitive user info in localStorage.
                localStorage.setItem('adminUser', JSON.stringify(data.user));
                navigate('/admin/panel');
            } else {
                setError(data.error || 'Login failed');
            }
        } catch (err) {
            setError(err?.error || err?.message || 'Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="admin-login-page">
            <div className="login-container">
                <div className="login-header">
                    <img src="/assets/images/logo.png" alt="ZPluse News" className="admin-logo" />
                    <h2>Admin Login</h2>
                </div>

                {error && (
                    <div className="login-error">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group">
                        <label>Username or Email</label>
                        <input
                            type="text"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            placeholder="Enter your username"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            placeholder="Enter your password"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn-login"
                        disabled={loading}
                    >
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>

                <div className="login-footer">
                    <p className="warning">Authorised personnel only. Contact admin for access.</p>
                </div>
            </div>
        </div>
    );
}
