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
            <div className="container" style={{ paddingTop: '2rem', textAlign: 'center' }}>
                <h2 className="text-xl text-muted">Không tìm thấy dữ liệu phim.</h2>
            </div>
        );
    }

    return (
        <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
            {title && (
                <h2 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '2rem' }}>
                    {title}
                </h2>
            )}

            <div className="movie-grid">
                {movies.map((movie) => (
                    <Link to={`/phim/${movie.slug}`} key={movie._id} className="movie-card">
                        <div className="movie-poster-wrapper">
                            <img
                                src={`https://img.ophim.live/uploads/movies/${movie.thumb_url}`}
                                alt={movie.name}
                                className="movie-poster"
                                loading="lazy"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/220x330?text=No+Image';
                                }}
                            />
                            <div className="movie-overlay">
                                <div className="play-circle">
                                    <Play fill="currentColor" size={24} />
                                </div>
                            </div>
                        </div>
                        <div className="movie-info">
                            <h3 className="movie-title" title={movie.name}>{movie.name}</h3>
                            <p className="movie-year">{movie.year || 'Đang cập nhật'}</p>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
};
