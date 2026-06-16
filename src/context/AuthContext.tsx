import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

export interface User {
  username: string;
}

export interface HistoryItem {
  _id: string;
  slug: string;
  name: string;
  thumb_url: string;
  timestamp: number;
  year?: number;
  origin_name?: string;
  currentEpisodeSlug?: string;
  currentTime?: number;
}

interface AuthContextType {
  user: User | null;
  login: (username: string) => void;
  logout: () => void;
  watchHistory: HistoryItem[];
  addToHistory: (movie: any, episodeSlug?: string, currentTime?: number) => void;
  updateWatchProgress: (movieSlug: string, episodeSlug: string, currentTime: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [watchHistory, setWatchHistory] = useState<HistoryItem[]>([]);

  // Load from local storage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('noirmovie_user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);

      const historyKey = `history_${parsedUser.username}`;
      const savedHistory = localStorage.getItem(historyKey);
      if (savedHistory) {
        setWatchHistory(JSON.parse(savedHistory));
      }
    }
  }, []);

  const login = (username: string) => {
    const newUser = { username };
    setUser(newUser);
    localStorage.setItem('noirmovie_user', JSON.stringify(newUser));

    // Load history for this user
    const historyKey = `history_${username}`;
    const savedHistory = localStorage.getItem(historyKey);
    if (savedHistory) {
      setWatchHistory(JSON.parse(savedHistory));
    } else {
      setWatchHistory([]);
    }
  };

  const logout = () => {
    setUser(null);
    setWatchHistory([]);
    localStorage.removeItem('noirmovie_user');
  };

  const addToHistory = (movie: any, episodeSlug?: string, currentTime?: number) => {
    setWatchHistory((prevHistory) => {
      const savedUserStr = localStorage.getItem('noirmovie_user');
      if (!savedUserStr) return prevHistory;

      const currentUser = JSON.parse(savedUserStr);

      const imageDomain = movie.APP_DOMAIN_CDN_IMAGE || 'https://img.ophim.live';
      const thumbUrl = movie.thumb_url || movie.poster_url;
      const extractedThumbUrl = typeof thumbUrl === 'string' && thumbUrl.startsWith('http')
        ? thumbUrl
        : `${imageDomain}/uploads/movies/${thumbUrl}`;

      const existingItemIndex = prevHistory.findIndex(item => item.slug === movie.slug);
      let existingItem = existingItemIndex >= 0 ? prevHistory[existingItemIndex] : null;

      const newItem: HistoryItem = {
        _id: movie._id,
        slug: movie.slug,
        name: movie.name,
        thumb_url: extractedThumbUrl,
        timestamp: Date.now(),
        currentEpisodeSlug: episodeSlug || existingItem?.currentEpisodeSlug,
        currentTime: currentTime !== undefined ? currentTime : existingItem?.currentTime,
      };

      const filtered = prevHistory.filter(item => item.slug !== movie.slug);
      const newHistory = [newItem, ...filtered].slice(0, 50);

      localStorage.setItem(`history_${currentUser.username}`, JSON.stringify(newHistory));
      return newHistory;
    });
  };

  const updateWatchProgress = (movieSlug: string, episodeSlug: string, currentTime: number) => {
    setWatchHistory((prevHistory) => {
      const savedUserStr = localStorage.getItem('noirmovie_user');
      if (!savedUserStr) return prevHistory;

      const currentUser = JSON.parse(savedUserStr);

      const newHistory = prevHistory.map(item => {
        if (item.slug === movieSlug) {
          return {
            ...item,
            currentEpisodeSlug: episodeSlug,
            currentTime: currentTime
          };
        }
        return item;
      });

      localStorage.setItem(`history_${currentUser.username}`, JSON.stringify(newHistory));
      return newHistory;
    });
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, watchHistory, addToHistory, updateWatchProgress }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
