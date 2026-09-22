import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { AuthLayout } from '../../components/layout/AuthLayout';
import checkIcon from '../../assets/11_check.svg';
import xIcon from '../../assets/26_x.svg';
import githubIcon from '../../assets/46_github.svg';
import googleIcon from '../../assets/45_google.svg';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@#$%^&+=!]).{8,}$/;

export const RegisterPage = () => {
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [passwordBlurred, setPasswordBlurred] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setError('');
      try {
        await loginWithGoogle({ access_token: tokenResponse.access_token });
        navigate('/');
      } catch (err) {
        setError(err.response?.data?.message || 'Google sign-up failed. Please try again.');
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

  const passwordValid = useMemo(() => PASSWORD_REGEX.test(formData.password), [formData.password]);
  const confirmMatches = useMemo(() => formData.confirmPassword !== '' && formData.password === formData.confirmPassword, [formData.password, formData.confirmPassword]);
  const confirmMismatch = useMemo(() => formData.confirmPassword !== '' && formData.password !== formData.confirmPassword, [formData.password, formData.confirmPassword]);
  const canSubmit = passwordValid && confirmMatches;

  const handleChange = (e) => setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError('');
    setLoading(true);
    try {
      const { confirmPassword, firstName, lastName, ...rest } = formData;
      await register({ ...rest, display_name: `${firstName} ${lastName}`.trim() });
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const passwordHintClass = passwordValid
    ? 'text-green-600 dark:text-green-400'
    : passwordBlurred ? 'text-red-500 dark:text-red-400' : 'text-[var(--text-muted)]';

  return (
    <AuthLayout>
      <div className="space-y-6">
        {/* Heading */}
        <div>
          <h2 className="text-2xl font-semibold text-[var(--text-primary)] tracking-tight">Create account</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Already have an account?{' '}
            <Link to="/login" className="text-[var(--accent-text)] hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="First name" name="firstName" value={formData.firstName} onChange={handleChange} required autoComplete="given-name" />
            <Input label="Last name" name="lastName" value={formData.lastName} onChange={handleChange} required autoComplete="family-name" />
          </div>

          <Input label="Email" type="email" name="email" placeholder="you@example.com" value={formData.email} onChange={handleChange} required autoComplete="email" />

          <div>
            <Input
              label="Password"
              type="password"
              name="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              onBlur={() => setPasswordBlurred(true)}
              required
              autoComplete="new-password"
            />
            <p className={`mt-1.5 text-xs flex items-center gap-1.5 ${passwordHintClass}`}>
              {passwordValid && <img src={checkIcon} alt="" className="w-3 h-3 shrink-0" aria-hidden="true" />}
              {passwordValid
                ? 'Password meets all requirements'
                : 'Min 8 chars, uppercase, lowercase, digit, and special character (@#$%^&+=!)'}
            </p>
          </div>

          <div>
            <Input
              label="Confirm password"
              type="password"
              name="confirmPassword"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              autoComplete="new-password"
            />
            {confirmMismatch && (
              <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1.5">
                <img src={xIcon} alt="" className="w-3 h-3 shrink-0" aria-hidden="true" />
                Passwords do not match
              </p>
            )}
            {confirmMatches && (
              <p className="mt-1.5 text-xs text-green-600 dark:text-green-400 flex items-center gap-1.5">
                <img src={checkIcon} alt="" className="w-3 h-3 shrink-0" aria-hidden="true" />
                Passwords match
              </p>
            )}
          </div>

          <Button type="submit" loading={loading} disabled={!canSubmit} className="w-full">
            Create account
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
            Sign up with Google
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
            Sign up with GitHub
          </button>
        </div>
      </div>
    </AuthLayout>
  );
};
