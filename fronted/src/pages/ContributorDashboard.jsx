import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ContributorDashboard.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const ContributorDashboard = ({ user }) => {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [formData, setFormData] = useState({
    question: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    explanation: '',
    category: 'general-knowledge',
    subCategory: 'All',
    tags: ''
  });

  useEffect(() => {
    if (user?.role !== 'contributor' && user?.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const [questionsRes, statsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/contributor/questions`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_BASE_URL}/contributor/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (questionsRes.data.status === 'success') {
        setQuestions(questionsRes.data.data);
      }
      if (statsRes.data.status === 'success') {
        setStats(statsRes.data.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('authToken');
      const payload = {
        ...formData,
        tags: formData.tags.split(',').map(t => t.trim()).filter(t => t)
      };

      if (editingQuestion) {
        await axios.put(`${API_BASE_URL}/contributor/questions/${editingQuestion._id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post(`${API_BASE_URL}/contributor/questions`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      setShowAddForm(false);
      setEditingQuestion(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving question:', error);
      alert(error.response?.data?.message || 'Failed to save question');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;

    try {
      const token = localStorage.getItem('authToken');
      await axios.delete(`${API_BASE_URL}/contributor/questions/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (error) {
      console.error('Error deleting question:', error);
      alert(error.response?.data?.message || 'Failed to delete question');
    }
  };

  const handleEdit = (question) => {
    setEditingQuestion(question);
    setFormData({
      question: question.question,
      options: [...question.options],
      correctAnswer: question.correctAnswer,
      explanation: question.explanation || '',
      category: question.category,
      subCategory: question.subCategory || 'All',
      tags: question.tags?.join(', ') || ''
    });
    setShowAddForm(true);
  };

  const resetForm = () => {
    setFormData({
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      explanation: '',
      category: 'general-knowledge',
      subCategory: 'All',
      tags: ''
    });
    setEditingQuestion(null);
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { text: 'Pending', class: 'status-pending' },
      approved: { text: 'Approved', class: 'status-approved' },
      rejected: { text: 'Rejected', class: 'status-rejected' }
    };
    const badge = badges[status] || badges.pending;
    return <span className={`status-badge ${badge.class}`}>{badge.text}</span>;
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="contributor-dashboard">
      <div className="dashboard-header">
        <h1>📝 Contributor Dashboard</h1>
        <p>Manage and submit your quiz questions</p>
      </div>

      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.totalQuestions}</div>
            <div className="stat-label">Total Questions</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.pendingQuestions}</div>
            <div className="stat-label">Pending</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.approvedQuestions}</div>
            <div className="stat-label">Approved</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.rejectedQuestions}</div>
            <div className="stat-label">Rejected</div>
          </div>
        </div>
      )}

      <div className="actions-bar">
        <button className="btn-primary" onClick={() => { resetForm(); setShowAddForm(true); }}>
          + Add New Question
        </button>
      </div>

      {showAddForm && (
        <div className="question-form-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editingQuestion ? 'Edit Question' : 'Add New Question'}</h2>
              <button className="close-btn" onClick={() => { setShowAddForm(false); resetForm(); }}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Question *</label>
                <textarea
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  required
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label>Options *</label>
                {formData.options.map((option, index) => (
                  <div key={index} className="option-input">
                    <input
                      type="radio"
                      name="correctAnswer"
                      checked={formData.correctAnswer === index}
                      onChange={() => setFormData({ ...formData, correctAnswer: index })}
                    />
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...formData.options];
                        newOptions[index] = e.target.value;
                        setFormData({ ...formData, options: newOptions });
                      }}
                      placeholder={`Option ${index + 1}`}
                      required
                    />
                  </div>
                ))}
              </div>

              <div className="form-group">
                <label>Explanation</label>
                <textarea
                  value={formData.explanation}
                  onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                  rows="2"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    required
                  >
                    <option value="general-knowledge">General Knowledge</option>
                    <option value="mathematics">Mathematics</option>
                    <option value="english">English</option>
                    <option value="current-affairs">Current Affairs</option>
                    <option value="science">Science</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Sub Category</label>
                  <input
                    type="text"
                    value={formData.subCategory}
                    onChange={(e) => setFormData({ ...formData, subCategory: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Tags (comma separated)</label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="tag1, tag2, tag3"
                />
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => { setShowAddForm(false); resetForm(); }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingQuestion ? 'Update' : 'Submit for Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="questions-list">
        <h2>Your Questions</h2>
        {questions.length === 0 ? (
          <div className="empty-state">
            <p>No questions yet. Add your first question!</p>
          </div>
        ) : (
          <div className="questions-grid">
            {questions.map((q) => (
              <div key={q._id} className="question-card">
                <div className="question-header">
                  {getStatusBadge(q.status)}
                  <span className="question-category">{q.category}</span>
                </div>
                <div className="question-text">{q.question}</div>
                <div className="question-actions">
                  {q.status === 'pending' && (
                    <>
                      <button className="btn-edit" onClick={() => handleEdit(q)}>Edit</button>
                      <button className="btn-delete" onClick={() => handleDelete(q._id)}>Delete</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ContributorDashboard;

