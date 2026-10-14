import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiMail, FiLock, FiAlertCircle, FiEye, FiEyeOff, FiZap, FiKey } from 'react-icons/fi';
import { loginSchema } from '../../lib/validate.js';
import { useAuth } from './useAuth.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';

export function LoginPage() {
  const { signIn, devBypassSignIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [authError, setAuthError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const from = location.state?.from || '/admin';

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm({
    resolver: yupResolver(loginSchema),
    defaultValues: {
      email: 'admin@example.com',
      password: 'Admin@123456'
    }
  });

  const onSubmit = async (data) => {
    setAuthError(null);
    setLoading(true);
    try {
      const email = data.email?.trim();
      const password = data.password?.trim();
      await signIn(email, password, rememberMe);
      navigate(from, { replace: true });
    } catch (err) {
      console.error('Sign-in error:', err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setAuthError('Invalid administrator email or password. Password is case-sensitive (Admin@123456). Or use One-Click Sign In below.');
      } else if (err.code === 'auth/too-many-requests') {
        setAuthError('Too many failed login attempts. Please use One-Click Sign In below or try again later.');
      } else {
        setAuthError(err.message || 'Authentication failed. Please verify your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDevBypass = (adminEmail = 'admin@example.com') => {
    devBypassSignIn(adminEmail);
    navigate(from, { replace: true });
  };

  const handleQuickFill = (email, pass = 'Admin@123456') => {
    setValue('email', email);
    setValue('password', pass);
    setAuthError(null);
  };

  return (
    <div className="min-h-screen bg-app flex flex-col justify-center items-center p-4 selection:bg-primary/20 selection:text-primary">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary text-primary-contrast font-bold text-2xl flex items-center justify-center mx-auto shadow-lg mb-4 font-poppins">
            FA
          </div>
          <h1 className="text-2xl font-bold text-main tracking-tight font-poppins">Administrator Sign In</h1>
          <p className="text-sm text-muted mt-1">
            Access the biometric attendance control center
          </p>
        </div>

        {/* Card */}
        <div className="bg-surface border border-line rounded-token p-6 sm:p-8 shadow-xl space-y-4">
          {/* Quick 1-Click Login Banner */}
          <div className="p-3 bg-primary/10 border border-primary/25 rounded-token flex flex-col gap-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-primary flex items-center gap-1.5">
                <FiZap className="w-3.5 h-3.5 text-warning" />
                Quick Admin Access:
              </span>
              <span className="text-[11px] font-mono text-muted">No typing required</span>
            </div>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => handleDevBypass('admin@example.com')}
              className="w-full font-bold flex items-center justify-center gap-2"
            >
              <FiZap className="w-4 h-4 text-warning" />
              <span>1-Click Instant Sign In as Admin</span>
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-px bg-line flex-1" />
            <span className="text-[11px] text-muted uppercase tracking-wider font-semibold">Or Sign In with Password</span>
            <div className="h-px bg-line flex-1" />
          </div>

          {/* Quick Fill Pills */}
          <div className="flex items-center justify-between text-xs text-muted">
            <span className="flex items-center gap-1">
              <FiKey className="w-3 h-3 text-primary" />
              <span>Fill Credentials:</span>
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => handleQuickFill('face@gmail.com', 'Gopi@188512')}
                className="px-2.5 py-0.5 rounded text-[11px] bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30 font-bold transition-colors"
                title="Fill face@gmail.com & Gopi@188512"
              >
                face@gmail.com
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('admin@example.com', 'Admin@123456')}
                className="px-2 py-0.5 rounded text-[11px] bg-surface-2 hover:bg-primary/15 text-primary border border-line font-medium transition-colors"
                title="Fill admin@example.com & Admin@123456"
              >
                admin@example.com
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('gopijakka2005@gmail.com', 'Admin@123456')}
                className="px-2 py-0.5 rounded text-[11px] bg-surface-2 hover:bg-primary/15 text-primary border border-line font-medium transition-colors"
                title="Fill gopijakka2005@gmail.com & Admin@123456"
              >
                gopijakka2005
              </button>
            </div>
          </div>

          {authError && (
            <div className="p-3.5 bg-danger/10 border border-danger/30 rounded-token flex items-start gap-3 text-danger text-xs leading-relaxed">
              <FiAlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              icon={FiMail}
              placeholder="admin@example.com"
              error={errors.email?.message}
              {...register('email')}
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                icon={FiLock}
                placeholder="Admin@123456"
                error={errors.password?.message}
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[33px] text-muted hover:text-main focus:outline-none p-1"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded text-primary focus:ring-primary w-4 h-4 border-line bg-surface"
                />
                <span className="text-xs text-muted font-medium">Stay signed in on this device</span>
              </label>

              <span className="text-[11px] text-muted font-mono">
                Key: <strong className="text-main font-semibold">Admin@123456</strong>
              </span>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="secondary"
                loading={loading}
                className="w-full"
                size="lg"
              >
                Sign In with Credentials
              </Button>
            </div>
          </form>
        </div>

        {/* Public Kiosk Link */}
        <div className="text-center mt-6">
          <a
            href="/kiosk"
            className="text-xs font-semibold text-accent hover:underline uppercase tracking-wider"
          >
            Launch Public Attendance Kiosk ↗
          </a>
        </div>
      </div>
    </div>
  );
}
