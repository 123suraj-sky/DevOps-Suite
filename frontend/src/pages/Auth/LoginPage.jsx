import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { AuthLayout } from '../../components/layout/AuthLayout';
import githubIcon from '../../assets/46_github.svg';
import googleIcon from '../../assets/45_google.svg';

export const LoginPage = () => {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const successMessage = location.state?.successMessage ?? null;

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setError('');
      try {
        await loginWithGoogle({ access_token: tokenResponse.access_token });
        navigate('/');
      } catch (err) {
        setError(err.response?.data?.message || 'Google sign-in failed. Please try again.');
      }
    },
    onError: () => setError('Google sign-in was cancelled or failed.'),
  });

  const handleGithubLogin = () => {
    const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
    const redirectUri = `${window.location.origin}/auth/github/callback`;
    const scope = 'read:user user:email';
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message || err.response?.data?.error;
      setPassword('');
      if (status === 401 || status === 403) {
        setError('Incorrect email or password. Please try again.');
      } else if (status === 404) {
        setError('No account found with this email address.');
      } else if (msg) {
        setError(msg);
      } else {
        setError('Login failed. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="space-y-6">
        {/* Heading */}
        <div>
          <h2 className="text-2xl font-semibold text-[var(--text-primary)] tracking-tight">Sign in</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Don't have an account?{' '}
            <Link to="/register" className="text-[var(--accent-text)] hover:underline font-medium">
              Sign up
            </Link>
          </p>
        </div>

        {successMessage && (
          <div className="p-3 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-sm text-green-700 dark:text-green-300">
            {successMessage}
          </div>
        )}

        {error && (
          <div className="p-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <div>
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <div className="mt-1.5 text-right">
              <Link
                to="/forgot-password"
                className="text-xs text-[var(--text-muted)] hover:text-[var(--accent-text)] transition-colors"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          <Button type="submit" loading={loading} className="w-full">
            Sign in
          </Button>
        </form>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[var(--border-subtle)]" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-[var(--surface-base)] px-3 text-[var(--text-muted)]">or continue with</span>
          </div>
        </div>

        {/* OAuth buttons */}
        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => handleGoogleLogin()}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium
              bg-[var(--surface-raised)] text-[var(--text-primary)]
              border border-[var(--border-subtle)] hover:border-[var(--border-strong)]
              hover:bg-[var(--surface-sunken)] transition-all active:scale-[0.98]
              focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <img src={googleIcon} alt="" className="w-4 h-4" aria-hidden="true" />
            Sign in with Google
          </button>
          <button
            type="button"
            onClick={handleGithubLogin}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium
              bg-[var(--surface-raised)] text-[var(--text-primary)]
              border border-[var(--border-subtle)] hover:border-[var(--border-strong)]
              hover:bg-[var(--surface-sunken)] transition-all active:scale-[0.98]
              focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <img src={githubIcon} alt="" className="w-4 h-4 dark:invert" aria-hidden="true" />
            Sign in with GitHub
          </button>
        </div>
      </div>
    </AuthLayout>
  );
};
