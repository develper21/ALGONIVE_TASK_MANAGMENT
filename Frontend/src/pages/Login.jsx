import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, Mail, Lock, Loader2, Chrome } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
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
    setLoading(true);
    
    const result = await login(email, password);
    
    if (result.success) {
      navigate('/dashboard');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-6xl bg-white rounded-[32px] shadow-[0_40px_120px_rgba(15,23,42,0.15)] grid lg:grid-cols-2 overflow-hidden">
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
              <p className="text-sm text-gray-500 uppercase tracking-wide mb-2">Welcome Back</p>
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900">Sign in to continue</h1>
              <p className="text-gray-500 mt-2">Enter your credentials to access your dashboard and stay on top of your team activities.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
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
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <label className="inline-flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" className="rounded border-gray-300 text-gray-900 focus:ring-gray-900" />
                    <span>Remember me</span>
                  </label>
                  <Link to="/forgot-password" className="text-gray-900 font-medium hover:underline">Forgot password?</Link>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-14 rounded-2xl bg-gradient-to-r from-gray-900 to-gray-800 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-gray-900/20">
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <LogIn size={18} />
                    <span>Sign In</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-8">
              <div className="flex items-center justify-between text-sm text-gray-400 mb-4">
                <span className="flex-1 h-px bg-gray-100"></span>
                <span className="px-4">or login with</span>
                <span className="flex-1 h-px bg-gray-100"></span>
              </div>
              <div className="grid grid-cols-1">
                <button type="button" className="rounded-2xl border border-gray-200 py-3 flex items-center justify-center gap-3 text-gray-600 font-medium hover:bg-gray-50">
                  <Chrome size={18} /> Google
                </button>
              </div>
            </div>
          </div>

          <p className="text-center text-sm text-gray-500 mt-12">
            Don't have an account?{' '}
            <Link to="/signup" className="text-gray-900 font-semibold hover:underline">
              Register
            </Link>
          </p>
        </div>

        <div className="bg-[#0f172a] text-white relative p-10 lg:p-14 flex flex-col gap-8">
          <div>
            <p className="text-sm text-white/60 mb-3">Live project insights</p>
            <h2 className="text-3xl font-semibold leading-tight">Transform your data into beautiful dashboards</h2>
            <p className="text-white/60 mt-4 text-sm">
              Modern analytics components help you keep everyone informed. See task health, pipeline targets,
              team segmentation and conversion metrics in one glance.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Sales Pipeline', value: '$5,832', detail: 'up 8% vs last month' },
              { label: 'Closed Won', value: '$11,680', detail: '↑ $8,450 MoM' },
              { label: 'Segmentation', value: '2,758', detail: 'SMB • Enterprise • Individuals' },
              { label: 'Task Completion', value: '92%', detail: '+12% efficiency' }
            ].map((card) => (
              <div key={card.label} className="rounded-2xl bg-white/5 border border-white/10 p-4">
                <p className="text-xs uppercase tracking-wide text-white/50">{card.label}</p>
                <p className="text-2xl font-semibold mt-2">{card.value}</p>
                <p className="text-sm text-white/60 mt-1">{card.detail}</p>
              </div>
            ))}
          </div>

          <div className="mt-auto">
            <p className="text-sm text-white/50">Algonive Analytics</p>
            <p className="text-lg font-semibold">“Data stories your team can act on instantly.”</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
