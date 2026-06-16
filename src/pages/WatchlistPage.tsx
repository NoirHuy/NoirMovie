import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bookmark, Trash2, Play, Film, ArrowLeft } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const WatchlistPage: React.FC = () => {
  const { user, watchlist, removeFromWatchlist } = useAuth();
  const navigate = useNavigate();

  const getThumbUrl = (url: string) => {
    if (!url) return "https://via.placeholder.com/220x330?text=No+Image";
    if (url.startsWith("http")) return url;
    return "https://img.ophim.live/uploads/movies/" + url;
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background pt-28 flex items-center justify-center">
        <div className="text-center glass-panel rounded-2xl p-12 max-w-md mx-auto">
          <Bookmark size={56} className="mx-auto mb-4 text-primary/60" />
          <h2 className="font-headline text-2xl font-bold text-white mb-2">Dang nhap de xem danh sach</h2>
          <p className="text-on-surface-variant/70 mb-6 text-sm">Luu phim yeu thich va xem lai moi luc tren moi thiet bi.</p>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("trigger-login-modal"))}
            className="px-6 py-3 bg-primary hover:bg-primary/80 text-white font-bold rounded-xl transition-all active:scale-95 cursor-pointer"
          >
            Dang nhap ngay
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-28 pb-16">
      <div className="max-w-[1920px] mx-auto px-6 md:px-container-desktop">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            <ArrowLeft size={20} className="text-on-surface-variant" />
          </button>
          <div>
            <h1 className="font-headline text-3xl font-bold text-white flex items-center gap-3">
              <Bookmark size={28} className="text-primary" />
              Danh Sach Yeu Thich
            </h1>
            <p className="text-on-surface-variant/70 text-sm mt-1">
              {watchlist.length > 0 ? (watchlist.length + " phim da luu") : "Chua co phim nao"}
            </p>
          </div>
        </div>

        {watchlist.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="relative mb-6">
              <div className="w-24 h-24 rounded-full bg-surface-container flex items-center justify-center">
                <Film size={40} className="text-on-surface-variant/40" />
              </div>
              <div className="absolute -top-1 -right-1 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">0</span>
              </div>
            </div>
            <h3 className="font-headline text-xl font-bold text-white mb-2">Danh sach trong</h3>
            <p className="text-on-surface-variant/60 text-sm mb-6 max-w-xs">
              Kham pha phim va nhan nut Luu de them vao danh sach cua ban.
            </p>
            <Link
              to="/"
              className="px-6 py-3 bg-primary hover:bg-primary/80 text-white font-bold rounded-xl transition-all active:scale-95"
            >
              Kham pha phim ngay
            </Link>
          </div>
        )}

        {watchlist.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
            {watchlist.map((movie) => (
              <div key={movie.slug} className="group relative">
                <Link to={"/phim/" + movie.slug} className="block">
                  <div className="aspect-[2/3] rounded-xl overflow-hidden mb-3 relative ring-1 ring-white/5 bg-surface-container transition-all duration-300 group-hover:scale-[1.03] group-hover:ring-primary/40 group-hover:shadow-[0_0_20px_rgba(255,84,81,0.2)]">
                    <img
                      src={getThumbUrl(movie.thumb_url)}
                      alt={movie.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                      onError={(e) => { (e.target as HTMLImageElement).src = "https://via.placeholder.com/220x330?text=No+Image"; }}
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <div className="w-11 h-11 bg-primary rounded-full flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-300">
                        <Play fill="currentColor" size={18} className="ml-0.5 text-white" />
                      </div>
                    </div>
                    <div className="absolute top-2 left-2">
                      <div className="px-2 py-0.5 bg-primary/90 backdrop-blur-sm rounded-md text-white text-[10px] font-bold flex items-center gap-1">
                        <Bookmark size={8} fill="currentColor" /> Da luu
                      </div>
                    </div>
                  </div>
                  <h3 className="text-sm font-bold text-white group-hover:text-primary transition-colors truncate" title={movie.name}>
                    {movie.name}
                  </h3>
                  <p className="text-xs text-on-surface-variant/70 mt-0.5">{movie.year || "Dang cap nhat"}</p>
                </Link>

                <button
                  onClick={() => removeFromWatchlist(movie.slug)}
                  title="Xoa khoi danh sach"
                  className="absolute top-2 right-2 w-8 h-8 bg-black/70 hover:bg-red-600 backdrop-blur-sm rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer z-10"
                >
                  <Trash2 size={13} className="text-white" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};