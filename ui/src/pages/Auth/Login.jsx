import React, { useContext, useState } from "react";
import AuthLayout from "../../components/layouts/AuthLayout";
import { Link, useNavigate } from "react-router-dom";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { UserContext } from "../../context/userContext";
import { validateEmail } from "../../utils/helper";
import { FaGoogle, FaApple } from "react-icons/fa";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const { updateUser } = useContext(UserContext);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!validateEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!password) {
      setError("Please enter the password.");
      return;
    }

    setError("");

    try {
      const response = await axiosInstance.post(API_PATHS.AUTH.LOGIN, {
        email,
        password,
      });

      const { token, role } = response.data;
      if (token) {
        localStorage.setItem("token", token);
        updateUser(response.data);
        if (role === "admin") {
          navigate("/admin/dashboard");
        } else {
          navigate("/user/dashboard");
        }
      }
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError("Something went wrong, please try again later.");
      }
    }
  };

  return (
    <AuthLayout>
      <div className="w-screen min-h-screen flex items-center justify-center p-6 bg-gray-200">
        <div className="w-full h-full rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden flex flex-col md:flex-row">
          {/* LEFT - FORM */}
          <div className="md:w-1/2 p-10 flex flex-col justify-center gap-4">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
                <img src="../assets/favicon.png" alt="logo" className="w-7 h-7 object-contain" />
              </div>
              <div>
                <div className="text-sm font-semibold">Algonive</div>
                <div className="text-xs text-gray-500">Team Management</div>
              </div>
            </div>

            <h2 className="text-2xl font-semibold text-gray-900">Login to Dashboard</h2>
            <p className="text-sm text-slate-600">Fill the below form to login</p>

            {/* Form */}
            <form onSubmit={handleLogin} className="flex flex-col gap-3">
              <label className="text-sm text-gray-700">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email address"
                type="email"
                className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                aria-label="Email"
              />

              <label className="text-sm text-gray-700 mt-2">Password</label>
              <div className="relative">
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter Password"
                  type={showPassword ? "text" : "password"}
                  className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  aria-label="Password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <AiOutlineEyeInvisible size={18} /> : <AiOutlineEye size={18} />}
                </button>
              </div>

              {error && <p className="text-xs text-red-500">{error}</p>}

              <div className="flex items-center justify-between mt-2">
                <Link to="/forgot" className="text-sm text-indigo-600">
                  Forgot Password?
                </Link>
              </div>

              <button
                type="submit"
                className="mt-4 w-full px-4 py-3 text-white font-medium text-sm bg-gradient-to-r from-indigo-500 to-violet-500 shadow-md"
              >
                Login
              </button>

              <p className="text-[13px] text-slate-800 mt-3">
                Don't have account?{" "}
                <Link className="font-medium text-indigo-600 underline" to="/signup">
                  SignUp
                </Link>
              </p>

              {/* OR divider */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-gray-200"></div>
                <div className="text-xs text-gray-400">OR</div>
                <div className="flex-1 h-px bg-gray-200"></div>
              </div>
            </form>

            {/* Social Buttons */}
            <div className="flex flex-row justify-center gap-3 mt-4">
              <button
                type="button"
                className="flex items-center justify-center gap-3 border rounded-md px-3 py-2 text-sm hover:shadow-sm"
              >
                <FaGoogle size={16} />
                <span>Sign in with Google</span>
              </button>

              <button
                type="button"
                className="flex items-center justify-center gap-3 border rounded-md px-3 py-2 text-sm hover:shadow-sm"
              >
                <FaApple size={16} />
                <span>Sign in with Apple</span>
              </button>
            </div>
          </div>

          {/* RIGHT - VISUAL / VIDEO */}
          <div className="md:w-1/2 relative bg-gradient-to-br from-indigo-50 to-white p-8 flex items-center justify-center">
            <div className="w-full h-full rounded-xl border border-gray-100 bg-white/60 backdrop-blur-sm p-6 flex flex-col gap-4 justify-between">
              <div>
                <span className="inline-block text-xs px-3 py-1 rounded-full bg-white/40 border text-gray-600">
                  IQM SYSTEMS Pressure Control
                </span>

                <h3 className="mt-4 text-lg font-semibold text-gray-800">
                  Manage your concreting and construction operations{" "}
                  <span className="text-indigo-600">more professionally</span>
                </h3>

                <p className="text-sm text-gray-500 mt-2">
                  Please define your project structures before start creating Pour sessions.
                </p>
              </div>

              <div className="flex-1 flex items-center justify-center">
                {/* Use a video tag or an image poster. Replace src with actual video file if available */}
                <div className="w-full rounded-lg overflow-hidden border border-gray-100 shadow-sm">
                  <video
                    src=""
                    poster="/images/dashboard-preview.png"
                    className="w-full h-64 object-cover"
                  />
                </div>
              </div>
            </div>

            {/* faint decorative frame (to mimic outer rounded white border in design) */}
            <div className="pointer-events-none absolute inset-2 rounded-2xl border border-white mix-blend-screen opacity-30"></div>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
};

export default Login;
