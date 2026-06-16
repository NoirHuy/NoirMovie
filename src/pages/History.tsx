import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Clock, Play, RotateCcw } from 'lucide-react';

export const History: React.FC = () => {
    const { watchHistory, user } = useAuth();

    const formatTime = (seconds?: number) => {
        if (seconds === undefined || seconds === 0) return '00:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const formatEpisode = (slug?: string) => {
        if (!slug) return '';
        // E.g., "tap-05" -> "Tập 05" or "tap-1" -> "Tập 1"
        return slug
            .replace(/-/g, ' ')
            .replace(/\btap\b/gi, 'Tập')
            .replace(/\bfull\b/gi, 'Full')
            .replace(/^\w/, (c) => c.toUpperCase());
    };

    if (!user) {
        return (
            <div className="min-h-screen bg-background pt-28 pb-20 flex items-center justify-center p-6 text-center">
                <div className="max-w-md glass-panel p-8 rounded-2xl">
                    <Clock size={40} className="text-primary mx-auto mb-4" />
                    <h2 className="font-headline text-2xl font-bold text-white mb-2">Lịch Sử Xem Phim</h2>
                    <p className="text-sm text-on-surface-variant/75">Vui lòng đăng nhập để xem những bộ phim bạn đã theo dõi.</p>
                </div>
            </div>
        );
    }

    if (!watchHistory || watchHistory.length === 0) {
        return (
            <div className="min-h-screen bg-background pt-28 pb-20 flex items-center justify-center p-6 text-center">
                <div className="max-w-md glass-panel p-8 rounded-2xl">
                    <Clock size={40} className="text-on-surface-variant/50 mx-auto mb-4" />
                    <h2 className="font-headline text-2xl font-bold text-white mb-2">Lịch Sử Trống</h2>
                    <p className="text-sm text-on-surface-variant/75">Bạn chưa xem bộ phim nào gần đây.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-12 pt-28">
            {/* Header */}
            <div className="max-w-[1920px] mx-auto px-6 md:px-container-desktop mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <Clock size={28} className="text-primary" />
                    <h2 className="font-headline text-2xl md:text-3xl font-bold text-white m-0">Lịch sử xem phim</h2>
                </div>
                <p className="text-sm text-on-surface-variant/75">
                    Lịch sử xem phim của tài khoản <strong>{user.username}</strong>
                </p>
            </div>

            {/* List */}
            <div className="max-w-[1920px] mx-auto px-6 md:px-container-desktop">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                    {watchHistory.map((item) => (
                        <Link 
                            to={`/phim/${item.slug}`} 
                            key={item._id} 
                            className="group cursor-pointer block"
                        >
                            {/* Card Image Container */}
                            <div className="aspect-[2/3] rounded-xl overflow-hidden mb-3 relative ring-1 ring-white/5 bg-surface-container transition-all duration-300 group-hover:scale-[1.03] group-hover:ring-primary/40 group-hover:shadow-[0_0_20px_rgba(255,84,81,0.2)]">
                                <img
                                    src={item.thumb_url}
                                    alt={item.name}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    loading="lazy"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/220x330?text=No+Image';
                                    }}
                                />
                                {/* Hover Play overlay */}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                    <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-300">
                                        <Play fill="currentColor" size={20} className="ml-1" />
                                    </div>
                                </div>
                            </div>

                            {/* Card Details */}
                            <div className="px-1">
                                <h3 
                                    className="text-sm font-bold text-white group-hover:text-primary transition-colors truncate" 
                                    title={item.name}
                                >
                                    {item.name}
                                </h3>
                                
                                {item.currentEpisodeSlug && (
                                    <div className="flex items-center gap-1 text-[11px] text-primary mt-1 font-semibold">
                                        <RotateCcw size={10} />
                                        <span>
                                            {formatEpisode(item.currentEpisodeSlug)} 
                                            {item.currentTime && item.currentTime > 0 ? ` (${formatTime(item.currentTime)})` : ''}
                                        </span>
                                    </div>
                                )}
                                <p className="text-[11px] text-on-surface-variant/60 mt-0.5 font-medium">
                                    {item.year ? `${item.year}` : 'Đã xem gần đây'}
                                </p>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
};
