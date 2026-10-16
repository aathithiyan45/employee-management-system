import React, { useState, useEffect, useCallback, useRef } from "react";
import api from "../axiosInstance";
import Sidebar from "../components/Sidebar";
import Toast from "../components/Toast";
import "./UsersAndRoles.css";

// ── SVG Icon Helper ──────────────────────────────────────────
const Icon = ({ d, size = 16, stroke = "currentColor", fill = "none", className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill}
    stroke={stroke}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={{ flexShrink: 0 }}
  >
    <path d={d} />
  </svg>
);

// ── Helper Utilities ─────────────────────────────────────────
const getInitials = (name, username) => {
  const target = (name && name.trim()) || username || "U";
  const parts = target.split(" ").filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return target.slice(0, 2).toUpperCase();
};

const getAvatarColor = (name) => {
  if (!name) return "#4f46e5";
  const colors = [
    "#4f46e5", "#0284c7", "#0d9488", "#16a34a",
    "#ca8a04", "#ea580c", "#dc2626", "#7c3aed", "#db2777"
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return "Never logged in";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
};

export default function UsersAndRoles() {
  // ── States ─────────────────────────────────────────────────
  const [users, setUsers] = useState([]);
  const [summary, setSummary] = useState({
    total_users: 0,
    admin_count: 0,
    hr_count: 0,
    active_count: 0,
    inactive_count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Filter states
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [toast, setToast] = useState(null);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addFormData, setAddFormData] = useState({
    username: "",
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    role: "hr",
    is_active: true,
  });
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [addErrors, setAddErrors] = useState({});
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);

  // Edit Modal states
  const [editingUser, setEditingUser] = useState(null);
  const [editFormData, setEditFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    role: "hr",
    password: "",
  });
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editErrors, setEditErrors] = useState({});
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Status Change (Activate/Deactivate) Dialog
  const [statusDialogUser, setStatusDialogUser] = useState(null);
  const [isSubmittingStatus, setIsSubmittingStatus] = useState(false);

  // Delete Dialog
  const [deleteDialogUser, setDeleteDialogUser] = useState(null);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

  const searchDebounceRef = useRef(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
  };

  // ── Fetch Users API ─────────────────────────────────────────
  const fetchUsers = useCallback(async (targetPage = 1, searchQuery = search) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", targetPage);
      params.append("page_size", pageSize);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());
      if (roleFilter) params.append("role", roleFilter);
      if (statusFilter) params.append("status", statusFilter);

      const res = await api.get(`users/?${params.toString()}`);
      if (res.data) {
        setUsers(res.data.results || []);
        setTotalCount(res.data.count || 0);
        if (res.data.summary) {
          setSummary(res.data.summary);
        }
      }
      setPage(targetPage);
    } catch (err) {
      console.error("Failed to load users:", err);
      const errMsg = err.response?.data?.error || err.response?.data?.detail || "Failed to load user records.";
      showToast(errMsg, "error");
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter]);

  // Initial fetch and on filter change
  useEffect(() => {
    fetchUsers(1, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter, statusFilter]);

  // Search debounce
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      fetchUsers(1, val);
    }, 350);
  };

  // ── Create User Submit ─────────────────────────────────────
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!addFormData.username.trim()) errors.username = "Username is required";
    if (!addFormData.password.trim()) {
      errors.password = "Password is required";
    } else if (addFormData.password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }
    if (addFormData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addFormData.email)) {
      errors.email = "Please enter a valid email address";
    }

    if (Object.keys(errors).length > 0) {
      setAddErrors(errors);
      return;
    }

    setAddErrors({});
    setIsSubmittingAdd(true);
    try {
      const res = await api.post("users/", addFormData);
      showToast(res.data?.message || "User created successfully!");
      setIsAddModalOpen(false);
      setAddFormData({
        username: "",
        first_name: "",
        last_name: "",
        email: "",
        password: "",
        role: "hr",
        is_active: true,
      });
      fetchUsers(1);
    } catch (err) {
      const errMsg = err.response?.data?.error || "Failed to create user.";
      showToast(errMsg, "error");
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  // ── Open Edit Modal ────────────────────────────────────────
  const handleOpenEdit = (user) => {
    setEditingUser(user);
    setEditFormData({
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      email: user.email || "",
      role: user.role,
      password: "",
    });
    setEditErrors({});
    setShowEditPassword(false);
  };

  // ── Edit User Submit ───────────────────────────────────────
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;

    const errors = {};
    if (editFormData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editFormData.email)) {
      errors.email = "Please enter a valid email address";
    }
    if (editFormData.password && editFormData.password.length < 6) {
      errors.password = "New password must be at least 6 characters";
    }

    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      return;
    }

    setEditErrors({});
    setIsSubmittingEdit(true);
    try {
      const payload = {
        first_name: editFormData.first_name,
        last_name: editFormData.last_name,
        email: editFormData.email,
        role: editFormData.role,
      };
      if (editFormData.password.trim()) {
        payload.password = editFormData.password.trim();
      }

      const res = await api.put(`users/${editingUser.id}/`, payload);
      showToast(res.data?.message || "User updated successfully!");
      setEditingUser(null);
      fetchUsers(page);
    } catch (err) {
      const errMsg = err.response?.data?.error || "Failed to update user.";
      showToast(errMsg, "error");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // ── Toggle Status Confirm ──────────────────────────────────
  const handleConfirmToggleStatus = async () => {
    if (!statusDialogUser) return;
    setIsSubmittingStatus(true);
    try {
      const res = await api.post(`users/${statusDialogUser.id}/toggle-status/`, {});
      showToast(res.data?.message || "User status updated successfully!");
      setStatusDialogUser(null);
      fetchUsers(page);
    } catch (err) {
      const errMsg = err.response?.data?.error || "Failed to update user status.";
      showToast(errMsg, "error");
    } finally {
      setIsSubmittingStatus(false);
    }
  };

  // ── Delete Confirm ─────────────────────────────────────────
  const handleConfirmDelete = async () => {
    if (!deleteDialogUser) return;
    setIsSubmittingDelete(true);
    try {
      const res = await api.delete(`users/${deleteDialogUser.id}/`);
      showToast(res.data?.message || "User account deleted successfully!");
      setDeleteDialogUser(null);
      fetchUsers(page);
    } catch (err) {
      const errMsg = err.response?.data?.error || "Failed to delete user.";
      showToast(errMsg, "error");
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // Check if target user is the last active admin
  const isProtectedAdmin = (targetUser) => {
    return targetUser.role === "admin" && targetUser.is_active && summary.admin_count <= 1;
  };

  return (
    <div className="dashboard-container">
      <Sidebar />

      <main className="dashboard-main users-roles-page">
        {/* ── TOPBAR ────────────────────────────────────────── */}
        <div className="users-topbar">
          <div>
            <h1 className="page-heading">User & Roles</h1>
            <p className="page-subheading">
              Manage system access permissions, authenticate administrators, and assign HR portal roles.
            </p>
          </div>
          <div className="topbar-actions">
            <button
              className="refresh-icon-btn"
              onClick={() => fetchUsers(page)}
              title="Refresh users"
            >
              <Icon d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" size={15} />
            </button>
            <button
              className="add-user-btn"
              onClick={() => {
                setAddErrors({});
                setIsAddModalOpen(true);
              }}
            >
              <Icon d="M12 5v14M5 12h14" size={16} stroke="#ffffff" />
              Add User
            </button>
          </div>
        </div>

        <div className="users-content-container">
          {/* ── 1. SUMMARY CARDS ──────────────────────────────── */}
          <div className="summary-cards-grid">
            {/* Total Users */}
            <div className="summary-card">
              <div className="summary-card-header">
                <span className="card-label">Total Users</span>
                <div className="card-icon-wrap theme-icon">
                  <Icon d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" size={20} stroke="#4f46e5" />
                </div>
              </div>
              <div className="card-value">{summary.total_users}</div>
              <div className="card-meta">
                <span className="meta-badge-success">{summary.active_count} active</span>
                <span className="meta-sep">•</span>
                <span className="meta-sub">{summary.inactive_count} inactive</span>
              </div>
            </div>

            {/* Administrators */}
            <div className="summary-card">
              <div className="summary-card-header">
                <span className="card-label">Administrators</span>
                <div className="card-icon-wrap admin-icon">
                  <Icon d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" size={20} stroke="#7c3aed" />
                </div>
              </div>
              <div className="card-value">{summary.admin_count}</div>
              <div className="card-meta">
                <span className="meta-sub">Full administrative & system access</span>
              </div>
            </div>

            {/* HR Users */}
            <div className="summary-card">
              <div className="summary-card-header">
                <span className="card-label">HR Specialists</span>
                <div className="card-icon-wrap hr-icon">
                  <Icon d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" size={20} stroke="#0d9488" />
                </div>
              </div>
              <div className="card-value">{summary.hr_count}</div>
              <div className="card-meta">
                <span className="meta-sub">Employee, payroll & document management</span>
              </div>
            </div>
          </div>

          {/* ── 2. FILTER & SEARCH BAR ────────────────────────── */}
          <div className="users-filter-bar">
            {/* Search Input */}
            <div className="search-input-wrapper">
              <Icon d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" size={16} stroke="#64748b" />
              <input
                type="text"
                className="search-input"
                placeholder="Search by name, username, or email..."
                value={search}
                onChange={handleSearchChange}
              />
              {search && (
                <button
                  className="clear-search-btn"
                  onClick={() => {
                    setSearch("");
                    fetchUsers(1, "");
                  }}
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filters Group */}
            <div className="filters-group">
              {/* Role Filter */}
              <div className="filter-select-wrapper">
                <Icon d="M4 6h16M7 12h10m-8 6h6" size={14} stroke="#64748b" />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="hr">HR</option>
                </select>
              </div>

              {/* Status Filter */}
              <div className="filter-select-wrapper">
                <Icon d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" size={14} stroke="#64748b" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* ── 3. USERS TABLE ────────────────────────────────── */}
          <div className="table-outer-card">
            <div className="table-responsive">
              <table className="users-table">
                <thead>
                  <tr>
                    <th className="text-left">User / Full Name</th>
                    <th className="text-left">Username</th>
                    <th className="text-left">Email</th>
                    <th className="text-center">Role</th>
                    <th className="text-center">Account Status</th>
                    <th className="text-left">Last Login</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    // Skeleton Rows
                    Array.from({ length: 5 }, (_, i) => (
                      <tr key={i} className="skeleton-row">
                        <td>
                          <div className="skeleton-user-profile">
                            <div className="skeleton-avatar" />
                            <div className="skeleton-lines">
                              <div className="skeleton-line w-120" />
                              <div className="skeleton-line w-80" />
                            </div>
                          </div>
                        </td>
                        <td><div className="skeleton-line w-80" /></td>
                        <td><div className="skeleton-line w-140" /></td>
                        <td className="text-center"><div className="skeleton-pill" /></td>
                        <td className="text-center"><div className="skeleton-pill" /></td>
                        <td><div className="skeleton-line w-100" /></td>
                        <td className="text-center"><div className="skeleton-btn" /></td>
                      </tr>
                    ))
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="empty-table-cell">
                        <div className="users-empty-state">
                          <div className="empty-state-icon">👥</div>
                          <h3>No users found</h3>
                          <p>
                            {search || roleFilter || statusFilter
                              ? "Try adjusting your search queries or filter selections."
                              : "No admin or HR users currently registered in the database."}
                          </p>
                          {(search || roleFilter || statusFilter) && (
                            <button
                              className="clear-all-filters-btn"
                              onClick={() => {
                                setSearch("");
                                setRoleFilter("");
                                setStatusFilter("");
                                fetchUsers(1, "");
                              }}
                            >
                              Reset Filters
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => {
                      const initials = getInitials(u.full_name, u.username);
                      const avatarBg = getAvatarColor(u.full_name || u.username);
                      const isSelf = u.is_self;
                      const isLastAdmin = isProtectedAdmin(u);

                      return (
                        <tr key={u.id} className="user-row">
                          {/* User / Full Name */}
                          <td className="text-left">
                            <div className="user-identity-cell">
                              <div
                                className="user-avatar-circle"
                                style={{ backgroundColor: avatarBg }}
                              >
                                {initials}
                              </div>
                              <div className="user-name-box">
                                <div className="user-primary-name">
                                  <strong>{u.full_name || u.username}</strong>
                                  {isSelf && <span className="you-pill">You</span>}
                                </div>
                                <span className="user-joined-date">
                                  Joined {u.date_joined ? new Date(u.date_joined).toLocaleDateString("en-GB") : "—"}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Username */}
                          <td className="text-left">
                            <code className="username-tag">@{u.username}</code>
                          </td>

                          {/* Email */}
                          <td className="text-left">
                            {u.email ? (
                              <a href={`mailto:${u.email}`} className="user-email-link">
                                {u.email}
                              </a>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>

                          {/* Role */}
                          <td className="text-center">
                            <span className={`role-badge ${u.role}`}>
                              {u.role === "admin" ? (
                                <Icon d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" size={12} stroke="currentColor" />
                              ) : (
                                <Icon d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" size={12} stroke="currentColor" />
                              )}
                              {u.role_display || (u.role === "admin" ? "Admin" : "HR")}
                            </span>
                          </td>

                          {/* Account Status */}
                          <td className="text-center">
                            <span className={`status-badge-pill ${u.is_active ? "active" : "inactive"}`}>
                              <span className="status-dot" />
                              {u.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>

                          {/* Last Login */}
                          <td className="text-left">
                            <span className={`last-login-text ${!u.last_login ? "never" : ""}`}>
                              {formatDateTime(u.last_login)}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="text-center">
                            <div className="action-buttons-wrap">
                              {/* Edit Button */}
                              <button
                                className="action-btn edit"
                                onClick={() => handleOpenEdit(u)}
                                title="Edit user details"
                              >
                                <Icon d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" size={14} />
                                Edit
                              </button>

                              {/* Activate / Deactivate Toggle */}
                              <button
                                className={`action-btn ${u.is_active ? "deactivate" : "activate"}`}
                                disabled={isSelf || isLastAdmin}
                                onClick={() => setStatusDialogUser(u)}
                                title={
                                  isSelf
                                    ? "You cannot deactivate your own account"
                                    : isLastAdmin
                                    ? "Cannot deactivate the last active administrator"
                                    : u.is_active
                                    ? "Deactivate account"
                                    : "Activate account"
                                }
                              >
                                {u.is_active ? (
                                  <>
                                    <Icon d="M18.36 6.64a9 9 0 1 1-12.73 0M12 2v10" size={14} />
                                    Deactivate
                                  </>
                                ) : (
                                  <>
                                    <Icon d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" size={14} />
                                    Activate
                                  </>
                                )}
                              </button>

                              {/* Delete Button */}
                              <button
                                className="action-btn-danger"
                                disabled={isSelf || isLastAdmin}
                                onClick={() => setDeleteDialogUser(u)}
                                title={
                                  isSelf
                                    ? "You cannot delete your own account"
                                    : isLastAdmin
                                    ? "Cannot delete the last active administrator"
                                    : "Delete user account"
                                }
                              >
                                <Icon d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* ── 4. PAGINATION ────────────────────────────────── */}
            {totalPages > 1 && (
              <div className="table-pagination-footer">
                <span className="pagination-info">
                  Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)} of {totalCount} users
                </span>
                <div className="pagination-controls">
                  <button
                    className="pagination-btn"
                    disabled={page <= 1}
                    onClick={() => fetchUsers(page - 1)}
                  >
                    Previous
                  </button>
                  <span className="current-page-pill">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    className="pagination-btn"
                    disabled={page >= totalPages}
                    onClick={() => fetchUsers(page + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── MODAL: ADD USER ─────────────────────────────────── */}
        {isAddModalOpen && (
          <div className="modal-backdrop-overlay" onClick={() => !isSubmittingAdd && setIsAddModalOpen(false)}>
            <div className="user-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h3 className="modal-title">Add New System User</h3>
                  <p className="modal-subtitle">Create a user account with role-based access control.</p>
                </div>
                <button
                  className="modal-close-icon-btn"
                  onClick={() => !isSubmittingAdd && setIsAddModalOpen(false)}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddSubmit}>
                <div className="modal-body-scroll">
                  {/* Username */}
                  <div className="form-group">
                    <label className="form-label required">Username</label>
                    <input
                      type="text"
                      className={`form-input ${addErrors.username ? "error" : ""}`}
                      placeholder="e.g. jdoe_admin"
                      value={addFormData.username}
                      onChange={(e) => setAddFormData({ ...addFormData, username: e.target.value })}
                      required
                    />
                    {addErrors.username && <span className="field-error-text">{addErrors.username}</span>}
                  </div>

                  {/* Full Name (First + Last) */}
                  <div className="form-row-2">
                    <div className="form-group">
                      <label className="form-label">First Name</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="John"
                        value={addFormData.first_name}
                        onChange={(e) => setAddFormData({ ...addFormData, first_name: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Last Name</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Doe"
                        value={addFormData.last_name}
                        onChange={(e) => setAddFormData({ ...addFormData, last_name: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input
                      type="email"
                      className={`form-input ${addErrors.email ? "error" : ""}`}
                      placeholder="john.doe@company.com"
                      value={addFormData.email}
                      onChange={(e) => setAddFormData({ ...addFormData, email: e.target.value })}
                    />
                    {addErrors.email && <span className="field-error-text">{addErrors.email}</span>}
                  </div>

                  {/* Password */}
                  <div className="form-group">
                    <label className="form-label required">Temporary Password</label>
                    <div className="password-input-wrap">
                      <input
                        type={showAddPassword ? "text" : "password"}
                        className={`form-input ${addErrors.password ? "error" : ""}`}
                        placeholder="Minimum 6 characters"
                        value={addFormData.password}
                        onChange={(e) => setAddFormData({ ...addFormData, password: e.target.value })}
                        required
                      />
                      <button
                        type="button"
                        className="toggle-password-btn"
                        onClick={() => setShowAddPassword(!showAddPassword)}
                      >
                        {showAddPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                    {addErrors.password && <span className="field-error-text">{addErrors.password}</span>}
                  </div>

                  {/* Role Selector */}
                  <div className="form-group">
                    <label className="form-label required">Assign System Role</label>
                    <div className="role-cards-selector">
                      <label
                        className={`role-choice-card ${addFormData.role === "admin" ? "selected" : ""}`}
                        onClick={() => setAddFormData({ ...addFormData, role: "admin" })}
                      >
                        <input
                          type="radio"
                          name="role"
                          value="admin"
                          checked={addFormData.role === "admin"}
                          onChange={() => {}}
                          style={{ display: "none" }}
                        />
                        <div className="role-choice-icon admin">
                          <Icon d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" size={18} stroke="#7c3aed" />
                        </div>
                        <div className="role-choice-text">
                          <strong>Administrator</strong>
                          <span>Full management access to employees, audit logs, and users.</span>
                        </div>
                      </label>

                      <label
                        className={`role-choice-card ${addFormData.role === "hr" ? "selected" : ""}`}
                        onClick={() => setAddFormData({ ...addFormData, role: "hr" })}
                      >
                        <input
                          type="radio"
                          name="role"
                          value="hr"
                          checked={addFormData.role === "hr"}
                          onChange={() => {}}
                          style={{ display: "none" }}
                        />
                        <div className="role-choice-icon hr">
                          <Icon d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" size={18} stroke="#0d9488" />
                        </div>
                        <div className="role-choice-text">
                          <strong>HR Specialist</strong>
                          <span>Employee rosters, documents, attendance, and payroll operations.</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Active Status */}
                  <div className="form-checkbox-row">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={addFormData.is_active}
                        onChange={(e) => setAddFormData({ ...addFormData, is_active: e.target.checked })}
                      />
                      <span>Activate account immediately</span>
                    </label>
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={isSubmittingAdd}
                    onClick={() => setIsAddModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={isSubmittingAdd}
                  >
                    {isSubmittingAdd ? "Creating User..." : "Create User"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── MODAL: EDIT USER ────────────────────────────────── */}
        {editingUser && (
          <div className="modal-backdrop-overlay" onClick={() => !isSubmittingEdit && setEditingUser(null)}>
            <div className="user-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h3 className="modal-title">Edit User Details</h3>
                  <p className="modal-subtitle">
                    Updating account for <strong>@{editingUser.username}</strong>
                  </p>
                </div>
                <button
                  className="modal-close-icon-btn"
                  onClick={() => !isSubmittingEdit && setEditingUser(null)}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleEditSubmit}>
                <div className="modal-body-scroll">
                  {/* Full Name */}
                  <div className="form-row-2">
                    <div className="form-group">
                      <label className="form-label">First Name</label>
                      <input
                        type="text"
                        className="form-input"
                        value={editFormData.first_name}
                        onChange={(e) => setEditFormData({ ...editFormData, first_name: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Last Name</label>
                      <input
                        type="text"
                        className="form-input"
                        value={editFormData.last_name}
                        onChange={(e) => setEditFormData({ ...editFormData, last_name: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input
                      type="email"
                      className={`form-input ${editErrors.email ? "error" : ""}`}
                      value={editFormData.email}
                      onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    />
                    {editErrors.email && <span className="field-error-text">{editErrors.email}</span>}
                  </div>

                  {/* Role Selector */}
                  <div className="form-group">
                    <label className="form-label required">System Role</label>
                    <div className="role-cards-selector">
                      <label
                        className={`role-choice-card ${editFormData.role === "admin" ? "selected" : ""}`}
                        onClick={() => setEditFormData({ ...editFormData, role: "admin" })}
                      >
                        <input
                          type="radio"
                          name="editRole"
                          value="admin"
                          checked={editFormData.role === "admin"}
                          onChange={() => {}}
                          style={{ display: "none" }}
                        />
                        <div className="role-choice-icon admin">
                          <Icon d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" size={18} stroke="#7c3aed" />
                        </div>
                        <div className="role-choice-text">
                          <strong>Administrator</strong>
                          <span>Full management access.</span>
                        </div>
                      </label>

                      <label
                        className={`role-choice-card ${editFormData.role === "hr" ? "selected" : ""} ${isProtectedAdmin(editingUser) ? "disabled" : ""}`}
                        onClick={() => {
                          if (!isProtectedAdmin(editingUser)) {
                            setEditFormData({ ...editFormData, role: "hr" });
                          }
                        }}
                        title={isProtectedAdmin(editingUser) ? "Cannot change role of last active admin" : ""}
                      >
                        <input
                          type="radio"
                          name="editRole"
                          value="hr"
                          checked={editFormData.role === "hr"}
                          disabled={isProtectedAdmin(editingUser)}
                          onChange={() => {}}
                          style={{ display: "none" }}
                        />
                        <div className="role-choice-icon hr">
                          <Icon d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" size={18} stroke="#0d9488" />
                        </div>
                        <div className="role-choice-text">
                          <strong>HR Specialist</strong>
                          <span>Operations & employee management.</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Optional Password Reset */}
                  <div className="edit-password-section">
                    <div className="section-divider-title">
                      <span>Reset Password (Optional)</span>
                    </div>
                    <div className="password-input-wrap">
                      <input
                        type={showEditPassword ? "text" : "password"}
                        className={`form-input ${editErrors.password ? "error" : ""}`}
                        placeholder="Leave blank to keep existing password"
                        value={editFormData.password}
                        onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                      />
                      <button
                        type="button"
                        className="toggle-password-btn"
                        onClick={() => setShowEditPassword(!showEditPassword)}
                      >
                        {showEditPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                    {editErrors.password && <span className="field-error-text">{editErrors.password}</span>}
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={isSubmittingEdit}
                    onClick={() => setEditingUser(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={isSubmittingEdit}
                  >
                    {isSubmittingEdit ? "Saving Changes..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── DIALOG: ACTIVATE / DEACTIVATE CONFIRMATION ─────── */}
        {statusDialogUser && (
          <div className="modal-backdrop-overlay" onClick={() => !isSubmittingStatus && setStatusDialogUser(null)}>
            <div className="confirm-modal-box" onClick={(e) => e.stopPropagation()}>
              <div className={`confirm-icon-circle ${statusDialogUser.is_active ? "warning" : "success"}`}>
                {statusDialogUser.is_active ? (
                  <Icon d="M18.36 6.64a9 9 0 1 1-12.73 0M12 2v10" size={24} stroke="#ea580c" />
                ) : (
                  <Icon d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" size={24} stroke="#16a34a" />
                )}
              </div>
              <h3 className="confirm-title">
                {statusDialogUser.is_active ? "Deactivate User Account?" : "Activate User Account?"}
              </h3>
              <p className="confirm-message">
                {statusDialogUser.is_active ? (
                  <>
                    Are you sure you want to deactivate <strong>@{statusDialogUser.username}</strong>?
                    They will immediately lose access and all active sessions will be terminated.
                  </>
                ) : (
                  <>
                    Are you sure you want to activate <strong>@{statusDialogUser.username}</strong>?
                    This user will immediately regain access to the system.
                  </>
                )}
              </p>
              <div className="confirm-actions">
                <button
                  className="btn-secondary"
                  disabled={isSubmittingStatus}
                  onClick={() => setStatusDialogUser(null)}
                >
                  Cancel
                </button>
                <button
                  className={statusDialogUser.is_active ? "btn-warning" : "btn-primary"}
                  disabled={isSubmittingStatus}
                  onClick={handleConfirmToggleStatus}
                >
                  {isSubmittingStatus
                    ? "Updating..."
                    : statusDialogUser.is_active
                    ? "Yes, Deactivate"
                    : "Yes, Activate"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── DIALOG: DELETE CONFIRMATION ────────────────────── */}
        {deleteDialogUser && (
          <div className="modal-backdrop-overlay" onClick={() => !isSubmittingDelete && setDeleteDialogUser(null)}>
            <div className="confirm-modal-box" onClick={(e) => e.stopPropagation()}>
              <div className="confirm-icon-circle danger">
                <Icon d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" size={24} stroke="#dc2626" />
              </div>
              <h3 className="confirm-title">Delete User Account?</h3>
              <p className="confirm-message">
                Are you sure you want to permanently delete <strong>@{deleteDialogUser.username}</strong>?
                This action cannot be undone.
              </p>
              <div className="confirm-actions">
                <button
                  className="btn-secondary"
                  disabled={isSubmittingDelete}
                  onClick={() => setDeleteDialogUser(null)}
                >
                  Cancel
                </button>
                <button
                  className="btn-danger"
                  disabled={isSubmittingDelete}
                  onClick={handleConfirmDelete}
                >
                  {isSubmittingDelete ? "Deleting..." : "Delete User"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── TOAST NOTIFICATIONS ────────────────────────────── */}
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </main>
    </div>
  );
}
