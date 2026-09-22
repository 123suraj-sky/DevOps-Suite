import { useState, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../../api/authApi';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { AuthLayout } from '../../components/layout/AuthLayout';
import checkIcon from '../../assets/11_check.svg';
import xIcon from '../../assets/26_x.svg';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@#$%^&+=!]).{8,}$/;

export const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordBlurred, setPasswordBlurred] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const passwordValid = useMemo(() => PASSWORD_REGEX.test(password), [password]);
  const confirmMatches = useMemo(() => confirmPassword !== '' && password === confirmPassword, [password, confirmPassword]);
  const confirmMismatch = useMemo(() => confirmPassword !== '' && password !== confirmPassword, [password, confirmPassword]);
  const canSubmit = passwordValid && confirmMatches;

  if (!token) {
    return (
      <AuthLayout>
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)] tracking-tight">Invalid link</h2>
          </div>
          <div className="p-4 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
            This password reset link is invalid or has already been used.
          </div>
          <Link
            to="/forgot-password"
            className="block text-center text-sm text-[var(--accent-text)] hover:underline font-medium"
          >
            Request a new reset link
          </Link>
        </div>
      </AuthLayout>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError('');
    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      navigate('/login', { state: { successMessage: 'Password reset successfully. You can now sign in.' } });
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
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
        <div>
          <h2 className="text-2xl font-semibold text-[var(--text-primary)] tracking-tight">New password</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Choose a strong password for your account.</p>
        </div>

        {error && (
          <div className="p-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              label="New password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setPasswordBlurred(true)}
              required
              autoComplete="new-password"
            />
            <p className={`mt-1.5 text-xs flex items-center gap-1.5 ${passwordHintClass}`}>
              {passwordValid && <img src={checkIcon} alt="" className="w-3 h-3 shrink-0" aria-hidden="true" />}
              {passwordValid ? 'Password meets all requirements' : 'Min 8 chars, uppercase, lowercase, digit, and special character'}
            </p>
          </div>

          <div>
            <Input
              label="Confirm password"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
            Reset password
          </Button>

          <Link
            to="/login"
            className="block text-center text-sm text-[var(--text-muted)] hover:text-[var(--accent-text)] transition-colors"
          >
            Back to sign in
          </Link>
        </form>
      </div>
    </AuthLayout>
  );
};
