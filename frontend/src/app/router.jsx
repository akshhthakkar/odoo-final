import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from '../features/landing/pages/LandingPage.jsx';
import AppShell from './layout/AppShell.jsx';
import RequireAuth from './guards/RequireAuth.jsx';
import RequireRole from './guards/RequireRole.jsx';
import LoginPage from '../features/auth/pages/LoginPage.jsx';
import DashboardPage from '../features/dashboard/pages/DashboardPage.jsx';
import EmployeesPage from '../features/employees/pages/EmployeesPage.jsx';
import EmployeeProfilePage from '../features/employees/pages/EmployeeProfilePage.jsx';
import ContractsPage from '../features/contracts/pages/ContractsPage.jsx';
import SchedulesPage from '../features/schedules/pages/SchedulesPage.jsx';
import AttendancePage from '../features/attendance/pages/AttendancePage.jsx';
import TimeOffPage from '../features/timeoff/pages/TimeOffPage.jsx';
import PayrollPage from '../features/payroll-run/pages/PayrollPage.jsx';
import PayrunsPage from '../features/payroll-run/pages/PayrunsPage.jsx';
import SalaryConfigPage from '../features/payroll-config/pages/SalaryConfigPage.jsx';
import AdminPage from '../features/admin/pages/AdminPage.jsx';

// Role Groups
const HR_AND_PAYROLL_ROLES = ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'];
const PAYROLL_ROLES = ['ADMIN', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'];
const ADMIN_ONLY = ['ADMIN'];

export default function Router() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          {/* Dashboard — all authenticated roles */}
          <Route path="/dashboard" element={<DashboardPage />} />

          {/* Time Off & Attendance — all authenticated roles (self-service for Employee, full for HR) */}
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/timeoff" element={<TimeOffPage />} />

          {/* Employees & Profiles — HR & Payroll Managers/Users, Admin */}
          <Route element={<RequireRole roles={HR_AND_PAYROLL_ROLES} />}>
            <Route path="/employees" element={<EmployeesPage />} />
            <Route path="/employees/:id" element={<EmployeeProfilePage />} />
            <Route path="/contracts" element={<ContractsPage />} />
            <Route path="/schedules" element={<SchedulesPage />} />
          </Route>

          {/* Payroll / Payruns & Salary Config — Payroll Users/Managers, Admin */}
          <Route element={<RequireRole roles={PAYROLL_ROLES} />}>
            <Route path="/payruns" element={<PayrunsPage />} />
            <Route path="/payroll" element={<Navigate to="/payruns" replace />} />
            <Route path="/salary-config" element={<SalaryConfigPage />} />
          </Route>

          {/* Admin panel — Admin only */}
          <Route element={<RequireRole roles={ADMIN_ONLY} />}>
            <Route path="/admin" element={<AdminPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
