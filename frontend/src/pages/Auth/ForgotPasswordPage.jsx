import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../../api/authApi';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Card } from '../../components/common/Card';
import logoIcon from '../../assets/42_logo.svg';

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
      const serverMessage = err.response?.data?.message;
      setError(serverMessage || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={logoIcon} alt="DevOps Suite Logo" className="w-16 h-16 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Reset your password</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Enter your email and we'll send you a reset link.
          </p>
        </div>

        {submitted ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-md text-sm text-green-700 dark:text-green-300 text-center">
              If that email is registered you will receive a reset link shortly. Check your inbox.
            </div>
            <div className="text-center text-sm text-gray-500 dark:text-gray-400">
              <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
                Back to sign in
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md text-sm text-red-700 dark:text-red-300">
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
            />

            <Button type="submit" loading={loading} className="w-full">
              Send reset link
            </Button>

            <div className="text-center text-sm text-gray-500 dark:text-gray-400">
              <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
                Back to sign in
              </Link>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
};
