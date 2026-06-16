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

    return (
        <div className="catalog-page">
            {loading ? (
                <div className="container" style={{ paddingTop: '2rem', textAlign: 'center' }}>
                    <h2 className="text-xl text-muted">Đang tải...</h2>
                </div>
            ) : error ? (
                <div className="container" style={{ paddingTop: '2rem', textAlign: 'center' }}>
                    <h2 className="text-xl" style={{ color: 'var(--accent-primary)' }}>{error}</h2>
                </div>
            ) : (
                <>
                    <MovieGrid movies={movies} title={title} />

                    {totalPages > 1 && (
                        <div className="pagination-controls" style={{ display: 'flex', justifyContent: 'center', gap: '1rem', paddingBottom: '3rem' }}>
                            <button
                                disabled={page === 1}
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                style={{ padding: '0.5rem 1rem', background: 'var(--bg-tertiary)', borderRadius: '4px', cursor: page === 1 ? 'not-allowed' : 'pointer' }}
                            >
                                Trang trước
                            </button>
                            <span style={{ display: 'flex', alignItems: 'center' }}>Trang {page} / {totalPages}</span>
                            <button
                                disabled={page >= totalPages}
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                style={{ padding: '0.5rem 1rem', background: 'var(--bg-tertiary)', borderRadius: '4px', cursor: page >= totalPages ? 'not-allowed' : 'pointer' }}
                            >
                                Trang tiếp
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
