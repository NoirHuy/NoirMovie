import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { MovieGrid } from '../components/MovieGrid';
import { Hero } from '../components/Hero';
import { useAuth } from '../context/AuthContext';
import { Play, Sparkles, Clock } from 'lucide-react';

export const Home: React.FC = () => {
    const navigate = useNavigate();
    const [movies, setMovies] = useState([]);
    const [featuredMovie, setFeaturedMovie] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Auth state for Continue Watching
    const { watchHistory, user } = useAuth();

    // Recommendation states
    const [recommendations, setRecommendations] = useState<any[]>([]);
    const [recommendedGenreName, setRecommendedGenreName] = useState('');
    const [recLoading, setRecLoading] = useState(false);

    // Filter watch history for active items (less than 95% finished)
    const continueWatchingItems = watchHistory.filter(item => {
        if (!item.currentTime || !item.currentEpisodeSlug) return false;
        const percent = Math.round((item.currentTime / (item.duration || 2700)) * 100);
        return percent < 95;
    }).slice(0, 8);

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

    // Fetch smart recommendations based on last watched genre
    useEffect(() => {
        const fetchRecommendations = async () => {
            if (!user || watchHistory.length === 0) {
                // Fallback curated popular category
                setRecLoading(true);
                try {
                    const data = await apiService.getMoviesByCategory('hanh-dong');
                    if (data.status === 'success' && data.data && data.data.items) {
                        setRecommendations(data.data.items.slice(0, 10));
                        setRecommendedGenreName('Phim Hành Động');
                    }
                } catch (e) {
                    console.error('Failed to fetch fallback recommendations', e);
                } finally {
                    setRecLoading(false);
                }
                return;
            }

            setRecLoading(true);
            try {
                const lastWatched = watchHistory[0];
                const detail = await apiService.getMovieDetail(lastWatched.slug);
                if (detail.status === 'success' && detail.data && detail.data.item) {
                    const categories = detail.data.item.category || [];
                    if (categories.length > 0) {
                        const targetGenre = categories[0];
                        const recData = await apiService.getMoviesByCategory(targetGenre.slug);
                        if (recData.status === 'success' && recData.data && recData.data.items) {
                            const filtered = recData.data.items
                                .filter((m: any) => m.slug !== lastWatched.slug)
                                .slice(0, 10);
                            setRecommendations(filtered);
                            setRecommendedGenreName(`Phim ${targetGenre.name} Cho Bạn`);
                            return;
                        }
                    }
                }
            } catch (err) {
                console.error('Failed to fetch smart recommendations:', err);
            } finally {
                setRecLoading(false);
            }
        };

        fetchRecommendations();
    }, [watchHistory, user]);

    const handlePlayFeatured = () => {
        if (featuredMovie) {
            navigate(`/phim/${featuredMovie.slug}`);
        }
    };

    const formatEpisodeLabel = (slug: string) => {
        return slug
            .replace(/-/g, ' ')
            .replace(/\btap\b/gi, 'Tập')
            .replace(/\bfull\b/gi, 'Full')
            .replace(/^\w/, (c) => c.toUpperCase());
    };

    const getRemainingMinutes = (item: any) => {
        const duration = item.duration || 2700;
        const current = item.currentTime || 0;
        const remaining = Math.max(duration - current, 0);
        const mins = Math.round(remaining / 60);
        return mins > 0 ? `${mins} phút còn lại` : 'Xem xong';
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
        <div className="min-h-screen bg-background pb-12 overflow-x-hidden">
            {/* Rich featured hero section */}
            {featuredMovie && (
                <Hero 
                    movie={featuredMovie} 
                    imageDomain={featuredMovie.APP_DOMAIN_CDN_IMAGE || 'https://img.ophim.live'} 
                    onPlayClick={handlePlayFeatured} 
                />
            )}
            
            {/* Continue Watching Section (Only for logged-in users with progress) */}
            {user && continueWatchingItems.length > 0 && (
                <div className="max-w-[1920px] mx-auto px-6 md:px-container-desktop mt-10">
                    <div className="flex items-center gap-2 mb-6">
                        <Clock className="text-primary" size={22} />
                        <h2 className="font-headline text-2xl font-bold text-white tracking-tight">
                            Tiếp Tục Xem
                        </h2>
                    </div>

                    <div className="flex overflow-x-auto gap-5 pb-4 custom-scrollbar hide-scrollbar">
                        {continueWatchingItems.map((item) => {
                            const percent = Math.round((item.currentTime! / (item.duration || 2700)) * 100);
                            return (
                                <div 
                                    key={item._id}
                                    onClick={() => navigate(`/phim/${item.slug}`)}
                                    className="min-w-[260px] md:min-w-[300px] aspect-[16/10] bg-surface-container/30 rounded-2xl overflow-hidden border border-white/5 cursor-pointer relative group transition-all duration-300 hover:scale-[1.02] hover:border-primary/20 hover:bg-surface-container-high/40 shadow-lg shrink-0 flex flex-col justify-between"
                                >
                                    {/* Movie Thumbnail Background */}
                                    <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${item.thumb_url})` }}></div>
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10 group-hover:via-black/45 transition-colors"></div>

                                    {/* Play Overlay Button */}
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                        <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white crimson-glow">
                                            <Play size={20} fill="currentColor" className="ml-1" />
                                        </div>
                                    </div>

                                    {/* Top Metadata */}
                                    <div className="relative z-10 p-4">
                                        <span className="text-[10px] font-bold uppercase tracking-wider bg-black/60 backdrop-blur-md px-2 py-0.5 rounded border border-white/10 text-primary">
                                            {formatEpisodeLabel(item.currentEpisodeSlug || '')}
                                        </span>
                                    </div>

                                    {/* Bottom Title & Progress info */}
                                    <div className="relative z-10 p-4">
                                        <h3 className="text-sm font-bold text-white truncate drop-shadow-md">
                                            {item.name}
                                        </h3>
                                        <p className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1">
                                            <span>{getRemainingMinutes(item)}</span>
                                        </p>
                                    </div>

                                    {/* Red progress bar at the very bottom */}
                                    <div className="absolute bottom-0 left-0 w-full h-1 bg-white/10 z-20">
                                        <div className="bg-primary h-full transition-all duration-300" style={{ width: `${percent}%` }}></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Movie grid container */}
            <div className="mt-8">
                <MovieGrid movies={movies} title="Phim Mới Cập Nhật" />
            </div>

            {/* Smart Recommendations Section */}
            {!recLoading && recommendations.length > 0 && (
                <div className="mt-12">
                    <div className="max-w-[1920px] mx-auto px-6 md:px-container-desktop flex items-center gap-2 mb-1">
                        <Sparkles className="text-amber-400" size={20} />
                        <span className="text-xs font-headline font-bold text-amber-400 uppercase tracking-widest">Độc Quyền Cho Bạn</span>
                    </div>
                    <MovieGrid movies={recommendations} title={recommendedGenreName} />
                </div>
            )}
        </div>
    );
};
