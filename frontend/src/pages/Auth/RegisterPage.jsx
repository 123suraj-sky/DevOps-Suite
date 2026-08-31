import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Card } from '../../components/common/Card';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@#$%^&+=!]).{8,}$/;

export const RegisterPage = () => {
  const { register } = useAuth();
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
    ? 'text-green-600'
    : passwordBlurred
    ? 'text-red-500'
    : 'text-gray-400';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">DevOps Suite</h1>
          <p className="text-sm text-gray-500 mt-2">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
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
            <p className={`mt-1 text-xs ${passwordHintClass}`}>
              {passwordValid
                ? '✓ Password meets all requirements'
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
              <p className="mt-1 text-xs text-red-500">✗ Passwords do not match</p>
            )}
            {confirmMatches && (
              <p className="mt-1 text-xs text-green-600">✓ Passwords match</p>
            )}
          </div>

          <Button
            type="submit"
            loading={loading}
            disabled={!canSubmit}
            className="w-full"
          >
            Create Account
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
            Sign in
          </Link>
        </div>
      </Card>
    </div>
  );
};
