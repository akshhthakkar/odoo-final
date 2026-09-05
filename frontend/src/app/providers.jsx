import React, { useEffect } from 'react';
import { Provider, useDispatch } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { store } from '../store/store.js';
import { queryClient } from '../lib/query-client.js';
import { setCredentials, bootstrapDone } from '../store/slices/authSlice.js';
import { ToastProvider } from '../components/ui/ToastContext.jsx';

// ─── Inner component so it can use hooks inside <Provider> ───────────────────
function AuthBootstrap({ children }) {
  const dispatch = useDispatch();

  useEffect(() => {
    // Silently restore session using the httpOnly session cookie
    api
      .get('/auth/me')
      .then(({ data }) => {
        dispatch(
          setCredentials({
            user: data.data.user,
            employee: data.data.employee,
          })
        );
      })
      .catch(() => {
        // No active session — user is guest
        dispatch(bootstrapDone());
      });
  }, [dispatch]);

  return children;
}

export default function Providers({ children }) {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ToastProvider>
            <AuthBootstrap>{children}</AuthBootstrap>
          </ToastProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </Provider>
  );
}
