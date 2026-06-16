import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronDown, Crown } from 'lucide-react';
import { Hero } from '../components/Hero';
import { VideoPlayer } from '../components/VideoPlayer';
import { EpisodeList } from '../components/EpisodeList';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';

const planValues = {
    'Free': 0,
    'Standard': 1,
    'VIP': 2
};

const getRequiredPlan = (movie: any): 'Free' | 'Standard' | 'VIP' => {
    if (!movie) return 'Free';
    
    // 1. VIP condition: newer releases (e.g. year >= 2025), tmdb rating >= 8.5, or name/slug contains special markers
    const isVip = 
        movie.year >= 2025 || 
        (movie.tmdb?.vote_average && movie.tmdb.vote_average >= 8.5) ||
        movie.slug?.toLowerCase().includes('vip') ||
        movie.name?.toLowerCase().includes('vip');
    
    if (isVip) return 'VIP';

    // 2. Standard condition: Single movies ("phim lẻ", type === "single" or single categories like theater/blockbusters) or action movies with good rating, or name contains premium
    const isStandard = 
        movie.type === 'single' || 
        movie.slug?.toLowerCase().includes('chieu-rap') || 
        movie.slug?.toLowerCase().includes('premium') ||
        (movie.category && movie.category.some((c: any) => c.slug === 'hanh-dong' || c.slug === 'vien-tuong'));

    if (isStandard) return 'Standard';

    return 'Free';
};

