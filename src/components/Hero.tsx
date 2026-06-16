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
        ? `${imageDomain}/uploads/movies/${movie.poster_url}`
        : movie.thumb_url
            ? `${imageDomain}/uploads/movies/${movie.thumb_url}`
            : '';

    useEffect(() => {
        setIsVisible(true);
    }, [movie]);

    if (!movie) return null;

    return (
        <div className="hero-container">
            <div
                className="hero-backdrop"
                style={{ backgroundImage: `url(${backdropImageUrl})` }}
            >
                <div className="hero-gradient"></div>
            </div>

            <div className={`hero-content ${isVisible ? 'animate-fade-in' : ''}`}>
                <div className="hero-tags delay-100">
                    {movie.year && <span className="hero-tag">{movie.year}</span>}
                    {movie.quality && <span className="hero-tag quality">{movie.quality}</span>}
                    {movie.episode_current && <span className="hero-tag">{movie.episode_current}</span>}
                    {movie.tmdb?.vote_average && <span className="hero-tag vote">★ {movie.tmdb.vote_average.toFixed(1)}</span>}
                </div>

                <h1 className="hero-title delay-200">{movie.name}</h1>
                {movie.origin_name && <h2 className="hero-subtitle delay-200">{movie.origin_name}</h2>}

                <div className="hero-meta delay-300">
                    {movie.category && movie.category.length > 0 && (
                        <p className="hero-categories">
                            {movie.category.map((cat: any) => cat.name).join(' • ')}
                        </p>
                    )}
                    {movie.content && (
                        <div
                            className="hero-description"
                            dangerouslySetInnerHTML={{ __html: movie.content }}
                        />
                    )}
                </div>

                <div className="hero-actions delay-300">
                    <button className="play-btn" onClick={onPlayClick}>
                        <Play size={20} fill="currentColor" />
                        <span>Xem Phim</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
