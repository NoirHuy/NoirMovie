import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useSearchParams } from 'react-router-dom';
import { apiService } from '../services/api';
import { MovieGrid } from '../components/MovieGrid';

export const Catalog: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const location = useLocation();
    const [searchParams] = useSearchParams();

    const [movies, setMovies] = useState([]);
    const [title, setTitle] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const keyword = searchParams.get('keyword');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                let data;
                let pageTitle = '';

                if (location.pathname.startsWith('/tim-kiem')) {
                    if (keyword) {
                        data = await apiService.searchMovies(keyword, page);
                        pageTitle = `Kết quả tìm kiếm cho: "${keyword}"`;
                    } else {
                        setLoading(false);
                        return;
                    }
                }
                else if (location.pathname.startsWith('/the-loai') && slug) {
                    data = await apiService.getMoviesByCategory(slug, page);
                    pageTitle = data?.data?.seoOnPage?.titleHead || `Thể loại: ${slug}`;
                }
                else if (location.pathname.startsWith('/quoc-gia') && slug) {
                    data = await apiService.getMoviesByCountry(slug, page);
                    pageTitle = data?.data?.seoOnPage?.titleHead || `Quốc gia: ${slug}`;
                }
                else if (location.pathname.startsWith('/danh-sach') && slug) {
                    data = await apiService.getList(slug, page);
                    pageTitle = data?.data?.seoOnPage?.titleHead || `Danh sách: ${slug}`;
                }

                if (data && data.status === 'success' && data.data && data.data.items) {
                    setMovies(data.data.items);
                    setTitle(pageTitle);
                    setTotalPages(data.data.params?.pagination?.totalPages || 1);
                } else {
                    setError('Không có kết quả nào');
                    setMovies([]);
                }
            } catch (err: any) {
                setError(err.message || 'Lỗi lấy dữ liệu');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [location.pathname, slug, keyword, page]);

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <h2 className="text-xl text-on-surface-variant/75 font-semibold font-headline animate-pulse">
                    Đang tải danh sách phim...
                </h2>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-6 text-center">
                <h2 className="text-xl font-bold font-headline text-primary">
                    {error}
                </h2>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pt-28 pb-12">
            <MovieGrid movies={movies} title={title} />

            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 py-8">
                    <button
                        disabled={page === 1}
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        className="px-5 py-2.5 rounded-xl font-bold text-xs transition-all border active:scale-95 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed bg-surface-container border-white/5 text-on-surface-variant hover:bg-primary/20 hover:border-primary/30 hover:text-white"
                    >
                        Trang trước
                    </button>
                    
                    <span className="text-sm font-semibold text-on-surface-variant">
                        Trang {page} / {totalPages}
                    </span>
                    
                    <button
                        disabled={page >= totalPages}
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        className="px-5 py-2.5 rounded-xl font-bold text-xs transition-all border active:scale-95 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed bg-surface-container border-white/5 text-on-surface-variant hover:bg-primary/20 hover:border-primary/30 hover:text-white"
                    >
                        Trang tiếp
                    </button>
                </div>
            )}
        </div>
    );
};
