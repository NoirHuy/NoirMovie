import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ChevronDown, LogOut, History, User } from 'lucide-react';
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
            <header className="fixed top-0 left-0 w-full z-50 bg-background/60 backdrop-blur-[30px] border-b border-white/10 h-20 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
                <div className="h-full max-w-[1920px] mx-auto flex justify-between items-center px-6 md:px-container-desktop">
                    
                    {/* Left: Logo and Nav Menu */}
                    <div className="flex items-center gap-12">
                        <Link to="/" className="font-headline text-2xl font-bold text-primary tracking-tighter hover:scale-105 transition-transform duration-300">
                            Noir<span className="text-white">Movie</span>
                        </Link>
                        
                        <nav className="hidden lg:flex items-center gap-8">
                            <Link to="/" className="text-sm font-semibold text-on-surface hover:text-primary transition-colors">
                                Trang chủ
                            </Link>

                            {/* Dropdown Phim Bộ */}
                            <div className="relative group py-6">
                                <span className="text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors flex items-center gap-1 cursor-pointer">
                                    Phim Bộ <ChevronDown size={14} />
                                </span>
                                <div className="absolute top-full left-0 hidden group-hover:flex flex-col w-48 glass-panel p-2 rounded-xl shadow-2xl animate-fade-in border border-white/10 z-50">
                                    <Link to="/danh-sach/phim-bo" className="w-full text-left text-sm py-2 px-3 rounded-lg text-on-surface-variant hover:bg-primary/10 hover:text-primary transition-all">Tất cả phim bộ</Link>
                                    <Link to="/danh-sach/phim-dang-chieu" className="w-full text-left text-sm py-2 px-3 rounded-lg text-on-surface-variant hover:bg-primary/10 hover:text-primary transition-all">Phim đang chiếu</Link>
                                    <Link to="/danh-sach/phim-hoan-thanh" className="w-full text-left text-sm py-2 px-3 rounded-lg text-on-surface-variant hover:bg-primary/10 hover:text-primary transition-all">Phim đã hoàn thành</Link>
                                </div>
                            </div>

                            {/* Dropdown Thể Loại */}
                            <div className="relative group py-6">
                                <span className="text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors flex items-center gap-1 cursor-pointer">
                                    Thể Loại <ChevronDown size={14} />
                                </span>
                                <div className="absolute top-full left-0 hidden group-hover:grid grid-cols-2 w-80 glass-panel p-3 rounded-xl shadow-2xl border border-white/10 z-50 gap-1">
                                    {categories.slice(0, 16).map((c: any) => (
                                        <Link key={c._id} to={`/the-loai/${c.slug}`} className="text-sm py-1.5 px-3 rounded-lg text-on-surface-variant hover:bg-primary/10 hover:text-primary transition-all truncate">
                                            {c.name}
                                        </Link>
                                    ))}
                                </div>
                            </div>

                            {/* Dropdown Quốc Gia */}
                            <div className="relative group py-6">
                                <span className="text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors flex items-center gap-1 cursor-pointer">
                                    Quốc Gia <ChevronDown size={14} />
                                </span>
                                <div className="absolute top-full left-0 hidden group-hover:grid grid-cols-2 w-80 glass-panel p-3 rounded-xl shadow-2xl border border-white/10 z-50 gap-1">
                                    {countries.slice(0, 16).map((c: any) => (
                                        <Link key={c._id} to={`/quoc-gia/${c.slug}`} className="text-sm py-1.5 px-3 rounded-lg text-on-surface-variant hover:bg-primary/10 hover:text-primary transition-all truncate">
                                            {c.name}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </nav>
                    </div>

                    {/* Right: Search Box, Notifications, User Auth */}
                    <div className="flex items-center gap-6">
                        {/* Search bar */}
                        <form onSubmit={handleSearch} className="hidden md:flex items-center bg-surface-container rounded-full px-4 py-1.5 border border-white/10 group focus-within:border-primary transition-colors">
                            <input
                                type="text"
                                placeholder="Tìm kiếm phim..."
                                className="bg-transparent border-none outline-none text-sm placeholder:text-on-surface-variant/50 w-48 text-on-surface focus:ring-0 p-0"
                                value={keyword}
                                onChange={(e) => setKeyword(e.target.value)}
                            />
                            <button type="submit" className="text-on-surface-variant group-focus-within:text-primary hover:text-primary transition-colors cursor-pointer ml-2">
                                <Search size={18} />
                            </button>
                        </form>

                        {/* User action */}
                        {user ? (
                            <div className="relative group py-4">
                                <button className="w-10 h-10 rounded-full flex items-center justify-center bg-primary/20 border border-primary/20 text-primary font-bold hover:scale-105 transition-transform cursor-pointer">
                                    {user.username.charAt(0).toUpperCase()}
                                </button>
                                <div className="absolute top-full right-0 hidden group-hover:flex flex-col w-48 glass-panel p-2 rounded-xl shadow-2xl border border-white/10 z-50">
                                    <div className="border-b border-white/5 pb-2 mb-1 px-3 py-1.5">
                                        <small className="text-xs text-on-surface-variant/50 block">Xin chào,</small>
                                        <span className="font-semibold text-sm text-on-surface truncate block">{user.username}</span>
                                    </div>
                                    <Link to="/lich-su" className="flex items-center gap-2 text-sm py-2 px-3 rounded-lg text-on-surface-variant hover:bg-primary/10 hover:text-primary transition-all">
                                        <History size={16} /> Lịch sử xem
                                    </Link>
                                    <button onClick={handleLogout} className="w-full flex items-center gap-2 text-left text-sm py-2 px-3 rounded-lg text-on-surface-variant hover:bg-primary/10 hover:text-primary transition-all cursor-pointer">
                                        <LogOut size={16} /> Đăng xuất
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button 
                                onClick={() => setIsAuthModalOpen(true)} 
                                className="w-10 h-10 rounded-full flex items-center justify-center bg-surface-container border border-white/10 text-on-surface-variant hover:text-primary hover:border-primary/20 transition-all cursor-pointer"
                                title="Đăng nhập"
                            >
                                <User size={20} />
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
