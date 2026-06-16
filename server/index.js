import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns';
import { promisify } from 'util';
import https from 'https';
import http from 'http';
import { URL } from 'url';
import { Server } from 'socket.io';

dns.setDefaultResultOrder('ipv4first');
dotenv.config();

const resolve4Async = promisify(dns.resolve4);
const resolve6Async = promisify(dns.resolve6);

// Custom http request helper to bypass native fetch bugs and support options
function httpRequest(urlStr, options = {}) {
  return new Promise((resolve, reject) => {
    try {
      const parsedUrl = new URL(urlStr);
      const isHttps = parsedUrl.protocol === 'https:';
      
      const requestOptions = {
        method: options.method || 'GET',
        headers: options.headers || {}
      };

      requestOptions.timeout = options.timeout || 10000;
      const client = isHttps ? https : http;
      
      if (options.body) {
        let bodyData = options.body;
        if (typeof bodyData === 'object') {
          bodyData = JSON.stringify(bodyData);
          requestOptions.headers['Content-Type'] = requestOptions.headers['Content-Type'] || 'application/json';
        }
        requestOptions.headers['Content-Length'] = Buffer.byteLength(bodyData);
        
        const req = client.request(urlStr, requestOptions, (res) => {
          let data = '';
          res.on('data', (chunk) => data += chunk);
          res.on('end', () => {
            resolve({
              ok: res.statusCode >= 200 && res.statusCode < 300,
              status: res.statusCode,
              json: async () => JSON.parse(data),
              text: async () => data
            });
          });
        });

        req.on('error', (err) => reject(err));
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Request timed out'));
        });
        req.write(bodyData);
        req.end();
      } else {
        const req = client.request(urlStr, requestOptions, (res) => {
          let data = '';
          res.on('data', (chunk) => data += chunk);
          res.on('end', () => {
            resolve({
              ok: res.statusCode >= 200 && res.statusCode < 300,
              status: res.statusCode,
              json: async () => JSON.parse(data),
              text: async () => data
            });
          });
        });

        req.on('error', (err) => reject(err));
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Request timed out'));
        });
        req.end();
      }
    } catch (e) {
      reject(e);
    }
  });
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(cors());

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/noirmovie';
const JWT_SECRET = process.env.JWT_SECRET || 'noirmovie_jwt_secret_key_987654';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB successfully'))
  .catch(err => {
    console.error('Failed to connect to MongoDB:', err.message);
    console.log('Ensure MongoDB is running or configure MONGODB_URI in environment variables.');
  });

// Schemas
const HistoryItemSchema = new mongoose.Schema({
  slug: { type: String, required: true },
  name: { type: String, required: true },
  thumb_url: { type: String },
  timestamp: { type: Number, default: Date.now },
  currentEpisodeSlug: { type: String },
  currentTime: { type: Number },
  duration: { type: Number }
});

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  email: { type: String, lowercase: true, trim: true },
  name: { type: String }, // User's full name / Google display name
  password: { type: String }, // Optional for Google OAuth users
  googleId: { type: String, unique: true, sparse: true }, // Sparse unique index allows null for normal users
  facebookId: { type: String, unique: true, sparse: true },
  avatar: { type: String },
  givenName: { type: String },
  familyName: { type: String },
  emailVerified: { type: Boolean },
  locale: { type: String },
  googlePayload: { type: mongoose.Schema.Types.Mixed }, // Store the raw Google profile payload
  facebookPayload: { type: mongoose.Schema.Types.Mixed }, // Store the raw Facebook profile payload
  bio: { type: String },
  phoneNumber: { type: String },
  subscription: {
    plan: { type: String, enum: ['Free', 'Standard', 'VIP'], default: 'Free' },
    status: { type: String, enum: ['active', 'inactive'], default: 'inactive' },
    expiresAt: { type: Date }
  },
  watchHistory: [HistoryItemSchema]
});

