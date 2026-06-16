import React, { useState } from 'react';
import { X, Loader } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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

    try {
      if (isRegister) {
        await register(trimmedUsername, password);
      } else {
        await login(trimmedUsername, password);
      }
      // Reset form and close
      setUsername('');
      setPassword('');
      setError(null);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra, vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchMode = () => {
    setIsRegister(!isRegister);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      {/* Modal Card */}
      <div className="w-full max-w-md glass-panel p-8 rounded-2xl relative shadow-2xl animate-fade-in">
        
        {/* Close Button */}
        <button 
          className="absolute top-4 right-4 text-on-surface-variant hover:text-white transition-colors cursor-pointer disabled:opacity-50" 
          onClick={onClose} 
          disabled={loading}
        >
          <X size={20} />
        </button>

        {/* Header */}
        <h2 className="font-headline text-2xl font-bold text-white text-center mb-1">
          {isRegister ? 'Đăng Ký NoirMovie' : 'Đăng Nhập NoirMovie'}
        </h2>
        <p className="text-xs text-on-surface-variant/75 text-center mb-6 leading-relaxed">
          {isRegister 
            ? 'Đăng ký tài khoản để đồng bộ và lưu lịch sử xem phim.' 
            : 'Đăng nhập để xem lịch sử phim của bạn.'}
        </p>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm px-4 py-2.5 rounded-xl mb-6 animate-pulse">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="username" className="text-[10px] font-bold text-primary uppercase tracking-widest">
              Tên đăng nhập
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nhập tên đăng nhập"
              className="w-full bg-surface-container border border-white/5 rounded-xl px-4 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-on-surface"
              autoFocus
              required
              minLength={3}
              disabled={loading}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-[10px] font-bold text-primary uppercase tracking-widest">
              Mật khẩu
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu (tối thiểu 6 ký tự)"
              className="w-full bg-surface-container border border-white/5 rounded-xl px-4 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-on-surface"
              required
              minLength={6}
              disabled={loading}
            />
          </div>

          <button 
            type="submit" 
            className="w-full bg-primary text-white py-3 rounded-xl font-bold text-sm hover:bg-primary/95 transition-all shadow-[0_0_15px_rgba(255,84,81,0.4)] hover:shadow-[0_0_25px_rgba(255,84,81,0.6)] flex items-center justify-center gap-2 cursor-pointer mt-6 active:scale-95 disabled:opacity-50"
            disabled={loading}
          >
            {loading && <Loader className="animate-spin" size={16} />}
            <span>{isRegister ? 'ĐĂNG KÝ' : 'ĐĂNG NHẬP'}</span>
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="mt-6 text-center text-sm text-on-surface-variant/70">
          {isRegister ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}{' '}
          <button 
            onClick={handleSwitchMode}
            className="text-primary font-bold hover:underline cursor-pointer bg-transparent border-none p-0 focus:outline-none"
            disabled={loading}
          >
            {isRegister ? 'Đăng nhập ngay' : 'Đăng ký ngay'}
          </button>
        </div>

      </div>
    </div>
  );
};
