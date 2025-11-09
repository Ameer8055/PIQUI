import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from '../utils/toast';
import './AdminPDFApproval.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const AdminPDFApproval = ({ user }) => {
  const [pdfs, setPdfs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending'); // 'pending', 'approved', 'rejected', 'all'
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  const [selectedPdf, setSelectedPdf] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [deletingPdfId, setDeletingPdfId] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState(null);
  const [originalPdfUrl, setOriginalPdfUrl] = useState(null);

  useEffect(() => {
    fetchPDFs();
    fetchStats();
  }, [statusFilter, searchTerm, pagination.page]);

  const fetchPDFs = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/pdfs`, {
        params: {
          status: statusFilter === 'all' ? undefined : statusFilter,
          search: searchTerm,
          page: pagination.page,
          limit: pagination.limit
        }
      });
      setPdfs(response.data.data.pdfs || []);
      setPagination(response.data.data.pagination || pagination);
    } catch (error) {
      console.error('Error fetching PDFs:', error);
      toast.error('Error fetching PDFs: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/pdfs/stats`);
      setStats(response.data.data || { pending: 0, approved: 0, rejected: 0, total: 0 });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleApprove = async (pdfId) => {
    if (!window.confirm('Are you sure you want to approve this PDF?')) return;
    
    setProcessingId(pdfId);
    try {
      await axios.put(`${API_BASE_URL}/admin/pdfs/${pdfId}/approve`, {
        adminId: user._id
      });
      toast.success('PDF approved successfully!');
      fetchPDFs();
      fetchStats();
    } catch (error) {
      console.error('Error approving PDF:', error);
      toast.error('Error approving PDF: ' + (error.response?.data?.message || error.message));
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!selectedPdf) return;
    if (!rejectionReason.trim()) {
      toast.warning('Please provide a reason for rejection');
      return;
    }

    setProcessingId(selectedPdf._id);
    try {
      await axios.put(`${API_BASE_URL}/admin/pdfs/${selectedPdf._id}/reject`, {
        rejectionReason: rejectionReason,
        adminId: user._id
      });
      toast.success('PDF rejected successfully!');
      setShowRejectModal(false);
      setRejectionReason('');
      setSelectedPdf(null);
      fetchPDFs();
      fetchStats();
    } catch (error) {
      console.error('Error rejecting PDF:', error);
      toast.error('Error rejecting PDF: ' + (error.response?.data?.message || error.message));
    } finally {
      setProcessingId(null);
    }
  };

  const openRejectModal = (pdf) => {
    setSelectedPdf(pdf);
    setShowRejectModal(true);
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const openPDFPreview = (pdfUrl) => {
    // Use Google Docs Viewer for reliable inline PDF viewing (prevents download)
    // This ensures the PDF is displayed in the browser without downloading
    const viewUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(pdfUrl)}&embedded=true`;
    
    setOriginalPdfUrl(pdfUrl);
    setPreviewPdfUrl(viewUrl);
    setShowPreviewModal(true);
  };

  const closePreviewModal = () => {
    setShowPreviewModal(false);
    setPreviewPdfUrl(null);
    setOriginalPdfUrl(null);
  };

  const handleDeletePDF = async (pdfId) => {
    if (!window.confirm('Are you sure you want to delete this PDF? This action cannot be undone.')) {
      return;
    }

    setDeletingPdfId(pdfId);
    try {
      const token = localStorage.getItem('authToken');
      await axios.delete(`${API_BASE_URL}/admin/pdfs/${pdfId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      toast.success('PDF deleted successfully!');
      fetchPDFs();
      fetchStats();
    } catch (error) {
      console.error('Error deleting PDF:', error);
      toast.error('Error deleting PDF: ' + (error.response?.data?.message || error.message));
    } finally {
      setDeletingPdfId(null);
    }
  };

  return (
    <div className="admin-pdf-approval">
      <div className="page-header">
        <h1>📄 PDF Approval Management</h1>
        <div className="header-actions">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search PDFs by title, description, or uploader..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPagination({ ...pagination, page: 1 });
              }}
            />
          </div>
        </div>
      </div>

      <div className="pdf-stats">
        <div className="stat-card pending">
          <div className="stat-icon">⏳</div>
          <div className="stat-info">
            <div className="stat-value">{stats.pending}</div>
            <div className="stat-label">Pending</div>
          </div>
        </div>
        <div className="stat-card approved">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <div className="stat-value">{stats.approved}</div>
            <div className="stat-label">Approved</div>
          </div>
        </div>
        <div className="stat-card rejected">
          <div className="stat-icon">❌</div>
          <div className="stat-info">
            <div className="stat-value">{stats.rejected}</div>
            <div className="stat-label">Rejected</div>
          </div>
        </div>
        <div className="stat-card total">
          <div className="stat-icon">📊</div>
          <div className="stat-info">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total PDFs</div>
          </div>
        </div>
      </div>

      <div className="filter-tabs">
        <button
          className={`filter-tab ${statusFilter === 'pending' ? 'active' : ''}`}
          onClick={() => {
            setStatusFilter('pending');
            setPagination({ ...pagination, page: 1 });
          }}
        >
          ⏳ Pending ({stats.pending})
        </button>
        <button
          className={`filter-tab ${statusFilter === 'approved' ? 'active' : ''}`}
          onClick={() => {
            setStatusFilter('approved');
            setPagination({ ...pagination, page: 1 });
          }}
        >
          ✅ Approved ({stats.approved})
        </button>
        <button
          className={`filter-tab ${statusFilter === 'rejected' ? 'active' : ''}`}
          onClick={() => {
            setStatusFilter('rejected');
            setPagination({ ...pagination, page: 1 });
          }}
        >
          ❌ Rejected ({stats.rejected})
        </button>
        <button
          className={`filter-tab ${statusFilter === 'all' ? 'active' : ''}`}
          onClick={() => {
            setStatusFilter('all');
            setPagination({ ...pagination, page: 1 });
          }}
        >
          📋 All ({stats.total})
        </button>
      </div>

      {loading ? (
        <div className="loading">Loading PDFs...</div>
      ) : (
        <div className="pdfs-grid">
          {pdfs.map((pdf) => (
            <div key={pdf._id} className={`pdf-card ${pdf.isApproved ? 'approved' : pdf.rejectionReason ? 'rejected' : 'pending'}`}>
              <div className="pdf-card-header">
                <div className="pdf-status-badge">
                  {pdf.isApproved ? '✅ Approved' : pdf.rejectionReason ? '❌ Rejected' : '⏳ Pending'}
                </div>
                <div className="pdf-subject">{pdf.subject}</div>
              </div>
              
              <div className="pdf-card-body">
                <h3 className="pdf-title">{pdf.title}</h3>
                {pdf.description && (
                  <p className="pdf-description">{pdf.description}</p>
                )}
                
                <div className="pdf-meta">
                  <div className="meta-item">
                    <span className="meta-label">📁 File:</span>
                    <span className="meta-value">{pdf.fileName}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">📏 Size:</span>
                    <span className="meta-value">{formatFileSize(pdf.fileSize)}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">👤 Uploaded by:</span>
                    <span className="meta-value">{pdf.uploaderName || pdf.uploadedBy?.name || 'Unknown'}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">📅 Uploaded:</span>
                    <span className="meta-value">{new Date(pdf.createdAt).toLocaleDateString()}</span>
                  </div>
                  {pdf.approvedBy && (
                    <div className="meta-item">
                      <span className="meta-label">✅ Approved by:</span>
                      <span className="meta-value">{pdf.approvedBy?.name || 'Admin'}</span>
                    </div>
                  )}
                  {pdf.approvedAt && (
                    <div className="meta-item">
                      <span className="meta-label">📅 Approved:</span>
                      <span className="meta-value">{new Date(pdf.approvedAt).toLocaleDateString()}</span>
                    </div>
                  )}
                  {pdf.rejectionReason && (
                    <div className="meta-item rejection-reason">
                      <span className="meta-label">❌ Reason:</span>
                      <span className="meta-value">{pdf.rejectionReason}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pdf-card-actions">
                <button
                  className="btn-preview"
                  onClick={() => openPDFPreview(pdf.cloudinaryUrl || pdf.filePath)}
                >
                  👁️ Preview
                </button>
                {!pdf.isApproved && !pdf.rejectionReason && (
                  <>
                    <button
                      className="btn-approve"
                      onClick={() => handleApprove(pdf._id)}
                      disabled={processingId === pdf._id}
                    >
                      {processingId === pdf._id ? 'Processing...' : '✅ Approve'}
                    </button>
                    <button
                      className="btn-reject"
                      onClick={() => openRejectModal(pdf)}
                      disabled={processingId === pdf._id}
                    >
                      ❌ Reject
                    </button>
                  </>
                )}
                {pdf.rejectionReason && (
                  <button
                    className="btn-approve"
                    onClick={() => handleApprove(pdf._id)}
                    disabled={processingId === pdf._id}
                  >
                    {processingId === pdf._id ? 'Processing...' : '✅ Approve Anyway'}
                  </button>
                )}
                <button
                  className="btn-delete"
                  onClick={() => handleDeletePDF(pdf._id)}
                  disabled={deletingPdfId === pdf._id}
                  title="Delete PDF"
                >
                  {deletingPdfId === pdf._id ? 'Deleting...' : '🗑️ Delete'}
                </button>
              </div>
            </div>
          ))}
          
          {pdfs.length === 0 && (
            <div className="no-pdfs">
              <div className="no-pdfs-icon">📄</div>
              <h3>No PDFs found</h3>
              <p>
                {statusFilter === 'pending' 
                  ? 'No pending PDFs to review' 
                  : statusFilter === 'approved'
                  ? 'No approved PDFs yet'
                  : statusFilter === 'rejected'
                  ? 'No rejected PDFs'
                  : 'No PDFs found matching your criteria'}
              </p>
            </div>
          )}
        </div>
      )}

      {pagination.pages > 1 && (
        <div className="pagination">
          <button
            onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
            disabled={pagination.page === 1}
            className="pagination-btn"
          >
            ← Previous
          </button>
          <span className="pagination-info">
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
            disabled={pagination.page >= pagination.pages}
            className="pagination-btn"
          >
            Next →
          </button>
        </div>
      )}

      {/* PDF Preview Modal */}
      {showPreviewModal && previewPdfUrl && (
        <div className="modal-overlay pdf-preview-overlay" onClick={closePreviewModal}>
          <div className="modal-content pdf-preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>PDF Preview</h2>
              <button className="modal-close" onClick={closePreviewModal}>×</button>
            </div>
            <div className="modal-body pdf-preview-body">
              <iframe
                src={previewPdfUrl}
                className="pdf-preview-iframe"
                title="PDF Preview"
                type="application/pdf"
              />
              <div className="pdf-preview-fallback">
                <p>Having trouble viewing? Try:</p>
                {originalPdfUrl && (
                  <a
                    href={originalPdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-preview-fallback"
                  >
                    Open Direct Link
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Reject PDF</h2>
              <button className="modal-close" onClick={() => setShowRejectModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p><strong>Title:</strong> {selectedPdf?.title}</p>
              <p><strong>Uploaded by:</strong> {selectedPdf?.uploaderName || selectedPdf?.uploadedBy?.name}</p>
              <div className="form-group">
                <label>Rejection Reason *</label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Please provide a reason for rejecting this PDF..."
                  rows="4"
                  required
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowRejectModal(false)}>
                Cancel
              </button>
              <button
                className="btn-confirm-reject"
                onClick={handleReject}
                disabled={!rejectionReason.trim() || processingId === selectedPdf?._id}
              >
                {processingId === selectedPdf?._id ? 'Processing...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPDFApproval;

