import React, { useState } from 'react';
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
  const { login, register } = useAuth();

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#09090b]/80 backdrop-blur-md p-container-margin-mobile md:p-0 overflow-y-auto">
      
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
            <span className="font-headline text-3xl font-extrabold text-primary tracking-tighter mb-2">CINEOS</span>
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
          <div className="grid grid-cols-2 gap-4">
            <button 
              type="button"
              className="flex items-center justify-center gap-3 bg-white/5 border border-white/10 py-3 rounded-lg hover:bg-white/10 transition-all hover:scale-[1.03] active:scale-[0.97] cursor-pointer"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M12 5.04c1.8 0 3.14.77 3.84 1.45l2.87-2.87C16.96 1.96 14.71 1 12 1 7.22 1 3.22 3.86 1.5 8l3.43 2.67C5.75 7.42 8.63 5.04 12 5.04z" fill="#EA4335"></path>
                <path d="M23.49 12.27c0-.84-.07-1.64-.21-2.42H12v4.58h6.45c-.28 1.48-1.12 2.74-2.38 3.58l3.7 2.87c2.16-2 3.72-4.94 3.72-8.61z" fill="#4285F4"></path>
                <path d="M5.13 14.67C4.88 13.92 4.75 13.12 4.75 12.3c0-.82.13-1.62.38-2.37L1.7 7.26C.62 9.3 0 11.6 0 14c0 2.4.62 4.7 1.7 6.74l3.43-2.07z" fill="#FBBC05"></path>
                <path d="M12 23c2.7 0 4.96-.89 6.62-2.42l-3.7-2.87c-.92.62-2.1.98-2.92.98-3.37 0-6.25-2.38-7.07-5.63L1.5 15.13C3.22 19.27 7.22 23 12 23z" fill="#34A853"></path>
              </svg>
              <span className="text-xs font-semibold text-on-surface">Google</span>
            </button>
            <button 
              type="button"
              className="flex items-center justify-center gap-3 bg-white/5 border border-white/10 py-3 rounded-lg hover:bg-white/10 transition-all hover:scale-[1.03] active:scale-[0.97] cursor-pointer"
            >
              <svg className="w-5 h-5 fill-current text-white" viewBox="0 0 24 24">
                <path d="M17.05 20.28c-.96.95-2.21 1.72-3.72 1.72-1.54 0-2.39-.92-4.01-.92-1.65 0-2.61.91-4.01.91-1.45 0-2.87-.86-4.05-2.22-2.41-2.76-2.41-7.23 0-9.98 1.18-1.35 2.6-2.21 4.05-2.21 1.41 0 2.36.91 4.01.91 1.62 0 2.48-.91 4.01-.91 1.25 0 2.49.65 3.39 1.58-2.83 1.43-2.38 5.63.43 7.02-.63 1.58-1.57 3.12-2.1 4.1zM12.03 7.25c-.02-2.23 1.83-4.09 4.01-4.13.04 2.23-1.83 4.11-4.01 4.13z"></path>
              </svg>
              <span className="text-xs font-semibold text-on-surface">Apple</span>
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
