import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validation
    if (!name || !email || !password) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    // Mock signup - replace with actual API call
    setTimeout(() => {
      navigate('/');
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-5xl mb-4 block">🎹</span>
          <h1 className="text-2xl font-bold text-neutral-900">Create account</h1>
          <p className="text-neutral-500">Start your music journey today</p>
        </div>

        {/* Benefits */}
        <div className="bg-primary-50 rounded-xl p-4 mb-6">
          <p className="text-sm font-medium text-primary-900 mb-2">What you'll get:</p>
          <ul className="text-sm text-primary-700 space-y-1">
            <li>✓ 2 free songs to learn</li>
            <li>✓ Beginner piano lessons</li>
            <li>✓ Real-time feedback</li>
            <li>✓ Track your progress</li>
          </ul>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-colors"
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-colors"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-colors"
              placeholder="At least 6 characters"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white rounded-xl font-semibold transition-colors"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        {/* Terms */}
        <p className="mt-4 text-xs text-neutral-500 text-center">
          By signing up, you agree to our{' '}
          <Link to="/terms" className="text-primary-600 hover:underline">Terms</Link>
          {' '}and{' '}
          <Link to="/privacy" className="text-primary-600 hover:underline">Privacy Policy</Link>
        </p>

        <div className="mt-8 text-center">
          <p className="text-neutral-500">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
