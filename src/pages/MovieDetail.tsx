import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Hero } from '../components/Hero';
import { VideoPlayer } from '../components/VideoPlayer';
import { EpisodeList } from '../components/EpisodeList';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';

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

    // Auth context for tracking history
    const { addToHistory, updateWatchProgress, user, watchHistory } = useAuth();
    const historyAddedRef = useRef(false);

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
        if (movieData?.item && user && !historyAddedRef.current) {
            // Check if there is existing history to resume from
            const existingHistory = watchHistory.find(h => h.slug === movieData.item.slug);

            if (existingHistory && existingHistory.currentEpisodeSlug) {
                // We will set the episode later when the episodes list is parsed
                setInitialTime(existingHistory.currentTime || 0);
            }

            addToHistory(movieData.item);
            historyAddedRef.current = true;
        }
    }, [movieData, user, addToHistory, watchHistory]);

    const movie = movieData?.item;

    // Extract all servers (Vietsub, Thuyết minh, v.v)
    const episodeServers = movie?.episodes || movieData?.episodes || [];
    const validServers = episodeServers.filter((server: any) => server.server_data && server.server_data.length > 0);

    // Get episodes for currently selected server
    const currentServer = validServers.length > 0 ? validServers[currentServerIndex] : null;
    const episodes = currentServer ? currentServer.server_data : [];

    // Automatically select the saved episode if resuming from history
    useEffect(() => {
        if (!movie) return;
        if (episodes.length > 0 && !currentEpisode && user && historyAddedRef.current) {
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
    }, [episodes, currentEpisode, user, watchHistory, movie?.slug, validServers, currentServerIndex]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (timeUpdateTimeout.current) {
                clearTimeout(timeUpdateTimeout.current);
            }
        };
    }, []);

    const saveProgressNow = () => {
        if (user && currentEpisode && movie?.slug && currentTimeRef.current > 0) {
            updateWatchProgress(movie.slug, currentEpisode.slug, currentTimeRef.current);
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
    }, [user, currentEpisode, movie?.slug]);

    if (loading) {
        return (
            <div className="container" style={{ paddingTop: '2rem', textAlign: 'center' }}>
                <h2 className="text-xl text-muted">Đang tải thông tin phim...</h2>
            </div>
        );
    }

    if (error || !movieData || !movie) {
        return (
            <div className="container" style={{ paddingTop: '2rem', textAlign: 'center' }}>
                <h2 className="text-xl" style={{ color: 'var(--accent-primary)' }}>{error || 'Đã có lỗi xảy ra'}</h2>
            </div>
        );
    }

    // Try to use APP_DOMAIN_CDN_IMAGE if available, or extract from movie poster/thumb if it's absolute, else fallback
    const imageDomain = movieData.APP_DOMAIN_CDN_IMAGE || 'https://img.ophim.live';

    const handlePlayClick = () => {
        if (!currentEpisode && episodes.length > 0) {
            setCurrentEpisode(episodes[0]);
            setInitialTime(0);
        }
        setTimeout(() => {
            playerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    };

    const handleEpisodeSelect = (episode: any) => {
        setCurrentEpisode(episode);
        setInitialTime(0); // Reset time when manually changing episode
        playerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    // Debounce saving watch progress to prevent hammering localStorage
    const handleTimeUpdate = (currentTime: number) => {
        currentTimeRef.current = currentTime;
        if (!user || !currentEpisode || !movie.slug) return;

        if (timeUpdateTimeout.current) {
            clearTimeout(timeUpdateTimeout.current);
        }

        timeUpdateTimeout.current = setTimeout(() => {
            updateWatchProgress(movie.slug, currentEpisode.slug, currentTime);
        }, 5000); // Save every 5 seconds of playback to avoid lag
    };

    const handlePause = (currentTime: number) => {
        currentTimeRef.current = currentTime;
        saveProgressNow();
    };

    return (
        <>
            <Hero
                movie={movie}
                imageDomain={imageDomain}
                onPlayClick={handlePlayClick}
            />

            <div className="container app-grid">
                <div className="player-section" ref={playerRef}>
                    {currentEpisode ? (
                        <VideoPlayer
                            episode={currentEpisode}
                            posterUrl={movie.poster_url?.startsWith('http') ? movie.poster_url : `${imageDomain}/uploads/movies/${movie.poster_url || movie.thumb_url}`}
                            initialTime={initialTime}
                            onTimeUpdate={handleTimeUpdate}
                            onPause={handlePause}
                        />
                    ) : (
                        <div className="player-placeholder glass-panel">
                            <div className="placeholder-content">
                                <h2>{episodes.length > 0 ? 'Chưa chọn tập phim' : 'Phim đang cập nhật'}</h2>
                                <p>{episodes.length > 0 ? 'Vui lòng chọn một tập từ danh sách hoặc nhấn "Xem Phim"' : 'Hiện chưa có tập phim nào cho bộ phim này.'}</p>
                                {episodes.length > 0 && (
                                    <button className="play-btn mt-4" onClick={handlePlayClick}>
                                        Xem Tập 1
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {currentEpisode && (
                        <div className="episode-info mt-4 glass-panel">
                            <h3 className="text-xl font-semibold">Tập {currentEpisode.name}</h3>
                            <p className="text-muted mt-2">{currentEpisode.filename}</p>
                        </div>
                    )}
                </div>

                <div className="sidebar-section">
                    {validServers.length > 0 ? (
                        <>
                            {/* SEASON SELECTION UI */}
                            {relatedSeasons.length > 1 && (
                                <div className="season-selection mb-4" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingBottom: '1rem', borderBottom: '1px solid var(--glass-border)' }}>
                                    <div className="text-sm text-muted font-semibold">Chọn Phần / Season:</div>
                                    <select
                                        value={slug}
                                        onChange={(e) => navigate(`/phim/${e.target.value}`)}
                                        style={{
                                            padding: '0.5rem 2.5rem 0.5rem 1rem',
                                            borderRadius: '6px',
                                            fontSize: '0.9rem',
                                            fontWeight: '600',
                                            border: '1px solid var(--accent-primary)',
                                            background: 'var(--bg-secondary)',
                                            color: 'var(--text-primary)',
                                            appearance: 'none',
                                            cursor: 'pointer',
                                            outline: 'none',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                                        }}
                                    >
                                        {relatedSeasons.map((season: any) => (
                                            <option key={season.slug} value={season.slug}>
                                                {season.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* SERVER SELECTION UI */}
                            {validServers.length > 1 && (
                                <div className="server-selection mb-4">
                                    <div className="text-sm text-muted mb-2">Chọn Server / Lồng tiếng:</div>
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        {validServers.map((server: any, index: number) => (
                                            <button
                                                key={index}
                                                onClick={() => setCurrentServerIndex(index)}
                                                style={{
                                                    padding: '0.4rem 0.8rem',
                                                    borderRadius: '4px',
                                                    fontSize: '0.875rem',
                                                    fontWeight: '500',
                                                    border: '1px solid var(--glass-border)',
                                                    background: index === currentServerIndex ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                                                    color: index === currentServerIndex ? '#fff' : 'var(--text-secondary)',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease',
                                                }}
                                            >
                                                {server.server_name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <EpisodeList
                                episodes={episodes}
                                currentEpisodeSlug={currentEpisode?.slug || ''}
                                onEpisodeSelect={handleEpisodeSelect}
                            />
                        </>
                    ) : (
                        <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
                            <h3 className="text-xl font-semibold" style={{ color: 'var(--text-muted)' }}>Trailer / Đang cập nhật</h3>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};
