import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, Loader2 } from 'lucide-react';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        setEmailSent(true);
        setMessage(data.message);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-[32px] shadow-[0_40px_120px_rgba(15,23,42,0.15)] p-8">
          {/* Back Button */}
          <Link 
            to="/login"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
          >
            <ArrowLeft size={20} className="mr-2" />
            Back to Login
          </Link>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center mx-auto mb-4">
              <Mail className="text-white" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Forgot Password?</h1>
            <p className="text-gray-600">
              {!emailSent 
                ? "Enter your email address and we'll send you a 6-digit OTP to reset your password."
                : "Check your email for the OTP code."
              }
            </p>
          </div>

          {!emailSent ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Email Address</label>
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

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-14 rounded-2xl bg-gradient-to-r from-gray-900 to-gray-800 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-gray-900/20 disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    <span>Sending OTP...</span>
                  </>
                ) : (
                  <span>Send OTP</span>
                )}
              </button>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">
                {message}
              </div>

              <div className="text-center space-y-4">
                <p className="text-gray-600 text-sm">
                  Didn't receive the email? Check your spam folder or try again.
                </p>
                
                <button
                  onClick={() => {
                    setEmailSent(false);
                    setMessage('');
                    setError('');
                  }}
                  className="text-gray-900 font-medium hover:underline text-sm"
                >
                  Try Again
                </button>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <Link
                  to="/verify-otp"
                  state={{ email }}
                  className="w-full h-14 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold flex items-center justify-center shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 transition-shadow"
                >
                  Verify OTP
                </Link>
              </div>
            </div>
          )}

          {/* Security Notice */}
          <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <h3 className="text-sm font-semibold text-amber-900 mb-2">🔒 Security Notice</h3>
            <ul className="text-xs text-amber-700 space-y-1">
              <li>• OTP will expire in 10 minutes</li>
              <li>• Never share OTP with anyone</li>
              <li>• OTP can only be used once</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
