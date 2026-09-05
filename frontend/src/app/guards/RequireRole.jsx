import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

export default function RequireRole({ roles, children }) {
  const user = useSelector((s) => s.auth.user);

  if (!user || (roles && roles.length > 0 && !roles.includes(user.role))) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}
