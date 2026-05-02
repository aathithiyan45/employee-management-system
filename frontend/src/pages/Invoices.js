import React, { useState, useEffect, useCallback } from "react";
import axiosInstance from "../axiosInstance";
import Sidebar from "../components/Sidebar";
import "./Invoices.css";

function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const firstPageSize = 3;
  const otherPageSize = 20;
  
  // Search
  const [search, setSearch] = useState("");
  
  // File upload
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Manual entry form
  const [formData, setFormData] = useState({
    date: "",
    invoice_no: "",
    client_number: "",
    project_name: "",
    work_order_no: "",
    pr_no: "",
    invoice_value: "",
    retention: "",
    gst: "",
    retentionPct: "10",
    gstPct: "18",
  });

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      let url = "invoices/";
      if (search) {
        url += `?search=${search}`;
      }
      const res = await axiosInstance.get(url);
      setInvoices(res.data.results ? res.data.results : res.data);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch invoices");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let newFormData = { ...formData, [name]: value };

    // Auto-calculate retention and gst if invoice_value OR percentages change
    if (name === "invoice_value" || name === "retentionPct" || name === "gstPct") {
      const val = parseFloat(newFormData.invoice_value) || 0;
      const rPct = parseFloat(newFormData.retentionPct) || 0;
      const gPct = parseFloat(newFormData.gstPct) || 0;
      
      const ret = val * (rPct / 100);
      const gst = (val - ret) * (gPct / 100);
      
      newFormData.retention = ret.toFixed(2);
      newFormData.gst = gst.toFixed(2);
    }

    setFormData(newFormData);
  };

  const calculateTotalPreview = () => {
    const val = parseFloat(formData.invoice_value) || 0;
    const ret = parseFloat(formData.retention) || 0;
    const gst = parseFloat(formData.gst) || 0;
    return (val - ret + gst).toFixed(2);
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      await axiosInstance.post("invoices/", formData);
      setSuccess("Invoice added successfully!");
      setFormData({
        date: "",
        invoice_no: "",
        client_number: "",
        project_name: "",
        work_order_no: "",
        pr_no: "",
        invoice_value: "",
        retention: "",
        gst: "",
      });
      fetchInvoices();
    } catch (err) {
      setError(err.response?.data?.invoice_no?.[0] || "Failed to add invoice");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this invoice?")) return;
    
    try {
      await axiosInstance.delete(`invoices/${id}/`);
      setSuccess("Invoice deleted.");
      fetchInvoices();
    } catch (err) {
      setError("Failed to delete invoice");
    }
  };

  const handleFileUpload = async () => {
    if (!uploadFile) {
      setError("Please select an Excel file first.");
      return;
    }

    setUploading(true);
    setError("");
    setSuccess("");

    const data = new FormData();
    data.append("file", uploadFile);

    try {
      const res = await axiosInstance.post("invoices/upload/", data, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      if (res.data.errors && res.data.errors.length > 0) {
        setError(`Upload finished with errors: ${res.data.errors.join(", ")}`);
      } else {
        setSuccess(res.data.message || "Upload successful!");
      }
      setUploadFile(null);
      fetchInvoices();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async () => {
    try {
      const res = await axiosInstance.get("invoices/export/", { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'invoices.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError("Failed to download Excel file");
    }
  };

  const totalPreview = calculateTotalPreview();

  // Adaptive Pagination Logic
  let currentRecords = [];
  let totalPages = 1;
  
  if (invoices.length > 0) {
    if (currentPage === 1) {
      currentRecords = invoices.slice(0, firstPageSize);
    } else {
      const start = firstPageSize + (currentPage - 2) * otherPageSize;
      const end = start + otherPageSize;
      currentRecords = invoices.slice(start, end);
    }

    const remaining = invoices.length - firstPageSize;
    if (remaining > 0) {
      totalPages = 1 + Math.ceil(remaining / otherPageSize);
    } else {
      totalPages = 1;
    }
  }

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="dashboard-container">
      <Sidebar />
      <main className="dashboard-main invoices-page">
        
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="invoices-header">
          <div className="invoices-title" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {currentPage > 1 && (
              <button 
                onClick={() => paginate(1)}
                style={{ background: "white", border: "1px solid var(--grey-300)", padding: "8px 12px", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontWeight: "600", color: "var(--grey-700)" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                Back to Page 1
              </button>
            )}
            <h1>Invoice Management ({invoices.length})</h1>
          </div>
          <div className="header-right">
            <button 
              className="action-btn" 
              onClick={handleDownload}
              style={{ background: "var(--success-bg)", color: "var(--success)", border: "1px solid rgba(46, 125, 50, 0.2)", display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", fontWeight: "600" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
              </svg>
              Export to Excel
            </button>
          </div>
        </div>

        <section className="invoices-content">
          {error && <div className="payroll-alert payroll-alert-error">{error}</div>}
          {success && <div className="payroll-alert payroll-alert-success">{success}</div>}

          {/* ── Top Bar: Upload & Search (Hidden on Page > 1) ─────────────────────────────── */}
          {currentPage === 1 && (
            <div className="invoices-top-bar">
              <div className="upload-card">
                <div className="file-input-wrapper">
                  <input 
                    type="file" 
                    accept=".xlsx" 
                    onChange={(e) => setUploadFile(e.target.files[0])}
                  />
                </div>
                <button 
                  className="action-btn" 
                  onClick={handleFileUpload} 
                  disabled={uploading}
                  style={{ background: "var(--blue-600)", color: "white", padding: "8px 20px" }}
                >
                  {uploading ? "Uploading..." : "Upload Excel"}
                </button>
              </div>
              
              <div className="search-wrapper">
                <input 
                  type="text" 
                  className="invoices-search" 
                  placeholder="Search by invoice no, client, or project..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* ── Manual Entry Form (Hidden on Page > 1) ────────────────────────────────────── */}
          {currentPage === 1 && (
            <div className="entry-card">
              <h4>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Manual Invoice Entry
              </h4>
              
              <form onSubmit={handleManualSubmit} className="entry-form">
                <div className="form-field">
                  <label>Date</label>
                  <input required type="date" name="date" className="invoice-input" value={formData.date} onChange={handleInputChange} />
                </div>
                <div className="form-field">
                  <label>Invoice No</label>
                  <input required type="text" name="invoice_no" className="invoice-input" value={formData.invoice_no} onChange={handleInputChange} placeholder="e.g. INV-001" />
                </div>
                <div className="form-field">
                  <label>Client Number</label>
                  <input required type="text" name="client_number" className="invoice-input" value={formData.client_number} onChange={handleInputChange} placeholder="Client ID" />
                </div>
                <div className="form-field">
                  <label>Project Name</label>
                  <input required type="text" name="project_name" className="invoice-input" value={formData.project_name} onChange={handleInputChange} placeholder="Project Name" />
                </div>
                <div className="form-field">
                  <label>Work Order No</label>
                  <input required type="text" name="work_order_no" className="invoice-input" value={formData.work_order_no} onChange={handleInputChange} />
                </div>
                <div className="form-field">
                  <label>PR No</label>
                  <input required type="text" name="pr_no" className="invoice-input" value={formData.pr_no} onChange={handleInputChange} />
                </div>
                <div className="form-field">
                  <label>Invoice Value</label>
                  <input required type="number" step="0.01" name="invoice_value" className="invoice-input" value={formData.invoice_value} onChange={handleInputChange} />
                </div>

                {/* Calculation Parameters Group */}
                <div className="calc-row">
                  <div className="form-field calc-field pct">
                    <label>Retention %</label>
                    <input required type="number" step="0.1" name="retentionPct" className="invoice-input" value={formData.retentionPct} onChange={handleInputChange} />
                  </div>
                  <div className="form-field calc-field">
                    <label>Retention Amount</label>
                    <input required type="number" step="0.01" name="retention" className="invoice-input" value={formData.retention} onChange={handleInputChange} />
                  </div>
                  <div className="form-field calc-field pct">
                    <label>GST %</label>
                    <input required type="number" step="0.1" name="gstPct" className="invoice-input" value={formData.gstPct} onChange={handleInputChange} />
                  </div>
                  <div className="form-field calc-field">
                    <label>GST Amount</label>
                    <input required type="number" step="0.01" name="gst" className="invoice-input" value={formData.gst} onChange={handleInputChange} />
                  </div>
                  
                  <div className="form-field" style={{ justifyContent: "flex-end" }}>
                    <button type="submit" className="action-btn" style={{ background: "var(--blue-600)", color: "white", padding: "12px", height: "44px", fontWeight: "600" }}>
                      Create Invoice
                    </button>
                  </div>
                </div>

                <div className="preview-bar">
                  <span className="total-label">Calculated Net Total</span>
                  <span className="total-value">${totalPreview}</span>
                </div>
              </form>
            </div>
          )}

          {/* ── Invoice Table ────────────────────────────────────────── */}
          <div className={`invoices-table-container ${currentPage > 1 ? "full-height" : ""}`}>
            <table className="invoices-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Invoice No</th>
                  <th>Client No</th>
                  <th>Project</th>
                  <th>Value</th>
                  <th>Retention</th>
                  <th>GST</th>
                  <th>Total</th>
                  <th style={{ textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="9" style={{ textAlign: "center", padding: "40px", color: "var(--grey-400)" }}>Fetching invoices...</td></tr>
                ) : currentRecords.length === 0 ? (
                  <tr><td colSpan="9" style={{ textAlign: "center", padding: "60px", color: "var(--grey-400)" }}>No invoice records found.</td></tr>
                ) : (
                  currentRecords.map(inv => (
                    <tr key={inv.id}>
                      <td>{inv.date}</td>
                      <td className="val-bold">{inv.invoice_no}</td>
                      <td>{inv.client_number}</td>
                      <td>{inv.project_name}</td>
                      <td className="val-bold">${parseFloat(inv.invoice_value).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="val-neg">-${parseFloat(inv.retention).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="val-pos">+${parseFloat(inv.gst).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="val-total">${parseFloat(inv.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td style={{ textAlign: "center" }}>
                        <button 
                          className="action-btn" 
                          onClick={() => handleDelete(inv.id)}
                          style={{ color: "var(--danger)", border: "1px solid var(--danger-bg)", background: "var(--danger-bg)", padding: "6px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: "600" }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* ── Pagination Controls ─────────────────────────────────── */}
            {totalPages > 1 && (
              <div className="pagination" style={{ display: "flex", justifyContent: "center", gap: "10px", padding: "20px", background: "var(--grey-50)", borderTop: "1px solid var(--grey-200)" }}>
                <button 
                  disabled={currentPage === 1}
                  onClick={() => paginate(currentPage - 1)}
                  style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid var(--grey-300)", background: "white", cursor: currentPage === 1 ? "not-allowed" : "pointer", opacity: currentPage === 1 ? 0.5 : 1, fontWeight: "600" }}
                >
                  Previous
                </button>
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => paginate(i + 1)}
                    style={{ 
                      padding: "8px 14px", 
                      borderRadius: "6px", 
                      border: "1px solid",
                      borderColor: currentPage === i + 1 ? "var(--blue-500)" : "var(--grey-300)",
                      background: currentPage === i + 1 ? "var(--blue-500)" : "white",
                      color: currentPage === i + 1 ? "white" : "var(--grey-700)",
                      cursor: "pointer",
                      fontWeight: "700"
                    }}
                  >
                    {i + 1}
                  </button>
                ))}
                <button 
                  disabled={currentPage === totalPages}
                  onClick={() => paginate(currentPage + 1)}
                  style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid var(--grey-300)", background: "white", cursor: currentPage === totalPages ? "not-allowed" : "pointer", opacity: currentPage === totalPages ? 0.5 : 1, fontWeight: "600" }}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default Invoices;
