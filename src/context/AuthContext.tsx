import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

export interface Subscription {
  plan: 'Free' | 'Standard' | 'VIP';
  status: 'active' | 'inactive';
  expiresAt?: string;
}

export interface User {
  username: string;
  email?: string;
  avatar?: string;
  name?: string;
  bio?: string;
  phoneNumber?: string;
  subscription?: Subscription;
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
  duration?: number;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  loginWithFacebook: (accessToken: string, profile: any) => Promise<void>;
  logout: () => void;
  updateProfile: (profileData: { name?: string; email?: string; phoneNumber?: string; bio?: string }) => Promise<void>;
  subscribePlan: (plan: 'Free' | 'Standard' | 'VIP') => Promise<void>;
  watchHistory: HistoryItem[];
  addToHistory: (movie: any, episodeSlug?: string, currentTime?: number, duration?: number) => Promise<void>;
  updateWatchProgress: (movieSlug: string, episodeSlug: string, currentTime: number, duration?: number) => Promise<void>;
  clearHistory: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [watchHistory, setWatchHistory] = useState<HistoryItem[]>([]);

  // Load from local storage and backend on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('noirmovie_user');
    const token = localStorage.getItem('noirmovie_token');

    if (savedUser && token) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);

      // Load profile details from backend to sync subscription/bio/phone
      fetch('/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch profile');
          return res.json();
        })
        .then(profileData => {
          const syncedUser: User = {
            username: profileData.username,
            email: profileData.email,
            avatar: profileData.avatar,
            name: profileData.name,
            bio: profileData.bio,
            phoneNumber: profileData.phoneNumber,
            subscription: profileData.subscription
          };
          setUser(syncedUser);
          localStorage.setItem('noirmovie_user', JSON.stringify(syncedUser));
        })
        .catch(err => {
          console.error('Error syncing profile from backend:', err);
        });

      // Load history from backend MongoDB
      fetch('/api/history', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch history');
          return res.json();
        })
        .then(data => {
          setWatchHistory(data);
          localStorage.setItem(`history_${parsedUser.username}`, JSON.stringify(data));
        })
        .catch(err => {
          console.error('Error fetching history from backend:', err);
          // Fallback to local storage if API fails
          const historyKey = `history_${parsedUser.username}`;
          const savedHistory = localStorage.getItem(historyKey);
          if (savedHistory) {
            setWatchHistory(JSON.parse(savedHistory));
          }
        });
    }
  }, []);

  const login = async (username: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Đăng nhập thất bại.');
    }

    const newUser: User = { 
      username: data.user.username,
      email: data.user.email,
      avatar: data.user.avatar,
      name: data.user.name,
      bio: data.user.bio,
      phoneNumber: data.user.phoneNumber,
      subscription: data.user.subscription
    };
    setUser(newUser);
    localStorage.setItem('noirmovie_user', JSON.stringify(newUser));
    localStorage.setItem('noirmovie_token', data.token);

    // Sync history from backend
    try {
      const historyResponse = await fetch('/api/history', {
        headers: {
          'Authorization': `Bearer ${data.token}`
        }
      });
      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        setWatchHistory(historyData);
        localStorage.setItem(`history_${data.user.username}`, JSON.stringify(historyData));
      }
    } catch (err) {
      console.error('Error loading history on login:', err);
    }
  };

  const register = async (username: string, email: string, password: string) => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, email, password })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Đăng ký thất bại.');
    }

    const newUser: User = { 
      username: data.user.username,
      email: data.user.email,
      avatar: data.user.avatar,
      name: data.user.name,
      bio: data.user.bio,
      phoneNumber: data.user.phoneNumber,
      subscription: data.user.subscription
    };
    setUser(newUser);
    localStorage.setItem('noirmovie_user', JSON.stringify(newUser));
    localStorage.setItem('noirmovie_token', data.token);
    setWatchHistory([]);
  };

  const loginWithGoogle = async (credential: string) => {
    const response = await fetch('/api/auth/google', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ credential })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Đăng nhập Google thất bại.');
    }

    const newUser: User = { 
      username: data.user.username,
      email: data.user.email,
      avatar: data.user.avatar,
      name: data.user.name,
      bio: data.user.bio,
      phoneNumber: data.user.phoneNumber,
      subscription: data.user.subscription
    };
    setUser(newUser);
    localStorage.setItem('noirmovie_user', JSON.stringify(newUser));
    localStorage.setItem('noirmovie_token', data.token);

    // Sync history from backend
    try {
      const historyResponse = await fetch('/api/history', {
        headers: {
          'Authorization': `Bearer ${data.token}`
        }
      });
      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        setWatchHistory(historyData);
        localStorage.setItem(`history_${data.user.username}`, JSON.stringify(historyData));
      }
    } catch (err) {
      console.error('Error loading history on Google login:', err);
    }
  };

  const loginWithFacebook = async (accessToken: string, profile: any) => {
    const response = await fetch('/api/auth/facebook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ accessToken, profile })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Đăng nhập Facebook thất bại.');
    }

    const newUser: User = { 
      username: data.user.username,
      email: data.user.email,
      avatar: data.user.avatar,
      name: data.user.name,
      bio: data.user.bio,
      phoneNumber: data.user.phoneNumber,
      subscription: data.user.subscription
    };
    setUser(newUser);
    localStorage.setItem('noirmovie_user', JSON.stringify(newUser));
    localStorage.setItem('noirmovie_token', data.token);

    // Sync history from backend
    try {
      const historyResponse = await fetch('/api/history', {
        headers: {
          'Authorization': `Bearer ${data.token}`
        }
      });
      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        setWatchHistory(historyData);
        localStorage.setItem(`history_${data.user.username}`, JSON.stringify(historyData));
      }
    } catch (err) {
      console.error('Error loading history on Facebook login:', err);
    }
  };

  const logout = () => {
    setUser(null);
    setWatchHistory([]);
    localStorage.removeItem('noirmovie_user');
    localStorage.removeItem('noirmovie_token');
  };

  const updateProfile = async (profileData: { name?: string; email?: string; phoneNumber?: string; bio?: string }) => {
    const token = localStorage.getItem('noirmovie_token');
    if (!token) throw new Error('Không tìm thấy mã xác thực. Vui lòng đăng nhập lại.');

    const response = await fetch('/api/user/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(profileData)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Cập nhật hồ sơ thất bại.');
    }

    const updatedUser: User = {
      username: data.username,
      email: data.email,
      avatar: data.avatar,
      name: data.name,
      bio: data.bio,
      phoneNumber: data.phoneNumber,
      subscription: data.subscription
    };

    setUser(updatedUser);
    localStorage.setItem('noirmovie_user', JSON.stringify(updatedUser));
  };

  const subscribePlan = async (plan: 'Free' | 'Standard' | 'VIP') => {
    const token = localStorage.getItem('noirmovie_token');
    if (!token) throw new Error('Không tìm thấy mã xác thực. Vui lòng đăng nhập lại.');

    const response = await fetch('/api/user/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ plan })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Đăng ký gói cước thất bại.');
    }

    const updatedUser: User = {
      username: data.username,
      email: data.email,
      avatar: data.avatar,
      name: data.name,
      bio: data.bio,
      phoneNumber: data.phoneNumber,
      subscription: data.subscription
    };

    setUser(updatedUser);
    localStorage.setItem('noirmovie_user', JSON.stringify(updatedUser));
  };

  const addToHistory = async (movie: any, episodeSlug?: string, currentTime?: number, duration?: number) => {
    const savedUserStr = localStorage.getItem('noirmovie_user');
    const token = localStorage.getItem('noirmovie_token');
    if (!savedUserStr) return;

    const currentUser = JSON.parse(savedUserStr);
    const imageDomain = movie.APP_DOMAIN_CDN_IMAGE || 'https://img.ophim.live';
    const thumbUrl = movie.thumb_url || movie.poster_url;
    const extractedThumbUrl = typeof thumbUrl === 'string' && thumbUrl.startsWith('http')
      ? thumbUrl
      : `${imageDomain}/uploads/movies/${thumbUrl}`;

    // Find if it exists to get current episode/time details
    const existingItem = watchHistory.find(item => item.slug === movie.slug);

    const historyItemInput: any = {
      slug: movie.slug,
      name: movie.name,
      thumb_url: extractedThumbUrl,
      currentEpisodeSlug: episodeSlug || existingItem?.currentEpisodeSlug,
      currentTime: currentTime !== undefined ? currentTime : existingItem?.currentTime,
      duration: duration !== undefined ? duration : existingItem?.duration,
    };

    // Update local state first for instant UI response
    setWatchHistory((prevHistory) => {
      const newItem: HistoryItem = {
        _id: movie._id || Date.now().toString(),
        ...historyItemInput,
        timestamp: Date.now(),
      };
      const filtered = prevHistory.filter(item => item.slug !== movie.slug);
      const newHistory = [newItem, ...filtered].slice(0, 50);
      localStorage.setItem(`history_${currentUser.username}`, JSON.stringify(newHistory));
      return newHistory;
    });

    // Sync to backend if token is available
    if (token) {
      try {
        const response = await fetch('/api/history', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(historyItemInput),
          keepalive: true
        });
        if (response.ok) {
          const updatedHistory = await response.json();
          setWatchHistory(updatedHistory);
          localStorage.setItem(`history_${currentUser.username}`, JSON.stringify(updatedHistory));
        }
      } catch (err) {
        console.error('Error syncing history to backend:', err);
      }
    }
  };

  const updateWatchProgress = async (movieSlug: string, episodeSlug: string, currentTime: number, duration?: number) => {
    const savedUserStr = localStorage.getItem('noirmovie_user');
    const token = localStorage.getItem('noirmovie_token');
    if (!savedUserStr) return;

    const currentUser = JSON.parse(savedUserStr);

    // Update local state first for instant UI response
    let itemToSync: any = null;
    setWatchHistory((prevHistory) => {
      const newHistory = prevHistory.map(item => {
        if (item.slug === movieSlug) {
          itemToSync = {
            slug: item.slug,
            name: item.name,
            thumb_url: item.thumb_url,
            currentEpisodeSlug: episodeSlug,
            currentTime: currentTime,
            duration: duration !== undefined ? duration : item.duration
          };
          return {
            ...item,
            currentEpisodeSlug: episodeSlug,
            currentTime: currentTime,
            duration: duration !== undefined ? duration : item.duration
          };
        }
        return item;
      });
      localStorage.setItem(`history_${currentUser.username}`, JSON.stringify(newHistory));
      return newHistory;
    });

    // Sync to backend if token is available and we found the item
    if (token && itemToSync) {
      try {
        const response = await fetch('/api/history', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(itemToSync),
          keepalive: true
        });
        if (response.ok) {
          const updatedHistory = await response.json();
          setWatchHistory(updatedHistory);
          localStorage.setItem(`history_${currentUser.username}`, JSON.stringify(updatedHistory));
        }
      } catch (err) {
        console.error('Error syncing progress to backend:', err);
      }
    }
  };

  const clearHistory = async () => {
    const savedUserStr = localStorage.getItem('noirmovie_user');
    const token = localStorage.getItem('noirmovie_token');
    
    // Clear local state first
    setWatchHistory([]);
    if (savedUserStr) {
      const currentUser = JSON.parse(savedUserStr);
      localStorage.removeItem(`history_${currentUser.username}`);
    }

    // Sync deletion to backend
    if (token) {
      try {
        const response = await fetch('/api/history', {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const updatedHistory = await response.json();
          setWatchHistory(updatedHistory);
        }
      } catch (err) {
        console.error('Error deleting history from backend:', err);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register, loginWithGoogle, loginWithFacebook, logout, updateProfile, subscribePlan, watchHistory, addToHistory, updateWatchProgress, clearHistory }}>
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
