import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { MovieGrid } from '../components/MovieGrid';

export const Home: React.FC = () => {
    const [movies, setMovies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchHomeData = async () => {
            try {
                const data = await apiService.getHome();
                if (data.status === 'success' && data.data && data.data.items) {
                    setMovies(data.data.items);
                } else {
                    setError('Không thể lấy danh sách phim mới');
                }
            } catch (err: any) {
                setError(err.message || 'Lỗi mạng');
            } finally {
                setLoading(false);
            }
        };

        fetchHomeData();
    }, []);

    if (loading) {
        return (
            <div className="container" style={{ paddingTop: '2rem', textAlign: 'center' }}>
                <h2 className="text-xl text-muted">Đang tải danh sách phim mới nhất...</h2>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container" style={{ paddingTop: '2rem', textAlign: 'center' }}>
                <h2 className="text-xl" style={{ color: 'var(--accent-primary)' }}>Lỗi: {error}</h2>
            </div>
        );
    }

    return <MovieGrid movies={movies} title="Phim Mới Cập Nhật" />;
};
