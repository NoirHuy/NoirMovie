import React, { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Bookmark, BookmarkCheck, Star, Calendar, Film, Users, Globe } from "lucide-react";
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
    tmdb?: { vote_average?: number };
    time?: string;
    country?: { name: string }[];
}

interface MovieGridProps {
    movies: Movie[];
    title?: string;
}

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
    const [detail, setDetail] = useState<MovieDetail | null>(null);
    const [fetchingDetail, setFetchingDetail] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const cardRef = useRef<HTMLDivElement>(null);
    const detailFetchedRef = useRef(false);
    const inWatchlist = isInWatchlist(movie.slug);

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
                const expandedW = cardWidth * 2.6;
                const spaceLeft = rect.left;
                const spaceRight = window.innerWidth - rect.right;
                if (spaceLeft < expandedW / 2) {
                    setOffsetStyle({ left: 0, width: `${expandedW}px` });
                } else if (spaceRight < expandedW / 2) {
                    setOffsetStyle({ right: 0, width: `${expandedW}px` });
                } else {
                    setOffsetStyle({ left: `-${(expandedW - cardWidth) / 2}px`, width: `${expandedW}px` });
                }
            }
            setHoverActive(true);
        }, 400);
    }, [prefetchDetail]);

    const handleMouseLeave = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        setHoverActive(false);
    }, []);

    const handleWatchlistToggle = (e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation();
        if (!user) { window.dispatchEvent(new CustomEvent("trigger-login-modal")); return; }
        inWatchlist ? removeFromWatchlist(movie.slug) : addToWatchlist({ slug: movie.slug, name: movie.name, thumb_url: movie.thumb_url, year: movie.year, origin_name: movie.origin_name });
    };

    const rating = detail?.tmdb?.vote_average;
    const actors = detail?.actor?.filter(Boolean).slice(0, 5).join(", ");
    const directors = detail?.director?.filter(Boolean).slice(0, 2).join(", ");
    const synopsis = detail?.content?.replace(/<[^>]*>/g, "").trim();

    return (
        <div
            ref={cardRef}
            className="relative group cursor-pointer"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* Normal card */}
            <div
                className={`transition-opacity duration-150 ${hoverActive ? "opacity-0 pointer-events-none" : "opacity-100"}`}
                onClick={() => navigate("/phim/" + movie.slug)}
            >
                <div className="aspect-[2/3] rounded-xl overflow-hidden mb-2 relative ring-1 ring-white/5 bg-surface-container">
                    <img src={getThumbUrl(movie.thumb_url)} alt={movie.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).src = "https://via.placeholder.com/220x330?text=No+Image"; }} />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <div className="w-11 h-11 bg-primary rounded-full flex items-center justify-center text-white shadow-lg"><Play fill="currentColor" size={18} className="ml-0.5" /></div>
                    </div>
                    {movie.quality && <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-primary/90 text-white text-[10px] font-bold rounded">{movie.quality}</div>}
                </div>
                <h3 className="text-sm font-bold text-white group-hover:text-primary transition-colors truncate" title={movie.name}>{movie.name}</h3>
                <p className="text-xs text-zinc-500 mt-0.5">{movie.year || ""}</p>
            </div>

            {/* Expanded hover card — fully clickable to navigate */}
            {hoverActive && (
                <div
                    className="absolute top-0 z-50 rounded-2xl overflow-hidden shadow-[0_30px_70px_rgba(0,0,0,0.95)] border border-white/10 animate-fade-in-scale cursor-pointer"
                    style={{ ...offsetStyle, background: "#0f0e11" }}
                    onClick={() => navigate("/phim/" + movie.slug)}
                    onMouseEnter={() => { if (timerRef.current) clearTimeout(timerRef.current); setHoverActive(true); }}
                    onMouseLeave={handleMouseLeave}
                >
                    {/* Thumbnail with Ken Burns pan */}
                    <div className="relative aspect-video w-full overflow-hidden bg-black">
                        <img
                            src={getThumbUrl(movie.thumb_url)}
                            alt={movie.name}
                            className="absolute inset-0 w-full h-full object-cover"
                            style={{ animation: "kenBurns 8s ease-in-out infinite alternate", transformOrigin: "center center" }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0f0e11] via-black/30 to-transparent" />
                        {movie.quality && <span className="absolute top-3 left-3 px-2 py-0.5 bg-primary text-white text-[10px] font-bold rounded shadow-md">{movie.quality}</span>}
                        {rating && (
                            <span className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 bg-black/70 text-amber-400 text-[11px] font-bold rounded backdrop-blur-sm">
                                <Star size={10} fill="currentColor" /> {rating.toFixed(1)}
                            </span>
                        )}
                        {/* Title overlay */}
                        <div className="absolute bottom-3 left-4 right-4">
                            <h4 className="font-headline font-black text-white text-lg leading-tight line-clamp-1 drop-shadow-lg">{movie.name}</h4>
                            <p className="text-xs text-zinc-400 mt-0.5 truncate">{movie.origin_name}</p>
                        </div>
                    </div>

                    {/* Info section */}
                    <div className="p-4 space-y-3">
                        {/* Meta row */}
                        <div className="flex flex-wrap items-center gap-2">
                            {movie.year && (
                                <span className="flex items-center gap-1 text-xs text-zinc-400 font-semibold">
                                    <Calendar size={11} /> {movie.year}
                                </span>
                            )}
                            {detail?.time && (
                                <span className="flex items-center gap-1 text-xs text-zinc-500">
                                    <Film size={11} /> {detail.time}
                                </span>
                            )}
                            {detail?.country && detail.country[0] && (
                                <span className="flex items-center gap-1 text-xs text-zinc-500">
                                    <Globe size={11} /> {detail.country[0].name}
                                </span>
                            )}
                            {movie.episode_current && (
                                <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs rounded-full font-bold">{movie.episode_current}</span>
                            )}
                            {movie.lang && (
                                <span className="px-2 py-0.5 bg-zinc-800 text-zinc-300 text-xs rounded-full">{movie.lang}</span>
                            )}
                        </div>

                        {/* Genres */}
                        {movie.category && movie.category.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                                {movie.category.slice(0, 6).map(cat => (
                                    <span key={cat.slug} className="text-[11px] px-2.5 py-0.5 border border-primary/25 rounded-full text-primary/80 bg-primary/5 font-medium">
                                        {cat.name}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Synopsis */}
                        {synopsis ? (
                            <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3">{synopsis}</p>
                        ) : fetchingDetail ? (
                            <p className="text-xs text-zinc-600 italic">Đang tải thông tin...</p>
                        ) : null}

                        {/* Actors */}
                        {actors && (
                            <div className="flex items-start gap-2 text-xs">
                                <Users size={12} className="text-zinc-500 mt-0.5 flex-shrink-0" />
                                <p className="text-zinc-400 leading-relaxed"><span className="text-zinc-500 font-medium">Diễn viên: </span>{actors}</p>
                            </div>
                        )}

                        {/* Director */}
                        {directors && (
                            <div className="flex items-start gap-2 text-xs">
                                <Film size={12} className="text-zinc-500 mt-0.5 flex-shrink-0" />
                                <p className="text-zinc-400"><span className="text-zinc-500 font-medium">Đạo diễn: </span>{directors}</p>
                            </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex gap-2 pt-2 border-t border-white/5" onClick={(e) => e.stopPropagation()}>
                            <button
                                onClick={() => navigate("/phim/" + movie.slug)}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary hover:bg-red-500 text-white text-sm font-bold rounded-xl transition-all active:scale-95 shadow-[0_2px_14px_rgba(255,84,81,0.3)] cursor-pointer"
                            >
                                <Play size={14} fill="currentColor" /> Xem ngay
                            </button>
                            <button
                                onClick={handleWatchlistToggle}
                                title={inWatchlist ? "Xóa khỏi danh sách" : "Thêm vào danh sách"}
                                className={"flex items-center justify-center px-4 py-2.5 rounded-xl font-bold transition-all active:scale-95 cursor-pointer border " + (inWatchlist ? "bg-primary/20 border-primary/40 text-primary" : "bg-zinc-800 border-white/10 text-zinc-400 hover:border-primary/40 hover:text-primary")}
                            >
                                {inWatchlist ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
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
            {title && <h2 className="font-headline text-2xl md:text-3xl font-bold text-white mb-6 tracking-tight">{title}</h2>}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5 pb-24">
                {movies.map((movie) => (<MovieCard key={movie._id || movie.slug} movie={movie} />))}
            </div>
        </div>
    );
};