const User = mongoose.model('User', UserSchema);

const CommentSchema = new mongoose.Schema({
  movieSlug: { type: String, required: true, index: true },
  username: { type: String, required: true },
  avatar: { type: String },
  rating: { type: Number, min: 1, max: 5 },
  content: { type: String, required: true },
  isSpoiler: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});
const Comment = mongoose.model('Comment', CommentSchema);

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Truy cập bị từ chối. Không có token.' });
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Token không hợp lệ hoặc đã hết hạn.' });
  }
};

// --- AUTHENTICATION ENDPOINTS ---

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ tên đăng nhập và mật khẩu.' });
    }

    if (username.length < 3) {
      return res.status(400).json({ error: 'Tên đăng nhập phải dài ít nhất 3 ký tự.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu phải dài ít nhất 6 ký tự.' });
    }

    const normalizedUsername = username.toLowerCase().trim();

    // Check if user exists
    const userExists = await User.findOne({ username: normalizedUsername });
    if (userExists) {
      return res.status(400).json({ error: 'Tên đăng nhập này đã tồn tại.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const newUser = new User({
      username: normalizedUsername,
      email: email ? email.toLowerCase().trim() : undefined,
      password: hashedPassword,
      watchHistory: []
    });

    await newUser.save();
    
    // Create token
    const token = jwt.sign({ id: newUser._id, username: newUser.username }, JWT_SECRET, { expiresIn: '30d' });
    
    res.status(201).json({
      token,
      user: {
        username: newUser.username,
        email: newUser.email,
        avatar: newUser.avatar,
        name: newUser.name,
        bio: newUser.bio,
        phoneNumber: newUser.phoneNumber,
        subscription: newUser.subscription || { plan: 'Free', status: 'inactive' }
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi máy chủ khi đăng ký: ' + error.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Vui lòng nhập tên đăng nhập và mật khẩu.' });
    }

    const normalizedUsername = username.toLowerCase().trim();

    // Check if user exists
    const user = await User.findOne({ username: normalizedUsername });
    if (!user) {
      return res.status(400).json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
    }

    // Create token
    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
    
    res.json({
      token,
      user: {
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        name: user.name,
        bio: user.bio,
        phoneNumber: user.phoneNumber,
        subscription: user.subscription || { plan: 'Free', status: 'inactive' }
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi máy chủ khi đăng nhập: ' + error.message });
  }
});

// Get public configuration (Google Client ID & Facebook App ID)
app.get('/api/config/google', (req, res) => {
  res.json({ 
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    facebookAppId: process.env.FACEBOOK_APP_ID || ''
  });
});

// Google OAuth2 Login / Register
app.post('/api/auth/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ error: 'Không tìm thấy thông tin xác thực Google.' });
    }

    // Verify token with Google's tokeninfo API
    const googleVerifyUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`;
    const verifyResponse = await httpRequest(googleVerifyUrl);
    
    if (!verifyResponse.ok) {
      const errData = await verifyResponse.json();
      return res.status(400).json({ error: 'Mã xác thực Google không hợp lệ hoặc đã hết hạn: ' + (errData.error_description || '') });
    }

    const payload = await verifyResponse.json();
    const { 
      sub: googleId, 
      email, 
      name, 
      picture,
      given_name: givenName,
      family_name: familyName,
      email_verified: emailVerified,
      locale
    } = payload;

    if (!email) {
      return res.status(400).json({ error: 'Tài khoản Google này không cung cấp thông tin Email.' });
    }

    // 1. Check if user already linked with this googleId
    let user = await User.findOne({ googleId });

    if (!user) {
      // 2. Check if user already registered with this email
      user = await User.findOne({ email: email.toLowerCase().trim() });
      
      if (user) {
        // Link Google account to existing user
        user.googleId = googleId;
        if (!user.avatar) {
          user.avatar = picture;
        }
        if (!user.name) {
          user.name = name;
        }
        user.givenName = givenName;
        user.familyName = familyName;
        user.emailVerified = emailVerified;
        user.locale = locale;
        user.googlePayload = payload;
        await user.save();
      } else {
        // 3. Create a new user if not exists
        // Clean up name to construct username. e.g. "Huy Ph" -> "huyph"
        let baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
        if (!baseUsername) baseUsername = 'user';

        // Check if username is unique, append numbers if not
        let finalUsername = baseUsername;
        let suffix = 1;
        while (await User.findOne({ username: finalUsername })) {
          finalUsername = `${baseUsername}${suffix}`;
          suffix += 1;
        }

        user = new User({
          username: finalUsername,
          email: email.toLowerCase().trim(),
          name,
          googleId,
          avatar: picture,
          givenName,
          familyName,
          emailVerified,
          locale,
          googlePayload: payload,
          watchHistory: []
        });

        await user.save();
      }
    } else {
      // Update details if they changed on Google
      let updated = false;
      if (user.avatar !== picture) {
        user.avatar = picture;
        updated = true;
      }
      if (user.name !== name) {
        user.name = name;
        updated = true;
      }
      if (user.givenName !== givenName) {
        user.givenName = givenName;
        updated = true;
      }
      if (user.familyName !== familyName) {
        user.familyName = familyName;
        updated = true;
      }
      if (user.emailVerified !== emailVerified) {
        user.emailVerified = emailVerified;
        updated = true;
      }
      if (user.locale !== locale) {
        user.locale = locale;
        updated = true;
      }
      
      // Always store/update the raw payload
      user.googlePayload = payload;
      updated = true;

      if (updated) {
        await user.save();
      }
    }

    // Create app token
    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      token,
      user: {
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        name: user.name,
        bio: user.bio,
        phoneNumber: user.phoneNumber,
        subscription: user.subscription || { plan: 'Free', status: 'inactive' }
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi máy chủ khi đăng nhập Google: ' + error.message });
  }
});

// Diagnostic Auth Endpoint
app.get('/api/auth/diagnostic', async (req, res) => {
  const report = {
    time: new Date().toISOString(),
    env: {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      HTTP_PROXY: process.env.HTTP_PROXY ? 'defined' : 'undefined',
      HTTPS_PROXY: process.env.HTTPS_PROXY ? 'defined' : 'undefined',
      http_proxy: process.env.http_proxy ? 'defined' : 'undefined',
      https_proxy: process.env.https_proxy ? 'defined' : 'undefined',
    },
    dns: {},
    fetchGoogle: null,
    fetchFacebook: null,
    httpGoogle: null,
    httpFacebook: null
  };

  // 1. Test DNS
  try {
    report.dns.google_ipv4 = await resolve4Async('oauth2.googleapis.com').catch(e => e.message);
    report.dns.google_ipv6 = await resolve6Async('oauth2.googleapis.com').catch(e => e.message);
  } catch (e) {
    report.dns.google_err = e.message;
  }
  try {
    report.dns.facebook_ipv4 = await resolve4Async('graph.facebook.com').catch(e => e.message);
    report.dns.facebook_ipv6 = await resolve6Async('graph.facebook.com').catch(e => e.message);
  } catch (e) {
    report.dns.facebook_err = e.message;
  }

  // 2. Test native fetch
  try {
    const t0 = Date.now();
    const resGoogle = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=test', { signal: AbortSignal.timeout(3000) });
    report.fetchGoogle = { status: resGoogle.status, ok: resGoogle.ok, timeMs: Date.now() - t0 };
  } catch (e) {
    report.fetchGoogle = { error: e.message, code: e.code };
  }
  try {
    const t0 = Date.now();
    const resFB = await fetch('https://graph.facebook.com/me?fields=id&access_token=test', { signal: AbortSignal.timeout(3000) });
    report.fetchFacebook = { status: resFB.status, ok: resFB.ok, timeMs: Date.now() - t0 };
  } catch (e) {
    report.fetchFacebook = { error: e.message, code: e.code };
  }

  // 3. Test httpRequest
  try {
    const t0 = Date.now();
    const resGoogle = await httpRequest('https://oauth2.googleapis.com/tokeninfo?id_token=test');
    report.httpGoogle = { status: resGoogle.status, ok: resGoogle.ok, timeMs: Date.now() - t0 };
  } catch (e) {
    report.httpGoogle = { error: e.message, code: e.code };
  }
  try {
    const t0 = Date.now();
    const resFB = await httpRequest('https://graph.facebook.com/me?fields=id&access_token=test');
    report.httpFacebook = { status: resFB.status, ok: resFB.ok, timeMs: Date.now() - t0 };
  } catch (e) {
    report.httpFacebook = { error: e.message, code: e.code };
  }

  res.json(report);
});

// Facebook OAuth2 Login / Register
app.post('/api/auth/facebook', async (req, res) => {
  try {
    const { accessToken, profile } = req.body;
    if (!accessToken) {
      return res.status(400).json({ error: 'Không tìm thấy mã xác thực Facebook (accessToken).' });
    }

    let payload = null;
    let verified = false;

    // 1. Try to verify token with Facebook Graph API (server-side)
    try {
      const fbVerifyUrl = `https://graph.facebook.com/me?fields=id,name,email,picture.type(large),first_name,last_name,locale&access_token=${accessToken}`;
      const verifyResponse = await httpRequest(fbVerifyUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 4000 // 4 seconds timeout for fast failover
      });
      
      if (verifyResponse.ok) {
        payload = await verifyResponse.json();
        verified = true;
        console.log('Facebook Login: Token verified successfully on server-side.');
      } else {
        console.warn('Facebook Login: Server-side token verification returned non-ok status.');
      }
    } catch (fetchErr) {
      console.warn('Facebook Login: Server-side token verification failed (unreachable/timeout):', fetchErr.message);
    }

    // 2. Fallback to client-supplied profile if server-side fetch failed
    if (!verified) {
      if (profile && profile.id) {
        payload = profile;
        console.log('Facebook Login: Falling back to client-supplied profile.');
      } else {
        return res.status(400).json({ error: 'Không thể kết nối đến máy chủ Facebook và không nhận được thông tin cá nhân từ Client.' });
      }
    }

    const { 
      id: facebookId, 
      email, 
      name, 
      picture,
      first_name: givenName,
      last_name: familyName,
      locale
    } = payload;

    const avatarUrl = picture?.data?.url || '';

    // 3. Register or link user
    let user = await User.findOne({ facebookId });

    if (!user) {
      if (email) {
        user = await User.findOne({ email: email.toLowerCase().trim() });
      }
      
      if (user) {
        // Link Facebook account to existing user
        user.facebookId = facebookId;
        if (!user.avatar) {
          user.avatar = avatarUrl;
        }
        if (!user.name) {
          user.name = name;
        }
        if (!user.givenName) user.givenName = givenName;
        if (!user.familyName) user.familyName = familyName;
        if (!user.locale) user.locale = locale;
        user.facebookPayload = payload;
        await user.save();
      } else {
        // Create a new user if not exists
        let baseUsername = '';
        if (email) {
          baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
        } else {
          // If Facebook didn't return an email
          baseUsername = `fb_${facebookId.slice(-6)}`;
        }
        if (!baseUsername) baseUsername = 'user';

        // Check if username is unique, append numbers if not
        let finalUsername = baseUsername;
        let suffix = 1;
        while (await User.findOne({ username: finalUsername })) {
          finalUsername = `${baseUsername}${suffix}`;
          suffix += 1;
        }

        user = new User({
          username: finalUsername,
          email: email ? email.toLowerCase().trim() : undefined,
          name,
          facebookId,
          avatar: avatarUrl,
          givenName,
          familyName,
          locale,
          facebookPayload: payload,
          watchHistory: []
        });

        await user.save();
      }
    } else {
      // Update details if they changed on Facebook
      let updated = false;
      if (avatarUrl && user.avatar !== avatarUrl) {
        user.avatar = avatarUrl;
        updated = true;
      }
      if (user.name !== name) {
        user.name = name;
        updated = true;
      }
      if (user.givenName !== givenName) {
        user.givenName = givenName;
        updated = true;
      }
      if (user.familyName !== familyName) {
        user.familyName = familyName;
        updated = true;
      }
      if (locale && user.locale !== locale) {
        user.locale = locale;
        updated = true;
      }
      
      // Always store/update the raw payload
      user.facebookPayload = payload;
      updated = true;

      if (updated) {
        await user.save();
      }
    }

    // Create app token
    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      token,
      user: {
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        name: user.name,
        bio: user.bio,
        phoneNumber: user.phoneNumber,
        subscription: user.subscription || { plan: 'Free', status: 'inactive' }
      }
    });
  } catch (error) {
    console.error('Lỗi đăng nhập Facebook chi tiết:', error);
    res.status(500).json({ error: 'Lỗi máy chủ khi đăng nhập Facebook: ' + error.message });
  }
});

