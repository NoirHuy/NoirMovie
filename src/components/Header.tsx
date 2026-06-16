import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ChevronDown, LogOut, History, User, Menu, X, Globe, Library, Crown, Bookmark, Sun, Moon } from 'lucide-react';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { AuthModal } from './AuthModal';

export const Header: React.FC = () => {
    const navigate = useNavigate();
    const [keyword, setKeyword] = useState('');
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

    const [categories, setCategories] = useState([]);
    const [countries, setCountries] = useState([]);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    
    // Toggle states for mobile and profile dropdowns
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const { user, logout, watchlist } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const watchlistCount = watchlist.length;

    // Event listener for opening auth modal from other pages (e.g. ProfilePage)
    useEffect(() => {
        const handleTriggerLogin = () => {
            setIsAuthModalOpen(true);
        };
        window.addEventListener('trigger-login-modal', handleTriggerLogin);
        return () => {
            window.removeEventListener('trigger-login-modal', handleTriggerLogin);
        };
    }, []);

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

    // Debounce autocomplete search suggestions
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            const trimmed = keyword.trim();
            if (trimmed.length >= 2) {
                try {
                    const data = await apiService.searchMovies(trimmed);
                    if (data.status === 'success' && data.data && data.data.items) {
                        setSuggestions(data.data.items.slice(0, 5));
                        setShowSuggestions(true);
                    } else {
                        setSuggestions([]);
                    }
                } catch (error) {
                    console.error('Failed to fetch suggestions', error);
                    setSuggestions([]);
                }
            } else {
                setSuggestions([]);
                setShowSuggestions(false);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [keyword]);

    // Handle clicking outside of dropdowns to close them
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest('.search-box-container')) {
                setShowSuggestions(false);
            }
            if (!target.closest('.profile-menu-container')) {
                setIsProfileOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (keyword.trim()) {
            navigate(`/tim-kiem?keyword=${encodeURIComponent(keyword)}`);
            setKeyword('');
            setShowSuggestions(false);
            setIsMobileMenuOpen(false);
        }
    };

    const handleLogout = () => {
        logout();
        setIsProfileOpen(false);
        setIsMobileMenuOpen(false);
        navigate('/');
    };

    const getThumbUrl = (url: string) => {
        if (!url) return 'https://via.placeholder.com/120x180?text=No+Image';
        if (url.startsWith('http')) return url;
        return `https://img.ophim.live/uploads/movies/${url}`;
    };

    return (
        <>
            <header className="fixed top-0 left-0 w-full z-50 bg-[#09090b]/80 backdrop-blur-[30px] border-b border-white/10 h-20 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
                <div className="h-full max-w-[1920px] mx-auto flex justify-between items-center px-6 md:px-container-desktop">
                    
                    {/* Left: Logo and Nav Menu */}
                    <div className="flex items-center gap-12">
                        <Link 
                            to="/" 
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="font-headline text-2xl font-bold text-primary tracking-tighter hover:scale-105 transition-transform duration-300"
                        >
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

                    {/* Right: Search Box, User Auth, Hamburger */}
                    <div className="flex items-center gap-3">
                        {/* Search bar with Autocomplete (hidden on mobile, drawer has its own) */}
                        <form onSubmit={handleSearch} className="search-box-container relative hidden md:flex items-center bg-surface-container rounded-full px-4 py-1.5 border border-white/10 group focus-within:border-primary transition-colors">
                            <input
                                type="text"
                                placeholder="Tìm kiếm phim..."
                                className="bg-transparent border-none outline-none text-sm placeholder:text-on-surface-variant/50 w-48 text-on-surface focus:ring-0 p-0"
                                value={keyword}
                                onChange={(e) => setKeyword(e.target.value)}
                                onFocus={() => {
                                    if (keyword.trim().length >= 2 && suggestions.length > 0) {
                                        setShowSuggestions(true);
                                    }
                                }}
                            />
                            <button type="submit" className="text-on-surface-variant group-focus-within:text-primary hover:text-primary transition-colors cursor-pointer ml-2">
                                <Search size={18} />
                            </button>

                            {/* Autocomplete suggestions */}
                            {showSuggestions && suggestions.length > 0 && (
                                <div className="absolute top-full right-0 mt-3 w-80 glass-panel rounded-2xl border border-white/10 shadow-2xl p-4 z-50 text-left flex flex-col gap-3 animate-fade-in-scale">
                                    <div className="text-[10px] uppercase tracking-widest text-on-surface-variant/50 font-bold px-1">
                                        Danh sách phim gợi ý
                                    </div>
                                    <div className="flex flex-col gap-1 max-h-[300px] overflow-y-auto custom-scrollbar">
                                        {suggestions.map((movie) => (
                                            <div 
                                                key={movie._id}
                                                onClick={() => {
                                                    navigate(`/phim/${movie.slug}`);
                                                    setShowSuggestions(false);
                                                    setKeyword('');
                                                }}
                                                className="flex items-center gap-3 hover:bg-primary/10 p-1.5 rounded-xl transition-all cursor-pointer group"
                                            >
                                                <img 
                                                    src={getThumbUrl(movie.thumb_url)} 
                                                    alt={movie.name}
                                                    className="w-10 h-14 object-cover rounded-lg bg-surface-container-high flex-shrink-0"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/120x180?text=No+Image';
                                                    }}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-xs font-bold text-white group-hover:text-primary transition-colors truncate">
                                                        {movie.name}
                                                    </div>
                                                    <div className="text-[10px] text-on-surface-variant/70 truncate">
                                                        {movie.origin_name}
                                                    </div>
                                                    <div className="text-[9px] text-on-surface-variant/50 mt-0.5 font-medium">
                                                        {movie.year} • {movie.episode_current || 'HD'}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </form>

                        {/* Theme Toggle Button */}
                        <button
                            onClick={toggleTheme}
                            title={theme === 'dark' ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
                            className="hidden md:flex w-9 h-9 rounded-full items-center justify-center bg-surface-container border border-white/10 hover:border-primary/30 hover:text-primary text-on-surface-variant transition-all cursor-pointer"
                        >
                            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                        </button>

                        {/* Watchlist Button (logged-in users only) */}
                        {user && (
                            <Link
                                to="/danh-sach-yeu-thich"
                                title="Danh sách yêu thích"
                                className="hidden md:flex relative w-9 h-9 rounded-full items-center justify-center bg-surface-container border border-white/10 hover:border-primary/30 hover:text-primary text-on-surface-variant transition-all"
                            >
                                <Bookmark size={16} />
                                {watchlistCount > 0 && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full text-white text-[9px] font-bold flex items-center justify-center">
                                        {watchlistCount > 9 ? '9+' : watchlistCount}
                                    </span>
                                )}
                            </Link>
                        )}

                        {/* User action (responsive, click toggle for mobile compatibility) */}
                        {user ? (
                            <div className="relative profile-menu-container">
                                <button 
                                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold hover:scale-105 active:scale-95 transition-all cursor-pointer overflow-hidden border ${
                                        user.subscription?.plan === 'VIP' ? 'border-amber-500 bg-amber-500/20 text-amber-400 ring-2 ring-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.4)]' :
                                        user.subscription?.plan === 'Standard' ? 'border-blue-500 bg-blue-500/20 text-blue-400 ring-2 ring-blue-500/40 shadow-[0_0_12px_rgba(59,130,246,0.4)]' :
                                        'bg-primary/20 border-primary/20 text-primary'
                                    }`}
                                >
                                    {user.avatar ? (
                                        <img 
                                            src={user.avatar} 
                                            alt={user.username} 
                                            className="w-full h-full object-cover" 
                                            referrerPolicy="no-referrer"
                                        />
                                    ) : (
                                        user.username.charAt(0).toUpperCase()
                                    )}
                                </button>
                                {isProfileOpen && (
                                    <div className="absolute top-full right-0 mt-3 flex flex-col w-48 glass-panel p-2 rounded-xl shadow-2xl border border-white/10 z-50 animate-fade-in-scale">
                                        <div className="border-b border-white/5 pb-2 mb-1 px-3 py-1.5 flex flex-col">
                                            <small className="text-[10px] text-on-surface-variant/50 block">Xin chào,</small>
                                            <span className="font-semibold text-sm text-on-surface truncate block">{user.name || user.username}</span>
                                            {user.subscription?.plan !== 'Free' ? (
                                                <span className={`text-[8px] font-headline font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border mt-1 text-center w-max ${
                                                    user.subscription?.plan === 'VIP' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                                }`}>
                                                    {user.subscription?.plan}
                                                </span>
                                            ) : (
                                                <span className="text-[8px] font-headline font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-zinc-700 bg-zinc-800/10 text-zinc-400 mt-1 text-center w-max">
                                                    GÓI FREE
                                                </span>
                                            )}
                                        </div>
                                        <Link 
                                            to="/ho-so" 
                                            onClick={() => setIsProfileOpen(false)}
                                            className="flex items-center gap-2 text-sm py-2 px-3 rounded-lg text-on-surface-variant hover:bg-primary/10 hover:text-primary transition-all"
                                        >
                                            <User size={16} /> Hồ sơ cá nhân
                                        </Link>
                                        <Link 
                                            to="/premium" 
                                            onClick={() => setIsProfileOpen(false)}
                                            className="flex items-center gap-2 text-sm py-2 px-3 rounded-lg text-on-surface-variant hover:bg-primary/10 hover:text-primary transition-all font-semibold"
                                        >
                                            <Crown size={16} className={user.subscription?.plan === 'VIP' ? 'text-amber-400' : 'text-primary'} /> Nâng cấp Premium
                                        </Link>
                                        <Link 
                                            to="/lich-su" 
                                            onClick={() => setIsProfileOpen(false)}
                                            className="flex items-center gap-2 text-sm py-2 px-3 rounded-lg text-on-surface-variant hover:bg-primary/10 hover:text-primary transition-all"
                                        >
                                            <History size={16} /> Lịch sử xem
                                        </Link>
                                        <Link 
                                            to="/danh-sach-yeu-thich" 
                                            onClick={() => setIsProfileOpen(false)}
                                            className="flex items-center gap-2 text-sm py-2 px-3 rounded-lg text-on-surface-variant hover:bg-primary/10 hover:text-primary transition-all"
                                        >
                                            <Bookmark size={16} /> Danh sách yêu thích
                                            {watchlistCount > 0 && (
                                                <span className="ml-auto px-1.5 py-0.5 bg-primary/20 text-primary text-[9px] font-bold rounded-full">{watchlistCount}</span>
                                            )}
                                        </Link>
                                        <button 
                                            onClick={handleLogout} 
                                            className="w-full flex items-center gap-2 text-left text-sm py-2 px-3 rounded-lg text-on-surface-variant hover:bg-primary/10 hover:text-primary transition-all cursor-pointer bg-transparent border-none outline-none"
                                        >
                                            <LogOut size={16} /> Đăng xuất
                                        </button>
                                    </div>
                                )}
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

                        {/* Hamburger menu for Mobile / Tablet */}
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="lg:hidden text-on-surface-variant hover:text-white transition-colors cursor-pointer p-1"
                            aria-label="Toggle Menu"
                        >
                            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>
            </header>

            {/* Mobile Menu Drawer Overlay - Rendered outside header at root level with z-[9999] */}
            {isMobileMenuOpen && (
                <div className="fixed inset-x-0 top-20 bottom-0 z-[9999] bg-[#09090b] border-t border-white/5 lg:hidden flex flex-col p-6 overflow-y-auto animate-[fadeInScale_0.3s_ease]">
                    
                    {/* Search bar inside drawer */}
                    <form onSubmit={handleSearch} className="relative w-full mb-8 flex items-center bg-surface-container rounded-full px-5 py-3.5 border border-white/10 group focus-within:border-primary transition-colors">
                        <input
                            type="text"
                            placeholder="Tìm kiếm phim..."
                            className="bg-transparent border-none outline-none text-sm placeholder:text-on-surface-variant/50 w-full text-on-surface focus:ring-0 p-0"
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                        />
                        <button type="submit" className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer">
                            <Search size={20} />
                        </button>
                    </form>

                    {/* Mobile Links Stack */}
                    <div className="flex flex-col gap-6">
                        <Link 
                            to="/" 
                            className="text-base font-bold text-on-surface hover:text-primary transition-colors flex items-center gap-3 border-b border-white/5 pb-3"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            Trang chủ
                        </Link>

                        {user ? (
                            <>
                                <Link 
                                    to="/lich-su" 
                                    className="text-base font-bold text-on-surface hover:text-primary transition-colors flex items-center gap-3 border-b border-white/5 pb-3"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    Lịch sử xem phim
                                </Link>
                                <Link 
                                    to="/danh-sach-yeu-thich" 
                                    className="text-base font-bold text-on-surface hover:text-primary transition-colors flex items-center gap-3 border-b border-white/5 pb-3"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    <Bookmark size={18} className="text-primary" />
                                    Danh sách yêu thích
                                    {watchlistCount > 0 && (
                                        <span className="ml-auto px-2 py-0.5 bg-primary/20 text-primary text-xs font-bold rounded-full">{watchlistCount}</span>
                                    )}
                                </Link>
                            </>
                        ) : (
                            <button 
                                onClick={() => {
                                    setIsMobileMenuOpen(false);
                                    setIsAuthModalOpen(true);
                                }}
                                className="text-base font-bold text-left text-on-surface hover:text-primary transition-colors flex items-center gap-3 bg-transparent border-none outline-none cursor-pointer border-b border-white/5 pb-3"
                            >
                                Đăng nhập tài khoản
                            </button>
                        )}

                        {/* Section: Phim Bộ */}
                        <div className="space-y-3">
                            <div className="text-xs font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5 opacity-55">
                                <Library size={12} /> Phim Bộ
                            </div>
                            <div className="flex flex-col gap-2 pl-3">
                                <Link to="/danh-sach/phim-bo" className="text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors" onClick={() => setIsMobileMenuOpen(false)}>Tất cả phim bộ</Link>
                                <Link to="/danh-sach/phim-dang-chieu" className="text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors" onClick={() => setIsMobileMenuOpen(false)}>Phim đang chiếu</Link>
                                <Link to="/danh-sach/phim-hoan-thanh" className="text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors" onClick={() => setIsMobileMenuOpen(false)}>Phim đã hoàn thành</Link>
                            </div>
                        </div>

                        {/* Section: Thể Loại */}
                        <div className="space-y-3 pt-3 border-t border-white/5">
                            <div className="text-xs font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5 opacity-55">
                                <Library size={12} /> Thể Loại
                            </div>
                            <div className="grid grid-cols-2 gap-2.5 pl-3">
                                {categories.slice(0, 16).map((c: any) => (
                                    <Link 
                                        key={c._id} 
                                        to={`/the-loai/${c.slug}`} 
                                        className="text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors truncate"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        {c.name}
                                    </Link>
                                ))}
                            </div>
                        </div>

                        {/* Section: Quốc Gia */}
                        <div className="space-y-3 pt-3 border-t border-white/5">
                            <div className="text-xs font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5 opacity-55">
                                <Globe size={12} /> Quốc Gia
                            </div>
                            <div className="grid grid-cols-2 gap-2.5 pl-3">
                                {countries.slice(0, 16).map((c: any) => (
                                    <Link 
                                        key={c._id} 
                                        to={`/quoc-gia/${c.slug}`} 
                                        className="text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors truncate"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        {c.name}
                                    </Link>
                                ))}
                            </div>
                        </div>

                        {/* Active User details & logout */}
                        {user && (
                            <div className="pt-6 border-t border-white/5 flex flex-col gap-3">
                                <div className="px-4 py-3 bg-white/5 rounded-xl border border-white/5 flex items-center gap-3">
                                    {user.avatar ? (
                                        <img 
                                            src={user.avatar} 
                                            alt={user.username} 
                                            className={`w-10 h-10 rounded-full object-cover border ${
                                                user.subscription?.plan === 'VIP' ? 'border-amber-500' :
                                                user.subscription?.plan === 'Standard' ? 'border-blue-500' :
                                                'border-primary/20'
                                            }`} 
                                            referrerPolicy="no-referrer"
                                        />
                                    ) : (
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                                            user.subscription?.plan === 'VIP' ? 'bg-amber-500/20 border border-amber-500 text-amber-400' :
                                            user.subscription?.plan === 'Standard' ? 'bg-blue-500/20 border border-blue-500 text-blue-400' :
                                            'bg-primary/20 border border-primary/20 text-primary'
                                        }`}>
                                            {user.username.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-bold text-sm text-primary truncate block">{user.name || user.username}</span>
                                            {user.subscription?.plan !== 'Free' && (
                                                <span className={`text-[8px] font-headline font-bold uppercase tracking-wider px-1 rounded border ${
                                                    user.subscription?.plan === 'VIP' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                                }`}>
                                                    {user.subscription?.plan}
                                                </span>
                                            )}
                                        </div>
                                        <small className="text-[10px] text-on-surface-variant/40 block mt-0.5">@{user.username}</small>
                                    </div>
                                </div>
                                <Link 
                                    to="/ho-so" 
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="w-full bg-white/5 border border-white/10 hover:bg-white/10 py-3 rounded-xl font-bold text-sm transition-colors text-center text-white flex items-center justify-center gap-2"
                                >
                                    <User size={16} /> Hồ Sơ Cá Nhân
                                </Link>
                                <Link 
                                    to="/premium" 
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="w-full bg-gradient-to-r from-amber-500 to-yellow-600 text-black hover:brightness-110 py-3 rounded-xl font-headline font-black text-sm transition-colors text-center flex items-center justify-center gap-2"
                                >
                                    <Crown size={16} /> Nâng Cấp Premium
                                </Link>
                                <button 
                                    onClick={handleLogout}
                                    className="w-full bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 py-3 rounded-xl font-bold text-sm transition-colors cursor-pointer text-center"
                                >
                                    Đăng Xuất
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <AuthModal
                isOpen={isAuthModalOpen}
                onClose={() => setIsAuthModalOpen(false)}
            />
        </>
    );
};
