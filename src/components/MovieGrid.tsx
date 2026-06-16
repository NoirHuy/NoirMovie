import React, { useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { Play, Bookmark, BookmarkCheck } from "lucide-react";
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

const MovieCard: React.FC<{ movie: Movie }> = ({ movie }) => {
    const { user, isInWatchlist, addToWatchlist, removeFromWatchlist } = useAuth();
    const [hoverActive, setHoverActive] = useState(false);
    const [popupSide, setPopupSide] = useState<"right" | "left">("right");
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const cardRef = useRef<HTMLDivElement>(null);
    const inWatchlist = isInWatchlist(movie.slug);

    const getThumbUrl = (url: string) => {
        if (!url) return "https://via.placeholder.com/220x330?text=No+Image";
        if (url.startsWith("http")) return url;
        return "https://img.ophim.live/uploads/movies/" + url;
    };

    const handleMouseEnter = useCallback(() => {
        timerRef.current = setTimeout(() => {
            if (cardRef.current) {
                const rect = cardRef.current.getBoundingClientRect();
                const spaceRight = window.innerWidth - rect.right;
                setPopupSide(spaceRight > 300 ? "right" : "left");
            }
            setHoverActive(true);
        }, 450);
    }, []);

    const handleMouseLeave = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        setHoverActive(false);
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
            <Link to={"/phim/" + movie.slug} className="block">
                <div className="aspect-[2/3] rounded-xl overflow-hidden mb-3 relative ring-1 ring-white/5 bg-surface-container transition-all duration-300 group-hover:scale-[1.03] group-hover:ring-primary/40 group-hover:shadow-[0_0_20px_rgba(255,84,81,0.2)]">
                    <img
                        src={getThumbUrl(movie.thumb_url)}
                        alt={movie.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
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
                <p className="text-xs text-on-surface-variant/70 mt-1 font-medium">{movie.year || "Dang cap nhat"}</p>
            </Link>

            {hoverActive && (
                <div
                    className={"absolute top-0 z-50 w-64 rounded-2xl overflow-hidden shadow-2xl border border-white/10 animate-fade-in-scale " + (popupSide === "right" ? "left-[calc(100%+12px)]" : "right-[calc(100%+12px)]")}
                    style={{ background: "rgba(20,19,22,0.97)", backdropFilter: "blur(24px)" }}
                    onMouseEnter={() => { if (timerRef.current) clearTimeout(timerRef.current); setHoverActive(true); }}
                    onMouseLeave={handleMouseLeave}
                >
                    <div className="relative h-36 overflow-hidden">
                        <img
                            src={getThumbUrl(movie.thumb_url)}
                            alt={movie.name}
                            className="w-full h-full object-cover scale-110 blur-[1px]"
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-[rgba(20,19,22,1)]" />
                        <div className="absolute bottom-2 left-3 right-3">
                            <h4 className="font-headline font-bold text-white text-sm leading-tight line-clamp-2">{movie.name}</h4>
                        </div>
                    </div>

                    <div className="p-3 pt-1 space-y-2">
                        <div className="flex flex-wrap gap-1.5 text-[10px]">
                            {movie.year && (
                                <span className="px-2 py-0.5 bg-surface-container rounded-full text-on-surface-variant/80 font-medium">{movie.year}</span>
                            )}
                            {movie.origin_name && (
                                <span className="px-2 py-0.5 bg-surface-container rounded-full text-on-surface-variant/80 font-medium truncate max-w-[120px]">{movie.origin_name}</span>
                            )}
                            {movie.episode_current && (
                                <span className="px-2 py-0.5 bg-primary/20 text-primary rounded-full font-semibold">{movie.episode_current}</span>
                            )}
                        </div>

                        {movie.category && movie.category.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                                {movie.category.slice(0, 3).map(cat => (
                                    <span key={cat.slug} className="text-[9px] px-1.5 py-0.5 border border-white/10 rounded-md text-on-surface-variant/60">{cat.name}</span>
                                ))}
                            </div>
                        )}

                        <div className="flex gap-2 pt-1">
                            <Link
                                to={"/phim/" + movie.slug}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-primary hover:bg-primary/80 text-white text-xs font-bold rounded-lg transition-all active:scale-95"
                            >
                                <Play size={12} fill="currentColor" /> Xem ngay
                            </Link>
                            <button
                                onClick={handleWatchlistToggle}
                                title={inWatchlist ? "Xoa khoi danh sach" : "Them vao danh sach"}
                                className={"flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer border " + (inWatchlist ? "bg-primary/20 border-primary/40 text-primary" : "bg-surface-container border-white/10 text-on-surface-variant hover:border-primary/30 hover:text-primary")}
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
                <h2 className="text-xl text-on-surface-variant/75 font-medium">Khong tim thay du lieu phim.</h2>
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