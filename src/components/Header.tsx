import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ChevronDown, LogOut, History, UserCircle } from 'lucide-react';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { AuthModal } from './AuthModal';

export const Header: React.FC = () => {
    const navigate = useNavigate();
    const [keyword, setKeyword] = useState('');
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

    const [categories, setCategories] = useState([]);
    const [countries, setCountries] = useState([]);

    const { user, logout } = useAuth();

    useEffect(() => {
        const fetchNavData = async () => {
            try {
                const catRes = await apiService.getCategories();
                const countryRes = await apiService.getCountries();

                if (catRes.status === 'success') {
                    setCategories(catRes.data.items || []);
                }
                if (countryRes.status === 'success') {
                    setCountries(countryRes.data.items || []);
                }
            } catch (error) {
                console.error('Failed to fetch nav data', error);
            }
        };
        fetchNavData();
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (keyword.trim()) {
            navigate(`/tim-kiem?keyword=${encodeURIComponent(keyword)}`);
            setKeyword('');
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <>
            <header className="header glass-panel">
                <div className="header-content container">
                    <Link to="/" className="logo-container">
                        <span className="logo-text">Noir<span className="logo-highlight">Movie</span></span>
                    </Link>

                    <nav className="header-nav">
                        <Link to="/" className="nav-link">Trang chủ</Link>

                        <div className="nav-dropdown">
                            <span className="nav-link">
                                Phim Bộ <ChevronDown size={14} style={{ display: 'inline', marginLeft: 4 }} />
                            </span>
                            <div className="dropdown-menu glass-panel">
                                <Link to="/danh-sach/phim-bo" className="dropdown-item">Tất cả phim bộ</Link>
                                <Link to="/danh-sach/phim-dang-chieu" className="dropdown-item">Phim đang chiếu</Link>
                                <Link to="/danh-sach/phim-hoan-thanh" className="dropdown-item">Phim đã hoàn thành</Link>
                            </div>
                        </div>

                        <div className="nav-dropdown">
                            <span className="nav-link">
                                Thể Loại <ChevronDown size={14} style={{ display: 'inline', marginLeft: 4 }} />
                            </span>
                            <div className="dropdown-menu glass-panel grid-menu">
                                {categories.slice(0, 16).map((c: any) => (
                                    <Link key={c._id} to={`/the-loai/${c.slug}`} className="dropdown-item">{c.name}</Link>
                                ))}
                            </div>
                        </div>

                        <div className="nav-dropdown">
                            <span className="nav-link">
                                Quốc Gia <ChevronDown size={14} style={{ display: 'inline', marginLeft: 4 }} />
                            </span>
                            <div className="dropdown-menu glass-panel grid-menu">
                                {countries.slice(0, 16).map((c: any) => (
                                    <Link key={c._id} to={`/quoc-gia/${c.slug}`} className="dropdown-item">{c.name}</Link>
                                ))}
                            </div>
                        </div>

                    </nav>

                    <div className="header-actions">
                        <form onSubmit={handleSearch} className="search-box">
                            <input
                                type="text"
                                placeholder="Tìm kiếm phim..."
                                className="search-input"
                                value={keyword}
                                onChange={(e) => setKeyword(e.target.value)}
                            />
                            <button type="submit" className="icon-btn search-btn" aria-label="Search">
                                <Search size={18} />
                            </button>
                        </form>

                        {user ? (
                            <div className="nav-dropdown">
                                <button className="icon-btn profile-btn" style={{ fontWeight: '600' }}>
                                    {user.username.charAt(0).toUpperCase()}
                                </button>
                                <div className="dropdown-menu glass-panel" style={{ left: 'auto', right: 0, minWidth: '150px' }}>
                                    <div className="dropdown-item" style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem', marginBottom: '0.25rem' }}>
                                        <small className="text-muted">Xin chào,</small>
                                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user.username}</div>
                                    </div>
                                    <Link to="/lich-su" className="dropdown-item" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <History size={16} /> Lịch sử xem
                                    </Link>
                                    <button onClick={handleLogout} className="dropdown-item" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', textAlign: 'left' }}>
                                        <LogOut size={16} /> Đăng xuất
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button className="icon-btn" aria-label="Login" onClick={() => setIsAuthModalOpen(true)} title="Đăng nhập">
                                <UserCircle size={28} />
                            </button>
                        )}

                    </div>
                </div>
            </header>

            <AuthModal
                isOpen={isAuthModalOpen}
                onClose={() => setIsAuthModalOpen(false)}
            />
        </>
    );
};
