import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getCategoriesForSubject, getSubjectName } from '../utils/quizCategories';
import './ContributorDashboard.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const ContributorDashboard = ({ user }) => {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [filteredQuestions, setFilteredQuestions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showHostedForm, setShowHostedForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [hostedQuizzes, setHostedQuizzes] = useState([]);
  const [loadingHosted, setLoadingHosted] = useState(true);
  const [hostedForm, setHostedForm] = useState({
    title: '',
    description: '',
    category: 'india-gk',
    subCategory: 'All',
    questions: [
      { question: '', options: ['', '', '', ''], correctAnswer: 0, explanation: '' }
    ]
  });
  const categories = [
    "kerala-gk",
    "india-gk",
    "mathematics",
    "english",
    "malayalam",
    "constitution",
    "reasoning",
    "computer",
    "current-affairs",
    "science",
    "movies-tv",
    "music",
    "video-games",
    "sports",
    "food",
    "travel",
    "books",
    "pop-culture",
  ];

  const [formData, setFormData] = useState({
    question: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    explanation: '',
    category: 'india-gk',
    subCategory: 'All',
    tags: ''
  });

  useEffect(() => {
    if (!user?.isContributor && user?.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
    fetchData();
  }, [user, navigate]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredQuestions(questions);
    } else {
      const filtered = questions.filter(q =>
        q.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (q.tags && q.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
      );
      setFilteredQuestions(filtered);
    }
  }, [searchTerm, questions]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const [questionsRes, statsRes, hostedRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/contributor/questions`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_BASE_URL}/contributor/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_BASE_URL}/hosted-quizzes/mine`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (questionsRes.data.status === 'success') {
        setQuestions(questionsRes.data.data);
        setFilteredQuestions(questionsRes.data.data);
      }
      if (statsRes.data.status === 'success') {
        setStats(statsRes.data.data);
      }
      if (hostedRes.data.status === 'success') {
        setHostedQuizzes(hostedRes.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setLoadingHosted(false);
    }
  };

  const addHostedQuestionRow = () => {
    setHostedForm(prev => ({
      ...prev,
      questions: [
        ...prev.questions,
        { question: '', options: ['', '', '', ''], correctAnswer: 0, explanation: '' }
      ]
    }));
  };

  const updateHostedQuestionField = (index, field, value) => {
    setHostedForm(prev => {
      const updated = [...prev.questions];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, questions: updated };
    });
  };

  const updateHostedOption = (qIndex, optIndex, value) => {
    setHostedForm(prev => {
      const updated = [...prev.questions];
      const opts = [...updated[qIndex].options];
      opts[optIndex] = value;
      updated[qIndex] = { ...updated[qIndex], options: opts };
      return { ...prev, questions: updated };
    });
  };

  const submitHostedQuiz = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('authToken');
      const payload = {
        title: hostedForm.title,
        description: hostedForm.description,
        category: hostedForm.category,
        subCategory: hostedForm.subCategory,
        // Pass multiple questions at once; backend will create Question docs and link them
        questions: hostedForm.questions.map(q => ({
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          category: hostedForm.category,
          subCategory: hostedForm.subCategory
        }))
      };

      await axios.post(`${API_BASE_URL}/hosted-quizzes`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setShowHostedForm(false);
      setHostedForm({
        title: '',
        description: '',
        category: 'india-gk',
        subCategory: 'All',
        questions: [
          { question: '', options: ['', '', '', ''], correctAnswer: 0, explanation: '' }
        ]
      });
      fetchData();
    } catch (error) {
      console.error('Error creating hosted quiz:', error);
      alert(error.response?.data?.message || 'Failed to create hosted quiz');
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

  const handleDeleteAnyStatus = async (id) => {
    if (!window.confirm('Are you sure you want to delete this question? This action cannot be undone.')) return;

    try {
      const token = localStorage.getItem('authToken');
      // Try contributor endpoint first, if it fails (because status is not pending), use admin endpoint
      try {
        await axios.delete(`${API_BASE_URL}/contributor/questions/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (err) {
        // If contributor delete fails, try admin delete (if user is admin)
        if (user?.role === 'admin') {
          await axios.delete(`${API_BASE_URL}/admin/questions/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } else {
          throw err;
        }
      }
      fetchData();
    } catch (error) {
      console.error('Error deleting question:', error);
      alert(error.response?.data?.message || 'Failed to delete question');
    }
  };

  const handleHostedDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this hosted quiz match? The questions will remain in the database.')) return;

    try {
      const token = localStorage.getItem('authToken');
      await axios.delete(`${API_BASE_URL}/hosted-quizzes/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (error) {
      console.error('Error deleting hosted quiz:', error);
      alert(error.response?.data?.message || 'Failed to delete hosted quiz');
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
      category: 'india-gk',
      subCategory: 'All',
      tags: ''
    });
    setEditingQuestion(null);
  };

  const getCategoryDisplayName = (category) => {
    const names = {
      "kerala-gk": "Kerala GK",
      "india-gk": "India GK",
      mathematics: "Mathematics",
      english: "English",
      malayalam: "Malayalam",
      constitution: "Constitution",
      reasoning: "Reasoning",
      computer: "Computer",
      "current-affairs": "Current Affairs",
      science: "Science",
      "movies-tv": "Movies & TV Shows",
      music: "Music & Artists",
      "video-games": "Video Games",
      sports: "Sports",
      food: "Food & Cuisine",
      travel: "Travel & Places",
      books: "Books & Literature",
      "pop-culture": "Pop Culture",
    };
    return names[category] || category;
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
        <h1>Contributor Dashboard</h1>
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
          <div className="stat-card highlight-card">
            <div className="stat-value">{stats.contributorPoints || 0}</div>
            <div className="stat-label">Points</div>
          </div>
        </div>
      )}

      <div className="actions-bar">
        <div className="search-container">
          <input
            type="text"
            placeholder="Search questions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button className="clear-search" onClick={() => setSearchTerm('')}>✕</button>
          )}
        </div>
        <button className="btn-primary" onClick={() => { resetForm(); setShowAddForm(true); }}>
          + Add New Question
        </button>
        <button className="btn-primary" style={{ background: '#10B981' }} onClick={() => setShowHostedForm(true)}>
          👥 Create Hosted Quiz Match
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
                    onChange={(e) => {
                      const newCategory = e.target.value;
                      const subCategories = getCategoriesForSubject(newCategory);
                      setFormData({ 
                        ...formData, 
                        category: newCategory,
                        subCategory: subCategories[0] || 'All'
                      });
                    }}
                    required
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {getCategoryDisplayName(category)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Sub Category</label>
                  <select
                    value={formData.subCategory}
                    onChange={(e) => setFormData({ ...formData, subCategory: e.target.value })}
                  >
                    {getCategoriesForSubject(formData.category).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
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

      {showHostedForm && (
        <div className="question-form-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Create Hosted Quiz Match</h2>
              <button className="close-btn" onClick={() => setShowHostedForm(false)}>×</button>
            </div>
            <form onSubmit={submitHostedQuiz}>
              <div className="form-group">
                <label>Quiz Title *</label>
                <input
                  type="text"
                  value={hostedForm.title}
                  onChange={(e) => setHostedForm({ ...hostedForm, title: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={hostedForm.description}
                  onChange={(e) => setHostedForm({ ...hostedForm, description: e.target.value })}
                  rows="2"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Category *</label>
                  <select
                    value={hostedForm.category}
                    onChange={(e) => {
                      const newCategory = e.target.value;
                      const subCategories = getCategoriesForSubject(newCategory);
                      setHostedForm(prev => ({
                        ...prev,
                        category: newCategory,
                        subCategory: subCategories[0] || 'All'
                      }));
                    }}
                    required
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {getCategoryDisplayName(category)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Sub Category</label>
                  <select
                    value={hostedForm.subCategory}
                    onChange={(e) => setHostedForm({ ...hostedForm, subCategory: e.target.value })}
                  >
                    {getCategoriesForSubject(hostedForm.category).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Questions for this Hosted Quiz *</label>
                {hostedForm.questions.map((q, qIndex) => (
                  <div key={qIndex} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '0.75rem', marginBottom: '1rem', background: '#f9fafb' }}>
                    <div className="form-group">
                      <label>Question {qIndex + 1}</label>
                      <textarea
                        value={q.question}
                        onChange={(e) => updateHostedQuestionField(qIndex, 'question', e.target.value)}
                        required
                        rows="2"
                      />
                    </div>
                    <div className="form-group">
                      <label>Options</label>
                      {q.options.map((opt, optIndex) => (
                        <div key={optIndex} className="option-input">
                          <input
                            type="radio"
                            name={`hosted-correct-${qIndex}`}
                            checked={q.correctAnswer === optIndex}
                            onChange={() => updateHostedQuestionField(qIndex, 'correctAnswer', optIndex)}
                          />
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => updateHostedOption(qIndex, optIndex, e.target.value)}
                            placeholder={`Option ${optIndex + 1}`}
                            required
                          />
                        </div>
                      ))}
                    </div>
                    <div className="form-group">
                      <label>Explanation (optional)</label>
                      <textarea
                        value={q.explanation}
                        onChange={(e) => updateHostedQuestionField(qIndex, 'explanation', e.target.value)}
                        rows="2"
                      />
                    </div>
                  </div>
                ))}
                <button type="button" className="btn-secondary" onClick={addHostedQuestionRow}>
                  + Add Another Question
                </button>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowHostedForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Submit Hosted Quiz for Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="questions-list">
        <h2>Your Questions {filteredQuestions.length !== questions.length && `(${filteredQuestions.length} of ${questions.length})`}</h2>
        {filteredQuestions.length === 0 ? (
          <div className="empty-state">
            <p>{searchTerm ? 'No questions found matching your search.' : 'No questions yet. Add your first question!'}</p>
          </div>
        ) : (
          <div className="questions-grid">
            {filteredQuestions.map((q) => (
              <div key={q._id} className="question-card">
                <div className="question-header">
                  {getStatusBadge(q.status)}
                  <span className="question-category">{q.category}</span>
                </div>
                <div className="question-text">{q.question}</div>
                {q.options && q.options.length > 0 && (
                  <div className="question-options-preview">
                    <strong>Options:</strong>
                    <ul>
                      {q.options.map((opt, idx) => (
                        <li key={idx} className={idx === q.correctAnswer ? 'correct-option' : ''}>
                          {String.fromCharCode(65 + idx)}. {opt}
                          {idx === q.correctAnswer && ' ✓'}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="question-actions">
                  <button className="btn-edit" onClick={() => handleEdit(q)}>Edit</button>
                  <button className="btn-delete" onClick={() => handleDeleteAnyStatus(q._id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="questions-list">
        <h2>Your Hosted Quiz Matches</h2>
        {loadingHosted ? (
          <div className="loading">Loading hosted quizzes...</div>
        ) : hostedQuizzes.length === 0 ? (
          <div className="empty-state">
            <p>You have not created any hosted quiz matches yet.</p>
            <p>Create questions and then contact the developer to enable full hosted-quiz creation UI.</p>
          </div>
        ) : (
          <div className="questions-grid">
            {hostedQuizzes.map((quiz) => (
              <div key={quiz._id} className="question-card">
                <div className="question-header">
                  <span className="question-category">{quiz.category}</span>
                  <span className={`status-badge ${quiz.status === 'approved' ? 'status-approved' : quiz.status === 'rejected' ? 'status-rejected' : 'status-pending'}`}>
                    {quiz.status || 'pending'}
                  </span>
                </div>
                <div className="question-text">{quiz.title}</div>
                <div className="question-options-preview">
                  <strong>Questions:</strong> {quiz.questions?.length || 0}
                </div>
                <div className="question-actions">
                  <button className="btn-delete" onClick={() => handleHostedDelete(quiz._id)}>Delete Hosted Quiz</button>
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