// --- WATCH HISTORY ENDPOINTS ---

// Get watch history
app.get('/api/history', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng.' });
    }
    // Return history sorted by timestamp descending
    const sortedHistory = user.watchHistory.sort((a, b) => b.timestamp - a.timestamp);
    res.json(sortedHistory);
  } catch (error) {
    res.status(500).json({ error: 'Lỗi khi lấy lịch sử xem phim: ' + error.message });
  }
});

// Sync history item (add or update)
app.post('/api/history', authenticateToken, async (req, res) => {
  try {
    const { slug, name, thumb_url, currentEpisodeSlug, currentTime, duration } = req.body;
    if (!slug || !name) {
      return res.status(400).json({ error: 'Thiếu thông tin phim (slug hoặc tên).' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng.' });
    }

    // Check if item already exists in history
    const existingIndex = user.watchHistory.findIndex(item => item.slug === slug);

    if (existingIndex >= 0) {
      // Update existing
      const existingItem = user.watchHistory[existingIndex];
      existingItem.timestamp = Date.now();
      if (currentEpisodeSlug !== undefined) existingItem.currentEpisodeSlug = currentEpisodeSlug;
      if (currentTime !== undefined) existingItem.currentTime = currentTime;
      if (thumb_url !== undefined) existingItem.thumb_url = thumb_url;
      if (duration !== undefined) existingItem.duration = duration;
    } else {
      // Add new to history
      user.watchHistory.push({
        slug,
        name,
        thumb_url,
        timestamp: Date.now(),
        currentEpisodeSlug,
        currentTime,
        duration
      });
    }

    // Keep history capped at 50 items
    if (user.watchHistory.length > 50) {
      user.watchHistory.sort((a, b) => b.timestamp - a.timestamp);
      user.watchHistory = user.watchHistory.slice(0, 50);
    }

    await user.save();
    res.json(user.watchHistory.sort((a, b) => b.timestamp - a.timestamp));
  } catch (error) {
    res.status(500).json({ error: 'Lỗi khi đồng bộ lịch sử: ' + error.message });
  }
});

// Clear all watch history
app.delete('/api/history', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng.' });
    }
    user.watchHistory = [];
    await user.save();
    res.json([]);
  } catch (error) {
    res.status(500).json({ error: 'Lỗi khi xóa lịch sử xem phim: ' + error.message });
  }
});

