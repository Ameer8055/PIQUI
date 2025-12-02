import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { InstallPrompt } from "./components/InstallPrompt";
import Navbar from "./components/Navbar";
import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import DailyQuiz from "./pages/DailyQuiz";
import QuizBrowser from "./pages/QuizBrowser";
import QuizBattle from "./pages/QuizBattle";
import Notes from "./pages/Notes";
import Chat from "./pages/Chat";
import "./App.css";
import "./components/Toast.css";
import SignInPage from "./pages/SignInPage";
import ForgotPassword from "./pages/ForgotPassword";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminDashboard from "./pages/AdminDashboard";
import ManageQuestions from "./pages/ManageQuestions";
import AdminLayout from "./components/AdminLayout";
import AdminUsers from "./pages/AdminUsers";
import AdminAnalytics from "./pages/AdminAnalytics";
import AdminPDFApproval from "./pages/AdminPDFApproval";
import AdminDeveloperMessages from "./pages/AdminDeveloperMessages";
import AdminChatManagement from "./pages/AdminChatManagement";
import AdminUserDetails from "./pages/AdminUserDetails";
import ProgressTracker from "./pages/ProgressTracker";
import ProgressTrackerRedirect from "./components/ProgressTrackerRedirect";
import Leaderboard from "./pages/Leaderboard";
import Profile from "./pages/Profile";
import ContributorDashboard from "./pages/ContributorDashboard";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("authToken");
      const userData = localStorage.getItem("user");

      if (token && userData) {
        try {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
        } catch (error) {
          console.error("Error parsing user data:", error);
          localStorage.removeItem("authToken");
          localStorage.removeItem("user");
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleRegister = (userData) => {
    setUser(userData);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <Router>
      <div className="app">
        <InstallPrompt />

        {/* Navbar for all non-admin areas */}
        {user && !window.location.pathname.startsWith("/admin") && (
          <Navbar user={user} />
        )}
        {/* REMOVED: AdminNavbar from here */}

        <main className={`main-content ${user ? "with-navbar" : ""}`}>
          <Routes>
            {/* Public Routes */}
            <Route
              path="/"
              element={
                user ? (
                  <Dashboard user={user} />
                ) : (
                  <LandingPage onRegister={handleRegister} />
                )
              }
            />
            <Route
              path="/signin"
              element={<SignInPage onLogin={handleLogin} />}
            />
            <Route
              path="/forgot-password"
              element={<ForgotPassword />}
            />

            {/* User Protected Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute user={user}>
                  <Dashboard user={user} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/daily-quiz"
              element={
                <ProtectedRoute user={user}>
                  <DailyQuiz user={user} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/quiz-browser"
              element={
                <ProtectedRoute user={user}>
                  <QuizBrowser user={user} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/live-quiz"
              element={
                <ProtectedRoute user={user}>
                  <QuizBattle user={user} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notes"
              element={
                <ProtectedRoute user={user}>
                  <Notes user={user} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat"
              element={
                <ProtectedRoute user={user}>
                  <Chat user={user} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/progress"
              element={
                <ProtectedRoute user={user}>
                  <ProgressTrackerRedirect user={user} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/leaderboard"
              element={
                <ProtectedRoute user={user}>
                  <Leaderboard user={user} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute user={user}>
                  <Profile user={user} />
                </ProtectedRoute>
              }
            />

            {/* Admin Protected Routes - AdminLayout has its own navbar */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute user={user} requireAdmin={true}>
                  <AdminLayout user={user}>
                    <AdminDashboard user={user} />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/questions"
              element={
                <ProtectedRoute user={user} requireAdmin={true}>
                  <AdminLayout user={user}>
                    <ManageQuestions user={user} />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/users"
              element={
                <ProtectedRoute user={user} requireAdmin={true}>
                  <AdminLayout user={user}>
                    <AdminUsers user={user} />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users/:id"
              element={
                <ProtectedRoute user={user} requireAdmin={true}>
                  <AdminLayout user={user}>
                    <AdminUserDetails />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/analytics"
              element={
                <ProtectedRoute user={user} requireAdmin={true}>
                  <AdminLayout user={user}>
                    <AdminAnalytics user={user} />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/pdfs"
              element={
                <ProtectedRoute user={user} requireAdmin={true}>
                  <AdminLayout user={user}>
                    <AdminPDFApproval user={user} />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/messages"
              element={
                <ProtectedRoute user={user} requireAdmin={true}>
                  <AdminLayout user={user}>
                    <AdminDeveloperMessages user={user} />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/chat"
              element={
                <ProtectedRoute user={user} requireAdmin={true}>
                  <AdminLayout user={user}>
                    <AdminChatManagement user={user} />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />

            {/* Catch all admin routes */}
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute user={user} requireAdmin={true}>
                  <AdminLayout user={user}>
                    <AdminDashboard user={user} />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />

            {/* Contributor Routes */}
            <Route
              path="/contributor"
              element={
                <ProtectedRoute user={user}>
                  <ContributorDashboard user={user} />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
