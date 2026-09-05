import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';

export default function RequireRole({ roles, children }) {
  const user = useSelector((s) => s.auth.user);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // ADMIN has full access across all routes
  if (user.role === 'ADMIN') {
    return children ? children : <Outlet />;
  }

  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children ? children : <Outlet />;
}
