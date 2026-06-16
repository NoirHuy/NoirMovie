import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
    const [username, setUsername] = useState('');
    const { login } = useAuth();

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (username.trim().length >= 3) {
            login(username.trim());
            onClose();
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content glass-panel animate-fade-in">
                <button className="modal-close icon-btn" onClick={onClose}>
                    <X size={24} />
                </button>

                <h2 className="modal-title">Đăng Nhập NoirMovie</h2>
                <p className="modal-subtitle">Nhập một tên hiển thị để lưu lại lịch sử phim của bạn.</p>

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label htmlFor="username">Tên hiển thị</label>
                        <input
                            type="text"
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Ví dụ: JohnDoe"
                            className="auth-input"
                            autoFocus
                            required
                            minLength={3}
                        />
                    </div>

                    <button type="submit" className="play-btn" style={{ width: '100%', justifyContent: 'center' }}>
                        Bắt Đầu Xem Lịch Sử
                    </button>
                </form>
            </div>
        </div>
    );
};