// --- PROFILE & PREMIUM SUBSCRIPTION ENDPOINTS ---

// Get current user profile (with auth token)
app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng.' });
    }
    res.json({
      username: user.username,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      bio: user.bio,
      phoneNumber: user.phoneNumber,
      subscription: user.subscription || { plan: 'Free', status: 'inactive' }
    });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi máy chủ khi lấy hồ sơ: ' + error.message });
  }
});

// Update user profile (with auth token)
app.put('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const { name, email, phoneNumber, bio } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng.' });
    }

    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email.toLowerCase().trim();
    if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;
    if (bio !== undefined) user.bio = bio;

    await user.save();

    res.json({
      username: user.username,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      bio: user.bio,
      phoneNumber: user.phoneNumber,
      subscription: user.subscription || { plan: 'Free', status: 'inactive' }
    });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi máy chủ khi cập nhật hồ sơ: ' + error.message });
  }
});

// Simulated Subscribe Plan (with auth token)
app.post('/api/user/subscribe', authenticateToken, async (req, res) => {
  try {
    const { plan } = req.body;
    if (!['Free', 'Standard', 'VIP'].includes(plan)) {
      return res.status(400).json({ error: 'Gói đăng ký không hợp lệ.' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng.' });
    }

    if (plan === 'Free') {
      user.subscription = {
        plan: 'Free',
        status: 'inactive',
        expiresAt: undefined
      };
    } else {
      // 30 days from now
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      
      user.subscription = {
        plan,
        status: 'active',
        expiresAt
      };
    }

    await user.save();

    res.json({
      username: user.username,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      bio: user.bio,
      phoneNumber: user.phoneNumber,
      subscription: user.subscription
    });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi máy chủ khi đăng ký gói cước: ' + error.message });
  }
});

// --- MOVIE COMMENTS & RATINGS ENDPOINTS ---

// Get movie comments
app.get('/api/movies/:slug/comments', async (req, res) => {
  try {
    const { slug } = req.params;
    const comments = await Comment.find({ movieSlug: slug }).sort({ createdAt: -1 });
    res.json(comments);
  } catch (error) {
    res.status(500).json({ error: 'Lỗi máy chủ khi lấy bình luận: ' + error.message });
  }
});

// Post a new comment (requires auth token)
app.post('/api/movies/:slug/comments', authenticateToken, async (req, res) => {
  try {
    const { slug } = req.params;
    const { content, rating, isSpoiler } = req.body;
    
    if (!content || content.trim() === '') {
      return res.status(400).json({ error: 'Nội dung bình luận không được để trống.' });
    }

    // Find user to get their avatar
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy thông tin người dùng.' });
    }

    const newComment = new Comment({
      movieSlug: slug,
      username: user.username,
      avatar: user.avatar,
      rating: rating ? Number(rating) : undefined,
      content: content.trim(),
      isSpoiler: Boolean(isSpoiler)
    });

    await newComment.save();
    res.status(201).json(newComment);
  } catch (error) {
    res.status(500).json({ error: 'Lỗi máy chủ khi thêm bình luận: ' + error.message });
  }
});

// --- SERVE FRONTEND STATIC FILES IN PRODUCTION ---
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// Fallback to React app router
app.get('*', (req, res) => {
  // If it looks like an API call but wasn't handled, return 404
  if (req.originalUrl.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  // Otherwise serve React frontend index.html
  const indexPath = path.join(distPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(404).send('Frontend build files not found. Please build frontend first.');
    }
  });
});

