// pages/ManageQuestions.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "../utils/toast";
import "./ManageQuestions.css";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const ManageQuestions = ({ user }) => {
  const [questions, setQuestions] = useState([]);
  const [filteredQuestions, setFilteredQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkImportFile, setBulkImportFile] = useState(null);
  const [bulkImportLoading, setBulkImportLoading] = useState(false);
  const [bulkImportResult, setBulkImportResult] = useState(null);

  const categories = [
    "all",
    "general-knowledge",
    "mathematics",
    "english",
    "malayalam",
    "constitution",
    "reasoning",
    "computer",
    "current-affairs",
  ];

  const [formData, setFormData] = useState({
    question: "",
    options: ["", "", "", ""],
    correctAnswer: 0,
    explanation: "",
    category: "general-knowledge",
    difficulty: "medium",
    tags: "",
  });

  useEffect(() => {
    fetchQuestions();
  }, []);

  useEffect(() => {
    filterQuestions();
  }, [questions, selectedCategory, searchTerm]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${API_BASE_URL}/admin/questions`
      );
      setQuestions(response.data.data.questions);
    } catch (error) {
      console.error("Error fetching questions:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterQuestions = () => {
    let filtered = questions;

    if (selectedCategory !== "all") {
      filtered = filtered.filter((q) => q.category === selectedCategory);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (q) =>
          q.question.toLowerCase().includes(term) ||
          (q.tags && q.tags.some((tag) => tag.toLowerCase().includes(term))) ||
          q.category.toLowerCase().includes(term)
      );
    }

    setFilteredQuestions(filtered);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingQuestion) {
        // Update existing question
        await axios.put(
          `${API_BASE_URL}/admin/questions/${editingQuestion._id}`,
          {
            ...formData,
            tags: formData.tags
              .split(",")
              .map((tag) => tag.trim())
              .filter((tag) => tag),
          }
        );
      } else {
        // Add new question
        await axios.post(`${API_BASE_URL}/admin/questions`, {
          ...formData,
          tags: formData.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter((tag) => tag),
        });
      }

      resetForm();
      fetchQuestions();
    } catch (error) {
      console.error("Error saving question:", error);
    }
  };

  const handleEdit = (question) => {
    setEditingQuestion(question);
    setFormData({
      question: question.question,
      options: [...question.options],
      correctAnswer: question.correctAnswer,
      explanation: question.explanation || "",
      category: question.category,
      difficulty: question.difficulty,
      tags: question.tags ? question.tags.join(", ") : "",
    });
    setShowAddForm(true);
    // Scroll to form
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteClick = (questionId) => {
    setDeleteConfirm(questionId);
  };

  const handleDeleteConfirm = async () => {
    try {
      const response = await axios.delete(
        `${API_BASE_URL}/admin/questions/${deleteConfirm}`
      );
      setDeleteConfirm(null);
      fetchQuestions(); // Refresh the list
    } catch (error) {
      console.error("Error deleting question:", error);
      toast.error("Error deleting question. Please try again.");
      setDeleteConfirm(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm(null);
  };

  const resetForm = () => {
    setShowAddForm(false);
    setEditingQuestion(null);
    setFormData({
      question: "",
      options: ["", "", "", ""],
      correctAnswer: 0,
      explanation: "",
      category: "general-knowledge",
      difficulty: "medium",
      tags: "",
    });
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData({ ...formData, options: newOptions });
  };

  const getCategoryDisplayName = (category) => {
    const names = {
      all: "All Subjects",
      "general-knowledge": "General Knowledge",
      mathematics: "Mathematics",
      english: "English",
      malayalam: "Malayalam",
      constitution: "Constitution",
      reasoning: "Reasoning",
      computer: "Computer",
      "current-affairs": "Current Affairs",
    };
    return names[category] || category;
  };

  const getQuestionsCountByCategory = (category) => {
    if (category === "all") return questions.length;
    return questions.filter((q) => q.category === category).length;
  };

  const handleBulkImport = async () => {
    if (!bulkImportFile) {
      toast.warning('Please select a file first');
      return;
    }

    setBulkImportLoading(true);
    setBulkImportResult(null);

    try {
      const fileContent = await readFileContent(bulkImportFile);
      let questions = [];

      if (bulkImportFile.name.endsWith('.json')) {
        questions = JSON.parse(fileContent);
      } else if (bulkImportFile.name.endsWith('.csv')) {
        questions = parseCSV(fileContent);
      } else {
        throw new Error('Unsupported file format. Please use JSON or CSV.');
      }

      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error('File must contain an array of questions');
      }

      const token = localStorage.getItem('authToken');
      const response = await axios.post(
        'http://localhost:5000/api/admin/questions/bulk-import',
        { questions },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      setBulkImportResult({
        status: 'success',
        data: response.data.data
      });
    } catch (error) {
      console.error('Bulk import error:', error);
      setBulkImportResult({
        status: 'error',
        message: error.response?.data?.message || error.message || 'Failed to import questions',
        data: error.response?.data?.data || null
      });
    } finally {
      setBulkImportLoading(false);
    }
  };

  const readFileContent = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const parseCSV = (csvContent) => {
    const lines = csvContent.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV file must have at least a header row and one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const questions = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length < headers.length) continue;

      const question = {
        question: values[headers.indexOf('question')] || '',
        options: [
          values[headers.indexOf('option1')] || '',
          values[headers.indexOf('option2')] || '',
          values[headers.indexOf('option3')] || values[headers.indexOf('option3')] || '',
          values[headers.indexOf('option4')] || values[headers.indexOf('option4')] || ''
        ].filter(opt => opt),
        correctAnswer: parseInt(values[headers.indexOf('correctanswer')] || '0', 10),
        category: values[headers.indexOf('category')] || 'general-knowledge',
        difficulty: values[headers.indexOf('difficulty')] || 'medium',
        explanation: values[headers.indexOf('explanation')] || '',
        tags: values[headers.indexOf('tags')] ? values[headers.indexOf('tags')].split(';').map(t => t.trim()) : []
      };

      questions.push(question);
    }

    return questions;
  };

  return (
    <div className="manage-questions">
      <div className="page-header">
        <h1>Manage Questions</h1>
        <div className="header-actions">
          <button
            className="btn-secondary"
            onClick={() => {
              setShowBulkImport(true);
              setShowAddForm(false);
            }}
          >
            📥 Bulk Import
          </button>
          <button
            className="btn-primary"
            onClick={() => {
              resetForm();
              setShowAddForm(true);
              setShowBulkImport(false);
            }}
          >
            + Add Question
          </button>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="filters-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search questions by text or tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button className="clear-search" onClick={() => setSearchTerm("")}>
              ✕
            </button>
          )}
        </div>

        <div className="category-filters">
          {categories.map((category) => (
            <button
              key={category}
              className={`category-filter ${
                selectedCategory === category ? "active" : ""
              }`}
              onClick={() => setSelectedCategory(category)}
            >
              {getCategoryDisplayName(category)}
              <span className="question-count">
                ({getQuestionsCountByCategory(category)})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Current Filter Info */}
      <div className="current-filter-info">
        <h2>
          {selectedCategory === "all"
            ? "All Questions"
            : getCategoryDisplayName(selectedCategory)}
          {searchTerm && ` containing "${searchTerm}"`}
          <span className="total-count">
            {" "}
            ({filteredQuestions.length} questions)
          </span>
        </h2>
      </div>

      {/* Bulk Import Section */}
      {showBulkImport && (
        <div className="bulk-import-section">
          <div className="section-header">
            <h2>Bulk Import Questions</h2>
            <button
              className="btn-close"
              onClick={() => {
                setShowBulkImport(false);
                setBulkImportFile(null);
                setBulkImportResult(null);
              }}
              title="Close"
            >
              ✕
            </button>
          </div>
          <div className="bulk-import-info">
            <h3>📋 Import Format</h3>
            <p>You can import questions using JSON or CSV format. Download the template to see the required format.</p>
            
            <div className="format-examples">
              <div className="format-example">
                <h4>JSON Format:</h4>
                <pre>{`[
  {
    "question": "What is the capital of India?",
    "options": ["Mumbai", "Delhi", "Kolkata", "Chennai"],
    "correctAnswer": 1,
    "category": "general-knowledge",
    "difficulty": "easy",
    "explanation": "Delhi is the capital of India",
    "tags": ["geography", "india"]
  }
]`}</pre>
              </div>
              
              <div className="format-example">
                <h4>CSV Format:</h4>
                <p>CSV should have columns: question, option1, option2, option3, option4, correctAnswer, category, difficulty, explanation, tags</p>
                <p className="note">Note: correctAnswer should be 0-based index (0, 1, 2, or 3)</p>
              </div>
            </div>

            <div className="download-template">
              <button
                className="btn-secondary"
                onClick={() => {
                  const template = [
                    {
                      question: "Sample Question 1",
                      options: ["Option A", "Option B", "Option C", "Option D"],
                      correctAnswer: 0,
                      category: "general-knowledge",
                      difficulty: "medium",
                      explanation: "This is an explanation",
                      tags: ["sample", "template"]
                    },
                    {
                      question: "Sample Question 2",
                      options: ["Option A", "Option B", "Option C", "Option D"],
                      correctAnswer: 1,
                      category: "mathematics",
                      difficulty: "hard",
                      explanation: "Another explanation",
                      tags: ["math", "template"]
                    }
                  ];
                  
                  const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'questions-template.json';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                📥 Download JSON Template
              </button>
            </div>
          </div>

          <div className="file-upload-section">
            <h3>Upload File</h3>
            <div className="file-upload-area">
              <input
                type="file"
                id="bulk-import-file"
                accept=".json,.csv"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    setBulkImportFile(file);
                    setBulkImportResult(null);
                  }
                }}
                style={{ display: 'none' }}
              />
              <label htmlFor="bulk-import-file" className="file-upload-label">
                {bulkImportFile ? (
                  <span>📄 {bulkImportFile.name}</span>
                ) : (
                  <span>📁 Click to select JSON or CSV file</span>
                )}
              </label>
              {bulkImportFile && (
                <button
                  className="btn-clear"
                  onClick={() => {
                    setBulkImportFile(null);
                    document.getElementById('bulk-import-file').value = '';
                  }}
                >
                  ✕ Clear
                </button>
              )}
            </div>

            {bulkImportFile && (
              <button
                className="btn-primary"
                onClick={handleBulkImport}
                disabled={bulkImportLoading}
              >
                {bulkImportLoading ? '⏳ Importing...' : '🚀 Import Questions'}
              </button>
            )}
          </div>

          {bulkImportResult && (
            <div className={`import-result ${bulkImportResult.status === 'success' ? 'success' : 'error'}`}>
              <h3>
                {bulkImportResult.status === 'success' ? '✅ Import Successful' : '❌ Import Failed'}
              </h3>
              {bulkImportResult.data && (
                <div className="result-stats">
                  <div className="stat-item">
                    <span className="stat-label">Total:</span>
                    <span className="stat-value">{bulkImportResult.data.total || 0}</span>
                  </div>
                  <div className="stat-item success">
                    <span className="stat-label">Imported:</span>
                    <span className="stat-value">{bulkImportResult.data.imported || 0}</span>
                  </div>
                  {bulkImportResult.data.skipped > 0 && (
                    <div className="stat-item warning">
                      <span className="stat-label">Skipped:</span>
                      <span className="stat-value">{bulkImportResult.data.skipped}</span>
                    </div>
                  )}
                  {bulkImportResult.data.failed > 0 && (
                    <div className="stat-item error">
                      <span className="stat-label">Failed:</span>
                      <span className="stat-value">{bulkImportResult.data.failed}</span>
                    </div>
                  )}
                </div>
              )}

              {bulkImportResult.data?.errors && bulkImportResult.data.errors.length > 0 && (
                <div className="import-errors">
                  <h4>Errors:</h4>
                  <div className="errors-list">
                    {bulkImportResult.data.errors.slice(0, 10).map((error, index) => (
                      <div key={index} className="error-item">
                        <strong>Row {error.row}:</strong> {error.question || 'N/A'}
                        <ul>
                          {error.errors?.map((err, i) => (
                            <li key={i}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                    {bulkImportResult.data.errors.length > 10 && (
                      <p className="more-errors">... and {bulkImportResult.data.errors.length - 10} more errors</p>
                    )}
                  </div>
                </div>
              )}

              {bulkImportResult.status === 'success' && bulkImportResult.data?.imported > 0 && (
                <button
                  className="btn-primary"
                  onClick={() => {
                    fetchQuestions();
                    setShowBulkImport(false);
                    setBulkImportFile(null);
                    setBulkImportResult(null);
                  }}
                >
                  Refresh Questions List
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Question Form */}
      {showAddForm && (
        <div className="add-question-form">
          <div className="section-header">
            <h2>{editingQuestion ? "Edit Question" : "Add New Question"}</h2>
            <button
              className="btn-close"
              onClick={resetForm}
              title="Close"
            >
              ✕
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Question</label>
              <textarea
                value={formData.question}
                onChange={(e) =>
                  setFormData({ ...formData, question: e.target.value })
                }
                required
              />
            </div>

            <div className="form-group">
              <label>Options</label>
              {formData.options.map((option, index) => (
                <div key={index} className="option-input-group">
                  <span className="option-label">
                    {String.fromCharCode(65 + index)}.
                  </span>
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    required
                  />
                </div>
              ))}
            </div>

            <div className="form-group">
              <label>Correct Answer</label>
              <select
                value={formData.correctAnswer}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    correctAnswer: parseInt(e.target.value),
                  })
                }
              >
                {formData.options.map((_, index) => (
                  <option key={index} value={index}>
                    Option {String.fromCharCode(65 + index)}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Category</label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                >
                  {categories
                    .filter((cat) => cat !== "all")
                    .map((category) => (
                      <option key={category} value={category}>
                        {getCategoryDisplayName(category)}
                      </option>
                    ))}
                </select>
              </div>

              <div className="form-group">
                <label>Difficulty</label>
                <select
                  value={formData.difficulty}
                  onChange={(e) =>
                    setFormData({ ...formData, difficulty: e.target.value })
                  }
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Explanation (Optional)</label>
              <textarea
                value={formData.explanation}
                onChange={(e) =>
                  setFormData({ ...formData, explanation: e.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label>Tags (comma separated)</label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) =>
                  setFormData({ ...formData, tags: e.target.value })
                }
                placeholder="psc, kerala, general-knowledge"
              />
            </div>

            <div className="form-actions">
              <button type="button" onClick={resetForm}>
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                {editingQuestion ? "Update Question" : "Add Question"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Questions List */}
      <div className="questions-list">
        {loading ? (
          <div className="loading">Loading questions...</div>
        ) : (
          <div className="questions-grid">
            {filteredQuestions.length === 0 ? (
              <div className="no-questions">
                {searchTerm || selectedCategory !== "all"
                  ? "No questions found matching your criteria."
                  : "No questions available. Add your first question!"}
              </div>
            ) : (
              filteredQuestions.map((question) => (
                <div key={question._id} className="question-card">
                  <h4>{question.question}</h4>
                  <div className="question-meta">
                    <span className={`difficulty ${question.difficulty}`}>
                      {question.difficulty}
                    </span>
                    <span className="category">
                      {getCategoryDisplayName(question.category)}
                    </span>
                    {question.tags && question.tags.length > 0 && (
                      <div className="question-tags">
                        {question.tags.map((tag, index) => (
                          <span key={index} className="tag">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="question-options">
                    {question.options.map((option, index) => (
                      <div
                        key={index}
                        className={`option ${
                          index === question.correctAnswer ? "correct" : ""
                        }`}
                      >
                        {String.fromCharCode(65 + index)}. {option}
                      </div>
                    ))}
                  </div>
                  {question.explanation && (
                    <div className="explanation">
                      <strong>Explanation:</strong> {question.explanation}
                    </div>
                  )}
                  <div className="question-footer">
                    <div className="question-date">
                      Created:{" "}
                      {new Date(question.createdAt).toLocaleDateString()}
                    </div>
                    <div className="question-actions">
                      <button
                        className="btn-edit"
                        onClick={() => handleEdit(question)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn-delete"
                        onClick={() => handleDeleteClick(question._id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Confirm Delete</h3>
            </div>
            <div className="modal-body">
              <p>
                Are you sure you want to delete this question? This action
                cannot be undone.
              </p>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={handleDeleteCancel}>
                Cancel
              </button>
              <button
                className="btn-delete-confirm"
                onClick={handleDeleteConfirm}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageQuestions;
