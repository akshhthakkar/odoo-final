import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import HomePage from '../pages/HomePage.jsx';
import AppShell from './layout/AppShell.jsx';
import RequireAuth from './guards/RequireAuth.jsx';
import LoginPage from '../features/auth/pages/LoginPage.jsx';
import DashboardPage from '../features/dashboard/pages/DashboardPage.jsx';
import EmployeesPage from '../features/employees/pages/EmployeesPage.jsx';
import ContractsPage from '../features/contracts/pages/ContractsPage.jsx';
import SchedulesPage from '../features/schedules/pages/SchedulesPage.jsx';
import AttendancePage from '../features/attendance/pages/AttendancePage.jsx';
import TimeOffPage from '../features/timeoff/pages/TimeOffPage.jsx';
import PayrollPage from '../features/payroll-run/pages/PayrollPage.jsx';
import SalaryConfigPage from '../features/payroll-config/pages/SalaryConfigPage.jsx';
import AdminPage from '../features/admin/pages/AdminPage.jsx';

export default function Router() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/contracts" element={<ContractsPage />} />
          <Route path="/schedules" element={<SchedulesPage />} />
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/timeoff" element={<TimeOffPage />} />
          <Route path="/payroll" element={<PayrollPage />} />
          <Route path="/salary-config" element={<SalaryConfigPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
