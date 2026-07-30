import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import { ProtectedRoute, PublicRoute } from './components/common/ProtectedRoute';
import ErrorBoundary from './components/common/ErrorBoundary';
import Layout from './components/layout/Layout';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import PortalSelectPage from './pages/PortalSelectPage';
import StudentLoginPage from './pages/StudentLoginPage';
import HodLoginPage from './pages/DepartmentAdminLoginPage';
import PrincipalLoginPage from './pages/PrincipalLoginPage';
import SuperAdminLoginPage from './pages/SuperAdminLoginPage';
import ClubLoginPage from './pages/ClubLoginPage';
import FeedPage from './pages/FeedPage';
import ProfilePage from './pages/ProfilePage';
import MessagesPage from './pages/MessagesPage';
import ChannelsPage from './pages/ChannelsPage';
import EventsPage from './pages/EventsPage';
import NotificationsPage from './pages/NotificationsPage';
import LeaderboardPage from './pages/LeaderboardPage';
import SearchPage from './pages/SearchPage';
import SettingsPage from './pages/SettingsPage';
import AdminLayout from './pages/admin/AdminLayout';
import SuperAdminDashboardPage from './pages/admin/SuperAdminDashboardPage';
import ManageClubsPage from './pages/admin/ManageClubsPage';
import CreateClubPage from './pages/admin/CreateClubPage';
import ClubDetailsPage from './pages/admin/ClubDetailsPage';
import DepartmentsPage from './pages/admin/DepartmentsPage';
import CreateDepartmentPage from './pages/admin/CreateDepartmentPage';
import ManageUsersPage from './pages/admin/ManageUsersPage';
import AdminAnalyticsPage from './pages/admin/AdminAnalyticsPage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';
import DepartmentAdminDashboardPage from './pages/DepartmentAdminDashboardPage';
import ClubDashboardPage from './pages/ClubDashboardPage';
import StudentClubsPage from './pages/StudentClubsPage';
import StudentClubDetailsPage from './pages/ClubDetailsPage';
import ClubAdminDashboardPage from './pages/ClubAdminDashboardPage';
import PrincipalDashboardPage from './pages/PrincipalDashboardPage';
import PrincipalDepartmentsPage from './pages/principal/PrincipalDepartmentsPage';
import PrincipalClubsPage from './pages/principal/PrincipalClubsPage';
import PrincipalAnnouncementsPage from './pages/principal/PrincipalAnnouncementsPage';
import PrincipalLeaderboardPage from './pages/principal/PrincipalLeaderboardPage';
import PrincipalReportsPage from './pages/principal/PrincipalReportsPage';

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <ErrorBoundary>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<PortalSelectPage />} />
                <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
                <Route path="/login/super-admin" element={<PublicRoute><SuperAdminLoginPage /></PublicRoute>} />
                <Route path="/login/student" element={<PublicRoute><StudentLoginPage /></PublicRoute>} />
                <Route path="/login/department-admin" element={<HodLoginPage />} />
                <Route path="/login/principal" element={<PublicRoute><PrincipalLoginPage /></PublicRoute>} />
                <Route path="/login/club" element={<PublicRoute><ClubLoginPage /></PublicRoute>} />
                <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

                {/* Protected Routes — All authenticated users */}
                <Route path="/feed" element={<ProtectedRoute><Layout><FeedPage /></Layout></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Layout><ProfilePage /></Layout></ProtectedRoute>} />
                <Route path="/profile/:userId" element={<ProtectedRoute><Layout><ProfilePage /></Layout></ProtectedRoute>} />
                <Route path="/messages" element={<ProtectedRoute><Layout><MessagesPage /></Layout></ProtectedRoute>} />
                <Route path="/channels" element={<ProtectedRoute><Layout><ChannelsPage /></Layout></ProtectedRoute>} />
                <Route path="/events" element={<ProtectedRoute><Layout><EventsPage /></Layout></ProtectedRoute>} />
                <Route path="/notifications" element={<ProtectedRoute><Layout><NotificationsPage /></Layout></ProtectedRoute>} />
                <Route path="/leaderboard" element={<ProtectedRoute><Layout><LeaderboardPage /></Layout></ProtectedRoute>} />
                <Route path="/search" element={<ProtectedRoute><Layout><SearchPage /></Layout></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Layout><SettingsPage /></Layout></ProtectedRoute>} />

                {/* Role-Protected Routes */}
                <Route path="/super-admin" element={<ProtectedRoute roles={['super_admin']}><Layout><AdminLayout><SuperAdminDashboardPage /></AdminLayout></Layout></ProtectedRoute>} />
                <Route path="/super-admin/clubs" element={<ProtectedRoute roles={['super_admin']}><Layout><AdminLayout><ManageClubsPage /></AdminLayout></Layout></ProtectedRoute>} />
                <Route path="/super-admin/clubs/create" element={<ProtectedRoute roles={['super_admin']}><Layout><AdminLayout><CreateClubPage /></AdminLayout></Layout></ProtectedRoute>} />
                <Route path="/super-admin/clubs/:clubId" element={<ProtectedRoute roles={['super_admin']}><Layout><AdminLayout><ClubDetailsPage /></AdminLayout></Layout></ProtectedRoute>} />
                <Route path="/super-admin/departments" element={<ProtectedRoute roles={['super_admin']}><Layout><AdminLayout><DepartmentsPage /></AdminLayout></Layout></ProtectedRoute>} />
                <Route path="/super-admin/departments/create" element={<ProtectedRoute roles={['super_admin']}><Layout><AdminLayout><CreateDepartmentPage /></AdminLayout></Layout></ProtectedRoute>} />
                <Route path="/super-admin/users" element={<ProtectedRoute roles={['super_admin']}><Layout><AdminLayout><ManageUsersPage /></AdminLayout></Layout></ProtectedRoute>} />
                <Route path="/super-admin/analytics" element={<ProtectedRoute roles={['super_admin']}><Layout><AdminLayout><AdminAnalyticsPage /></AdminLayout></Layout></ProtectedRoute>} />
                <Route path="/super-admin/settings" element={<ProtectedRoute roles={['super_admin']}><Layout><AdminLayout><AdminSettingsPage /></AdminLayout></Layout></ProtectedRoute>} />
                <Route
                  path="/department-admin"
                  element={<ProtectedRoute roles={['department_admin']}><Layout><DepartmentAdminDashboardPage /></Layout></ProtectedRoute>}
                />
                <Route
                  path="/clubs"
                  element={<ProtectedRoute roles={['department_admin', 'super_admin', 'club_admin']}><Layout><ClubDashboardPage /></Layout></ProtectedRoute>}
                />
                <Route
                  path="/clubs/browse"
                  element={<ProtectedRoute roles={['student', 'department_admin', 'super_admin', 'club_admin', 'principal']}><Layout><StudentClubsPage /></Layout></ProtectedRoute>}
                />
                <Route
                  path="/clubs/:clubId"
                  element={<ProtectedRoute roles={['student', 'department_admin', 'super_admin', 'club_admin', 'principal']}><Layout><StudentClubDetailsPage /></Layout></ProtectedRoute>}
                />
                <Route
                  path="/clubs/admin-dashboard"
                  element={<ProtectedRoute roles={['club_admin']}><Layout><ClubAdminDashboardPage /></Layout></ProtectedRoute>}
                />
                <Route
                  path="/principal"
                  element={<ProtectedRoute roles={['principal']}><Layout><PrincipalDashboardPage /></Layout></ProtectedRoute>}
                />
                <Route
                  path="/principal/departments"
                  element={<ProtectedRoute roles={['principal']}><Layout><PrincipalDepartmentsPage /></Layout></ProtectedRoute>}
                />
                <Route
                  path="/principal/clubs"
                  element={<ProtectedRoute roles={['principal']}><Layout><PrincipalClubsPage /></Layout></ProtectedRoute>}
                />
                <Route
                  path="/principal/announcements"
                  element={<ProtectedRoute roles={['principal']}><Layout><PrincipalAnnouncementsPage /></Layout></ProtectedRoute>}
                />
                <Route
                  path="/principal/leaderboard"
                  element={<ProtectedRoute roles={['principal']}><Layout><PrincipalLeaderboardPage /></Layout></ProtectedRoute>}
                />
                <Route
                  path="/principal/reports"
                  element={<ProtectedRoute roles={['principal']}><Layout><PrincipalReportsPage /></Layout></ProtectedRoute>}
                />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </ErrorBoundary>
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: { borderRadius: '12px', padding: '12px 16px', fontSize: '14px' },
                success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
                error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
              }}
            />
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