export const MovieDetail: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const [movieData, setMovieData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [currentServerIndex, setCurrentServerIndex] = useState(0);
    const [currentEpisode, setCurrentEpisode] = useState<any>(null);
    const [relatedSeasons, setRelatedSeasons] = useState<any[]>([]);

    // For resuming playback
    const [initialTime, setInitialTime] = useState(0);

    const playerRef = useRef<HTMLDivElement>(null);
    const timeUpdateTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const currentTimeRef = useRef(0);
    const episodeDurationRef = useRef(0);

    // Auth context for tracking history
    const { addToHistory, updateWatchProgress, user, watchHistory } = useAuth();
    const historyAddedRef = useRef(false);

    const movie = movieData?.item;
    const requiredPlan = getRequiredPlan(movie);
    const userPlan = user?.subscription?.plan || 'Free';
    const hasAccess = planValues[userPlan] >= planValues[requiredPlan];

    useEffect(() => {
        // Reset state on new movie
        historyAddedRef.current = false;
        setCurrentServerIndex(0);
        setCurrentEpisode(null);
        setInitialTime(0);

        const fetchMovieDetail = async () => {
            setLoading(true);
            setError(null);
            try {
                if (!slug) return;
                const data = await apiService.getMovieDetail(slug);

                if (data.status === 'success' && data.data && data.data.item) {
                    const movieItem = data.data.item;
                    setMovieData(data.data);

                    // Fetch related seasons
                    try {
                        const baseNameVn = movieItem.name.replace(/\s*\([^)]*\)/g, '').split('-')[0].trim().toLowerCase();
                        const baseNameEn = movieItem.origin_name ? movieItem.origin_name.replace(/\s*\([^)]*\)/g, '').split('-')[0].trim().toLowerCase() : '';

                        const searchKeyword = movieItem.name.split('(')[0].trim() || movieItem.name.split('-')[0].trim();

                        const searchRes = await apiService.searchMovies(searchKeyword);
                        if (searchRes.status === 'success' && searchRes.data.items) {
                            const related = searchRes.data.items.filter((m: any) => {
                                // Match by TMDB ID
                                if (movieItem.tmdb?.id && m.tmdb?.id && movieItem.tmdb.id === m.tmdb.id && movieItem.tmdb.type === m.tmdb.type) return true;

                                // Fallback name matching
                                const mName = m.name.replace(/\s*\([^)]*\)/g, '').split('-')[0].trim().toLowerCase();
                                const mOrigin = m.origin_name ? m.origin_name.replace(/\s*\([^)]*\)/g, '').split('-')[0].trim().toLowerCase() : '';

                                return (mName === baseNameVn && mName.length > 0) || (baseNameEn && mOrigin === baseNameEn);
                            });

                            // Sort related by Season / Part number
                            related.sort((a: any, b: any) => {
                                const matchA = a.name.match(/Phần (\d+)/i) || a.origin_name?.match(/Season (\d+)/i);
                                const matchB = b.name.match(/Phần (\d+)/i) || b.origin_name?.match(/Season (\d+)/i);
                                const numA = matchA ? parseInt(matchA[1]) : 0;
                                const numB = matchB ? parseInt(matchB[1]) : 0;
                                return numA - numB;
                            });

                            setRelatedSeasons(related);
                        }
                    } catch (err) {
                        console.error('Lỗi tìm phần khác:', err);
                    }
                } else {
                    setError('Không tìm thấy thông tin phim');
                }
            } catch (err: any) {
                setError(err.message || 'Lỗi tải chi tiết phim');
            } finally {
                setLoading(false);
            }
        };

        fetchMovieDetail();
        // Scroll to top on route change
        window.scrollTo(0, 0);
    }, [slug]);

    // Track Watch History
    useEffect(() => {
        if (movie && user && !historyAddedRef.current) {
            // Check if there is existing history to resume from
            const existingHistory = watchHistory.find(h => h.slug === movie.slug);

            if (existingHistory && existingHistory.currentEpisodeSlug) {
                // We will set the episode later when the episodes list is parsed
                setInitialTime(existingHistory.currentTime || 0);
            }

            addToHistory(movie);
            historyAddedRef.current = true;
        }
    }, [movie, user, addToHistory, watchHistory]);

    // Extract all servers (Vietsub, Thuyết minh, v.v)
    const episodeServers = movie?.episodes || movieData?.episodes || [];
    const validServers = episodeServers.filter((server: any) => server.server_data && server.server_data.length > 0);

    // Get episodes for currently selected server
    const currentServer = validServers.length > 0 ? validServers[currentServerIndex] : null;
    const episodes = currentServer ? currentServer.server_data : [];

    // Automatically select the saved episode if resuming from history
    useEffect(() => {
        if (!movie) return;
        if (episodes.length > 0 && !currentEpisode && user && historyAddedRef.current && hasAccess) {
            const existingHistory = watchHistory.find(h => h.slug === movie.slug);
            if (existingHistory && existingHistory.currentEpisodeSlug) {
                // Find server that contains this episode
                let foundEpisode = null;
                let foundServerIndex = currentServerIndex;

                for (let i = 0; i < validServers.length; i++) {
                    const ep = validServers[i].server_data.find((e: any) => e.slug === existingHistory.currentEpisodeSlug);
                    if (ep) {
                        foundEpisode = ep;
                        foundServerIndex = i;
                        break;
                    }
                }

                if (foundEpisode) {
                    if (foundServerIndex !== currentServerIndex) {
                        setCurrentServerIndex(foundServerIndex);
                    }
                    setCurrentEpisode(foundEpisode);
                    // Do not scroll down automatically if it's an auto-resume on load
                    return;
                }
            }
        }
    }, [episodes, currentEpisode, user, watchHistory, movie?.slug, validServers, currentServerIndex, hasAccess]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (timeUpdateTimeout.current) {
                clearTimeout(timeUpdateTimeout.current);
            }
        };
    }, []);

    const saveProgressNow = () => {
        if (user && currentEpisode && movie?.slug && currentTimeRef.current > 0 && hasAccess) {
            updateWatchProgress(movie.slug, currentEpisode.slug, currentTimeRef.current, episodeDurationRef.current || undefined);
        }
    };

    // Save progress when user leaves the page or closes tab
    useEffect(() => {
        const handleUnload = () => {
            saveProgressNow();
        };

        window.addEventListener('beforeunload', handleUnload);
        window.addEventListener('pagehide', handleUnload);

        return () => {
            window.removeEventListener('beforeunload', handleUnload);
            window.removeEventListener('pagehide', handleUnload);
            saveProgressNow();
        };
    }, [user, currentEpisode, movie?.slug, hasAccess]);

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <h2 className="text-xl text-on-surface-variant/75 font-semibold font-headline animate-pulse">
                    Đang tải thông tin phim...
                </h2>
            </div>
        );
    }

    if (error || !movieData || !movie) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-6 text-center">
                <h2 className="text-xl font-bold font-headline text-primary">
                    {error || 'Đã có lỗi xảy ra'}
                </h2>
            </div>
        );
    }

    // Try to use APP_DOMAIN_CDN_IMAGE if available, or extract from movie poster/thumb if it's absolute, else fallback
    const imageDomain = movieData.APP_DOMAIN_CDN_IMAGE || 'https://img.ophim.live';

    const handlePlayClick = () => {
        if (!hasAccess) {
            playerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
        }
        if (!currentEpisode && episodes.length > 0) {
            setCurrentEpisode(episodes[0]);
            setInitialTime(0);
        }
        setTimeout(() => {
            playerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    };

    const handleEpisodeSelect = (episode: any) => {
        if (!hasAccess) {
            playerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
        }
        setCurrentEpisode(episode);
        setInitialTime(0); // Reset time when manually changing episode
        playerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const hasNextEpisode = () => {
        if (!currentEpisode || episodes.length <= 1) return false;
        const currentIndex = episodes.findIndex((ep: any) => ep.slug === currentEpisode.slug);
        return currentIndex !== -1 && currentIndex + 1 < episodes.length;
    };

    const handleNextEpisode = () => {
        if (!currentEpisode || episodes.length <= 1 || !hasAccess) return;
        const currentIndex = episodes.findIndex((ep: any) => ep.slug === currentEpisode.slug);
        if (currentIndex !== -1 && currentIndex + 1 < episodes.length) {
            handleEpisodeSelect(episodes[currentIndex + 1]);
        }
    };

    // Debounce saving watch progress to prevent hammering localStorage
    const handleTimeUpdate = (currentTime: number, duration?: number) => {
        currentTimeRef.current = currentTime;
        if (duration) episodeDurationRef.current = duration;
        if (!user || !currentEpisode || !movie.slug) return;

        if (timeUpdateTimeout.current) {
            clearTimeout(timeUpdateTimeout.current);
        }

        timeUpdateTimeout.current = setTimeout(() => {
            updateWatchProgress(movie.slug, currentEpisode.slug, currentTime, duration || episodeDurationRef.current);
        }, 5000); // Save every 5 seconds of playback to avoid lag
    };

    const renderLockOverlay = (required: 'Standard' | 'VIP') => {
        const isVip = required === 'VIP';
        const title = isVip ? 'Đặc Quyền Thành Viên VIP' : 'Yêu Cầu Nâng Cấp Gói Cước';
        const description = isVip 
            ? 'Bộ phim bom tấn chất lượng 4K này chỉ dành riêng cho các thành viên VIP của Cineos.' 
            : 'Để xem bộ phim chiếu rạp hấp dẫn này, vui lòng nâng cấp lên tài khoản Standard hoặc VIP.';
        
        return (
            <div className={`aspect-video w-full rounded-2xl overflow-hidden shadow-2xl flex flex-col items-center justify-center border relative p-6 text-center ${
                isVip 
                    ? 'border-amber-500/40 bg-gradient-to-b from-zinc-950 via-zinc-900 to-amber-950/20' 
                    : 'border-blue-500/40 bg-gradient-to-b from-zinc-950 via-zinc-900 to-blue-950/20'
            }`}>
                <div className={`p-4 rounded-full mb-4 border ${
                    isVip ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                }`}>
                    <Crown size={32} className={isVip ? 'animate-bounce text-amber-400' : 'text-blue-400'} />
                </div>
                
                <h3 className="font-headline text-xl md:text-2xl font-black text-white mb-2">
                    {title}
                </h3>
                <p className="text-xs md:text-sm text-zinc-400 max-w-md mb-6 leading-relaxed">
                    {description}
                </p>

                <div className="flex flex-col sm:flex-row gap-3">
                    {!user ? (
                        <button 
                            onClick={() => {
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                window.dispatchEvent(new CustomEvent('trigger-login-modal'));
                            }}
                            className="bg-white/10 hover:bg-white/15 text-white font-headline font-bold text-xs py-3 px-6 rounded-xl border border-white/10 hover:border-white/20 transition duration-300 cursor-pointer"
                        >
                            Đăng Nhập Tài Khoản
                        </button>
                    ) : null}
                    
                    <button 
                        onClick={() => navigate('/premium')}
                        className={`font-headline font-bold text-xs py-3 px-6 rounded-xl transition duration-300 flex items-center justify-center gap-1.5 shadow-md cursor-pointer ${
                            isVip 
                                ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-black hover:brightness-110 shadow-amber-500/20' 
                                : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:brightness-110 shadow-blue-500/20'
                        }`}
                    >
                        Nâng Cấp Gói {required} Chỉ Từ 79k/tháng
                    </button>
                </div>
            </div>
        );
    };

    const handlePause = (currentTime: number, duration?: number) => {
        currentTimeRef.current = currentTime;
        if (duration) episodeDurationRef.current = duration;
        saveProgressNow();
    };

    return (
        <div className="min-h-screen bg-background">
            <Hero
                movie={movie}
                imageDomain={imageDomain}
                onPlayClick={handlePlayClick}
            />

            <main className="pt-8 pb-20 max-w-[1920px] mx-auto px-6 md:px-container-desktop">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* Left Column: Player and Details */}
                    <div className="lg:col-span-8 space-y-6" ref={playerRef}>
                        {!hasAccess ? (
                            renderLockOverlay(requiredPlan as 'Standard' | 'VIP')
                        ) : currentEpisode ? (
                             <VideoPlayer
                                episode={currentEpisode}
                                posterUrl={movie.poster_url?.startsWith('http') ? movie.poster_url : `${imageDomain}/uploads/movies/${movie.poster_url || movie.thumb_url}`}
                                initialTime={initialTime}
                                onTimeUpdate={handleTimeUpdate}
                                onPause={handlePause}
                                onNextEpisode={handleNextEpisode}
                                hasNextEpisode={hasNextEpisode()}
                            />
                        ) : (
                            <div className="aspect-video bg-surface-container rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center border border-white/5 p-6">
                                <div className="text-center max-w-md">
                                    <h2 className="font-headline text-xl font-bold text-white mb-2">
                                        {episodes.length > 0 ? 'Chưa chọn tập phim' : 'Phim đang cập nhật'}
                                    </h2>
                                    <p className="text-sm text-on-surface-variant/75 mb-6">
                                        {episodes.length > 0 ? 'Vui lòng chọn một tập từ danh sách hoặc nhấn "Xem Phim"' : 'Hiện chưa có tập phim nào cho bộ phim này.'}
                                    </p>
                                    {episodes.length > 0 && (
                                        <button 
                                            className="bg-primary hover:bg-primary/95 text-white font-bold px-6 py-2.5 rounded-full shadow-[0_0_15px_rgba(255,84,81,0.3)] active:scale-95 transition-all cursor-pointer"
                                            onClick={handlePlayClick}
                                        >
                                            Xem Tập 1
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Current playing episode header */}
                        {currentEpisode && (
                            <div className="p-5 rounded-2xl glass-panel">
                                <h3 className="text-lg font-bold text-white">Đang phát: Tập {currentEpisode.name}</h3>
                                <p className="text-xs text-on-surface-variant/75 mt-1">{currentEpisode.filename}</p>
                            </div>
                        )}

                        {/* Movie Details Info Box */}
                        <div className="glass-panel p-6 md:p-8 rounded-2xl space-y-6">
                            <div>
                                <h1 className="font-headline text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 tracking-tight">
                                    {movie.name}
                                </h1>
                                <div className="flex flex-wrap items-center gap-4 text-xs md:text-sm text-on-surface-variant/80 font-medium">
                                    {movie.tmdb?.vote_average && (
                                        <span className="flex items-center gap-1 text-primary font-bold bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
                                            ★ {movie.tmdb.vote_average.toFixed(1)}
                                        </span>
                                    )}
                                    {requiredPlan !== 'Free' && (
                                        <span className={`text-[10px] font-headline font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                                            requiredPlan === 'VIP' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                                        }`}>
                                            Gói {requiredPlan}
                                        </span>
                                    )}
                                    {movie.year && <span>{movie.year}</span>}
                                    {movie.time && <span>{movie.time}</span>}
                                    {movie.episode_current && (
                                        <span className="bg-surface-container px-2 py-0.5 rounded border border-white/5 uppercase tracking-widest text-[10px] font-bold">
                                            {movie.episode_current}
                                        </span>
                                    )}
                                    {movie.quality && (
                                        <span className="bg-surface-container px-2 py-0.5 rounded border border-white/5 uppercase tracking-widest text-[10px] font-bold">
                                            {movie.quality}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Synopsis */}
                            {movie.content && (
                                <div className="space-y-3">
                                    <h3 className="font-headline text-lg font-bold text-white">Nội dung phim</h3>
                                    <div 
                                        className="text-sm md:text-base text-on-surface-variant leading-relaxed max-w-4xl"
                                        dangerouslySetInnerHTML={{ __html: movie.content }}
                                    />
                                </div>
                            )}

                            {/* Metadata Details Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6 border-t border-white/5">
                                <div className="space-y-1">
                                    <span className="text-[10px] uppercase tracking-widest text-primary font-bold">Quốc gia</span>
                                    <p className="text-white text-sm font-semibold">{movie.country?.map((c: any) => c.name).join(', ') || 'Đang cập nhật'}</p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[10px] uppercase tracking-widest text-primary font-bold">Thể loại</span>
                                    <p className="text-white text-sm font-semibold truncate" title={movie.category?.map((c: any) => c.name).join(', ')}>
                                        {movie.category?.map((c: any) => c.name).join(', ') || 'Đang cập nhật'}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[10px] uppercase tracking-widest text-primary font-bold">Đạo diễn</span>
                                    <p className="text-white text-sm font-semibold">{movie.director?.join(', ') || 'Đang cập nhật'}</p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[10px] uppercase tracking-widest text-primary font-bold">Diễn viên</span>
                                    <p className="text-white text-sm font-semibold truncate" title={movie.actor?.join(', ')}>
                                        {movie.actor?.join(', ') || 'Đang cập nhật'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Server, Season & Episode Lists */}
                    <div className="lg:col-span-4 space-y-6">
                        
                        {/* Server Selectors */}
                        {validServers.length > 0 && (
                            <div className="glass-panel p-5 rounded-2xl">
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="text-primary font-bold">⚡</span>
                                    <h4 className="font-headline text-sm md:text-base font-bold text-white">Chọn nguồn phát video</h4>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {validServers.map((server: any, index: number) => {
                                        const isSelected = index === currentServerIndex;
                                        return (
                                            <button
                                                key={index}
                                                onClick={() => setCurrentServerIndex(index)}
                                                className={`flex-1 min-w-[100px] py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer border active:scale-95 ${
                                                    isSelected
                                                        ? 'bg-primary border-primary text-white shadow-md'
                                                        : 'bg-surface-container border-white/5 text-on-surface-variant hover:bg-primary/20 hover:border-primary/30 hover:text-white'
                                                }`}
                                            >
                                                {server.server_name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Season Dropdown */}
                        {relatedSeasons.length > 1 && (
                            <div className="glass-panel p-5 rounded-2xl flex flex-col gap-3">
                                <label className="text-xs font-bold text-primary uppercase tracking-widest">Chọn phần / Season</label>
                                <div className="relative">
                                    <select
                                        value={slug}
                                        onChange={(e) => navigate(`/phim/${e.target.value}`)}
                                        className="w-full bg-surface-container border border-white/5 rounded-xl px-4 py-2.5 text-sm outline-none text-on-surface focus:border-primary focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
                                    >
                                        {relatedSeasons.map((season: any) => (
                                            <option key={season.slug} value={season.slug}>
                                                {season.name}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute right-4 top-3.5 pointer-events-none text-on-surface-variant">
                                        <ChevronDown size={16} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Episode List */}
                        {validServers.length > 0 ? (
                            <EpisodeList
                                episodes={episodes}
                                currentEpisodeSlug={currentEpisode?.slug || ''}
                                onEpisodeSelect={handleEpisodeSelect}
                            />
                        ) : (
                            <div className="glass-panel p-6 rounded-2xl text-center">
                                <h3 className="font-headline text-base font-bold text-on-surface-variant/75">Trailer / Đang cập nhật</h3>
                            </div>
                        )}

                    </div>
                </div>
            </main>
        </div>
    );
};
