import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './SetPassword.css';

const API_BASE = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000/api";

const SetPassword = () => {
    const { uid, token } = useParams();
    const navigate = useNavigate();
    
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        if (password.length < 8) {
            setError("Password must be at least 8 characters long.");
            return;
        }
        
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);
        try {
            await axios.post(`${API_BASE}/set-password/`, {
                uid,
                token,
                new_password: password
            });
            setSuccess(true);
            setTimeout(() => navigate('/login'), 3000);
        } catch (err) {
            setError(err.response?.data?.error || "Failed to set password. Link may be expired.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="set-password-container">
            <div className="set-password-card">
                <h2>Set Your Password</h2>
                <p>Welcome to EMS. Please set a secure password for your account.</p>
                
                {success ? (
                    <div className="success-message">
                        <p>Password set successfully! Redirecting to login...</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        {error && <div className="error-alert">{error}</div>}
                        
                        <div className="form-group">
                            <label>New Password</label>
                            <input 
                                type="password" 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)} 
                                required 
                                placeholder="Enter new password"
                            />
                        </div>
                        
                        <div className="form-group">
                            <label>Confirm Password</label>
                            <input 
                                type="password" 
                                value={confirmPassword} 
                                onChange={(e) => setConfirmPassword(e.target.value)} 
                                required 
                                placeholder="Confirm your password"
                            />
                        </div>
                        
                        <button type="submit" disabled={loading} className="submit-btn">
                            {loading ? "Processing..." : "Set Password"}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default SetPassword;
