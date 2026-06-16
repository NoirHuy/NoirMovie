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
            <div className="container" style={{ paddingTop: '4rem', textAlign: 'center' }}>
                <h2 className="text-2xl font-bold mb-4">Lịch Sử Xem Phim</h2>
                <p className="text-muted">Vui lòng đăng nhập để xem những bộ phim bạn đã theo dõi.</p>
            </div>
        );
    }

    if (!watchHistory || watchHistory.length === 0) {
        return (
            <div className="container" style={{ paddingTop: '4rem', textAlign: 'center' }}>
                <Clock size={48} className="text-muted mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">Lịch Sử Trống</h2>
                <p className="text-muted">Bạn chưa xem bộ phim nào gần đây.</p>
            </div>
        );
    }

    return (
        <div className="history-page">
            <div className="container" style={{ paddingTop: '2rem', paddingBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                    <Clock size={28} className="text-primary" />
                    <h2 className="text-2xl font-bold m-0">Phim Đã Xem</h2>
                </div>
                <p className="text-muted">Lịch sử xem phim của tài khoản <strong>{user.username}</strong></p>
            </div>

            <div className="container" style={{ paddingBottom: '4rem' }}>
                <div className="movie-grid">
                    {watchHistory.map((item) => (
                        <Link to={`/phim/${item.slug}`} key={item._id} className="movie-card">
                            <div className="movie-poster-wrapper">
                                <img
                                    src={item.thumb_url}
                                    alt={item.name}
                                    className="movie-poster"
                                    loading="lazy"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/220x330?text=No+Image';
                                    }}
                                />
                                <div className="movie-overlay">
                                    <div className="play-circle">
                                        <Play fill="currentColor" size={24} />
                                    </div>
                                </div>
                            </div>
                            <div className="movie-info">
                                <h3 className="movie-title" title={item.name}>{item.name}</h3>
                                
                                {item.currentEpisodeSlug && (
                                    <div style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: '4px', 
                                        fontSize: '0.8rem', 
                                        color: 'var(--accent-primary)',
                                        marginTop: '4px',
                                        fontWeight: '500'
                                    }}>
                                        <RotateCcw size={12} />
                                        <span>
                                            {formatEpisode(item.currentEpisodeSlug)} 
                                            {item.currentTime && item.currentTime > 0 ? ` (${formatTime(item.currentTime)})` : ''}
                                        </span>
                                    </div>
                                )}
                                <p className="movie-year" style={{ marginTop: '2px' }}>
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
