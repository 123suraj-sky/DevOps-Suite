import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../../api/authApi';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { AuthLayout } from '../../components/layout/AuthLayout';

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-[var(--text-primary)] tracking-tight">Reset password</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Enter your email and we'll send you a reset link.
          </p>
        </div>

        {submitted ? (
          <div className="space-y-4">
            <div className="p-4 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-sm text-green-700 dark:text-green-300">
              If that email is registered you'll receive a reset link shortly. Check your inbox.
            </div>
            <Link
              to="/login"
              className="block text-center text-sm text-[var(--accent-text)] hover:underline font-medium"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />

            <Button type="submit" loading={loading} className="w-full">
              Send reset link
            </Button>

            <Link
              to="/login"
              className="block text-center text-sm text-[var(--text-muted)] hover:text-[var(--accent-text)] transition-colors"
            >
              Back to sign in
            </Link>
          </form>
        )}
      </div>
    </AuthLayout>
  );
};
