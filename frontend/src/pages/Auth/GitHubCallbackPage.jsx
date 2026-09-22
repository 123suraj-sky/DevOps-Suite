import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Spinner } from '../../components/common/Spinner';

/**
 * Landing page for the GitHub OAuth callback.
 * GitHub redirects here with ?code=XXXX after the user authorises the app.
 * This component hands the code to the backend and then navigates to /.
 */
export const GitHubCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const { loginWithGithub } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    const code = searchParams.get('code');

    if (!code) {
      navigate('/login', { replace: true });
      return;
    }

    let cancelled = false;

    const exchange = async () => {
      try {
        await loginWithGithub(code);
        if (!cancelled) navigate('/', { replace: true });
      } catch (err) {
        if (!cancelled) {
          const msg = err.response?.data?.message || 'GitHub sign-in failed. Please try again.';
          setError(msg);
        }
      }
    };

    exchange();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--surface-base)] gap-4">
        <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        <button
          onClick={() => navigate('/login', { replace: true })}
          className="text-[var(--accent-text)] hover:underline text-sm font-medium"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--surface-base)] gap-3">
      <Spinner size="lg" />
      <p className="text-sm text-[var(--text-muted)]">Signing you in with GitHub…</p>
    </div>
  );
};
