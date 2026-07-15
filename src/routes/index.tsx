import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import Layout from '@/components/Layout';
import NotFoundPage from '@/pages/NotFound/index';

// Eagerly import the most-visited pages for instant navigation
import HomePage from '@/pages/Home/index';
import AuthPage from '@/pages/Auth/index';

// Lazy-load less frequent pages
const DashboardPage = lazy(() => import('@/pages/Dashboard/index'));
const MarketsPage = lazy(() => import('@/pages/Markets/index'));
const InsightsPage = lazy(() => import('@/pages/Insights/index'));
const AdminPage = lazy(() => import('@/pages/Admin/index'));
const SettingsPage = lazy(() => import('@/pages/Settings/index'));
const TransactionsPage = lazy(() => import('@/pages/Transactions/index'));
const NotificationsPage = lazy(() => import('@/pages/Notifications/index'));
const DepositPage = lazy(() => import('@/pages/Deposit/index'));
const WithdrawPage = lazy(() => import('@/pages/Withdraw/index'));
const KYCPage = lazy(() => import('@/pages/KYC/index'));
const InvestmentPlansPage = lazy(() => import('@/pages/InvestmentPlans/index'));
const BulkTradePage = lazy(() => import('@/pages/BulkTrade/index'));

function Lazy({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-brand-bg flex items-center justify-center">
          <div className="relative flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-brand-border rounded-full"></div>
            <div className="w-12 h-12 border-4 border-brand-success border-t-transparent rounded-full animate-spin absolute"></div>
          </div>
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/login', element: <AuthPage /> },
      { path: '/dashboard', element: <Lazy><DashboardPage /></Lazy> },
      { path: '/markets', element: <Lazy><MarketsPage /></Lazy> },
      { path: '/insights', element: <Lazy><InsightsPage /></Lazy> },
      { path: '/settings', element: <Lazy><SettingsPage /></Lazy> },
      { path: '/transactions', element: <Lazy><TransactionsPage /></Lazy> },
      { path: '/notifications', element: <Lazy><NotificationsPage /></Lazy> },
      { path: '/deposit', element: <Lazy><DepositPage /></Lazy> },
      { path: '/withdraw', element: <Lazy><WithdrawPage /></Lazy> },
      { path: '/kyc', element: <Lazy><KYCPage /></Lazy> },
      { path: '/investment-plans', element: <Lazy><InvestmentPlansPage /></Lazy> },
    ],
  },
  { path: '/admin', element: <Lazy><AdminPage /></Lazy> },
  { path: '/admin/bulk-trade', element: <Lazy><BulkTradePage /></Lazy> },
  { path: '*', element: <NotFoundPage /> },
]);
