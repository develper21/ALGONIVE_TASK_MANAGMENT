import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Mail, Lock, User as UserIcon, Loader2 } from 'lucide-react';

const Signup = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('member');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signup } = useAuth();
  const navigate = useNavigate();

  const passwordStrength = useMemo(() => {
    if (!password) return { label: 'Enter a password', color: 'text-gray-400', bar: 'bg-gray-200', score: 0 };
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (score >= 3) {
      return { label: 'Strong password', color: 'text-green-600', bar: 'bg-green-500', score };
    } else if (score === 2) {
      return { label: 'Medium strength', color: 'text-amber-600', bar: 'bg-amber-500', score };
    }
    return { label: 'Weak password', color: 'text-red-600', bar: 'bg-red-500', score };
  }, [password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    
    const result = await signup(name, email, password, role);
    
    if (result.success) {
      navigate('/dashboard');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-6xl bg-white rounded-[32px] shadow-[0_40px_120px_rgba(15,23,42,0.15)] grid lg:grid-cols-2 overflow-hidden">
        {/* Left Form Panel */}
        <div className="px-8 lg:px-16 py-12 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-10">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                <span className="text-white text-2xl font-semibold">A</span>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Algonive</p>
                <p className="text-sm text-gray-500">Project Workspace</p>
              </div>
            </div>

            <div className="mb-10">
              <p className="text-sm text-gray-500 uppercase tracking-wide mb-2">Create Account</p>
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900">Start your workspace</h1>
              <p className="text-gray-500 mt-2">Set up your team profile and access collaborative tools in minutes.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50/60 focus:bg-white focus:border-gray-400 px-12 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black/5"
                    placeholder="John Doe"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50/60 focus:bg-white focus:border-gray-400 px-12 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black/5"
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-2xl border border-gray-200 bg-gray-50/60 focus:bg-white focus:border-gray-400 px-12 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black/5"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                  <div>
                    <div className="h-1 rounded-full bg-gray-200 overflow-hidden">
                      <div
                        className={`${passwordStrength.bar} h-full transition-all duration-200`}
                        style={{ width: `${(passwordStrength.score / 4) * 100}%` }}
                      ></div>
                    </div>
                    <p className={`text-xs mt-2 ${passwordStrength.color}`}>{passwordStrength.label}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full rounded-2xl border border-gray-200 bg-gray-50/60 focus:bg-white focus:border-gray-400 px-12 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black/5"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50/60 focus:bg-white focus:border-gray-400 px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/5"
                >
                  <option value="member">Team Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-14 rounded-2xl bg-gradient-to-r from-gray-900 to-gray-800 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-gray-900/20"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    <span>Creating account...</span>
                  </>
                ) : (
                  <>
                    <UserPlus size={18} />
                    <span>Create Account</span>
                  </>
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-sm text-gray-500 mt-12">
            Already have an account?{' '}
            <Link to="/login" className="text-gray-900 font-semibold hover:underline">
              Sign In
            </Link>
          </p>
        </div>

        {/* Right Story Panel */}
        <div className="bg-[#0f172a] text-white relative p-10 lg:p-14 flex flex-col gap-8">
          <div>
            <p className="text-sm text-white/60 mb-3">Why teams choose Algonive</p>
            <h2 className="text-3xl font-semibold leading-tight">Plan, execute and measure in one place</h2>
            <p className="text-white/60 mt-4 text-sm">
              Launch faster with templates, rich analytics widgets and realtime collaboration built for modern teams.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Projects live', value: '120+', detail: 'across global teams' },
              { label: 'Avg. response', value: '2m 14s', detail: 'support turnaround' },
              { label: 'Engagement', value: '98%', detail: 'teams active weekly' },
              { label: 'NPS Score', value: '72', detail: 'top percentile' }
            ].map((card) => (
              <div key={card.label} className="rounded-2xl bg-white/5 border border-white/10 p-4">
                <p className="text-xs uppercase tracking-wide text-white/50">{card.label}</p>
                <p className="text-2xl font-semibold mt-2">{card.value}</p>
                <p className="text-sm text-white/60 mt-1">{card.detail}</p>
              </div>
            ))}
          </div>

          <div className="mt-auto space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-white/60">“Algonive centralizes our operations. Our distributed teams stay aligned with zero effort.”</p>
              <p className="text-sm font-semibold mt-3">— Priya S., Product Ops Lead</p>
            </div>
            <div className="flex space-x-2">
              {[0, 1, 2].map((idx) => (
                <span key={idx} className={`h-1 rounded-full flex-1 ${idx === 0 ? 'bg-white' : 'bg-white/30'}`}></span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