const PORT = process.env.PORT || 7860;
const server = http.createServer(app);

// Setup Socket.io
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Track rooms and their participants
// roomsMap: roomId -> Map(socketId -> { username, avatar })
const roomsMap = new Map();

io.on('connection', (socket) => {
  let currentRoomId = null;
  let currentUserInfo = null;

  socket.on('join-room', ({ roomId, username, avatar }) => {
    currentRoomId = roomId;
    currentUserInfo = { username, avatar };

    socket.join(roomId);

    if (!roomsMap.has(roomId)) {
      roomsMap.set(roomId, new Map());
    }
    roomsMap.get(roomId).set(socket.id, currentUserInfo);

    // Broadcast system message: user joined
    io.to(roomId).emit('message', {
      _id: `sys-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sender: 'Hệ thống',
      text: `${username} đã tham gia phòng.`,
      isSystem: true,
      time: new Date()
    });

    // Send the current list of participants to everyone in the room
    const participants = Array.from(roomsMap.get(roomId).values());
    io.to(roomId).emit('room-members', participants);
  });

  socket.on('send-message', ({ text }) => {
    if (currentRoomId && currentUserInfo) {
      io.to(currentRoomId).emit('message', {
        _id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        sender: currentUserInfo.username,
        avatar: currentUserInfo.avatar,
        text: text,
        time: new Date()
      });
    }
  });

  // Media sync events
  socket.on('player-play', ({ time }) => {
    if (currentRoomId && currentUserInfo) {
      // Broadcast play event to all other clients in the room
      socket.to(currentRoomId).emit('player-play', { 
        time, 
        sender: currentUserInfo.username 
      });
      // Also send a system message to keep everyone updated
      io.to(currentRoomId).emit('message', {
        _id: `sys-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        sender: 'Hệ thống',
        text: `${currentUserInfo.username} đã bấm phát phim.`,
        isSystem: true,
        time: new Date()
      });
    }
  });

  socket.on('player-pause', () => {
    if (currentRoomId && currentUserInfo) {
      // Broadcast pause event to all other clients
      socket.to(currentRoomId).emit('player-pause', { 
        sender: currentUserInfo.username 
      });
      io.to(currentRoomId).emit('message', {
        _id: `sys-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        sender: 'Hệ thống',
        text: `${currentUserInfo.username} đã tạm dừng phim.`,
        isSystem: true,
        time: new Date()
      });
    }
  });

  socket.on('player-seek', ({ time }) => {
    if (currentRoomId && currentUserInfo) {
      // Broadcast seek event to all other clients
      socket.to(currentRoomId).emit('player-seek', { 
        time, 
        sender: currentUserInfo.username 
      });
      const mins = Math.floor(time / 60);
      const secs = Math.floor(time % 60);
      const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      io.to(currentRoomId).emit('message', {
        _id: `sys-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        sender: 'Hệ thống',
        text: `${currentUserInfo.username} đã tua phim đến ${timeStr}.`,
        isSystem: true,
        time: new Date()
      });
    }
  });

  // Client requests sync state from other users in the room (e.g. when joining)
  socket.on('request-sync', () => {
    if (currentRoomId) {
      // Find another socket ID in the same room
      const roomSockets = io.sockets.adapter.rooms.get(currentRoomId);
      if (roomSockets) {
        for (const otherSocketId of roomSockets) {
          if (otherSocketId !== socket.id) {
            // Send request to that specific client
            io.to(otherSocketId).emit('get-playback-state', { requesterId: socket.id });
            break;
          }
        }
      }
    }
  });

  // Response with current playback state to be sent to requester
  socket.on('send-playback-state', ({ requesterId, time, isPlaying }) => {
    io.to(requesterId).emit('receive-playback-state', { time, isPlaying });
  });

  socket.on('disconnect', () => {
    if (currentRoomId && currentUserInfo) {
      socket.leave(currentRoomId);
      const room = roomsMap.get(currentRoomId);
      if (room) {
        room.delete(socket.id);
        
        // Broadcast system message
        io.to(currentRoomId).emit('message', {
          _id: `sys-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          sender: 'Hệ thống',
          text: `${currentUserInfo.username} đã rời phòng.`,
          isSystem: true,
          time: new Date()
        });

        if (room.size === 0) {
          roomsMap.delete(currentRoomId);
        } else {
          // Send updated member list
          io.to(currentRoomId).emit('room-members', Array.from(room.values()));
        }
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
