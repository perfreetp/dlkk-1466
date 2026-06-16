import { createBrowserRouter, Navigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import PatientList from '@/pages/PatientList';
import PatientRegister from '@/pages/PatientRegister';
import Screening from '@/pages/Screening';
import Review from '@/pages/Review';
import Scheduling from '@/pages/Scheduling';
import Callback from '@/pages/Callback';
import Print from '@/pages/Print';
import Reverify from '@/pages/Reverify';
import Statistics from '@/pages/Statistics';
import StatisticsReasons from '@/pages/StatisticsReasons';
import StatisticsRisks from '@/pages/StatisticsRisks';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: '/dashboard',
    element: (
      <AppLayout>
        <Dashboard />
      </AppLayout>
    ),
  },
  {
    path: '/patients',
    element: (
      <AppLayout>
        <PatientList />
      </AppLayout>
    ),
  },
  {
    path: '/patients/register',
    element: (
      <AppLayout>
        <PatientRegister />
      </AppLayout>
    ),
  },
  {
    path: '/patients/:patientId/screening',
    element: (
      <AppLayout>
        <Screening />
      </AppLayout>
    ),
  },
  {
    path: '/patients/:patientId/review',
    element: (
      <AppLayout>
        <Review />
      </AppLayout>
    ),
  },
  {
    path: '/patients/:patientId/scheduling',
    element: (
      <AppLayout>
        <Scheduling />
      </AppLayout>
    ),
  },
  {
    path: '/patients/:patientId/callback',
    element: (
      <AppLayout>
        <Callback />
      </AppLayout>
    ),
  },
  {
    path: '/patients/:patientId/print',
    element: (
      <AppLayout>
        <Print />
      </AppLayout>
    ),
  },
  {
    path: '/patients/:patientId/reverify',
    element: (
      <AppLayout>
        <Reverify />
      </AppLayout>
    ),
  },
  {
    path: '/statistics',
    element: (
      <AppLayout>
        <Statistics />
      </AppLayout>
    ),
  },
  {
    path: '/statistics/reasons',
    element: (
      <AppLayout>
        <StatisticsReasons />
      </AppLayout>
    ),
  },
  {
    path: '/statistics/risks',
    element: (
      <AppLayout>
        <StatisticsRisks />
      </AppLayout>
    ),
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
]);

export default router;
