import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { MovieGrid } from '../components/MovieGrid';
import { Hero } from '../components/Hero';

export const Home: React.FC = () => {
    const navigate = useNavigate();
    const [movies, setMovies] = useState([]);
    const [featuredMovie, setFeaturedMovie] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchHomeData = async () => {
            try {
                const data = await apiService.getHome();
                if (data.status === 'success' && data.data && data.data.items) {
                    const items = data.data.items;
                    setMovies(items);

                    // Fetch full detail of the first movie to display as a rich Hero banner
                    if (items.length > 0) {
                        try {
                            const detailData = await apiService.getMovieDetail(items[0].slug);
                            if (detailData.status === 'success' && detailData.data && detailData.data.item) {
                                setFeaturedMovie({
                                    ...detailData.data.item,
                                    APP_DOMAIN_CDN_IMAGE: detailData.APP_DOMAIN_CDN_IMAGE
                                });
                            }
                        } catch (detailErr) {
                            console.error('Failed to fetch detailed movie for Hero:', detailErr);
                            // Fallback to basic info from list
                            setFeaturedMovie(items[0]);
                        }
                    }
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

    const handlePlayFeatured = () => {
        if (featuredMovie) {
            navigate(`/phim/${featuredMovie.slug}`);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <h2 className="text-xl text-on-surface-variant/75 font-semibold font-headline animate-pulse">
                    Đang tải danh sách phim mới nhất...
                </h2>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-6 text-center">
                <h2 className="text-xl font-bold font-headline text-primary">
                    Lỗi: {error}
                </h2>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-12">
            {/* Rich featured hero section */}
            {featuredMovie && (
                <Hero 
                    movie={featuredMovie} 
                    imageDomain={featuredMovie.APP_DOMAIN_CDN_IMAGE || 'https://img.ophim.live'} 
                    onPlayClick={handlePlayFeatured} 
                />
            )}
            
            {/* Movie grid container */}
            <div className="mt-8">
                <MovieGrid movies={movies} title="Phim Mới Cập Nhật" />
            </div>
        </div>
    );
};
