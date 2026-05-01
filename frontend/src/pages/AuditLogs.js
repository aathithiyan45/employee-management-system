import React, { useState, useEffect } from 'react';
import api from '../axiosInstance';
import './AuditLogs.css';

const AuditLogs = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filters, setFilters] = useState({
        user: '',
        action: '',
        date: ''
    });

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.user) params.append('user', filters.user);
            if (filters.action) params.append('action', filters.action);
            if (filters.date) params.append('date', filters.date);

            const res = await api.get(`audit-logs/?${params.toString()}`);
            setLogs(res.data);
            setError('');
        } catch (err) {
            setError('Failed to fetch audit logs.');
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    const getActionClass = (action) => {
        if (action.includes('delete')) return 'action-danger';
        if (action.includes('failed')) return 'action-warning';
        if (action.includes('create') || action.includes('import')) return 'action-success';
        return 'action-info';
    };

    return (
        <div className="audit-logs-page">
            <div className="page-header">
                <h1>Audit Logs</h1>
                <p>Monitor all system activities and security events.</p>
            </div>

            <div className="filter-bar">
                <input 
                    type="text" 
                    name="user" 
                    placeholder="Filter by User..." 
                    value={filters.user} 
                    onChange={handleFilterChange}
                />
                <select name="action" value={filters.action} onChange={handleFilterChange}>
                    <option value="">All Actions</option>
                    <option value="login">Login</option>
                    <option value="login_failed">Login Failed</option>
                    <option value="employee_create">Employee Create</option>
                    <option value="employee_delete">Employee Delete</option>
                    <option value="bulk_import_started">Import Started</option>
                </select>
                <input 
                    type="date" 
                    name="date" 
                    value={filters.date} 
                    onChange={handleFilterChange}
                />
                <button onClick={fetchLogs} className="btn-primary">Apply Filters</button>
            </div>

            {loading ? (
                <div className="loading-state">Loading logs...</div>
            ) : error ? (
                <div className="error-state">{error}</div>
            ) : (
                <div className="table-container">
                    <table className="audit-table">
                        <thead>
                            <tr>
                                <th>Timestamp</th>
                                <th>User</th>
                                <th>Action</th>
                                <th>Details</th>
                                <th>IP Address</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.length > 0 ? logs.map(log => (
                                <tr key={log.id}>
                                    <td>{new Date(log.timestamp).toLocaleString()}</td>
                                    <td><strong>{log.user_display || 'System'}</strong></td>
                                    <td>
                                        <span className={`action-badge ${getActionClass(log.action)}`}>
                                            {log.action.replace(/_/g, ' ')}
                                        </span>
                                    </td>
                                    <td className="details-cell">{JSON.stringify(log.metadata)}</td>
                                    <td><code>{log.ip_address || 'N/A'}</code></td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="5" className="no-data">No logs found matching filters.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default AuditLogs;
