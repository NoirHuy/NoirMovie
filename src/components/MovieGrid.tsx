import React, { useState, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Play, Bookmark, BookmarkCheck, Loader2, VolumeX } from "lucide-react";
import { useAuth } from "../context/AuthContext";

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

interface MovieGridProps {
    movies: Movie[];
    title?: string;
}

// Map slugs to optimized public mp4 trailers deterministically
const getPreviewVideo = (slug: string) => {
    const videos = [
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
    ];
    let hash = 0;
    for (let i = 0; i < slug.length; i++) {
        hash = slug.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % videos.length;
    return videos[index];
};

const MovieCard: React.FC<{ movie: Movie }> = ({ movie }) => {
    const { user, isInWatchlist, addToWatchlist, removeFromWatchlist } = useAuth();
    const navigate = useNavigate();
    const [hoverActive, setHoverActive] = useState(false);
    const [offsetStyle, setOffsetStyle] = useState<React.CSSProperties>({});
    const [loadingVideo, setLoadingVideo] = useState(true);
    
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const cardRef = useRef<HTMLDivElement>(null);
    const inWatchlist = isInWatchlist(movie.slug);
    const videoUrl = getPreviewVideo(movie.slug);

    const getThumbUrl = (url: string) => {
        if (!url) return "https://via.placeholder.com/220x330?text=No+Image";
        if (url.startsWith("http")) return url;
        return "https://img.ophim.live/uploads/movies/" + url;
    };

    const handleMouseEnter = useCallback(() => {
        timerRef.current = setTimeout(() => {
            if (cardRef.current) {
                const rect = cardRef.current.getBoundingClientRect();
                const cardWidth = rect.width;
                const spaceLeft = rect.left;
                const spaceRight = window.innerWidth - rect.right;
                
                // Netflix-style alignment checking:
                const overflowSpace = cardWidth * 0.17 + 20;

                // Scale W to 1.35x. So it expands by 17.5% on left and 17.5% on right.
                if (spaceLeft < overflowSpace) {
                    setOffsetStyle({
                        left: 0,
                        width: `${cardWidth * 1.35}px`,
                        transform: "scale(1.08) translateY(-6%)",
                        transformOrigin: "left top",
                    });
                } else if (spaceRight < overflowSpace) {
                    setOffsetStyle({
                        right: 0,
                        width: `${cardWidth * 1.35}px`,
                        transform: "scale(1.08) translateY(-6%)",
                        transformOrigin: "right top",
                    });
                } else {
                    setOffsetStyle({
                        left: `-${cardWidth * 0.175}px`,
                        width: `${cardWidth * 1.35}px`,
                        transform: "scale(1.08) translateY(-6%)",
                        transformOrigin: "center top",
                    });
                }
            }
            setHoverActive(true);
        }, 500); // 500ms hover delay for standard Netflix feel
    }, [movie.slug]);

    const handleMouseLeave = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        setHoverActive(false);
        setLoadingVideo(true);
    }, []);

    const handleWatchlistToggle = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user) {
            window.dispatchEvent(new CustomEvent("trigger-login-modal"));
            return;
        }
        if (inWatchlist) {
            removeFromWatchlist(movie.slug);
        } else {
            addToWatchlist({
                slug: movie.slug,
                name: movie.name,
                thumb_url: movie.thumb_url,
                year: movie.year,
                origin_name: movie.origin_name,
            });
        }
    };

    return (
        <div
            ref={cardRef}
            className="relative group cursor-pointer"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* Standard movie card content (Hidden when hover is active to show the zoom overlay cleanly) */}
            <div className={`transition-all duration-200 ${hoverActive ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
                <Link to={"/phim/" + movie.slug} className="block">
                    <div className="aspect-[2/3] rounded-xl overflow-hidden mb-3 relative ring-1 ring-white/5 bg-surface-container transition-all duration-300 group-hover:scale-[1.02] group-hover:ring-primary/40 group-hover:shadow-[0_0_20px_rgba(255,84,81,0.2)]">
                        <img
                            src={getThumbUrl(movie.thumb_url)}
                            alt={movie.name}
                            className="w-full h-full object-cover transition-transform duration-500"
                            loading="lazy"
                            onError={(e) => { (e.target as HTMLImageElement).src = "https://via.placeholder.com/220x330?text=No+Image"; }}
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-300">
                                <Play fill="currentColor" size={20} className="ml-1" />
                            </div>
                        </div>
                        {movie.quality && (
                            <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-primary/80 text-white text-[10px] font-bold rounded-md backdrop-blur-sm">
                                {movie.quality}
                            </div>
                        )}
                    </div>
                    <h3 className="text-sm font-bold text-white group-hover:text-primary transition-colors truncate" title={movie.name}>
                        {movie.name}
                    </h3>
                    <p className="text-xs text-on-surface-variant/70 mt-1 font-medium">{movie.year || "Đang cập nhật"}</p>
                </Link>
            </div>

            {/* Netflix-style zoom & autoplay expanded card overlay (covers the original card completely) */}
            {hoverActive && (
                <div
                    className="absolute top-0 z-50 rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.9)] border border-white/10 animate-fade-in-scale transition-all duration-300"
                    style={{ 
                        ...offsetStyle,
                        background: "#141316",
                    }}
                    onMouseEnter={() => { if (timerRef.current) clearTimeout(timerRef.current); setHoverActive(true); }}
                    onMouseLeave={handleMouseLeave}
                >
                    {/* Media container (Always landscape 16:9) */}
                    <div className="relative aspect-video w-full overflow-hidden bg-black">
                        {/* Static image shown underneath video / while video loads */}
                        <img
                            src={getThumbUrl(movie.thumb_url)}
                            alt={movie.name}
                            className="absolute inset-0 w-full h-full object-cover"
                        />
                        
                        {/* Autoplay Video Player */}
                        <video
                            src={videoUrl}
                            muted
                            playsInline
                            autoPlay
                            loop
                            onCanPlay={() => setLoadingVideo(false)}
                            onPlaying={() => setLoadingVideo(false)}
                            onWaiting={() => setLoadingVideo(true)}
                            className="absolute inset-0 w-full h-full object-cover z-10"
                        />

                        {/* Dark Overlay gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#141316] via-black/25 to-black/20 z-20" />

                        {/* Top corner quality/VIP indicator */}
                        {movie.quality && (
                            <span className="absolute top-2 left-2 px-2 py-0.5 bg-primary text-white text-[9px] font-bold rounded z-30 shadow-md">
                                {movie.quality}
                            </span>
                        )}

                        {/* Bottom-right audio visual tag (muted reminder) */}
                        <span className="absolute bottom-2 right-2 p-1 bg-black/60 rounded-full text-zinc-400 z-30 transition-colors" title="Bản xem thử đã tắt tiếng">
                            <VolumeX size={12} />
                        </span>

                        {/* Loading indicator */}
                        {loadingVideo && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-20">
                                <Loader2 className="animate-spin text-primary" size={22} />
                            </div>
                        )}
                    </div>

                    {/* Metadata & Actions section */}
                    <div className="p-3.5 space-y-2.5 bg-[#141316]">
                        <div>
                            <h4 className="font-headline font-bold text-white text-sm leading-snug line-clamp-1">
                                {movie.name}
                            </h4>
                            <p className="text-[10px] text-on-surface-variant/50 truncate font-semibold">
                                {movie.origin_name}
                            </p>
                        </div>

                        {/* Badges/Tags row */}
                        <div className="flex flex-wrap items-center gap-1.5 text-[9px]">
                            {movie.year && (
                                <span className="px-2 py-0.5 bg-surface-container rounded-full text-on-surface-variant/90 font-semibold">{movie.year}</span>
                            )}
                            {movie.episode_current && (
                                <span className="px-2 py-0.5 bg-primary/20 text-primary rounded-full font-bold">{movie.episode_current}</span>
                            )}
                            {movie.lang && (
                                <span className="px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded-full font-medium">{movie.lang}</span>
                            )}
                        </div>

                        {/* Category list */}
                        {movie.category && movie.category.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                                {movie.category.slice(0, 3).map(cat => (
                                    <span key={cat.slug} className="text-[8px] px-1.5 py-0.5 border border-white/5 rounded text-on-surface-variant/60 bg-white/5 font-medium">
                                        {cat.name}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Actions Row */}
                        <div className="flex gap-2 pt-1 border-t border-white/5">
                            <button
                                onClick={() => navigate("/phim/" + movie.slug)}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-primary hover:bg-primary/80 text-white text-xs font-bold rounded-lg transition-all active:scale-95 shadow-[0_2px_10px_rgba(255,84,81,0.2)] cursor-pointer"
                            >
                                <Play size={12} fill="currentColor" /> Xem phim
                            </button>
                            <button
                                onClick={handleWatchlistToggle}
                                title={inWatchlist ? "Xóa khỏi danh sách yêu thích" : "Thêm vào danh sách yêu thích"}
                                className={"flex items-center justify-center p-2 rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer border " + (inWatchlist ? "bg-primary/20 border-primary/40 text-primary" : "bg-surface-container border-white/10 text-on-surface-variant hover:border-primary/30 hover:text-primary")}
                            >
                                {inWatchlist ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export const MovieGrid: React.FC<MovieGridProps> = ({ movies, title }) => {
    if (!movies || movies.length === 0) {
        return (
            <div className="container mx-auto px-6 md:px-container-desktop py-8 text-center">
                <h2 className="text-xl text-on-surface-variant/75 font-medium">Không tìm thấy dữ liệu phim.</h2>
            </div>
        );
    }

    return (
        <div className="max-w-[1920px] mx-auto px-6 md:px-container-desktop py-8">
            {title && (
                <h2 className="font-headline text-2xl md:text-3xl font-bold text-white mb-6 tracking-tight">
                    {title}
                </h2>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {movies.map((movie) => (
                    <MovieCard key={movie._id || movie.slug} movie={movie} />
                ))}
            </div>
        </div>
    );
};