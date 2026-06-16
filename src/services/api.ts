const BASE_URL = 'https://ophim1.com/v1/api';
const OPTIONS = { method: 'GET', headers: { accept: 'application/json' } };

// Helper to fetch and parse JSON safely
const fetchAPI = async (endpoint: string) => {
    try {
        const response = await fetch(`${BASE_URL}${endpoint}`, OPTIONS);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`Error fetching ${endpoint}:`, error);
        throw error;
    }
};

export const apiService = {
    // Trang chủ
    getHome: () => fetchAPI('/home'),

    // Lấy chi tiết phim
    getMovieDetail: (slug: string) => fetchAPI(`/phim/${slug}`),

    // Lấy danh sách phim theo loại (phim-bo, phim-le, hoat-hinh...)
    // API example: /danh-sach/phim-bo?page=1
    getList: (slug: string, page: number = 1) => fetchAPI(`/danh-sach/${slug}?page=${page}`),

    // Lấy danh sách phim theo thể loại (hanh-dong, tinh-cam...)
    getMoviesByCategory: (slug: string, page: number = 1) => fetchAPI(`/the-loai/${slug}?page=${page}`),

    // Lấy danh sách phim theo quốc gia (han-quoc, trung-quoc...)
    getMoviesByCountry: (slug: string, page: number = 1) => fetchAPI(`/quoc-gia/${slug}?page=${page}`),

    // Lấy danh sách phim theo năm
    getMoviesByYear: (year: string, page: number = 1) => fetchAPI(`/nam-phat-hanh/${year}?page=${page}`),

    // Tìm kiếm phim
    searchMovies: (keyword: string, page: number = 1) => fetchAPI(`/tim-kiem?keyword=${encodeURIComponent(keyword)}&page=${page}`),

    // ================= Nav/Metadata Endpoints =================

    // Lấy danh sách tất cả thể loại (để build menu)
    getCategories: () => fetchAPI('/the-loai'),

    // Lấy danh sách tất cả quốc gia (để build menu)
    getCountries: () => fetchAPI('/quoc-gia'),

    // Lấy danh sách tất cả năm phát hành
    getYears: () => fetchAPI('/nam-phat-hanh'),
};
