import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Header } from './components/Header';
import { Home } from './pages/Home';
import { MovieDetail } from './pages/MovieDetail';
import { Catalog } from './pages/Catalog';
import { History } from './pages/History';

function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <Header />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/phim/:slug" element={<MovieDetail />} />
            <Route path="/danh-sach/:slug" element={<Catalog />} />
            <Route path="/the-loai/:slug" element={<Catalog />} />
            <Route path="/quoc-gia/:slug" element={<Catalog />} />
            <Route path="/tim-kiem" element={<Catalog />} />
            <Route path="/lich-su" element={<History />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
