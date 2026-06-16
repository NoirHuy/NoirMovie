import React from 'react';
import { Link } from 'react-router-dom';
import { Play } from 'lucide-react';

interface Movie {
    _id: string;
    name: string;
    slug: string;
    origin_name: string;
    thumb_url: string;
    year: number;
}

interface MovieGridProps {
    movies: Movie[];
    title?: string;
}

export const MovieGrid: React.FC<MovieGridProps> = ({ movies, title }) => {
    if (!movies || movies.length === 0) {
        return (
            <div className="container mx-auto px-6 md:px-container-desktop py-8 text-center">
                <h2 className="text-xl text-on-surface-variant/75 font-medium">Không tìm thấy dữ liệu phim.</h2>
            </div>
        );
    }

    const getThumbUrl = (url: string) => {
        if (!url) return 'https://via.placeholder.com/220x330?text=No+Image';
        if (url.startsWith('http')) return url;
        return `https://img.ophim.live/uploads/movies/${url}`;
    };

    return (
        <div className="max-w-[1920px] mx-auto px-6 md:px-container-desktop py-8">
            {title && (
                <h2 className="font-headline text-2xl md:text-3xl font-bold text-white mb-6 tracking-tight">
                    {title}
                </h2>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {movies.map((movie) => (
                    <Link 
                        to={`/phim/${movie.slug}`} 
                        key={movie._id} 
                        className="group cursor-pointer block"
                    >
                        {/* Card Image Container */}
                        <div className="aspect-[2/3] rounded-xl overflow-hidden mb-3 relative ring-1 ring-white/5 bg-surface-container transition-all duration-300 group-hover:scale-[1.03] group-hover:ring-primary/40 group-hover:shadow-[0_0_20px_rgba(255,84,81,0.2)]">
                            <img
                                src={getThumbUrl(movie.thumb_url)}
                                alt={movie.name}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                loading="lazy"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/220x330?text=No+Image';
                                }}
                            />
                            {/* Hover Overlay Play Icon */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-300">
                                    <Play fill="currentColor" size={20} className="ml-1" />
                                </div>
                            </div>
                        </div>

                        {/* Card Details */}
                        <div className="px-1">
                            <h3 
                                className="text-sm font-bold text-white group-hover:text-primary transition-colors truncate" 
                                title={movie.name}
                            >
                                {movie.name}
                            </h3>
                            <p className="text-xs text-on-surface-variant/70 mt-1 font-medium">
                                {movie.year || 'Đang cập nhật'}
                            </p>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
};
