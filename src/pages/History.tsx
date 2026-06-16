import React from 'react';
import { useAuth } from '../context/AuthContext';
import { MovieGrid } from '../components/MovieGrid';
import { Clock } from 'lucide-react';

export const History: React.FC = () => {
    const { watchHistory, user } = useAuth();

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

            {/* We reuse the generic MovieGrid to show history items */}
            <MovieGrid movies={watchHistory.map((item) => ({
                _id: item._id,
                name: item.name,
                slug: item.slug,
                origin_name: item.origin_name || '',
                thumb_url: item.thumb_url,
                year: item.year || 0
            }))} />
        </div>
    );
};
