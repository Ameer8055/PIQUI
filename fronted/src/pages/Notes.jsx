import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { generateNotebookPDF } from "../utils/PdfGenerator";
import { toast } from "../utils/toast";
import "./Notes.css";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const Notes = ({ user }) => {
  const navigate = useNavigate();
  const textAreaRef = useRef(null);
  const [activeSection, setActiveSection] = useState("pdf-sharing"); // 'pdf-sharing', 'notebook', 'quiz-maker'
  
  // PDF Sharing states
  const [sharedPDFs, setSharedPDFs] = useState([]);
  const [pdfUploadTitle, setPdfUploadTitle] = useState("");
  const [pdfUploadSubject, setPdfUploadSubject] = useState("");
  const [pdfUploadDescription, setPdfUploadDescription] = useState("");
  const [pdfFile, setPdfFile] = useState(null);
  const [isUploadingPDF, setIsUploadingPDF] = useState(false);
  const [pdfFilter, setPdfFilter] = useState("all");
  const [pdfSearchQuery, setPdfSearchQuery] = useState("");
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState(null);
  const [originalPdfUrl, setOriginalPdfUrl] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Typed Note states
  const [typedNotes, setTypedNotes] = useState([]);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteSubject, setNoteSubject] = useState("");
  const [textContent, setTextContent] = useState("");
  const [fontSize, setFontSize] = useState(16);
  const [fontFamily, setFontFamily] = useState("Arial");
  const [textColor, setTextColor] = useState("#000000");
  const [paperStyle, setPaperStyle] = useState("college");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState(null);
  const [deletingNoteId, setDeletingNoteId] = useState(null);

  // Quiz Maker states
  const [quizPDFTitle, setQuizPDFTitle] = useState("");
  const [quizPDFFile, setQuizPDFFile] = useState(null);
  const [isUploadingQuizPDF, setIsUploadingQuizPDF] = useState(false);
  const [quizFromPDFs, setQuizFromPDFs] = useState([]);
  const [currentQuiz, setCurrentQuiz] = useState(null);
  const [generatingQuizFromNote, setGeneratingQuizFromNote] = useState(null);
  const [hasGeneratedQuizToday, setHasGeneratedQuizToday] = useState(false);
  const [showNotebookOptions, setShowNotebookOptions] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth > 768;
  });

  const subjects = [
    "India GK",
    "Kerala GK",
    "Mathematics",
    "English",
    "Malayalam",
    "Constitution",
    "Reasoning",
    "Computer",
    "Current Affairs",
    "Science",
  ];

  const fontOptions = [
    { value: "Arial", label: "Arial" },
    { value: "Times New Roman", label: "Times New Roman" },
    { value: "Georgia", label: "Georgia" },
    { value: "Courier New", label: "Courier New" },
    { value: "Verdana", label: "Verdana" },
    { value: "Comic Sans MS", label: "Comic Sans" },
  ];

  const token = localStorage.getItem("authToken");

  // Fetch shared PDFs
  const fetchSharedPDFs = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/shared-pdfs?subject=${pdfFilter}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSharedPDFs(response.data.data.pdfs || []);
    } catch (error) {
      console.error("Error fetching shared PDFs:", error);
    }
  };

  // Fetch typed notes
  const fetchTypedNotes = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/typed-notes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTypedNotes(response.data.data.notes || []);
    } catch (error) {
      console.error("Error fetching typed notes:", error);
    }
  };

  // Fetch quiz from PDFs
  const fetchQuizFromPDFs = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/quiz-from-pdf`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const quizzes = response.data.data || [];
      setQuizFromPDFs(quizzes);
      
      // Daily limit removed for testing - always set to false
      setHasGeneratedQuizToday(false);
    } catch (error) {
      console.error("Error fetching quiz from PDFs:", error);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }
    fetchSharedPDFs();
    fetchTypedNotes();
    fetchQuizFromPDFs();
  }, [user, pdfFilter]);

  // PDF Sharing handlers
  const handlePDFUpload = async () => {
    if (!pdfFile || !pdfUploadTitle || !pdfUploadSubject) {
      toast.warning("Please fill all required fields");
      return;
    }

    if (pdfFile.size > 20 * 1024 * 1024) {
      toast.warning("File size must be less than 20MB");
      return;
    }

    setIsUploadingPDF(true);
    const formData = new FormData();
    formData.append("pdf", pdfFile);
    formData.append("title", pdfUploadTitle);
    formData.append("subject", pdfUploadSubject);
    formData.append("description", pdfUploadDescription);

    try {
      await axios.post(`${API_BASE_URL}/shared-pdfs/upload`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      toast.success("PDF uploaded successfully!");
      setPdfUploadTitle("");
      setPdfUploadSubject("");
      setPdfUploadDescription("");
      setPdfFile(null);
      setShowUploadModal(false); // Close modal after successful upload
      fetchSharedPDFs();
    } catch (error) {
      console.error("Error uploading PDF:", error);
      toast.error("Error uploading PDF: " + (error.response?.data?.message || error.message));
    } finally {
      setIsUploadingPDF(false);
    }
  };

  const handlePDFDownload = async (pdfId, fileName) => {
    try {
      // Create a link element to trigger download with proper filename
      const link = document.createElement("a");
      link.href = `${API_BASE_URL}/shared-pdfs/${pdfId}/download`;
      link.download = fileName || "document.pdf";
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Refresh the list to update download counts
      setTimeout(() => {
        fetchSharedPDFs();
      }, 1000);
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast.error("Error downloading PDF");
    }
  };

  const openPDFPreview = (pdf) => {
    // Get the PDF URL (cloudinaryUrl or filePath)
    const pdfUrl = pdf.cloudinaryUrl || pdf.filePath;
    if (!pdfUrl) {
      toast.warning("PDF URL not available");
      return;
    }
    
    // Use Google Docs Viewer for reliable inline PDF viewing (prevents download)
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

  const handlePDFLike = async (pdfId) => {
    try {
      await axios.post(`${API_BASE_URL}/shared-pdfs/${pdfId}/like`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchSharedPDFs();
    } catch (error) {
      console.error("Error liking PDF:", error);
    }
  };

  // Typed Note handlers
  const handleSaveNote = async () => {
    if (!noteTitle || !textContent || !noteSubject) {
      toast.warning("Please fill all required fields");
      return;
    }

    setIsSavingNote(true);
    try {
      if (selectedNote) {
        await axios.put(
          `${API_BASE_URL}/typed-notes/${selectedNote._id}`,
          {
            title: noteTitle,
            content: textContent,
            subject: noteSubject,
            fontSize,
            fontFamily,
            textColor,
            paperStyle,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        toast.success("Note updated successfully!");
      } else {
        await axios.post(
          `${API_BASE_URL}/typed-notes`,
          {
            title: noteTitle,
            content: textContent,
            subject: noteSubject,
            fontSize,
            fontFamily,
            textColor,
            paperStyle,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        toast.success("Note saved successfully!");
      }
      resetNoteForm();
      fetchTypedNotes();
    } catch (error) {
      console.error("Error saving note:", error);
      toast.error("Error saving note: " + (error.response?.data?.message || error.message));
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleDownloadNoteAsPDF = async (note) => {
    try {
      if (!note || !note.content) {
        toast.warning("Note content is missing. Cannot generate PDF.");
        return;
      }

      const noteData = {
        title: note.title || "Untitled Note",
        subject: note.subject || "General",
        date: note.createdAt || new Date(),
        type: "typing",
        textContent: note.content || "",
        fontSize: note.fontSize || 16,
        fontFamily: note.fontFamily || "Arial",
        textColor: note.textColor || "#000000",
        paperStyle: note.paperStyle || "college",
      };

      await generateNotebookPDF(noteData, user);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Error generating PDF: " + (error.message || "Unknown error"));
    }
  };

  const handleEditNote = (note) => {
    setSelectedNote(note);
    setNoteTitle(note.title);
    setNoteSubject(note.subject);
    setTextContent(note.content);
    setFontSize(note.fontSize);
    setFontFamily(note.fontFamily);
    setTextColor(note.textColor);
    setPaperStyle(note.paperStyle);
  };

  const resetNoteForm = () => {
    setSelectedNote(null);
    setNoteTitle("");
    setNoteSubject("");
    setTextContent("");
    setFontSize(16);
    setFontFamily("Arial");
    setTextColor("#000000");
    setPaperStyle("college");
  };

  const handleDeleteNoteClick = (noteId) => {
    const note = typedNotes.find(n => n._id === noteId);
    setNoteToDelete({
      id: noteId,
      title: note?.title || 'Untitled Note',
      preview: note?.content?.substring(0, 100) || ''
    });
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setNoteToDelete(null);
  };

  const handleDeleteNote = async () => {
    if (!noteToDelete) return;

    setDeletingNoteId(noteToDelete.id);
    try {
      await axios.delete(`${API_BASE_URL}/typed-notes/${noteToDelete.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Note deleted successfully!");
      fetchTypedNotes();
      closeDeleteModal();
    } catch (error) {
      console.error("Error deleting note:", error);
      toast.error("Error deleting note");
    } finally {
      setDeletingNoteId(null);
    }
  };

  // Quiz Maker handlers
  const handleQuizPDFUpload = async () => {
    if (!quizPDFFile || !quizPDFTitle) {
      toast.warning("Please fill all required fields");
      return;
    }

    if (quizPDFFile.size > 20 * 1024 * 1024) {
      toast.warning("File size must be less than 20MB");
      return;
    }

    setIsUploadingQuizPDF(true);
    const formData = new FormData();
    formData.append("file", quizPDFFile);
    formData.append("title", quizPDFTitle);

    try {
      const response = await axios.post(`${API_BASE_URL}/quiz-from-pdf/upload`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      toast.info("PDF uploaded! Quiz is being generated...");
      setQuizPDFTitle("");
      setQuizPDFFile(null);
      fetchQuizFromPDFs();
      
      // Poll for quiz completion
      const pollQuizStatus = setInterval(async () => {
        try {
          const statusResponse = await axios.get(
            `${API_BASE_URL}/quiz-from-pdf/${response.data.data.id}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          const quiz = statusResponse.data.data;
          if (quiz.status === "completed") {
            clearInterval(pollQuizStatus);
            setCurrentQuiz(quiz);
            fetchQuizFromPDFs();
          } else if (quiz.status === "failed") {
            clearInterval(pollQuizStatus);
            toast.error("Quiz generation failed: " + quiz.errorMessage);
          }
        } catch (error) {
          console.error("Error polling quiz status:", error);
        }
      }, 2000);

      setTimeout(() => clearInterval(pollQuizStatus), 60000); // Stop after 60 seconds
    } catch (error) {
      console.error("Error uploading quiz PDF:", error);
      const errorMessage = error.response?.data?.message || error.message;
      
      // Handle daily limit error specifically
      if (error.response?.status === 429 || error.response?.data?.code === 'DAILY_LIMIT_EXCEEDED') {
        toast.warning("⏰ Daily Limit Reached! You can only generate one quiz per day. Please try again tomorrow.");
        setHasGeneratedQuizToday(true);
        fetchQuizFromPDFs(); // Refresh to update state
      } else {
        toast.error("Error uploading PDF: " + errorMessage);
      }
    } finally {
      setIsUploadingQuizPDF(false);
    }
  };

  const handleStartQuiz = async (quizId) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/quiz-from-pdf/${quizId}/start`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      // Navigate to quiz page with questions and quizId
      navigate("/daily-quiz", { 
        state: { 
          questions: response.data.data.questions,
          quizId: response.data.data.quizId || response.data.data.sessionId
        } 
      });
    } catch (error) {
      console.error("Error starting quiz:", error);
      toast.error("Error starting quiz");
    }
  };

  // Generate quiz from a typed note
  const handleGenerateQuizFromNote = async (noteId, numQuestions = 5) => {
    if (!noteId) {
      toast.warning("Note ID is missing");
      return;
    }

    setGeneratingQuizFromNote(noteId);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/typed-notes/${noteId}/generate-quiz`,
        { numQuestions },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      toast.info("Quiz generation started! Check the AI Quiz Maker section in a few moments.");
      fetchQuizFromPDFs();
      
      // Poll for quiz completion
      const quizId = response.data.data.id;
      const pollQuizStatus = setInterval(async () => {
        try {
          const statusResponse = await axios.get(
            `${API_BASE_URL}/quiz-from-pdf/${quizId}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          const quiz = statusResponse.data.data;
          if (quiz.status === "completed") {
            clearInterval(pollQuizStatus);
            setCurrentQuiz(quiz);
            fetchQuizFromPDFs();
            toast.success("Quiz generated successfully!");
          } else if (quiz.status === "failed") {
            clearInterval(pollQuizStatus);
            toast.error("Quiz generation failed: " + (quiz.errorMessage || "Unknown error"));
          }
        } catch (error) {
          console.error("Error polling quiz status:", error);
        }
      }, 3000);

      setTimeout(() => clearInterval(pollQuizStatus), 120000); // Stop after 2 minutes
    } catch (error) {
      console.error("Error generating quiz from note:", error);
      const errorMessage = error.response?.data?.message || error.message;
      
      // Handle daily limit error specifically
      if (error.response?.status === 429 || error.response?.data?.code === 'DAILY_LIMIT_EXCEEDED') {
        toast.warning("⏰ Daily Limit Reached! You can only generate one quiz per day. Please try again tomorrow.");
        setHasGeneratedQuizToday(true);
        fetchQuizFromPDFs(); // Refresh to update state
      } else {
        toast.error("Error generating quiz: " + errorMessage);
      }
    } finally {
      setGeneratingQuizFromNote(null);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="notes-page">
      <div className="notes-header">
        <h1>📝 Study Notes</h1>
        <p>Share PDFs, create typed notes, and generate AI-powered quizzes</p>
      </div>

      {/* Section Tabs */}
      <div className="notes-tabs">
        <button
          className={`tab-btn ${activeSection === "pdf-sharing" ? "active" : ""}`}
          onClick={() => setActiveSection("pdf-sharing")}
        >
          Resources
        </button>
        <button
          className={`tab-btn ${activeSection === "notebook" ? "active" : ""}`}
          onClick={() => setActiveSection("notebook")}
        >
           Notebook
        </button>
        <button
          className={`tab-btn ${activeSection === "quiz-maker" ? "active" : ""}`}
          onClick={() => setActiveSection("quiz-maker")}
        >
          Quiz Maker
        </button>
      </div>

      {/* PDF Sharing Section */}
      {activeSection === "pdf-sharing" && (
        <div className="section-content contribute-section">
          {/* Upload Card - Hidden on mobile, shown on desktop */}
          <div className="upload-card desktop-upload-card">
            <h3>Share Your PDF Notes</h3>
            <p>Upload PDF files (max 20MB) to share with the community</p>

            <div className="upload-form">
              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  placeholder="e.g., Indian Constitution Summary"
                  value={pdfUploadTitle}
                  onChange={(e) => setPdfUploadTitle(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Subject *</label>
                <select
                  value={pdfUploadSubject}
                  onChange={(e) => setPdfUploadSubject(e.target.value)}
                >
                  <option value="">Select Subject</option>
                  {subjects.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  placeholder="Brief description of the PDF content..."
                  value={pdfUploadDescription}
                  onChange={(e) => setPdfUploadDescription(e.target.value)}
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label>Upload PDF *</label>
                <div className="file-upload-area">
                  <input
                    type="file"
                    id="pdf-upload"
                    accept=".pdf"
                    onChange={(e) => setPdfFile(e.target.files[0])}
                    style={{ display: "none" }}
                  />
                  <label htmlFor="pdf-upload" className="file-upload-label">
                    <div className="upload-icon">📁</div>
                    <div className="upload-text">
                      <strong>{pdfFile ? pdfFile.name : "Click to upload PDF"}</strong>
                      <span>Max file size: 20MB</span>
                    </div>
                  </label>
                </div>
              </div>

              <button
                className="upload-btn"
                onClick={handlePDFUpload}
                disabled={isUploadingPDF || !pdfFile || !pdfUploadTitle || !pdfUploadSubject}
              >
                {isUploadingPDF ? "Uploading..." : "Share PDF"}
              </button>
            </div>
          </div>

          <div className="community-notes">
            <div className="section-header-actions">
              <h3>Community PDFs ({sharedPDFs.length})</h3>
              <div className="header-actions-right">
                <button 
                  className="mobile-share-btn"
                  onClick={() => setShowUploadModal(true)}
                >
                  📤 Share PDF
                </button>
                <select
                  value={pdfFilter}
                  onChange={(e) => setPdfFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All Subjects</option>
                  {subjects.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="pdf-search-container">
              <input
                type="text"
                placeholder="🔍 Search PDFs by name..."
                value={pdfSearchQuery}
                onChange={(e) => setPdfSearchQuery(e.target.value)}
                className="pdf-search-input"
              />
            </div>
            <div className="notes-grid">
              {sharedPDFs
                .filter((pdf) => {
                  if (!pdfSearchQuery.trim()) return true;
                  const searchLower = pdfSearchQuery.toLowerCase();
                  return (
                    pdf.title.toLowerCase().includes(searchLower) ||
                    (pdf.description && pdf.description.toLowerCase().includes(searchLower)) ||
                    pdf.uploaderName.toLowerCase().includes(searchLower)
                  );
                })
                .map((pdf) => (
                <div key={pdf._id} className="note-card">
                  <div className="note-header">
                    <div className="note-type-icon">📄</div>
                    <div className="note-info">
                      <h4>{pdf.title}</h4>
                      <p className="note-subject">{pdf.subject}</p>
                      {pdf.description && (
                        <p className="note-preview">{pdf.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="note-meta">
                    <span>By {pdf.uploaderName}</span>
                    <span>{new Date(pdf.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="note-stats">
                    <div className="stat">
                      <button
                        className="like-btn"
                        onClick={() => handlePDFLike(pdf._id)}
                      >
                        👍 {pdf.likes?.length || 0}
                      </button>
                    </div>
                    <div className="stat">
                      <span>📥 {pdf.downloads || 0}</span>
                    </div>
                  </div>
                  <div className="note-actions">
                    <button
                      className="view-btn"
                      onClick={() => openPDFPreview(pdf)}
                    >
                      👁️ View
                    </button>
                    <button
                      className="download-btn"
                      onClick={() => handlePDFDownload(pdf._id, pdf.fileName)}
                    >
                      📥 Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PDF Upload Modal - Mobile Only */}
      {showUploadModal && (
        <div className="modal-overlay pdf-upload-modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="modal-content pdf-upload-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Share Your PDF Notes</h2>
              <button className="modal-close" onClick={() => setShowUploadModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="upload-form">
                <div className="form-group">
                  <label>Title *</label>
                  <input
                    type="text"
                    placeholder="e.g., Indian Constitution Summary"
                    value={pdfUploadTitle}
                    onChange={(e) => setPdfUploadTitle(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Subject *</label>
                  <select
                    value={pdfUploadSubject}
                    onChange={(e) => setPdfUploadSubject(e.target.value)}
                  >
                    <option value="">Select Subject</option>
                    {subjects.map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    placeholder="Brief description of the PDF content..."
                    value={pdfUploadDescription}
                    onChange={(e) => setPdfUploadDescription(e.target.value)}
                    rows="3"
                  />
                </div>

                <div className="form-group">
                  <label>Upload PDF *</label>
                  <div className="file-upload-area">
                    <input
                      type="file"
                      id="pdf-upload-mobile"
                      accept=".pdf"
                      onChange={(e) => setPdfFile(e.target.files[0])}
                      style={{ display: "none" }}
                    />
                    <label htmlFor="pdf-upload-mobile" className="file-upload-label">
                      <div className="upload-icon">📁</div>
                      <div className="upload-text">
                        <strong>{pdfFile ? pdfFile.name : "Click to upload PDF"}</strong>
                        <span>Max file size: 20MB</span>
                      </div>
                    </label>
                  </div>
                </div>

                <button
                  className="upload-btn"
                  onClick={handlePDFUpload}
                  disabled={isUploadingPDF || !pdfFile || !pdfUploadTitle || !pdfUploadSubject}
                >
                  {isUploadingPDF ? "Uploading..." : "Share PDF"}
                </button>
              </div>
            </div>
          </div>
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

      {/* Digital Notebook Section */}
      {activeSection === "notebook" && (
        <div className="section-content">
          <div className="notebook-section">
            <div className="notebook-header">
              <h3>✍️ Digital Notebook</h3>
              <p>Type your notes - they will be saved for 30 days</p>
            </div>

            <button
              type="button"
              className="options-toggle-btn"
              onClick={() => setShowNotebookOptions((prev) => !prev)}
            >
              {showNotebookOptions ? "Hide Options" : "⚙️ Options"}
            </button>

            <div className="notebook-container">
              <div className={`tools-panel ${showNotebookOptions ? 'show' : ''}`}>
                  <div className="tool-group">
                    <label>Text Color</label>
                    <div className="color-picker">
                    {["#000000", "#dc2626", "#2563eb", "#16a34a", "#7c3aed", "#6b7280"].map(
                      (color) => (
                        <button
                          key={color}
                          className={`color-option ${textColor === color ? "selected" : ""}`}
                          style={{ backgroundColor: color }}
                          onClick={() => setTextColor(color)}
                        />
                      )
                    )}
                      <input
                        type="color"
                        value={textColor}
                        onChange={(e) => setTextColor(e.target.value)}
                        className="color-input"
                      />
                    </div>
                  </div>

                  <div className="tool-group">
                    <label>Font Size</label>
                    <div className="font-sizes">
                      {[12, 14, 16, 18, 20, 24].map((size) => (
                        <button
                          key={size}
                        className={`size-option ${fontSize === size ? "selected" : ""}`}
                          onClick={() => setFontSize(size)}
                        >
                          {size}px
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="tool-group">
                    <label>Font Family</label>
                    <select
                      value={fontFamily}
                      onChange={(e) => setFontFamily(e.target.value)}
                      className="font-select"
                    >
                      {fontOptions.map((font) => (
                        <option key={font.value} value={font.value}>
                          {font.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="tool-group">
                    <label>Paper Style</label>
                    <div className="paper-style-selector">
                    {["college", "wide", "plain"].map((style) => (
                      <button
                        key={style}
                        className={`paper-style-btn ${paperStyle === style ? "active" : ""}`}
                        onClick={() => setPaperStyle(style)}
                      >
                        {style.charAt(0).toUpperCase() + style.slice(1)}
                      </button>
                    ))}
                    </div>
                  </div>

                  <div className="tool-actions">
                  <button className="tool-btn" onClick={() => setTextContent("")}>
                      🗑️ Clear Text
                    </button>
                  </div>
                </div>

              <div className="content-area">
                <div className="text-container">
                  <div
                    className={`lined-paper paper-${paperStyle}`}
                    style={{
                      "--line-color": paperStyle === "wide" ? "#cbd5e1" : "#d1d5db",
                      "--line-spacing":
                        paperStyle === "wide"
                          ? `${fontSize * 2.2}px`
                          : paperStyle === "college"
                          ? `${fontSize * 1.6}px`
                          : "0px",
                      "--font-size": `${fontSize}px`,
                      "--margin-color": paperStyle === "plain" ? "transparent" : "#f0ad4e",
                    }}
                  >
                    <textarea
                      ref={textAreaRef}
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      placeholder="Start typing your notes here..."
                      className="text-editor"
                      style={{
                        fontSize: `${fontSize}px`,
                        fontFamily: fontFamily,
                        color: textColor,
                        lineHeight:
                          paperStyle === "wide" ? "2.2" : paperStyle === "college" ? "1.6" : "1.8",
                      }}
                    />
                  </div>
                  <div className="text-stats">
                    <span>{textContent.length} characters</span>
                    <span>{textContent.split(/\s+/).filter((word) => word.length > 0).length} words</span>
                    <span>{textContent.split("\n").length} lines</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="save-section">
              <div className="save-form">
                <input
                  type="text"
                  placeholder="Enter title for your notes..."
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  className="note-title-input"
                />
                <select
                  value={noteSubject}
                  onChange={(e) => setNoteSubject(e.target.value)}
                  className="subject-select"
                >
                  <option value="">Select Subject</option>
                  {subjects.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
                <button
                  className="save-btn"
                  onClick={handleSaveNote}
                  disabled={isSavingNote || !noteTitle.trim() || !textContent.trim() || !noteSubject}
                >
                  {isSavingNote ? "Saving..." : selectedNote ? "💾 Update Note" : "💾 Save Note"}
                </button>
                {selectedNote && (
                  <button className="cancel-btn" onClick={resetNoteForm}>
                    Cancel
                  </button>
                )}
              </div>
              </div>

            <div className="saved-notes-section">
              <h3>Your Saved Notes</h3>
              <div className="notes-list">
                {typedNotes.map((note) => (
                  <div key={note._id} className="saved-note-item">
                    <div className="note-item-info">
                      <h4>{note.title}</h4>
                      <p>{note.subject} • {note.daysRemaining} days remaining</p>
                    </div>
                    <div className="note-item-actions">
                      <button onClick={() => handleEditNote(note)}>✏️ Edit</button>
                      <button onClick={() => handleDownloadNoteAsPDF(note)}>📥 Download PDF</button>
                      <button 
                        onClick={() => handleGenerateQuizFromNote(note._id, 5)}
                        disabled={
                          generatingQuizFromNote === note._id || 
                          !note.content || 
                          note.content.trim().length < 50 ||
                          hasGeneratedQuizToday
                        }
                        style={{ 
                          backgroundColor: hasGeneratedQuizToday 
                            ? '#ff9800' 
                            : generatingQuizFromNote === note._id 
                              ? '#ccc' 
                              : '#4CAF50',
                          color: 'white',
                          fontWeight: 'bold',
                          cursor: hasGeneratedQuizToday ? 'not-allowed' : 'pointer'
                        }}
                        title={hasGeneratedQuizToday ? "You can only generate one quiz per day. Try again tomorrow!" : ""}
                      >
                        {hasGeneratedQuizToday 
                          ? "⏰ Daily Limit Reached" 
                          : generatingQuizFromNote === note._id 
                            ? "⏳ Generating..." 
                            : "🤖 Generate Quiz"}
                      </button>
                      <button onClick={() => handleDeleteNoteClick(note._id)}>🗑️ Delete</button>
                    </div>
                  </div>
                ))}
                {typedNotes.length === 0 && (
                  <p className="empty-state">No saved notes yet. Create your first note above!</p>
                )}
                </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Quiz Maker Section */}
      {/* AI Quiz Maker Section - Simplified for Digital Notes Only */}
{activeSection === "quiz-maker" && (
  <div className="section-content">
    <div className="quiz-maker-section">
      {/* Header */}
      <div className="quiz-maker-header">
        <h3>🤖 AI Quiz Generator</h3>
        <p>Generate quizzes automatically from your saved digital notes using AI</p>
      </div>

      {/* Available Notes for Quiz Generation */}
      <div className="available-notes-section">
        <h4>📝 Your Notes Available for Quiz Generation</h4>
        <p>Select a note to generate an AI-powered quiz from its content</p>
        
        <div className="notes-list-for-quiz">
          {typedNotes.map((note) => (
            <div key={note._id} className="note-quiz-item">
              <div className="note-quiz-info">
                <h5>{note.title}</h5>
                <p className="note-subject">{note.subject}</p>
                <p className="note-preview">
                  {note.content.length > 150 
                    ? note.content.substring(0, 150) + '...' 
                    : note.content
                  }
                </p>
                <div className="note-stats">
                  <span>{note.content.length} chars</span>
                  <span>{note.content.split(/\s+/).filter(word => word.length > 0).length} words</span>
                  <span>{note.daysRemaining} days remaining</span>
                </div>
              </div>
              <div className="note-quiz-actions">
                <button 
                  className="generate-quiz-btn"
                  onClick={() => handleGenerateQuizFromNote(note._id, 5)}
                  disabled={
                    generatingQuizFromNote === note._id || 
                    !note.content || 
                    note.content.trim().length < 50 ||
                    hasGeneratedQuizToday
                  }
                  title={
                    hasGeneratedQuizToday 
                      ? "You can only generate one quiz per day. Try again tomorrow!" 
                      : note.content.trim().length < 50 
                        ? "Note content is too short (minimum 50 characters required)"
                        : "Generate quiz from this note"
                  }
                >
                  {hasGeneratedQuizToday 
                    ? "⏰ Daily Limit" 
                    : generatingQuizFromNote === note._id 
                      ? "⏳ Generating..." 
                      : "🤖 Generate Quiz"
                  }
                </button>
                
                {note.content.trim().length < 50 && (
                  <span className="warning-text">Note too short</span>
                )}
              </div>
            </div>
          ))}
          
          {typedNotes.length === 0 && (
            <div className="empty-notes-state">
              <div className="empty-icon">📝</div>
              <h5>No Notes Available</h5>
              <p>You haven't created any digital notes yet.</p>
              <button 
                className="create-note-btn"
                onClick={() => setActiveSection("notebook")}
              >
                ✍️ Create Your First Note
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Daily Limit Notice */}
      {hasGeneratedQuizToday && (
        <div className="daily-limit-notice">
          <div className="limit-icon">⏰</div>
          <div className="limit-text">
            <strong>Daily Limit Reached</strong>
            <p>You can generate one quiz per day. Come back tomorrow to create more quizzes!</p>
          </div>
        </div>
      )}

      {/* Generated Quizzes List */}
      <div className="generated-quizzes-section">
        <h4>🎯 Your Generated Quizzes</h4>
        <p>Quizzes created from your digital notes will appear here</p>
        
        <div className="quiz-list">
          {quizFromPDFs
            .filter(quiz => quiz.sourceType === "note") // Only show note-generated quizzes
            .map((quiz) => (
              <div key={quiz._id} className="quiz-item">
                <div className="quiz-item-info">
                  <h5>{quiz.title}</h5>
                  <div className="quiz-meta">
                    <span className={`status-badge status-${quiz.status}`}>
                      {quiz.status === "completed" ? "✅ Ready" : 
                       quiz.status === "processing" ? "⏳ Processing" : 
                       "❌ Failed"}
                    </span>
                    {quiz.status === "completed" && (
                      <span className="question-count">
                        {quiz.questions?.length || 0} questions
                      </span>
                    )}
                    <span className="quiz-date">
                      {new Date(quiz.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {quiz.sourceNote && (
                    <p className="source-note">
                      From note: <strong>{quiz.sourceNote.title}</strong>
                    </p>
                  )}
                </div>
                
                <div className="quiz-item-actions">
                  {quiz.status === "completed" ? (
                    <button
                      className="start-quiz-btn"
                      onClick={() => handleStartQuiz(quiz._id)}
                    >
                      🎯 Start Quiz
                    </button>
                  ) : quiz.status === "processing" ? (
                    <div className="processing-indicator">
                      <div className="spinner"></div>
                      <span>AI is generating your quiz...</span>
                    </div>
                  ) : (
                    <button 
                      className="retry-btn"
                      onClick={() => handleGenerateQuizFromNote(quiz.sourceNote?._id, 5)}
                      disabled={hasGeneratedQuizToday}
                    >
                      🔄 Retry
                    </button>
                  )}
                </div>
              </div>
            ))
          }
          
          {quizFromPDFs.filter(quiz => quiz.sourceType === "note").length === 0 && (
            <div className="empty-quizzes-state">
              <div className="empty-icon">🤖</div>
              <h5>No Quizzes Generated Yet</h5>
              <p>Generate your first quiz from one of your digital notes above!</p>
            </div>
          )}
        </div>
      </div>

      {/* How It Works */}
      <div className="how-it-works">
        <h4>💡 How It Works</h4>
        <div className="steps">
          <div className="step">
            <div className="step-number">1</div>
            <div className="step-content">
              <strong>Create Digital Notes</strong>
              <p>Use the Digital Notebook to type and save your study notes</p>
            </div>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <div className="step-content">
              <strong>Generate AI Quiz</strong>
              <p>Click "Generate Quiz" on any note with sufficient content</p>
            </div>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <div className="step-content">
              <strong>Take the Quiz</strong>
              <p>Start the quiz to test your knowledge from the notes</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
)}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && noteToDelete && (
        <div className="modal-overlay delete-modal-overlay" onClick={closeDeleteModal}>
          <div className="modal-content delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🗑️ Delete Note</h2>
              <button className="modal-close" onClick={closeDeleteModal}>×</button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete this note? This action cannot be undone.</p>
              <div className="message-preview">
                <strong>Note: {noteToDelete.title}</strong>
                <p>"{noteToDelete.preview}{noteToDelete.preview.length >= 100 ? '...' : ''}"</p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={closeDeleteModal}>
                Cancel
              </button>
              <button
                className="btn-delete-confirm"
                onClick={handleDeleteNote}
                disabled={deletingNoteId !== null}
              >
                {deletingNoteId ? 'Deleting...' : 'Delete Note'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notes;
