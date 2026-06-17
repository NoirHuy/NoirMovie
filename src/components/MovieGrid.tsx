import React, { useState, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Play, Bookmark, BookmarkCheck, Loader2, VolumeX, Star, Calendar, Film, Users } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { apiService } from "../services/api";

interface Movie {
    _id: string;
    name: string;
    slug: string;
    origin_name: string;
    thumb_url: string;
    year: number;
    category?: { name: string; slug: string }[];
    episode_current?: string;
    quality?: string;
    lang?: string;
}

interface MovieDetail {
    content?: string;
    actor?: string[];
    director?: string[];
    tmdb?: { vote_average?: number; vote_count?: number };
    time?: string;
    country?: { name: string }[];
}

interface MovieGridProps {
    movies: Movie[];
    title?: string;
}

const getPreviewVideo = (slug: string) => {
    const videos = [
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    ];
    let hash = 0;
    for (let i = 0; i < slug.length; i++) hash = slug.charCodeAt(i) + ((hash << 5) - hash);
    return videos[Math.abs(hash) % videos.length];
};

const getThumbUrl = (url: string) => {
    if (!url) return "https://via.placeholder.com/220x330?text=No+Image";
    if (url.startsWith("http")) return url;
    return "https://img.ophim.live/uploads/movies/" + url;
};

