import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
    ChevronDown, 
    Crown, 
    MessageSquare, 
    Send, 
    Users, 
    Copy, 
    AlertTriangle, 
    Check, 
    Star, 
    Tv, 
    LogOut, 
    CheckCircle,
    Play
} from 'lucide-react';
import { Hero } from '../components/Hero';
import { VideoPlayer } from '../components/VideoPlayer';
import type { VideoPlayerRef } from '../components/VideoPlayer';
import { EpisodeList } from '../components/EpisodeList';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
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
    const [searchParams, setSearchParams] = useSearchParams();
    const roomId = searchParams.get('roomId');

    const [movieData, setMovieData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [currentServerIndex, setCurrentServerIndex] = useState(0);
    const [currentEpisode, setCurrentEpisode] = useState<any>(null);
    const [relatedSeasons, setRelatedSeasons] = useState<any[]>([]);

    // Similar movies & comments
    const [similarMovies, setSimilarMovies] = useState<any[]>([]);
    const [comments, setComments] = useState<any[]>([]);
    const [commentsLoading, setCommentsLoading] = useState(false);

    // Comment Form states
    const [commentContent, setCommentContent] = useState('');
    const [commentRating, setCommentRating] = useState<number | null>(null);
    const [commentIsSpoiler, setCommentIsSpoiler] = useState(false);
    const [commentError, setCommentError] = useState('');
    const [commentSuccess, setCommentSuccess] = useState('');
    const [visibleSpoilers, setVisibleSpoilers] = useState<{ [key: string]: boolean }>({});

    // Watch Party states
    const [partyMessages, setPartyMessages] = useState<any[]>([]);
    const [partyInput, setPartyInput] = useState('');
    const [copied, setCopied] = useState(false);
    const [rightPanelTab, setRightPanelTab] = useState<'chat' | 'members' | 'episodes'>('chat');

    // For resuming playback
    const [initialTime, setInitialTime] = useState(0);

    const playerRef = useRef<HTMLDivElement>(null);
    const timeUpdateTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const currentTimeRef = useRef(0);
    const episodeDurationRef = useRef(0);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    // Auth context for tracking history
    const { addToHistory, updateWatchProgress, user, watchHistory } = useAuth();
    const historyAddedRef = useRef(false);
    const videoPlayerRef = useRef<VideoPlayerRef>(null);
    const socketRef = useRef<Socket | null>(null);
    const [roomMembers, setRoomMembers] = useState<any[]>([]);

    const movie = movieData?.item;
    const requiredPlan = getRequiredPlan(movie);
    const userPlan = user?.subscription?.plan || 'Free';
    const hasAccess = planValues[userPlan] >= planValues[requiredPlan];

    // Scroll chat to bottom
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [partyMessages]);

    // Fetch comments list
    const fetchComments = async () => {
        if (!slug) return;
        setCommentsLoading(true);
        try {
            const res = await fetch(`/api/movies/${slug}/comments`);
            if (res.ok) {
                const data = await res.json();
                setComments(data);
            }
        } catch (err) {
            console.error('Error fetching comments:', err);
        } finally {
            setCommentsLoading(false);
        }
    };

    // Main fetch on slug change
    useEffect(() => {
        // Reset state on new movie
        historyAddedRef.current = false;
        setCurrentServerIndex(0);
        setCurrentEpisode(null);
        setInitialTime(0);
        setSimilarMovies([]);
        setPartyMessages([]);

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

                    // Fetch similar movies based on first category
                    if (movieItem.category && movieItem.category.length > 0) {
                        try {
                            const simRes = await apiService.getMoviesByCategory(movieItem.category[0].slug);
                            if (simRes.status === 'success' && simRes.data.items) {
                                const filtered = simRes.data.items.filter((m: any) => m.slug !== movieItem.slug).slice(0, 6);
                                setSimilarMovies(filtered);
                            }
                        } catch (e) {
                            console.error('Failed to fetch similar movies:', e);
                        }
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
        fetchComments();
        // Scroll to top on route change
        window.scrollTo(0, 0);
    }, [slug]);

    // Real-Time Watch Party Socket.io Integration
    useEffect(() => {
        if (!roomId) {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
            setPartyMessages([]);
            setRoomMembers([]);
            return;
        }

        // Default tab to chat when party starts
        setRightPanelTab('chat');

        // Connect to the socket server
        // In local development, it will hit Vite dev server which proxies it.
        // In production, it connects to the same origin.
        const socket = io(window.location.origin);
        socketRef.current = socket;

        // Set initial welcome messages
        setPartyMessages([
            { _id: 'welcome-1', sender: 'Hệ thống', text: `Chào mừng bạn đến với phòng xem chung! Mã phòng: ${roomId}`, isSystem: true, time: new Date() },
            { _id: 'welcome-2', sender: 'Hệ thống', text: 'Trình phát video đã được đồng bộ hóa thành công qua WebSockets.', isSystem: true, time: new Date() }
        ]);

        // Join the room
        socket.emit('join-room', {
            roomId,
            username: user?.username || `Guest_${Math.floor(Math.random() * 1000)}`,
            avatar: user?.avatar
        });

        // Listen for messages
        socket.on('message', (msg: any) => {
            setPartyMessages(prev => {
                if (prev.some(m => m._id === msg._id)) return prev;
                return [...prev, {
                    ...msg,
                    isSelf: msg.sender === user?.username
                }];
            });
        });

        // Listen for active members list
        socket.on('room-members', (members: any[]) => {
            setRoomMembers(members);
        });

        // Listen for player sync events from others
        socket.on('player-play', ({ time }: { time: number }) => {
            if (videoPlayerRef.current) {
                videoPlayerRef.current.play();
                const localTime = videoPlayerRef.current.getCurrentTime();
                // Sync position if difference is more than 3 seconds
                if (Math.abs(localTime - time) > 3) {
                    videoPlayerRef.current.seek(time);
                }
            }
        });

        socket.on('player-pause', () => {
            if (videoPlayerRef.current) {
                videoPlayerRef.current.pause();
            }
        });

        socket.on('player-seek', ({ time }: { time: number }) => {
            if (videoPlayerRef.current) {
                videoPlayerRef.current.seek(time);
            }
        });

        // Listen for status query from newly joined users
        socket.on('get-playback-state', ({ requesterId }: { requesterId: string }) => {
            if (videoPlayerRef.current) {
                const time = videoPlayerRef.current.getCurrentTime();
                socket.emit('send-playback-state', {
                    requesterId,
                    time,
                    isPlaying: true // Assume active playing state to request matching status
                });
            }
        });

        // Listen for status response when we join
        socket.on('receive-playback-state', ({ time, isPlaying }: { time: number, isPlaying: boolean }) => {
            if (videoPlayerRef.current) {
                videoPlayerRef.current.seek(time);
                if (isPlaying) {
                    videoPlayerRef.current.play();
                } else {
                    videoPlayerRef.current.pause();
                }
            }
        });

        // Request initial state synchronization from other members
        socket.emit('request-sync');

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [roomId, user]);

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
        setInitialTime(0); 
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

    const handleTimeUpdate = (currentTime: number, duration?: number) => {
        currentTimeRef.current = currentTime;
        if (duration) episodeDurationRef.current = duration;
        if (!user || !currentEpisode || !movie.slug) return;

        if (timeUpdateTimeout.current) {
            clearTimeout(timeUpdateTimeout.current);
        }

        timeUpdateTimeout.current = setTimeout(() => {
            updateWatchProgress(movie.slug, currentEpisode.slug, currentTime, duration || episodeDurationRef.current);
        }, 5000);
    };

    // Watch Party Creation
    const handleCreateWatchParty = () => {
        if (user?.subscription?.plan !== 'VIP') {
            alert('Chức năng Tạo phòng xem chung chỉ dành riêng cho gói thành viên VIP!');
            return;
        }
        const roomCode = `NOIR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        setSearchParams({ roomId: roomCode });
        // Automatically start playing first episode if not already playing
        if (!currentEpisode && episodes.length > 0) {
            setCurrentEpisode(episodes[0]);
        }
    };

    const handleLeaveWatchParty = () => {
        setSearchParams({});
    };

    const handleCopyPartyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSendPartyMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!partyInput.trim() || !user) return;
        if (roomId && socketRef.current) {
            socketRef.current.emit('send-message', { text: partyInput.trim() });
        } else {
            setPartyMessages(prev => [
                ...prev,
                { sender: user.username, text: partyInput.trim(), time: new Date(), isSelf: true }
            ]);
        }
        setPartyInput('');
    };

    const handleSocketPlay = (currentTime: number) => {
        if (roomId && socketRef.current) {
            socketRef.current.emit('player-play', { time: currentTime });
        }
    };

    const handleSocketSeek = (time: number) => {
        if (roomId && socketRef.current) {
            socketRef.current.emit('player-seek', { time });
        }
    };

    // Comments submission
    const handleCommentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setCommentError('');
        setCommentSuccess('');

        if (!user) {
            setCommentError('Vui lòng đăng nhập để gửi bình luận.');
            return;
        }

        if (!commentContent.trim()) {
            setCommentError('Nội dung bình luận không được bỏ trống.');
            return;
        }

        const token = localStorage.getItem('noirmovie_token');
        if (!token) {
            setCommentError('Vui lòng đăng nhập lại để bình luận.');
            return;
        }

        try {
            const res = await fetch(`/api/movies/${slug}/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    content: commentContent,
                    rating: commentRating || undefined,
                    isSpoiler: commentIsSpoiler
                })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Có lỗi xảy ra.');
            }

            setCommentSuccess('Gửi bình luận thành công!');
            setCommentContent('');
            setCommentRating(null);
            setCommentIsSpoiler(false);
            
            // Reload comments list
            fetchComments();
        } catch (err: any) {
            setCommentError(err.message || 'Lỗi gửi bình luận.');
        }
    };

    const toggleSpoilerVisibility = (commentId: string) => {
        setVisibleSpoilers(prev => ({
            ...prev,
            [commentId]: !prev[commentId]
        }));
    };

    const renderLockOverlay = (required: 'Standard' | 'VIP') => {
        const isVip = required === 'VIP';
        const title = isVip ? 'Đặc Quyền Thành Viên VIP' : 'Yêu Cầu Nâng Cấp Gói Cước';
        const description = isVip 
            ? 'Bộ phim bom tấn chất lượng 4K này chỉ dành riêng cho các thành viên VIP của NoirMovie.' 
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
        if (roomId && socketRef.current) {
            socketRef.current.emit('player-pause');
        }
    };

    return (
        <div className="min-h-screen bg-background pb-16">
            <Hero
                movie={movie}
                imageDomain={imageDomain}
                onPlayClick={handlePlayClick}
            />

            <main className="pt-8 max-w-[1920px] mx-auto px-6 md:px-container-desktop">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* Left Column: Player / Lock and Details */}
                    <div className="lg:col-span-8 space-y-6" ref={playerRef}>
                        
                        {/* Interactive Player Box */}
                        {!hasAccess ? (
                            renderLockOverlay(requiredPlan as 'Standard' | 'VIP')
                        ) : currentEpisode ? (
                             <VideoPlayer
                                ref={videoPlayerRef}
                                episode={currentEpisode}
                                posterUrl={movie.poster_url?.startsWith('http') ? movie.poster_url : `${imageDomain}/uploads/movies/${movie.poster_url || movie.thumb_url}`}
                                initialTime={initialTime}
                                onTimeUpdate={handleTimeUpdate}
                                onPause={handlePause}
                                onPlay={handleSocketPlay}
                                onSeek={handleSocketSeek}
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
                            <div className="p-5 rounded-2xl glass-panel flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div>
                                    <h3 className="text-lg font-bold text-white">Đang phát: Tập {currentEpisode.name}</h3>
                                    <p className="text-xs text-on-surface-variant/75 mt-1">{currentEpisode.filename}</p>
                                </div>

                                {/* VIP Watch Party Trigger */}
                                {user?.subscription?.plan === 'VIP' && !roomId && (
                                    <button
                                        onClick={handleCreateWatchParty}
                                        className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:brightness-110 text-black font-headline font-bold text-xs py-2.5 px-4 rounded-xl transition duration-300 flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/10 cursor-pointer self-start sm:self-auto"
                                    >
                                        <Crown size={14} />
                                        Tạo phòng xem chung
                                    </button>
                                )}
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

                    {/* Right Column: Watch Party Chat OR Servers/Episode List */}
                    <div className="lg:col-span-4 space-y-6">
                        
                        {roomId ? (
                            /* Watch Party Sidebar Panels */
                            <div className="glass-panel rounded-2xl overflow-hidden border border-white/10 flex flex-col h-[520px]">
                                
                                {/* Watch Party Panel Tab Header */}
                                <div className="bg-zinc-950/80 border-b border-white/5 p-3 flex justify-between items-center shrink-0">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setRightPanelTab('chat')}
                                            className={`text-xs font-headline font-extrabold uppercase py-1.5 px-3 rounded-lg border transition ${
                                                rightPanelTab === 'chat'
                                                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                                                    : 'bg-transparent border-transparent text-zinc-400 hover:text-white'
                                            }`}
                                        >
                                            <MessageSquare size={12} className="inline mr-1" />
                                            Trò chuyện
                                        </button>
                                        <button
                                            onClick={() => setRightPanelTab('members')}
                                            className={`text-xs font-headline font-extrabold uppercase py-1.5 px-3 rounded-lg border transition ${
                                                rightPanelTab === 'members'
                                                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                                                    : 'bg-transparent border-transparent text-zinc-400 hover:text-white'
                                            }`}
                                        >
                                            <Users size={12} className="inline mr-1" />
                                            Thành viên ({roomMembers.length})
                                        </button>
                                        <button
                                            onClick={() => setRightPanelTab('episodes')}
                                            className={`text-xs font-headline font-extrabold uppercase py-1.5 px-3 rounded-lg border transition ${
                                                rightPanelTab === 'episodes'
                                                    ? 'bg-primary/10 border-primary/20 text-primary'
                                                    : 'bg-transparent border-transparent text-zinc-400 hover:text-white'
                                            }`}
                                        >
                                            <Tv size={12} className="inline mr-1" />
                                            Tập phim
                                        </button>
                                    </div>
                                    
                                    {/* Leave room */}
                                    <button 
                                        onClick={handleLeaveWatchParty}
                                        title="Rời phòng xem chung"
                                        className="text-zinc-500 hover:text-primary transition p-1 hover:bg-white/5 rounded-lg"
                                    >
                                        <LogOut size={16} />
                                    </button>
                                </div>

                                {rightPanelTab === 'chat' ? (
                                    /* Tab 1: Chat interface */
                                    <>
                                        {/* Room Header Info */}
                                        <div className="bg-white/5 px-4 py-3 border-b border-white/5 flex justify-between items-center shrink-0 text-xs text-zinc-400">
                                            <span className="flex items-center gap-1.5">
                                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                                Phòng hoạt động
                                            </span>
                                            <button 
                                                onClick={handleCopyPartyLink}
                                                className="flex items-center gap-1 hover:text-white transition font-semibold"
                                            >
                                                {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                                                {copied ? 'Đã sao chép link' : 'Mời bạn bè'}
                                            </button>
                                        </div>

                                        {/* Chat Messages Area */}
                                        <div 
                                            ref={chatContainerRef}
                                            className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar min-h-0"
                                        >
                                            {partyMessages.map((msg, index) => {
                                                if (msg.isSystem) {
                                                    return (
                                                        <div key={index} className="text-center">
                                                            <span className="inline-block bg-white/5 px-2.5 py-1 rounded-lg text-[10px] text-zinc-500 border border-white/5 leading-relaxed">
                                                                {msg.text}
                                                            </span>
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <div key={index} className={`flex flex-col ${msg.isSelf ? 'items-end' : 'items-start'}`}>
                                                        <span className="text-[10px] text-zinc-500 font-bold mb-0.5">@{msg.sender}</span>
                                                        <div className={`text-xs px-3.5 py-2 rounded-2xl max-w-[85%] leading-relaxed ${
                                                            msg.isSelf 
                                                                ? 'bg-primary text-white rounded-tr-none shadow-md shadow-primary/10' 
                                                                : 'bg-surface-container-high/60 text-zinc-200 rounded-tl-none border border-white/5'
                                                        }`}>
                                                            {msg.text}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Chat Input Field */}
                                        <form onSubmit={handleSendPartyMessage} className="p-3 border-t border-white/5 bg-zinc-950/80 flex gap-2 shrink-0">
                                            <input 
                                                type="text"
                                                placeholder="Nhập nội dung chát..."
                                                value={partyInput}
                                                onChange={e => setPartyInput(e.target.value)}
                                                className="flex-1 bg-surface-container border border-white/5 rounded-xl px-3.5 py-2 text-xs outline-none text-on-surface focus:border-primary/50 placeholder:text-zinc-500"
                                            />
                                            <button 
                                                type="submit"
                                                className="bg-primary hover:bg-primary/95 text-white p-2.5 rounded-xl transition cursor-pointer flex-shrink-0"
                                            >
                                                <Send size={14} />
                                            </button>
                                        </form>
                                    </>
                                ) : rightPanelTab === 'members' ? (
                                    /* Tab 2: Members list */
                                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                        <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-2">Thành viên trực tuyến ({roomMembers.length})</div>
                                        {roomMembers.map((member, idx) => (
                                            <div key={idx} className="flex items-center gap-2.5 p-2 rounded-xl bg-white/5 border border-white/5">
                                                <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center text-xs font-bold text-primary">
                                                    {member.avatar ? (
                                                        <img src={member.avatar} alt={member.username} className="w-full h-full object-cover" />
                                                    ) : (
                                                        member.username.charAt(0).toUpperCase()
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <span className="text-xs font-bold text-white block truncate">@{member.username}</span>
                                                    <span className="text-[9px] text-emerald-400 flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Trực tuyến
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    /* Tab 3: Episodes selector during party */
                                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                                        {validServers.length > 0 ? (
                                            <EpisodeList
                                                episodes={episodes}
                                                currentEpisodeSlug={currentEpisode?.slug || ''}
                                                onEpisodeSelect={handleEpisodeSelect}
                                            />
                                        ) : (
                                            <div className="text-center py-8 text-zinc-500 text-xs">Không có tập phim</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* Regular Sidebar Panels (No Watch Party Active) */
                            <>
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
                            </>
                        )}
                    </div>

                </div>

                {/* Similar Movies Recommendation Grid */}
                {similarMovies.length > 0 && (
                    <div className="mt-16 border-t border-white/5 pt-10">
                        <div className="flex items-center gap-2 mb-6">
                            <span className="text-primary font-bold">🎬</span>
                            <h2 className="font-headline text-2xl font-bold text-white tracking-tight">Có Thể Bạn Cũng Thích</h2>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                            {similarMovies.map((simMovie: any) => {
                                const thumbUrl = simMovie.thumb_url || simMovie.poster_url;
                                const simThumb = thumbUrl?.startsWith('http') 
                                    ? thumbUrl 
                                    : `${imageDomain}/uploads/movies/${thumbUrl}`;
                                
                                return (
                                    <div 
                                        key={simMovie._id}
                                        onClick={() => navigate(`/phim/${simMovie.slug}`)}
                                        className="bg-surface-container/30 rounded-xl overflow-hidden border border-white/5 cursor-pointer relative group transition-all duration-300 hover:scale-[1.02] hover:border-primary/20 shadow-md flex flex-col justify-between"
                                    >
                                        <div className="aspect-[2/3] w-full overflow-hidden relative">
                                            <img 
                                                src={simThumb} 
                                                alt={simMovie.name}
                                                className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/120x180?text=No+Image';
                                                }}
                                            />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition duration-300 flex items-center justify-center">
                                                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white shadow-lg">
                                                    <Play size={16} fill="currentColor" className="ml-0.5" />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="p-3">
                                            <h4 className="text-xs font-bold text-white truncate group-hover:text-primary transition-colors">{simMovie.name}</h4>
                                            <p className="text-[10px] text-zinc-500 mt-0.5">{simMovie.year || 'N/A'}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Comments & Reviews Glassmorphic Box */}
                <div className="mt-12 border-t border-white/5 pt-10">
                    <div className="flex items-center gap-2 mb-8">
                        <MessageSquare className="text-primary" size={24} />
                        <h2 className="font-headline text-2xl font-bold text-white tracking-tight">Đánh Giá & Bình Luận</h2>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        
                        {/* Left Column: Comment Submission Form */}
                        <div className="lg:col-span-4 glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
                            <h3 className="font-headline font-bold text-lg text-white">Viết đánh giá của bạn</h3>
                            
                            {commentError && (
                                <div className="p-3 bg-primary/10 border border-primary/20 text-primary text-xs rounded-xl flex items-center gap-1.5">
                                    <AlertTriangle size={14} className="shrink-0" />
                                    <span>{commentError}</span>
                                </div>
                            )}

                            {commentSuccess && (
                                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl flex items-center gap-1.5">
                                    <CheckCircle size={14} className="shrink-0" />
                                    <span>{commentSuccess}</span>
                                </div>
                            )}

                            {user ? (
                                <form onSubmit={handleCommentSubmit} className="space-y-4">
                                    {/* Star Rating Selection */}
                                    <div className="space-y-1.5">
                                        <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Chấm điểm phim (sao)</span>
                                        <div className="flex items-center gap-1 bg-white/5 py-2 px-3.5 rounded-xl border border-white/5 w-max">
                                            {[1, 2, 3, 4, 5].map((star) => {
                                                const isFilled = commentRating !== null && star <= commentRating;
                                                return (
                                                    <button
                                                        key={star}
                                                        type="button"
                                                        onClick={() => setCommentRating(star)}
                                                        className="text-zinc-600 hover:scale-110 active:scale-95 transition cursor-pointer"
                                                    >
                                                        <Star 
                                                            size={22} 
                                                            fill={isFilled ? '#f59e0b' : 'none'} 
                                                            className={isFilled ? 'text-amber-400' : 'text-zinc-600'} 
                                                        />
                                                    </button>
                                                );
                                            })}
                                            {commentRating && (
                                                <span className="text-xs text-amber-400 font-bold ml-2">
                                                    {commentRating}/5
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Spoiler Checkbox */}
                                    <div className="flex items-center gap-2 bg-white/5 py-2.5 px-3.5 rounded-xl border border-white/5">
                                        <input 
                                            type="checkbox" 
                                            id="isSpoiler"
                                            checked={commentIsSpoiler}
                                            onChange={e => setCommentIsSpoiler(e.target.checked)}
                                            className="accent-primary w-4 h-4 rounded cursor-pointer"
                                        />
                                        <label htmlFor="isSpoiler" className="text-xs text-zinc-300 font-medium cursor-pointer selection:bg-transparent">
                                            Bình luận này có chứa spoil tình tiết phim
                                        </label>
                                    </div>

                                    {/* Textarea comment */}
                                    <div className="space-y-1.5">
                                        <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Nội dung đánh giá</span>
                                        <textarea
                                            placeholder="Cảm nhận của bạn về bộ phim..."
                                            value={commentContent}
                                            onChange={e => setCommentContent(e.target.value)}
                                            rows={4}
                                            required
                                            className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-primary/50 resize-none placeholder:text-zinc-500 focus:ring-1 focus:ring-primary/20"
                                        />
                                    </div>

                                    <button 
                                        type="submit"
                                        className="w-full bg-primary hover:bg-primary/95 text-white font-semibold py-3 px-4 rounded-xl transition duration-300 flex items-center justify-center gap-1.5 crimson-glow cursor-pointer"
                                    >
                                        <Send size={14} />
                                        Gửi đánh giá
                                    </button>
                                </form>
                            ) : (
                                <div className="text-center py-6 bg-zinc-950/40 rounded-2xl border border-white/5">
                                    <p className="text-xs text-zinc-400 mb-4 px-4">Đăng nhập tài khoản của bạn để để lại đánh giá và nhận xét về bộ phim.</p>
                                    <button
                                        onClick={() => {
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                            window.dispatchEvent(new CustomEvent('trigger-login-modal'));
                                        }}
                                        className="bg-primary hover:bg-primary/90 text-white font-semibold py-2 px-5 rounded-xl text-xs transition duration-300 shadow-md shadow-primary/10"
                                    >
                                        Đăng Nhập Ngay
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Right Column: Comments List */}
                        <div className="lg:col-span-8 space-y-4">
                            {commentsLoading ? (
                                <div className="text-center py-10 text-xs text-zinc-500 animate-pulse">Đang tải danh sách bình luận...</div>
                            ) : comments.length === 0 ? (
                                <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/5 text-sm text-zinc-400">
                                    Chưa có lượt bình luận nào. Hãy là người đầu tiên chia sẻ cảm nghĩ về phim!
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {comments.map((comment) => {
                                        const isSpoilerVisible = visibleSpoilers[comment._id] || false;
                                        const needBlur = comment.isSpoiler && !isSpoilerVisible;
                                        
                                        return (
                                            <div 
                                                key={comment._id}
                                                className="glass-panel p-5 rounded-2xl border border-white/5 space-y-3 relative overflow-hidden"
                                            >
                                                {/* User Info Header */}
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center text-xs font-bold text-primary">
                                                            {comment.avatar ? (
                                                                <img src={comment.avatar} alt={comment.username} className="w-full h-full object-cover" />
                                                            ) : (
                                                                comment.username.charAt(0).toUpperCase()
                                                            )}
                                                        </div>
                                                        <div>
                                                            <span className="text-xs font-bold text-white block">@{comment.username}</span>
                                                            <small className="text-[9px] text-zinc-500 block mt-0.5">
                                                                {new Date(comment.createdAt).toLocaleDateString('vi-VN', {
                                                                    day: '2-digit',
                                                                    month: '2-digit',
                                                                    year: 'numeric',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                })}
                                                            </small>
                                                        </div>
                                                    </div>

                                                    {/* Rating Display */}
                                                    {comment.rating && (
                                                        <div className="flex items-center gap-0.5 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg text-amber-400 text-xs font-bold">
                                                            ★ {comment.rating}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Comment Content (with spoiler shield option) */}
                                                <div className="relative">
                                                    {needBlur ? (
                                                        <div 
                                                            onClick={() => toggleSpoilerVisibility(comment._id)}
                                                            className="bg-black/90 backdrop-blur-md border border-white/5 py-4 px-6 rounded-xl text-center text-xs font-medium text-amber-500 cursor-pointer hover:border-amber-500/30 hover:scale-[1.005] active:scale-[0.995] transition-all flex flex-col items-center justify-center gap-1.5"
                                                        >
                                                            <AlertTriangle size={18} className="text-amber-500 shrink-0" />
                                                            <span>Bình luận chứa tiết lộ cốt truyện! Nhấp để hiển thị</span>
                                                        </div>
                                                    ) : (
                                                        <div className="text-xs md:text-sm text-zinc-300 leading-relaxed font-sans pr-2">
                                                            {comment.content}
                                                            {comment.isSpoiler && (
                                                                <button 
                                                                    onClick={() => toggleSpoilerVisibility(comment._id)}
                                                                    className="text-[10px] text-amber-500 font-bold hover:underline block mt-2"
                                                                >
                                                                    Ẩn bình luận spoil
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                    </div>
                </div>

            </main>
        </div>
    );
};
