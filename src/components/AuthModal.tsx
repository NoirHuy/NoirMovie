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
    <div className="modal-overlay">
      <div className="modal-content glass-panel animate-fade-in">
        <button className="modal-close icon-btn" onClick={onClose} disabled={loading}>
          <X size={24} />
        </button>

        <h2 className="modal-title">
          {isRegister ? 'Đăng Ký NoirMovie' : 'Đăng Nhập NoirMovie'}
        </h2>
        <p className="modal-subtitle">
          {isRegister 
            ? 'Đăng ký tài khoản để đồng bộ và lưu lịch sử xem phim.' 
            : 'Đăng nhập để xem lịch sử phim của bạn.'}
        </p>

        {error && (
          <div className="error-message" style={{
            color: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            padding: '10px 14px',
            borderRadius: '6px',
            marginBottom: '16px',
            fontSize: '14px',
            border: '1px solid rgba(239, 68, 68, 0.2)'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="username">Tên đăng nhập</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nhập tên đăng nhập"
              className="auth-input"
              autoFocus
              required
              minLength={3}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Mật khẩu</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu (tối thiểu 6 ký tự)"
              className="auth-input"
              required
              minLength={6}
              disabled={loading}
            />
          </div>

          <button 
            type="submit" 
            className="play-btn" 
            style={{ width: '100%', justifyContent: 'center', gap: '8px' }}
            disabled={loading}
          >
            {loading && <Loader className="animate-spin" size={18} />}
            {isRegister ? 'Đăng Ký' : 'Đăng Nhập'}
          </button>
        </form>

        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px', color: '#a3a3a3' }}>
          {isRegister ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'} {' '}
          <button 
            onClick={handleSwitchMode}
            style={{ 
              color: '#3b82f6', 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer', 
              fontWeight: 500,
              textDecoration: 'underline',
              padding: 0
            }}
            disabled={loading}
          >
            {isRegister ? 'Đăng nhập ngay' : 'Đăng ký ngay'}
          </button>
        </div>
      </div>
    </div>
  );
};
