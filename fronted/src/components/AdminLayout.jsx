// components/AdminLayout.js
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AdminNavbar from './AdminNavbar';
import './AdminLayout.css';

const AdminLayout = ({ children, user }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Redirect to admin dashboard if user is admin but on wrong route
  React.useEffect(() => {
    if (user && user.role === 'admin' && location.pathname === '/dashboard') {
      navigate('/admin');
    }
  }, [user, location.pathname, navigate]);

  return (
    <div className="admin-layout">
      <AdminNavbar user={user} />
      
      <div className="admin-content-wrapper">
        <aside className="admin-sidebar">
          <div className="sidebar-header">
            <h2>Admin Panel</h2>
          </div>
          <nav className="sidebar-nav">
  <button onClick={() => navigate('/admin')} className={`nav-item ${location.pathname === '/admin' ? 'active' : ''}`}>
    <span className="nav-icon">📊</span>
    <span className="nav-label">Dashboard</span>
  </button>
  <button onClick={() => navigate('/admin/questions')} className={`nav-item ${location.pathname === '/admin/questions' ? 'active' : ''}`}>
    <span className="nav-icon">❓</span>
    <span className="nav-label">Manage Questions</span>
  </button>
  <button onClick={() => navigate('/admin/users')} className={`nav-item ${location.pathname === '/admin/users' ? 'active' : ''}`}>
    <span className="nav-icon">👥</span>
    <span className="nav-label">Users</span>
  </button>
  <button onClick={() => navigate('/admin/pdfs')} className={`nav-item ${location.pathname === '/admin/pdfs' ? 'active' : ''}`}>
    <span className="nav-icon">📄</span>
    <span className="nav-label">PDF Approval</span>
  </button>
  <button onClick={() => navigate('/admin/messages')} className={`nav-item ${location.pathname === '/admin/messages' ? 'active' : ''}`}>
    <span className="nav-icon">💬</span>
    <span className="nav-label">Developer Messages</span>
  </button>
  <button onClick={() => navigate('/admin/chat')} className={`nav-item ${location.pathname === '/admin/chat' ? 'active' : ''}`}>
    <span className="nav-icon">💭</span>
    <span className="nav-label">Community Chat</span>
  </button>
  <button onClick={() => navigate('/admin/analytics')} className={`nav-item ${location.pathname === '/admin/analytics' ? 'active' : ''}`}>
    <span className="nav-icon">📈</span>
    <span className="nav-label">Analytics</span>
  </button>
</nav>
        </aside>
        
        <main className="admin-main">
          <div className="admin-content">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;