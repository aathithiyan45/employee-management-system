import React, { useState, useEffect, useCallback } from 'react';
import api from '../axiosInstance';
import Sidebar from '../components/Sidebar';
import './AuditLogs.css';

// ── Icons Helper ──────────────────────────────────────────
const Icon = ({ d, size = 18, stroke = "currentColor", fill = "none" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}
    stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d={d} />
  </svg>
);

const AuditLogs = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [filters, setFilters] = useState({
        user: '',
        action: '',
        date: ''
    });

    const PAGE_SIZE = 15;

    const fetchLogs = useCallback(async (targetPage = 1) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.user) params.append('user', filters.user);
            if (filters.action) params.append('action', filters.action);
            if (filters.date) params.append('date', filters.date);
            params.append('page', targetPage);

            const res = await api.get(`audit-logs/?${params.toString()}`);
            
            if (res.data && res.data.results !== undefined) {
                setLogs(res.data.results);
                setTotalCount(res.data.count);
            } else {
                setLogs(res.data || []);
                setTotalCount((res.data || []).length);
            }
            setPage(targetPage);
            setError('');
        } catch (err) {
            setError('Failed to fetch audit logs.');
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchLogs(1);
    }, [fetchLogs]);

    const handleFilterChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    const getActionClass = (action) => {
        if (action.includes('delete')) return 'action-danger';
        if (action.includes('failed')) return 'action-warning';
        if (action.includes('create') || action.includes('import')) return 'action-success';
        return 'action-info';
    };

    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    return (
        <div className="dashboard-container">
            <Sidebar />

            {/* ══ MAIN ══ */}
            <main className="dashboard-main audit-logs-page">
                <div className="dashboard-topbar">
                    <div className="topbar-title">Audit Logs</div>
                    <div className="topbar-actions">
                        <button className="topbar-btn" onClick={() => fetchLogs(1)} title="Refresh Logs">
                            <Icon d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" size={15} />
                            Refresh
                        </button>
                    </div>
                </div>

                <div className="dashboard-content">
                    <div className="audit-page-header">
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Icon d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" size={20} stroke="var(--theme-600)" />
                            System Activities & Security Events
                        </h2>
                        <p>
                            Monitor and track all critical actions, login attempts, and employee record updates in real-time.
                        </p>
                    </div>

                    <div className="filter-bar">
                        <div className="input-with-icon">
                            <Icon d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" size={16} />
                            <input 
                                type="text" 
                                name="user" 
                                placeholder="Filter by User..." 
                                value={filters.user} 
                                onChange={handleFilterChange}
                            />
                        </div>
                        
                        <div className="input-with-icon">
                            <Icon d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" size={16} />
                            <select name="action" value={filters.action} onChange={handleFilterChange}>
                                <option value="">All Actions</option>
                                <option value="login">Login</option>
                                <option value="login_failed">Login Failed</option>
                                <option value="employee_create">Employee Create</option>
                                <option value="employee_delete">Employee Delete</option>
                                <option value="bulk_import_started">Import Started</option>
                            </select>
                        </div>
                        
                        <div className="input-with-icon">
                            <Icon d="M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM16 2v4M8 2v4M3 10h18" size={16} />
                            <input 
                                type="date" 
                                name="date" 
                                value={filters.date} 
                                onChange={handleFilterChange}
                            />
                        </div>

                        <button onClick={() => fetchLogs(1)} className="btn-primary">
                            <Icon d="M22 3H2l8 9v6l4 2v-8z" size={14} stroke="white" />
                            Apply Filters
                        </button>
                    </div>

                    {loading ? (
                        <div className="loading-state">
                            <div className="audit-spin" />
                            <p>Loading logs...</p>
                        </div>
                    ) : error ? (
                        <div className="error-state">
                            <Icon d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" size={24} stroke="var(--danger)" />
                            <p>{error}</p>
                        </div>
                    ) : (
                        <div className="table-wrapper">
                            <table className="audit-table">
                                <thead>
                                    <tr>
                                        <th width="20%">Timestamp</th>
                                        <th width="20%">User</th>
                                        <th width="20%">Action</th>
                                        <th width="25%">Details</th>
                                        <th width="15%">IP Address</th>
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
                                            <td className="details-cell" title={JSON.stringify(log.metadata)}>
                                                {JSON.stringify(log.metadata)}
                                            </td>
                                            <td><code>{log.ip_address || 'N/A'}</code></td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="5" className="no-data">No logs found matching filters.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>

                            {/* ── Pagination footer panel ── */}
                            {totalPages > 1 && (
                                <div className="audit-pagination">
                                    <button 
                                        className="audit-page-btn" 
                                        onClick={() => fetchLogs(page - 1)} 
                                        disabled={page === 1}
                                    >
                                        <Icon d="M15 18l-6-6 6-6" size={14} />
                                        Previous
                                    </button>
                                    
                                    <div className="audit-page-numbers">
                                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => {
                                            const isFirstOrLast = p === 1 || p === totalPages;
                                            const isNearCurrent = Math.abs(p - page) <= 1;
                                            
                                            if (isFirstOrLast || isNearCurrent) {
                                                return (
                                                    <button 
                                                        key={p} 
                                                        className={`audit-page-num ${page === p ? 'active' : ''}`}
                                                        onClick={() => fetchLogs(p)}
                                                    >
                                                        {p}
                                                    </button>
                                                );
                                            }
                                            
                                            if (p === 2 && page > 3) {
                                                return <span key={p} className="audit-page-dots">...</span>;
                                            }
                                            if (p === totalPages - 1 && page < totalPages - 2) {
                                                return <span key={p} className="audit-page-dots">...</span>;
                                            }
                                            
                                            return null;
                                        })}
                                    </div>

                                    <button 
                                        className="audit-page-btn" 
                                        onClick={() => fetchLogs(page + 1)} 
                                        disabled={page === totalPages}
                                    >
                                        Next
                                        <Icon d="M9 18l6-6-6-6" size={14} />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default AuditLogs;