const MovieCard: React.FC<{ movie: Movie }> = ({ movie }) => {
    const { user, isInWatchlist, addToWatchlist, removeFromWatchlist } = useAuth();
    const navigate = useNavigate();
    const [hoverActive, setHoverActive] = useState(false);
    const [offsetStyle, setOffsetStyle] = useState<React.CSSProperties>({});
    const [loadingVideo, setLoadingVideo] = useState(true);
    const [detail, setDetail] = useState<MovieDetail | null>(null);
    const [fetchingDetail, setFetchingDetail] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const cardRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const detailFetchedRef = useRef(false);
    const inWatchlist = isInWatchlist(movie.slug);
    const videoUrl = getPreviewVideo(movie.slug);

    // Callback ref: fires the instant the <video> element mounts in the DOM.
    // This avoids race conditions with useEffect which runs after the paint.
    const videoCallbackRef = useCallback((vid: HTMLVideoElement | null) => {
        videoRef.current = vid;
        if (!vid) return;
        vid.muted = true;
        vid.loop = true;
        vid.playsInline = true;
        vid.src = videoUrl;

        const play = () => {
            vid.play()
                .then(() => setLoadingVideo(false))
                .catch(() => {
                    // Some browsers block autoplay; retry after a short delay.
                    setTimeout(() =>
                        vid.play()
                            .then(() => setLoadingVideo(false))
                            .catch(() => setLoadingVideo(false))
                    , 300);
                });
        };

        if (vid.readyState >= 3) {
            // Already buffered enough — play immediately.
            play();
        } else {
            vid.addEventListener("canplay", play, { once: true });
        }

        vid.load();

        // Fallback: hide spinner after 4 s regardless.
        setTimeout(() => setLoadingVideo(false), 4000);
    }, [videoUrl]);

    const prefetchDetail = useCallback(() => {
        if (detailFetchedRef.current || fetchingDetail) return;
        setFetchingDetail(true);
        apiService.getMovieDetail(movie.slug)
            .then((res: any) => {
                if (res.status === "success" && res.data?.item) {
                    const item = res.data.item;
                    setDetail({ content: item.content, actor: item.actor, director: item.director, tmdb: item.tmdb, time: item.time, country: item.country });
                    detailFetchedRef.current = true;
                }
            })
            .catch(() => { detailFetchedRef.current = true; })
            .finally(() => setFetchingDetail(false));
    }, [movie.slug, fetchingDetail]);

    const handleMouseEnter = useCallback(() => {
        prefetchDetail();
        timerRef.current = setTimeout(() => {
            if (cardRef.current) {
                const rect = cardRef.current.getBoundingClientRect();
                const cardWidth = rect.width;
                const expandedW = cardWidth * 2.2;
                const spaceLeft = rect.left;
                const spaceRight = window.innerWidth - rect.right;
                if (spaceLeft < expandedW / 2) {
                    setOffsetStyle({ left: 0, width: `${expandedW}px`, transformOrigin: "left top" });
                } else if (spaceRight < expandedW / 2) {
                    setOffsetStyle({ right: 0, width: `${expandedW}px`, transformOrigin: "right top" });
                } else {
                    setOffsetStyle({ left: `-${(expandedW - cardWidth) / 2}px`, width: `${expandedW}px`, transformOrigin: "center top" });
                }
            }
            setHoverActive(true);
        }, 500);
    }, [prefetchDetail]);

    const handleMouseLeave = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        setHoverActive(false);
        setLoadingVideo(true);
        if (videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime = 0; }
    }, []);

    const handleWatchlistToggle = (e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation();
        if (!user) { window.dispatchEvent(new CustomEvent("trigger-login-modal")); return; }
        inWatchlist ? removeFromWatchlist(movie.slug) : addToWatchlist({ slug: movie.slug, name: movie.name, thumb_url: movie.thumb_url, year: movie.year, origin_name: movie.origin_name });
    };

    const rating = detail?.tmdb?.vote_average;
    const actors = detail?.actor?.slice(0, 4).join(", ");
    const directors = detail?.director?.filter(Boolean).slice(0, 2).join(", ");
    const synopsis = detail?.content?.replace(/<[^>]*>/g, "").trim();

    return (
        <div ref={cardRef} className="relative group cursor-pointer" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            <div className={`transition-opacity duration-200 ${hoverActive ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
                <Link to={"/phim/" + movie.slug} className="block">
                    <div className="aspect-[2/3] rounded-xl overflow-hidden mb-3 relative ring-1 ring-white/5 bg-surface-container">
                        <img src={getThumbUrl(movie.thumb_url)} alt={movie.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).src = "https://via.placeholder.com/220x330?text=No+Image"; }} />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white shadow-lg"><Play fill="currentColor" size={20} className="ml-1" /></div>
                        </div>
                        {movie.quality && <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-primary/80 text-white text-[10px] font-bold rounded-md">{movie.quality}</div>}
                    </div>
                    <h3 className="text-sm font-bold text-white group-hover:text-primary transition-colors truncate" title={movie.name}>{movie.name}</h3>
                    <p className="text-xs text-on-surface-variant/70 mt-1">{movie.year || "Dang cap nhat"}</p>
                </Link>
            </div>
            {hoverActive && (
                <div className="absolute top-0 z-50 rounded-2xl overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.95)] border border-white/10 animate-fade-in-scale" style={{ ...offsetStyle, background: "#0f0e11" }} onMouseEnter={() => { if (timerRef.current) clearTimeout(timerRef.current); setHoverActive(true); }} onMouseLeave={handleMouseLeave}>
                    <div className="relative aspect-video w-full overflow-hidden bg-black">
                        <img src={getThumbUrl(movie.thumb_url)} alt={movie.name} className="absolute inset-0 w-full h-full object-cover" />
                        <video ref={videoCallbackRef} muted playsInline loop className={`absolute inset-0 w-full h-full object-cover z-10 transition-opacity duration-500 ${loadingVideo ? "opacity-0" : "opacity-100"}`} />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0f0e11] via-black/20 to-transparent z-20" />
                        {movie.quality && <span className="absolute top-2.5 left-3 px-2 py-0.5 bg-primary text-white text-[9px] font-bold rounded-md z-30 shadow-md">{movie.quality}</span>}
                        {rating && <span className="absolute top-2.5 right-3 flex items-center gap-0.5 px-2 py-0.5 bg-black/70 text-amber-400 text-[10px] font-bold rounded-md z-30 backdrop-blur-sm"><Star size={9} fill="currentColor" /> {rating.toFixed(1)}</span>}
                        <span className="absolute bottom-2.5 right-3 p-1.5 bg-black/60 rounded-full text-zinc-400 z-30" title="Dang phat tat tieng"><VolumeX size={11} /></span>
                        {loadingVideo && <div className="absolute inset-0 flex items-center justify-center z-30"><Loader2 className="animate-spin text-primary" size={28} /></div>}
                        <div className="absolute bottom-3 left-3 right-3 z-30">
                            <h4 className="font-headline font-black text-white text-base leading-tight line-clamp-1 drop-shadow-lg">{movie.name}</h4>
                            <p className="text-[11px] text-zinc-400 font-medium truncate">{movie.origin_name}</p>
                        </div>
                    </div>
                    <div className="p-4 space-y-3 bg-[#0f0e11]">
                        <div className="flex flex-wrap items-center gap-2 text-[10px]">
                            {movie.year && <span className="flex items-center gap-1 text-zinc-400 font-semibold"><Calendar size={9} /> {movie.year}</span>}
                            {movie.episode_current && <span className="px-2 py-0.5 bg-primary/20 text-primary rounded-full font-bold">{movie.episode_current}</span>}
                            {movie.lang && <span className="px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded-full font-medium">{movie.lang}</span>}
                            {detail?.time && <span className="flex items-center gap-1 text-zinc-500 font-medium"><Film size={9} /> {detail.time}</span>}
                            {detail?.country && detail.country.length > 0 && <span className="text-zinc-500 font-medium">{detail.country[0].name}</span>}
                        </div>
                        {movie.category && movie.category.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                                {movie.category.slice(0, 5).map(cat => <span key={cat.slug} className="text-[9px] px-2 py-0.5 border border-primary/20 rounded-full text-primary/80 bg-primary/5 font-medium">{cat.name}</span>)}
                            </div>
                        )}
                        {synopsis ? (
                            <p className="text-[11px] text-zinc-400 leading-relaxed line-clamp-3">{synopsis}</p>
                        ) : fetchingDetail ? (
                            <div className="flex items-center gap-2 text-[10px] text-zinc-600"><Loader2 className="animate-spin" size={10} /> Dang tai thong tin...</div>
                        ) : null}
                        {actors && <div className="flex items-start gap-1.5 text-[10px]"><Users size={10} className="text-zinc-500 mt-0.5 flex-shrink-0" /><div><span className="text-zinc-500 font-medium">Dien vien: </span><span className="text-zinc-300">{actors}</span></div></div>}
                        {directors && <div className="flex items-start gap-1.5 text-[10px]"><Film size={10} className="text-zinc-500 mt-0.5 flex-shrink-0" /><div><span className="text-zinc-500 font-medium">Dao dien: </span><span className="text-zinc-300">{directors}</span></div></div>}
                        <div className="flex gap-2 pt-1 border-t border-white/5">
                            <button onClick={() => navigate("/phim/" + movie.slug)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-primary hover:bg-primary/80 text-white text-xs font-bold rounded-xl transition-all active:scale-95 shadow-[0_2px_14px_rgba(255,84,81,0.3)] cursor-pointer"><Play size={13} fill="currentColor" /> Xem ngay</button>
                            <button onClick={handleWatchlistToggle} title={inWatchlist ? "Xoa khoi danh sach" : "Them vao danh sach"} className={"flex items-center justify-center px-3 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer border " + (inWatchlist ? "bg-primary/20 border-primary/40 text-primary" : "bg-zinc-800 border-white/10 text-zinc-400 hover:border-primary/40 hover:text-primary")}>{inWatchlist ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export const MovieGrid: React.FC<MovieGridProps> = ({ movies, title }) => {
    if (!movies || movies.length === 0) {
        return (<div className="container mx-auto px-6 md:px-container-desktop py-8 text-center"><h2 className="text-xl text-on-surface-variant/75 font-medium">Khong tim thay du lieu phim.</h2></div>);
    }
    return (
        <div className="max-w-[1920px] mx-auto px-6 md:px-container-desktop py-8">
            {title && <h2 className="font-headline text-2xl md:text-3xl font-bold text-white mb-6 tracking-tight">{title}</h2>}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 pb-24">
                {movies.map((movie) => (<MovieCard key={movie._id || movie.slug} movie={movie} />))}
            </div>
        </div>
    );
};