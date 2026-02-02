import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@sargam/api';

type Step = 'phone' | 'otp' | 'name';

export default function LoginPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [devOtp, setDevOtp] = useState('');

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (step === 'otp') {
      otpRefs.current[0]?.focus();
    }
  }, [step]);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;

    if (formattedPhone.length < 12) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);

    try {
      const response = await authApi.sendOTP(formattedPhone);
      if (response.otp) {
        setDevOtp(response.otp);
      }
      setStep('otp');
    } catch (err: any) {
      const message = err?.response?.json ? await err.response.json() : null;
      setError(message?.error || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOTPChange = (index: number, value: string) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, 6).split('');
      const newOtp = [...otp];
      digits.forEach((digit, i) => {
        if (index + i < 6) {
          newOtp[index + i] = digit;
        }
      });
      setOtp(newOtp);
      const nextIndex = Math.min(index + digits.length, 5);
      otpRefs.current[nextIndex]?.focus();
    } else {
      const newOtp = [...otp];
      newOtp[index] = value.replace(/\D/g, '');
      setOtp(newOtp);
      if (value && index < 5) {
        otpRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleOTPKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      setError('Please enter the complete 6-digit OTP');
      return;
    }

    setLoading(true);

    try {
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
      const response = await authApi.verifyOTP(formattedPhone, otpCode, name || undefined);

      if (response.isNewUser && !name) {
        // New user - OTP already verified and tokens stored, just need name
        setStep('name');
        setLoading(false);
        return;
      }

      navigate('/');
    } catch (err: any) {
      const message = err?.response?.json ? await err.response.json() : null;
      setError(message?.error || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (name.length < 2) {
      setError('Please enter your name');
      return;
    }

    setLoading(true);

    try {
      // We're already authenticated from OTP verification, just update the profile
      await authApi.updateProfile({ name });
      navigate('/');
    } catch (err: any) {
      const message = err?.response?.json ? await err.response.json() : null;
      setError(message?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-pink-500 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/20">
            <span className="text-4xl">🎹</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Sargam AI</h1>
          <p className="text-white/50">Learn Piano with Bollywood</p>
        </div>

        {/* Phone Input Step */}
        {step === 'phone' && (
          <form onSubmit={handleSendOTP} className="space-y-5">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Phone Number
              </label>
              <div className="flex gap-2">
                <div className="px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white/50">
                  +91
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="flex-1 px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all"
                  placeholder="Enter 10-digit number"
                  autoComplete="tel"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || phone.length < 10}
              className="w-full py-4 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all shadow-lg shadow-orange-500/25"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending OTP...
                </span>
              ) : (
                'Continue'
              )}
            </button>

            <p className="text-center text-white/40 text-sm">
              We'll send you a one-time password to verify your number
            </p>
          </form>
        )}

        {/* OTP Verification Step */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOTP} className="space-y-5">
            <button
              type="button"
              onClick={() => setStep('phone')}
              className="flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-4"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Change number
            </button>

            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-white mb-1">Enter OTP</h2>
              <p className="text-white/50 text-sm">
                Sent to +91 {phone}
              </p>
              {devOtp && (
                <p className="text-orange-400 text-xs mt-2 font-mono bg-orange-500/10 px-3 py-1 rounded-lg inline-block">
                  Dev OTP: {devOtp}
                </p>
              )}
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div className="flex justify-center gap-3">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (otpRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={digit}
                  onChange={(e) => handleOTPChange(index, e.target.value)}
                  onKeyDown={(e) => handleOTPKeyDown(index, e)}
                  className="w-12 h-14 text-center text-xl font-bold bg-white/5 border border-white/10 rounded-xl text-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all"
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={loading || otp.join('').length !== 6}
              className="w-full py-4 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all shadow-lg shadow-orange-500/25"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verifying...
                </span>
              ) : (
                'Verify OTP'
              )}
            </button>

            <button
              type="button"
              onClick={handleSendOTP}
              className="w-full py-3 text-orange-400 hover:text-orange-300 font-medium transition-colors"
            >
              Resend OTP
            </button>
          </form>
        )}

        {/* Name Step */}
        {step === 'name' && (
          <form onSubmit={handleNameSubmit} className="space-y-5">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-white mb-1">Welcome!</h2>
              <p className="text-white/50 text-sm">
                Let's set up your profile
              </p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all"
                placeholder="Enter your name"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading || name.length < 2}
              className="w-full py-4 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all shadow-lg shadow-orange-500/25"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : (
                'Get Started'
              )}
            </button>
          </form>
        )}

        <p className="text-center text-white/30 text-xs mt-10">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
