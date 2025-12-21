import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { CreatePostProvider } from "./contexts/CreatePostContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { PrivateRoute } from "./components/PrivateRoute";
import { PublicRoute } from "./components/PublicRoute";
import { DesktopSidebar } from "./components/DesktopSidebar";
import { MobileSidebar } from "./components/MobileSidebar";
import { DesktopHeader } from "./components/DesktopHeader";
import { RightSidebar } from "./components/RightSidebar";
import { ChatBot } from "./components/ChatBot";
import { HomePage } from "./pages/HomePage";
import { GroupsPage } from "./pages/GroupsPage";
import { GroupDetailsPage } from "./pages/GroupDetailsPage";
import { QAPage } from "./pages/QAPage";
import { MessagesPage } from "./pages/MessagesPage";
import { ProfilePage } from "./pages/ProfilePage";
import { CoursesPage } from "./pages/CoursesPage";
import { ManageCoursePage } from "./pages/ManageCoursePage";
import { StudentCourseDetailPage } from "./pages/StudentCourseDetailPage";
import { SchedulePage } from "./pages/SchedulePage";
import { SessionsPage } from "./pages/SessionsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { ProgressPage } from "./pages/ProgressPage";
import { SearchResultsPage } from "./pages/SearchResultsPage";
import { PostDetailPage } from "./pages/PostDetailPage";
import { SinglePostPage } from "./pages/SinglePostPage";
import { WatchVideoPage } from "./pages/WatchVideoPage";
import TagsPage from "./pages/TagsPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import AdminUserDetailPage from "./pages/AdminUserDetailPage";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { CompleteProfilePage } from "./pages/CompleteProfilePage";
import { StripeReturnPage } from "./pages/StripeReturnPage";
import { EarningsStatsPage } from "./pages/EarningsStatsPage";
import { Toaster } from "./components/ui/sonner";

function Layout({ children, fullWidth = false }: { children: React.ReactNode; fullWidth?: boolean }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#18191a]">
      {/* Desktop Sidebar - Hidden on mobile */}
      <div className="hidden lg:block">
        <DesktopSidebar />
      </div>

      {/* Mobile Sidebar - Only on mobile */}
      <div className="lg:hidden">
        <MobileSidebar />
      </div>

      {/* Main Content Area */}
      <div className="lg:ml-64 min-h-screen">
        <DesktopHeader />
        
        {fullWidth ? (
          <div className="p-4 lg:p-6">
            {children}
          </div>
        ) : (
          <div className="flex gap-6 p-4 lg:p-6">
            {/* Center Content */}
            <main className="flex-1 lg:max-w-3xl w-full">
              {children}
            </main>

            {/* Right Sidebar - Hidden on mobile/tablet */}
            <div className="hidden xl:block">
              <RightSidebar />
            </div>
          </div>
        )}
      </div>

      {/* AI Chatbot */}
      <ChatBot />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <CreatePostProvider>
          <ThemeProvider>
            <Routes>
              {/* Public Routes */}
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <LoginPage />
                  </PublicRoute>
                }
              />
              <Route
                path="/signup"
                element={
                  <PublicRoute>
                    <SignupPage />
                  </PublicRoute>
                }
              />
              <Route
                path="/forgot-password"
                element={
                  <PublicRoute>
                    <ForgotPasswordPage />
                  </PublicRoute>
                }
              />

              {/* Private Routes */}
              <Route
                path="/"
                element={
                  <PrivateRoute>
                    <Layout>
                      <HomePage />
                    </Layout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/groups"
                element={
                  <PrivateRoute>
                    <Layout>
                      <GroupsPage />
                    </Layout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/groups/:groupId"
                element={
                  <PrivateRoute>
                    <Layout>
                      <GroupDetailsPage />
                    </Layout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/posts/:postId"
                element={
                  <PrivateRoute>
                    <Layout>
                      <PostDetailPage />
                    </Layout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/single-post/:postId"
                element={
                  <PrivateRoute>
                    <SinglePostPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/qa"
                element={
                  <PrivateRoute>
                    <Layout>
                      <QAPage />
                    </Layout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/messages"
                element={
                  <PrivateRoute>
                    <Layout>
                      <MessagesPage />
                    </Layout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <PrivateRoute>
                    <Layout>
                      <ProfilePage />
                    </Layout>
                  </PrivateRoute>
                }
              />

              {/* Courses route */}
              <Route
                path="/courses"
                element={
                  <PrivateRoute>
                    <Layout>
                      <CoursesPage />
                    </Layout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/manage-course/:id"
                element={
                  <PrivateRoute>
                    <ManageCoursePage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/student-course-detail"
                element={
                  <PrivateRoute>
                    <Layout fullWidth>
                      <StudentCourseDetailPage />
                    </Layout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/schedule"
                element={
                  <PrivateRoute>
                    <Layout fullWidth>
                      <SchedulePage />
                    </Layout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/sessions"
                element={
                  <PrivateRoute>
                    <Layout fullWidth>
                      <SessionsPage />
                    </Layout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <PrivateRoute>
                    <Layout fullWidth>
                      <SettingsPage />
                    </Layout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/progress"
                element={
                  <PrivateRoute>
                    <Layout fullWidth>
                      <ProgressPage />
                    </Layout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/earnings"
                element={
                  <PrivateRoute>
                    <Layout fullWidth>
                      <EarningsStatsPage />
                    </Layout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/complete-profile"
                element={
                  <PrivateRoute>
                    <CompleteProfilePage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/stripe-return"
                element={
                  <PrivateRoute>
                    <StripeReturnPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/search"
                element={
                  <PrivateRoute>
                    <Layout>
                      <SearchResultsPage />
                    </Layout>
                  </PrivateRoute>
                }
              />

              {/* Tags Route */}
              <Route
                path="/tags"
                element={
                  <PrivateRoute>
                    <Layout fullWidth>
                      <TagsPage />
                    </Layout>
                  </PrivateRoute>
                }
              />

              {/* Watch Video Route - Full Screen without Layout */}
              <Route
                path="/watch-video"
                element={
                  <PrivateRoute>
                    <WatchVideoPage />
                  </PrivateRoute>
                }
              />

              {/* Admin Routes - No Layout */}
              <Route
                path="/admin"
                element={
                  <PrivateRoute>
                    <AdminDashboardPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/admin/users/:userId"
                element={
                  <PrivateRoute>
                    <AdminUserDetailPage />
                  </PrivateRoute>
                }
              />

              {/* Catch-all route - redirect to home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <Toaster />
          </ThemeProvider>
        </CreatePostProvider>
      </AuthProvider>
    </Router>
  );
}