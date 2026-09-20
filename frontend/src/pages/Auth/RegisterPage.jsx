import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Card } from '../../components/common/Card';
import checkIcon from '../../assets/11_check.svg';
import xIcon from '../../assets/26_x.svg';
import logoIcon from '../../assets/42_logo.svg';
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
        const serverMessage = err.response?.data?.message;
        setError(serverMessage || 'Google sign-up failed. Please try again.');
      }
    },
    onError: () => {
      setError('Google sign-in was cancelled or failed.');
    },
  });

  const handleGithubLogin = () => {
    const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
    const redirectUri = `${window.location.origin}/auth/github/callback`;
    const scope = 'read:user user:email';
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`;
  };

  // Derived validation
  const passwordValid = useMemo(() => PASSWORD_REGEX.test(formData.password), [formData.password]);

  const confirmMatches = useMemo(
    () => formData.confirmPassword !== '' && formData.password === formData.confirmPassword,
    [formData.password, formData.confirmPassword]
  );

  const confirmMismatch = useMemo(
    () => formData.confirmPassword !== '' && formData.password !== formData.confirmPassword,
    [formData.password, formData.confirmPassword]
  );

  // Button only enabled when password is valid AND confirm matches
  const canSubmit = passwordValid && confirmMatches;

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePasswordBlur = () => setPasswordBlurred(true);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError('');
    setLoading(true);
    try {
      const { confirmPassword, firstName, lastName, ...rest } = formData;
      // Backend expects `display_name`, not separate first/last name fields
      const payload = {
        ...rest,
        display_name: `${firstName} ${lastName}`.trim(),
      };
      await register(payload);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  // Password hint: grey (untouched) → red (blurred & invalid) → green (valid)
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">DevOps Suite</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="First Name" name="firstName" value={formData.firstName} onChange={handleChange} required />
            <Input label="Last Name" name="lastName" value={formData.lastName} onChange={handleChange} required />
          </div>

          <Input
            label="Email"
            type="email"
            name="email"
            placeholder="you@example.com"
            value={formData.email}
            onChange={handleChange}
            required
          />

          {/* Password with blur-triggered validation hint */}
          <div>
            <Input
              label="Password"
              type="password"
              name="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              onBlur={handlePasswordBlur}
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

          {/* Confirm Password with real-time mismatch feedback */}
          <div>
            <Input
              label="Confirm Password"
              type="password"
              name="confirmPassword"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={handleChange}
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

          <button
            type="submit"
            disabled={!canSubmit || loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-primary-500 rounded-md shadow-sm bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading && (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            <span>Create Account</span>
          </button>

          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-700" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white dark:bg-gray-800 px-2 text-gray-400">or</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => handleGoogleLogin()}
              className="w-full flex items-center justify-center gap-3 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <img src={googleIcon} alt="Google" className="w-5 h-5" />
              <span>Sign up with Google</span>
            </button>
            <button
              type="button"
              onClick={handleGithubLogin}
              className="w-full flex items-center justify-center gap-3 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <img src={githubIcon} alt="GitHub" className="w-5 h-5 dark:invert" />
              <span>Sign up with GitHub</span>
            </button>
          </div>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
            Sign in
          </Link>
        </div>
      </Card>
    </div>
  );
};
