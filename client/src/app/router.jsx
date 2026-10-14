import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute.jsx';
import { AppShell } from '../components/layout/AppShell.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';

function lazyWithRetry(componentImport, exportName) {
  return lazy(async () => {
    try {
      const m = await componentImport();
      return { default: exportName ? m[exportName] : (m.default || Object.values(m)[0]) };
    } catch (error) {
      console.warn('Chunk fetch failed, retrying once...', error);
      await new Promise(resolve => setTimeout(resolve, 500));
      const m = await componentImport();
      return { default: exportName ? m[exportName] : (m.default || Object.values(m)[0]) };
    }
  });
}

// Lazy-loaded routes with retry resiliency
const KioskPage = lazyWithRetry(() => import('../features/kiosk/KioskPage.jsx'), 'KioskPage');
const LoginPage = lazyWithRetry(() => import('../features/auth/LoginPage.jsx'), 'LoginPage');
const DashboardPage = lazyWithRetry(() => import('../features/dashboard/DashboardPage.jsx'), 'DashboardPage');
const EnrollPage = lazyWithRetry(() => import('../features/enroll/EnrollPage.jsx'), 'EnrollPage');
const StudentsPage = lazyWithRetry(() => import('../features/students/StudentsPage.jsx'), 'StudentsPage');
const StudentDetail = lazyWithRetry(() => import('../features/students/StudentDetail.jsx'), 'StudentDetail');
const AttendancePage = lazyWithRetry(() => import('../features/attendance/AttendancePage.jsx'), 'AttendancePage');
const ReportsPage = lazyWithRetry(() => import('../features/reports/ReportsPage.jsx'), 'ReportsPage');
const MediaLibraryPage = lazyWithRetry(() => import('../features/media/MediaLibraryPage.jsx'), 'MediaLibraryPage');
const MovieViewPage = lazyWithRetry(() => import('../features/media/MovieViewPage.jsx'), 'MovieViewPage');
const ChatbotPage = lazyWithRetry(() => import('../features/chatbot/ChatbotPage.jsx'), 'ChatbotPage');
const ThemesPage = lazyWithRetry(() => import('../features/themes/ThemesPage.jsx'), 'ThemesPage');
const SettingsPage = lazyWithRetry(() => import('../features/settings/SettingsPage.jsx'), 'SettingsPage');
const NotFoundPage = lazyWithRetry(() => import('../features/NotFoundPage.jsx'), 'NotFoundPage');

function RouteFallback() {
  return (
    <div className="p-6 space-y-4 max-w-4xl mx-auto">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-48 w-full rounded-token" />
      <Skeleton className="h-48 w-full rounded-token" />
    </div>
  );
}

export const router = createBrowserRouter([
  // Root redirects to public kiosk
  {
    path: '/',
    element: <Navigate to="/kiosk" replace />
  },
  // Public Kiosk entrance screen
  {
    path: '/kiosk',
    element: (
      <Suspense fallback={<div className="min-h-screen bg-black" />}>
        <KioskPage />
      </Suspense>
    )
  },
  // Admin Login
  {
    path: '/admin/login',
    element: (
      <Suspense fallback={<RouteFallback />}>
        <LoginPage />
      </Suspense>
    )
  },
  // Protected Admin Portal
  {
    path: '/admin',
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          {
            index: true,
            element: (
              <Suspense fallback={<RouteFallback />}>
                <DashboardPage />
              </Suspense>
            )
          },
          {
            path: 'attendance',
            element: (
              <Suspense fallback={<RouteFallback />}>
                <AttendancePage />
              </Suspense>
            )
          },
          {
            path: 'students',
            element: (
              <Suspense fallback={<RouteFallback />}>
                <StudentsPage />
              </Suspense>
            )
          },
          {
            path: 'students/:id',
            element: (
              <Suspense fallback={<RouteFallback />}>
                <StudentDetail />
              </Suspense>
            )
          },
          {
            path: 'enroll',
            element: (
              <Suspense fallback={<RouteFallback />}>
                <EnrollPage />
              </Suspense>
            )
          },
          {
            path: 'reports',
            element: (
              <Suspense fallback={<RouteFallback />}>
                <ReportsPage />
              </Suspense>
            )
          },
          {
            path: 'media',
            element: (
              <Suspense fallback={<RouteFallback />}>
                <MediaLibraryPage />
              </Suspense>
            )
          },
          {
            path: 'movie/:id?',
            element: (
              <Suspense fallback={<div className="min-h-screen bg-[#06060c]" />}>
                <MovieViewPage />
              </Suspense>
            )
          },
          {
            path: 'chat',
            element: (
              <Suspense fallback={<RouteFallback />}>
                <ChatbotPage />
              </Suspense>
            )
          },
          {
            path: 'themes',
            element: (
              <Suspense fallback={<RouteFallback />}>
                <ThemesPage />
              </Suspense>
            )
          },
          {
            path: 'settings',
            element: (
              <Suspense fallback={<RouteFallback />}>
                <SettingsPage />
              </Suspense>
            )
          }
        ]
      }
    ]
  },
  // Catch-all 404
  {
    path: '*',
    element: (
      <Suspense fallback={<RouteFallback />}>
        <NotFoundPage />
      </Suspense>
    )
  }
], {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true
  }
});
