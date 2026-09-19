import { useState, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../../api/authApi';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Card } from '../../components/common/Card';
import checkIcon from '../../assets/11_check.svg';
import xIcon from '../../assets/26_x.svg';
import logoIcon from '../../assets/42_logo.svg';

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
  const confirmMatches = useMemo(
    () => confirmPassword !== '' && password === confirmPassword,
    [password, confirmPassword]
  );
  const confirmMismatch = useMemo(
    () => confirmPassword !== '' && password !== confirmPassword,
    [password, confirmPassword]
  );
  const canSubmit = passwordValid && confirmMatches;

  // No token in URL — show an error state immediately
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4">
        <Card className="w-full max-w-md">
          <div className="text-center mb-6">
            <img src={logoIcon} alt="DevOps Suite Logo" className="w-16 h-16 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Invalid reset link</h1>
          </div>
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md text-sm text-red-700 dark:text-red-300 text-center mb-4">
            This password reset link is invalid or has already been used.
          </div>
          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            <Link to="/forgot-password" className="text-primary-600 hover:text-primary-700 font-medium">
              Request a new reset link
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError('');
    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      navigate('/login', {
        state: { successMessage: 'Password reset successfully. You can now sign in.' },
      });
    } catch (err) {
      const serverMessage = err.response?.data?.message;
      setError(serverMessage || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const passwordHintClass = passwordValid
    ? 'text-green-600 dark:text-green-400'
    : passwordBlurred
    ? 'text-red-500 dark:text-red-400'
    : 'text-gray-400 dark:text-gray-500';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={logoIcon} alt="DevOps Suite Logo" className="w-16 h-16 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Choose a new password</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Must be at least 8 characters.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <div>
            <Input
              label="New password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setPasswordBlurred(true)}
              required
            />
            <p className={`mt-1 text-xs flex items-center gap-1 ${passwordHintClass}`}>
              {passwordValid && (
                <img src={checkIcon} alt="" className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
              )}
              {passwordValid
                ? 'Password meets all requirements'
                : 'Min 8 chars, must include uppercase, lowercase, digit, and a special character (@#$%^&+=!)'}
            </p>
          </div>

          <div>
            <Input
              label="Confirm new password"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            {confirmMismatch && (
              <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                <img src={xIcon} alt="" className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
                Passwords do not match
              </p>
            )}
            {confirmMatches && (
              <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
                <img src={checkIcon} alt="" className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
                Passwords match
              </p>
            )}
          </div>

          <Button type="submit" loading={loading} disabled={!canSubmit} className="w-full">
            Reset password
          </Button>

          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
              Back to sign in
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
};
