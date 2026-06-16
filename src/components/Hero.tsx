import React, { useState, useEffect } from 'react';
import { Play } from 'lucide-react';

interface HeroProps {
    movie: any;
    imageDomain: string;
    onPlayClick: () => void;
}

export const Hero: React.FC<HeroProps> = ({ movie, imageDomain, onPlayClick }) => {
    const [isVisible, setIsVisible] = useState(false);

    // Try to use poster_url, fallback to thumb_url
    const backdropImageUrl = movie.poster_url
        ? movie.poster_url.startsWith('http') ? movie.poster_url : `${imageDomain}/uploads/movies/${movie.poster_url}`
        : movie.thumb_url
            ? movie.thumb_url.startsWith('http') ? movie.thumb_url : `${imageDomain}/uploads/movies/${movie.thumb_url}`
            : '';

    useEffect(() => {
        setIsVisible(true);
    }, [movie]);

    if (!movie) return null;

    return (
        <div className="relative w-full h-[60vh] md:h-[75vh] overflow-hidden bg-background">
            {/* Backdrop Image */}
            <div 
                className="absolute inset-0 w-full h-full bg-cover bg-center transition-transform duration-1000 scale-100 opacity-60"
                style={{ backgroundImage: `url(${backdropImageUrl})` }}
            />
            {/* Ambient Shadow Gradients */}
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-transparent z-10" />
            <div className="absolute inset-0 fade-to-black z-10" />

            {/* Content Container */}
            <div className="absolute inset-0 z-20 flex flex-col justify-end max-w-[1920px] mx-auto px-6 md:px-container-desktop pb-12 md:pb-20">
                <div className={`space-y-4 max-w-3xl transition-all duration-700 transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                    
                    {/* Movie tags */}
                    <div className="flex flex-wrap items-center gap-3">
                        {movie.year && (
                            <span className="text-xs bg-surface-container-highest px-3 py-1 rounded-full text-white font-medium border border-white/5">
                                {movie.year}
                            </span>
                        )}
                        {movie.quality && (
                            <span className="text-xs bg-primary/20 px-3 py-1 rounded-full text-primary font-bold border border-primary/20">
                                {movie.quality}
                            </span>
                        )}
                        {movie.episode_current && (
                            <span className="text-xs bg-surface-container-highest px-3 py-1 rounded-full text-on-surface-variant font-medium border border-white/5">
                                {movie.episode_current}
                            </span>
                        )}
                        {movie.tmdb?.vote_average && (
                            <span className="text-xs bg-yellow-500/20 px-3 py-1 rounded-full text-yellow-400 font-bold border border-yellow-500/20 flex items-center gap-1">
                                ★ {movie.tmdb.vote_average.toFixed(1)}
                            </span>
                        )}
                    </div>

                    {/* Movie title */}
                    <h1 className="font-headline text-4xl md:text-6xl font-bold text-white tracking-tight leading-none drop-shadow-md">
                        {movie.name}
                    </h1>
                    {movie.origin_name && (
                        <h2 className="text-lg md:text-2xl font-medium text-on-surface-variant/80 font-headline drop-shadow-sm">
                            {movie.origin_name}
                        </h2>
                    )}

                    {/* Meta & Description */}
                    <div className="space-y-2">
                        {movie.category && movie.category.length > 0 && (
                            <p className="text-xs md:text-sm text-primary font-semibold tracking-wide">
                                {movie.category.map((cat: any) => cat.name).join(' • ')}
                            </p>
                        )}
                        {movie.content && (
                            <div
                                className="text-sm md:text-base text-on-surface-variant line-clamp-3 leading-relaxed max-w-2xl drop-shadow-sm"
                                dangerouslySetInnerHTML={{ __html: movie.content }}
                            />
                        )}
                    </div>

                    {/* Play button */}
                    <div className="pt-4">
                        <button 
                            onClick={onPlayClick}
                            className="flex items-center gap-2 bg-primary text-white hover:bg-primary/90 transition-all font-bold px-8 py-3.5 rounded-full shadow-[0_0_20px_rgba(255,84,81,0.4)] hover:shadow-[0_0_30px_rgba(255,84,81,0.6)] pulse-play active:scale-95 cursor-pointer"
                        >
                            <Play size={20} fill="currentColor" />
                            <span>XEM PHIM</span>
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};
