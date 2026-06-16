import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Clock, Play, Trash2, PlayCircle, Share2, Globe, ChevronDown } from 'lucide-react';

export const History: React.FC = () => {
    const { watchHistory, user, clearHistory } = useAuth();
    const [visibleCount, setVisibleCount] = useState(8);

    const getProgress = (item: any) => {
        const duration = item.duration || 2700; // default to 45 mins if not stored
        const current = item.currentTime || 0;
        return Math.min(Math.round((current / duration) * 100), 100);
    };

    const getRemainingTime = (item: any) => {
        const duration = item.duration || 2700;
        const current = item.currentTime || 0;
        const remaining = Math.max(duration - current, 0);
        
        if (remaining === 0) return 'Đã xem hết';
        
        const hours = Math.floor(remaining / 3600);
        const mins = Math.round((remaining % 3600) / 60);
        
        if (hours > 0) {
            return `${hours}h ${mins}m còn lại`;
        }
        return `${mins}m còn lại`;
    };

    const formatEpisode = (slug?: string) => {
        if (!slug) return 'Phim';
        return slug
            .replace(/-/g, ' ')
            .replace(/\btap\b/gi, 'Tập')
            .replace(/\bfull\b/gi, 'Full')
            .replace(/^\w/, (c) => c.toUpperCase());
    };

    const handleClearAll = async () => {
        if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử xem phim?')) {
            await clearHistory();
        }
    };

    const handleLoadMore = () => {
        setVisibleCount((prev) => prev + 8);
    };

    if (!user) {
        return (
            <div className="min-h-screen bg-background pt-32 pb-20 flex items-center justify-center p-6 text-center">
                <div className="max-w-md glass-card p-8 rounded-2xl">
                    <Clock size={40} className="text-primary mx-auto mb-4" />
                    <h2 className="font-headline text-2xl font-bold text-white mb-2">Lịch Sử Xem Phim</h2>
                    <p className="text-sm text-on-surface-variant/75">Vui lòng đăng nhập để xem những bộ phim bạn đã theo dõi.</p>
                </div>
            </div>
        );
    }

    if (!watchHistory || watchHistory.length === 0) {
        return (
            <div className="min-h-screen bg-background pt-32 pb-20 flex items-center justify-center p-6 text-center">
                <div className="max-w-md glass-card p-8 rounded-2xl">
                    <Clock size={40} className="text-on-surface-variant/50 mx-auto mb-4" />
                    <h2 className="font-headline text-2xl font-bold text-white mb-2">Lịch Sử Trống</h2>
                    <p className="text-sm text-on-surface-variant/75">Bạn chưa xem bộ phim nào gần đây.</p>
                </div>
            </div>
        );
    }

    const featuredItem = watchHistory[0];
    const gridItems = watchHistory.slice(1);

    return (
        <div className="min-h-screen bg-background">
            <main className="pt-32 pb-20 px-6 md:px-container-desktop max-w-[1920px] mx-auto">
                
                {/* Continue Watching Featured Section */}
                <section className="mb-16">
                    <div className="flex items-center justify-between mb-8">
                        <h1 className="font-headline text-2xl md:text-3xl font-bold text-white">Tiếp Tục Xem</h1>
                        <button 
                            onClick={handleClearAll}
                            className="text-xs font-bold text-primary hover:underline transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                            <Trash2 size={13} />
                            Xóa Lịch Sử
                        </button>
                    </div>

                    <div className="relative w-full h-[360px] md:h-[420px] rounded-xl overflow-hidden glass-card group">
                        <img 
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                            src={featuredItem.thumb_url} 
                            alt={featuredItem.name}
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/1920x1080?text=No+Image';
                            }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/25 to-transparent"></div>
                        <div className="absolute inset-0 bg-black/20"></div>
                        
                        <div className="absolute bottom-0 left-0 w-full p-6 md:p-12 z-10">
                            <div className="flex flex-col gap-3 md:gap-4">
                                <div className="flex items-center gap-3">
                                    <span className="px-3 py-1 bg-primary/20 backdrop-blur-md text-primary text-xs font-bold rounded-full border border-primary/30 tracking-wider">
                                        PHIM ĐANG XEM
                                    </span>
                                    <span className="text-white/80 text-xs font-semibold">
                                        {formatEpisode(featuredItem.currentEpisodeSlug)}
                                    </span>
                                </div>
                                <h2 className="font-headline text-3xl md:text-4xl lg:text-5xl font-extrabold text-white leading-tight tracking-tight">
                                    {featuredItem.name}
                                </h2>
                                <p className="text-sm text-on-surface-variant max-w-2xl line-clamp-2 opacity-90 font-medium">
                                    Nhấp vào nút để tiếp tục theo dõi tập phim dang dở của bạn. Tiến trình của bạn sẽ được lưu tự động.
                                </p>
                                
                                <div className="mt-4 flex flex-col gap-3 w-full max-w-md">
                                    <div className="flex justify-between items-end text-xs font-semibold">
                                        <span className="text-on-surface">{getProgress(featuredItem)}% đã xem</span>
                                        <span className="text-on-surface-variant">{getRemainingTime(featuredItem)}</span>
                                    </div>
                                    <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-primary progress-glow rounded-full transition-all duration-300"
                                            style={{ width: `${getProgress(featuredItem)}%` }}
                                        ></div>
                                    </div>
                                    
                                    <Link 
                                        to={`/phim/${featuredItem.slug}`}
                                        className="mt-2 w-fit flex items-center gap-2 bg-primary text-white font-bold text-xs px-6 py-3.5 rounded-lg hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-lg"
                                    >
                                        <Play size={14} fill="currentColor" />
                                        <span>TIẾP TỤC XEM</span>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Recently Watched Grid */}
                {gridItems.length > 0 && (
                    <section>
                        <div className="flex items-center gap-4 mb-8">
                            <h2 className="font-headline text-xl md:text-2xl font-bold text-white">Lịch Sử Xem Khác</h2>
                            <div className="h-[2px] flex-grow bg-white/5"></div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {gridItems.slice(0, visibleCount).map((item) => {
                                const progress = getProgress(item);
                                const remaining = getRemainingTime(item);
                                return (
                                    <Link 
                                        to={`/phim/${item.slug}`} 
                                        key={item._id}
                                        className="flex flex-col glass-card rounded-xl overflow-hidden group cursor-pointer"
                                    >
                                        <div className="relative aspect-video bg-surface-container overflow-hidden">
                                            <img 
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                                                src={item.thumb_url} 
                                                alt={item.name}
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/320x180?text=No+Image';
                                                }}
                                            />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                                <PlayCircle className="text-white transform scale-90 group-hover:scale-100 transition-transform duration-300" size={48} />
                                            </div>
                                            {/* Progress Bar Overlay */}
                                            <div className="absolute bottom-0 left-0 w-full h-1.5 bg-white/20">
                                                <div 
                                                    className="h-full bg-primary progress-glow transition-all duration-300" 
                                                    style={{ width: `${progress}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                        
                                        <div className="p-5 flex flex-col gap-2 flex-grow justify-between">
                                            <div className="flex justify-between items-start gap-2">
                                                <h3 className="text-sm font-bold text-white group-hover:text-primary transition-colors line-clamp-1 flex-grow" title={item.name}>
                                                    {item.name}
                                                </h3>
                                                <span className="text-on-surface-variant text-xs font-semibold shrink-0">{progress}%</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs font-medium text-on-surface-variant/70">
                                                <span>{formatEpisode(item.currentEpisodeSlug)}</span>
                                                <span>{remaining}</span>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>

                        {gridItems.length > visibleCount && (
                            <div className="mt-12 flex justify-center">
                                <button 
                                    onClick={handleLoadMore}
                                    className="px-8 py-3 border border-white/10 hover:border-primary/50 hover:bg-primary/5 rounded-full text-xs font-bold text-on-surface-variant hover:text-on-surface transition-all duration-300 flex items-center gap-2 cursor-pointer"
                                >
                                    TẢI THÊM LỊCH SỬ
                                    <ChevronDown size={14} />
                                </button>
                            </div>
                        )}
                    </section>
                )}
            </main>

            {/* Footer */}
            <footer className="w-full py-12 bg-[#0e0e10] border-t border-white/5 flex flex-col md:flex-row justify-between items-center px-6 md:px-container-desktop gap-8 text-xs font-semibold text-on-secondary-container/60">
                <div className="flex flex-col gap-2 text-center md:text-left">
                    <span className="font-headline text-lg font-bold text-primary tracking-tighter">CINEOS</span>
                    <p>© 2026 CINEOS Streaming. All rights reserved.</p>
                </div>
                <div className="flex flex-wrap justify-center gap-6 md:gap-8">
                    <a className="hover:text-primary transition-colors" href="#">Privacy Policy</a>
                    <a className="hover:text-primary transition-colors" href="#">Terms of Service</a>
                    <a className="hover:text-primary transition-colors" href="#">Help Center</a>
                    <a className="hover:text-primary transition-colors" href="#">Contact Us</a>
                    <a className="hover:text-primary transition-colors" href="#">Press</a>
                </div>
                <div className="flex gap-4">
                    <button className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-primary/20 hover:text-primary transition-all cursor-pointer">
                        <Share2 size={16} />
                    </button>
                    <button className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-primary/20 hover:text-primary transition-all cursor-pointer">
                        <Globe size={16} />
                    </button>
                </div>
            </footer>
        </div>
    );
};
