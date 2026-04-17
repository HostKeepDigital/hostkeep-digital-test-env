import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, CheckCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const CORNWALL_IMG = "https://raw.githubusercontent.com/HostKeepDigital/hostkeep-assets/main/vecteezy_cornwall-coast-in-england_2524414.jpg";
const LOGO_IMG = "https://raw.githubusercontent.com/HostKeepDigital/hostkeep-assets/main/HostKeep_Digital_Navy_Background.png";

export default function GuestSignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [forename, setForename] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [surname, setSurname] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [propertyCount, setPropertyCount] = useState(0);

  useEffect(() => {
    const fetchPropertyCount = async () => {
      try {
        const properties = await base44.entities.Property.filter({ status: 'published' });
        setPropertyCount(properties?.length || 0);
      } catch (err) {
        console.error('Failed to fetch property count:', err);
      }
    };
    fetchPropertyCount();
  }, []);

  const fullName = () => [forename.trim(), middleName.trim(), surname.trim()].filter(Boolean).join(' ');

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!forename.trim() || !surname.trim()) {
      setError('First and last name are required');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/apps/698eee4108bd1d9467648326/functions/customSignUp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          password,
          forename: forename.trim(),
          middle_name: middleName.trim() || null,
          surname: surname.trim(),
        }),
      });
      const data = await res.json();

      if (data.success) {
        window.location.href = `/verify-email?email=${encodeURIComponent(email.toLowerCase().trim())}&role=guest`;
      } else {
        setError(data.message || 'Sign-up failed');
      }
    } catch (err) {
      setError(err.message || 'An error occurred during sign-up');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — Cornwall photography */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img
          src={CORNWALL_IMG}
          alt="Cornwall coast"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Navy gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1E3A5F]/90 via-[#1E3A5F]/70 to-[#0d9488]/50" />

        {/* Content over image */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img
              src={LOGO_IMG}
              alt="HostKeep Digital"
              className="h-60 w-auto"
            />
          </div>

          {/* Centre quote */}
          <div>
            <p className="text-white/60 text-sm font-medium tracking-[0.2em] uppercase mb-4">
              Discover · Holiday Homes · Smarter Pricing
            </p>
            <h1 className="text-white text-4xl font-bold leading-tight mb-6">
              Discover beautiful<br />
              holiday homes.<br />
              <span className="text-[#0d9488]">Better value guaranteed.</span>
            </h1>
            <p className="text-white/70 text-base leading-relaxed max-w-sm">
              HostKeep properties offer 0% commission markups — meaning lower prices than traditional booking platforms. Pay fair rates directly to property owners.
            </p>
          </div>

          {/* Bottom stats */}
          <div className="flex gap-8">
            {[
              { value: "0%", label: "Platform markup" },
              { value: "10%+", label: "Savings vs Airbnb" },
              ...(propertyCount >= 1000 ? [{ value: "1000s", label: "Hand-picked homes" }] : []),
            ].map((s) => (
              <div key={s.label}>
                <p className="text-white text-2xl font-bold">{s.value}</p>
                <p className="text-white/50 text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 bg-white dark:bg-gray-900">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <img
              src={LOGO_IMG}
              alt="HostKeep Digital"
              className="h-20 w-auto"
            />
          </div>

          <h2 className="text-2xl font-bold text-[#111827] dark:text-white mb-1">Create your account</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Join thousands enjoying better-value holidays</p>

          <form onSubmit={handleSignUp} className="space-y-5">

            <div className="grid grid-cols-3 gap-3">
              {[['forename','Forename','Jane'],['middleName','Middle name','Optional'],['surname','Surname','Smith']].map(([field, label, placeholder]) => (
                <div key={field}>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5 tracking-wide uppercase">{label}</label>
                  <input
                    type="text"
                    required={field !== 'middleName'}
                    value={field === 'forename' ? forename : field === 'middleName' ? middleName : surname}
                    onChange={(e) => field === 'forename' ? setForename(e.target.value) : field === 'middleName' ? setMiddleName(e.target.value) : setSurname(e.target.value)}
                    placeholder={placeholder}
                    className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-3 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0d9488]/40 focus:border-[#0d9488] transition-colors"
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5 tracking-wide uppercase">
                Email address
              </label>
              <input
                type="email"
                inputMode="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0d9488]/40 focus:border-[#0d9488] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5 tracking-wide uppercase">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  inputMode="text"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-500 pr-11 focus:outline-none focus:ring-2 focus:ring-[#0d9488]/40 focus:border-[#0d9488] transition-colors"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5 tracking-wide uppercase">
                Retype password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  inputMode="text"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-500 pr-11 focus:outline-none focus:ring-2 focus:ring-[#0d9488]/40 focus:border-[#0d9488] transition-colors"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {confirmPassword && password === confirmPassword && (
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <CheckCircle size={12} /> Passwords match
                </p>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !forename.trim() || !surname.trim()}
              className="w-full bg-[#1E3A5F] hover:bg-[#162d4a] disabled:opacity-60 text-white font-semibold text-sm rounded-xl py-3.5 transition-colors min-h-[52px]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating account...
                </span>
              ) : 'Create Account'}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-gray-100 dark:border-gray-700 space-y-3">
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              Already have an account?{" "}
              <Link to="/SignIn" className="text-[#0d9488] font-semibold hover:text-[#0f766e] transition-colors">
                Sign In
              </Link>
            </p>
            <div className="text-center">
              <Link to="/" className="inline-block text-sm font-semibold text-white bg-[#0d9488] hover:bg-[#0f766e] rounded-xl px-5 py-2.5 transition-colors">
                ← Back to Home
              </Link>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            © 2026 HostKeep Digital Ltd · Cornwall, UK
          </p>
        </div>
      </div>
    </div>
  );
}