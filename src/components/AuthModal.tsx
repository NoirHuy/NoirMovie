import React, { useState, useEffect } from 'react';
import { X, Loader, Mail, Lock, User, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleClientId, setGoogleClientId] = useState<string>('');
  const { login, register, loginWithGoogle } = useAuth();

  const handleGoogleCredentialResponse = async (response: any) => {
    setError(null);
    setLoading(true);
    try {
      await loginWithGoogle(response.credential);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Đăng nhập Google thất bại.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/config/google');
        if (response.ok) {
          const data = await response.json();
          if (data.clientId) {
            setGoogleClientId(data.clientId);
          }
        }
      } catch (err) {
        console.error('Failed to fetch Google Client ID from backend:', err);
      }
    };
    fetchConfig();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !googleClientId) return;

    const initializeGoogleSignIn = () => {
      const google = (window as any).google;
      if (google && google.accounts) {
        google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleCredentialResponse,
        });

        const btnContainer = document.getElementById("google-signin-btn");
        if (btnContainer) {
          google.accounts.id.renderButton(btnContainer, {
            theme: "dark",
            size: "large",
            width: btnContainer.clientWidth || 320,
            text: "signin_with",
            shape: "rectangular"
          });
        }

        // Trigger One Tap
        google.accounts.id.prompt();
      }
    };

    const timer = setInterval(() => {
      const google = (window as any).google;
      if (google && google.accounts) {
        initializeGoogleSignIn();
        clearInterval(timer);
      }
    }, 100);

    return () => clearInterval(timer);
  }, [isOpen, isRegister, googleClientId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const trimmedUsername = username.trim();
    if (trimmedUsername.length < 3) {
      setError('Tên đăng nhập phải dài ít nhất 3 ký tự.');
      setLoading(false);
      return;
    }
    if (password.length < 6) {
      setError('Mật khẩu phải dài ít nhất 6 ký tự.');
      setLoading(false);
      return;
    }

    if (isRegister) {
      const trimmedEmail = email.trim();
      if (trimmedEmail) {
        // Basic email regex format check
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedEmail)) {
          setError('Địa chỉ email không đúng định dạng (Ví dụ: name@gmail.com).');
          setLoading(false);
          return;
        }
      }
      if (password !== confirmPassword) {
        setError('Mật khẩu xác nhận không khớp.');
        setLoading(false);
        return;
      }
    }

    try {
      if (isRegister) {
        await register(trimmedUsername, email.trim(), password);
      } else {
        await login(trimmedUsername, password);
      }
      // Reset form on success
      setUsername('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setError(null);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra, vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchMode = (registerMode: boolean) => {
    setIsRegister(registerMode);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#09090b]/80 backdrop-blur-md p-container-margin-mobile md:p-0 overflow-y-auto auth-modal-overlay">
      
      {/* Background Image Layer (Desaturated Hero style) */}
      <div className="fixed inset-0 z-0 opacity-30 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/80 to-transparent"></div>
        <img 
          className="w-full h-full object-cover" 
          alt="Cinematic theater background" 
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuAJjCC4hmtZoymhSSDeG0YGXwuw0XVOnePi26O15abZ5SAVl2kyUOJsM10AXdbNmrMZlrWDIsMOK6vqzZhZiht1E_DDEzslLSWOx1gndyGof3SgpLujbx_Qscm0VJUnCgM_kzs9hOwoQUE8sAtMYOUuiv9eNMQb8sgjMDG6TNoW-VSegEtqJFxh6dzEOGIhW1L5A993I34rlIfi9TFj3cOoBEaGVd-mTmW6wlbN42EB4nipi4JHcKbRr-tLwiUADorltKHm6lGg_JA"
        />
      </div>

      {/* Cinematic Background Mesh & Orbs */}
      <div className="absolute inset-0 bg-mesh opacity-90 z-0 pointer-events-none" />
      <div className="absolute top-0 left-0 w-[400px] h-[400px] rounded-full bg-red-500/5 blur-[60px] animate-move-orb pointer-events-none z-0" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-teal-500/5 blur-[60px] animate-move-orb pointer-events-none z-0" style={{ animationDelay: '-5s' }} />

      {/* Login/Signup Modal Container */}
      <main className="relative w-full max-w-[480px] z-10 p-4 my-8 animate-fade-in-scale">
        <div className="glass-panel p-8 md:p-12 rounded-xl shadow-2xl relative overflow-hidden">
          
          {/* Close Button */}
          <button 
            type="button"
            className="absolute top-4 right-4 text-on-surface-variant hover:text-white transition-colors cursor-pointer disabled:opacity-50 z-20" 
            onClick={onClose} 
            disabled={loading}
          >
            <X size={20} />
          </button>

          {/* Branding */}
          <div className="flex flex-col items-center mb-10">
            <span className="font-headline text-3xl font-extrabold text-primary tracking-tighter mb-2">NoirMovie</span>
            <p className="text-xs text-on-surface-variant uppercase tracking-widest font-semibold">Enter the Frame</p>
          </div>

          {/* Tab Switcher (Minimal) */}
          <div className="flex gap-8 mb-8 justify-center">
            <button 
              type="button"
              className={`text-sm pb-2 transition-all cursor-pointer font-semibold ${
                !isRegister 
                  ? 'text-primary border-b-2 border-primary' 
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
              onClick={() => handleSwitchMode(false)}
              disabled={loading}
            >
              Đăng Nhập
            </button>
            <button 
              type="button"
              className={`text-sm pb-2 transition-all cursor-pointer font-semibold ${
                isRegister 
                  ? 'text-primary border-b-2 border-primary' 
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
              onClick={() => handleSwitchMode(true)}
              disabled={loading}
            >
              Đăng Ký
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs px-4 py-3 rounded-lg mb-6 animate-shake">
              {error}
            </div>
          )}

          {/* Forms */}
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Username Input */}
            <div className="space-y-2 group transition-transform duration-200 focus-within:scale-[1.01]">
              <label className="text-xs font-bold text-on-surface-variant group-focus-within:text-primary transition-colors uppercase tracking-wider block" htmlFor="username">
                Tên đăng nhập
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/60">
                  <User size={18} />
                </span>
                <input 
                  className="w-full bg-surface-container/50 border border-white/10 rounded-lg py-4 pl-12 pr-4 text-sm text-on-surface focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-on-surface-variant/40" 
                  id="username" 
                  placeholder="Nhập tên đăng nhập" 
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required 
                  minLength={3}
                  disabled={loading}
                  type="text"
                />
              </div>
            </div>

            {/* Email Input (Optional - Only on Register) */}
            {isRegister && (
              <div className="space-y-2 group transition-transform duration-200 focus-within:scale-[1.01]">
                <label className="text-xs font-bold text-on-surface-variant group-focus-within:text-primary transition-colors uppercase tracking-wider block" htmlFor="email">
                  Địa chỉ Email <span className="text-on-surface-variant/50 text-[10px] font-normal lowercase">(Không bắt buộc)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/60">
                    <Mail size={18} />
                  </span>
                  <input 
                    className="w-full bg-surface-container/50 border border-white/10 rounded-lg py-4 pl-12 pr-4 text-sm text-on-surface focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-on-surface-variant/40" 
                    id="email" 
                    placeholder="name@example.com" 
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    disabled={loading}
                    type="email"
                  />
                </div>
              </div>
            )}

            {/* Password Input */}
            <div className="space-y-2 group transition-transform duration-200 focus-within:scale-[1.01]">
              <div className="flex justify-between items-end">
                <label className="text-xs font-bold text-on-surface-variant group-focus-within:text-primary transition-colors uppercase tracking-wider block" htmlFor="password">
                  Mật khẩu
                </label>
                {!isRegister && (
                  <a href="#" className="text-xs text-primary hover:underline font-semibold">
                    Quên?
                  </a>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/60">
                  <Lock size={18} />
                </span>
                <input 
                  className="w-full bg-surface-container/50 border border-white/10 rounded-lg py-4 pl-12 pr-4 text-sm text-on-surface focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-on-surface-variant/40" 
                  id="password" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required 
                  minLength={6}
                  disabled={loading}
                  type="password"
                />
              </div>
            </div>

            {/* Confirm Password Input (Only on Register) */}
            {isRegister && (
              <div className="space-y-2 group transition-transform duration-200 focus-within:scale-[1.01]">
                <label className="text-xs font-bold text-on-surface-variant group-focus-within:text-primary transition-colors uppercase tracking-wider block" htmlFor="confirmPassword">
                  Xác nhận lại mật khẩu
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/60">
                    <Lock size={18} />
                  </span>
                  <input 
                    className="w-full bg-surface-container/50 border border-white/10 rounded-lg py-4 pl-12 pr-4 text-sm text-on-surface focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-on-surface-variant/40" 
                    id="confirmPassword" 
                    placeholder="••••••••" 
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required 
                    minLength={6}
                    disabled={loading}
                    type="password"
                  />
                </div>
              </div>
            )}

            {/* CTA Submit Button */}
            <button 
              className="w-full bg-[#ff5451] text-white font-semibold py-4 rounded-lg crimson-glow hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" 
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <Loader className="animate-spin" size={18} />
              ) : (
                <>
                  <span>{isRegister ? 'Đăng Ký Ngay' : 'Đăng Nhập'}</span>
                  <ArrowRight className="group-hover:translate-x-1 transition-transform" size={18} />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-10">
            <div className="h-px bg-white/10 flex-grow"></div>
            <span className="text-[10px] text-on-surface-variant uppercase tracking-widest opacity-50 font-bold">HOẶC TIẾP TỤC VỚI</span>
            <div className="h-px bg-white/10 flex-grow"></div>
          </div>

          {/* Social Logins */}
          <div className="flex flex-col gap-4 w-full items-center justify-center">
            {/* Google Sign-In Container */}
            <div id="google-signin-btn" className="w-full flex justify-center h-[44px]"></div>
            
            <button 
              type="button"
              className="w-full flex items-center justify-center gap-3 bg-white/5 border border-white/10 py-3.5 rounded-lg hover:bg-white/10 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
            >
              <svg className="w-5 h-5 fill-current text-white" viewBox="0 0 24 24">
                <path d="M17.05 20.28c-.96.95-2.21 1.72-3.72 1.72-1.54 0-2.39-.92-4.01-.92-1.65 0-2.61.91-4.01.91-1.45 0-2.87-.86-4.05-2.22-2.41-2.76-2.41-7.23 0-9.98 1.18-1.35 2.6-2.21 4.05-2.21 1.41 0 2.36.91 4.01.91 1.62 0 2.48-.91 4.01-.91 1.25 0 2.49.65 3.39 1.58-2.83 1.43-2.38 5.63.43 7.02-.63 1.58-1.57 3.12-2.1 4.1zM12.03 7.25c-.02-2.23 1.83-4.09 4.01-4.13.04 2.23-1.83 4.11-4.01 4.13z"></path>
              </svg>
              <span className="text-xs font-semibold text-on-surface">Đăng nhập với Apple (Bản dùng thử)</span>
            </button>
          </div>

          {/* Footer Text */}
          <p className="mt-10 text-center text-xs font-medium text-on-surface-variant">
            {isRegister ? (
              <>
                Đã có tài khoản?{' '}
                <button 
                  type="button"
                  className="text-primary font-bold hover:underline cursor-pointer" 
                  onClick={() => handleSwitchMode(false)}
                >
                  Đăng Nhập
                </button>
              </>
            ) : (
              <>
                Thành viên mới?{' '}
                <button 
                  type="button"
                  className="text-primary font-bold hover:underline cursor-pointer" 
                  onClick={() => handleSwitchMode(true)}
                >
                  Đăng Ký Ngay
                </button>
              </>
            )}
          </p>

          {/* Decorative Glow Line */}
          <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-30"></div>
        </div>
      </main>
    </div>
  );
};
