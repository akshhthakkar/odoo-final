import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../lib/api.js';
import { setCredentials } from '../../../store/slices/authSlice.js';

export default function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const accessToken = useSelector((s) => s.auth.accessToken);
  const [email, setEmail] = useState('admin@pay365.dev');
  const [password, setPassword] = useState('Password@123');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      dispatch(setCredentials(data.data));
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="login-page" onSubmit={onSubmit}>
      <h1>Pay365</h1>
      <label>
        Email
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </label>
      <label>
        Password
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </label>
      {error && <p className="login-page__error">{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
