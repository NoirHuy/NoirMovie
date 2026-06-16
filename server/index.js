import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

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
  currentTime: { type: Number }
});

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  watchHistory: [HistoryItemSchema]
});

const User = mongoose.model('User', UserSchema);

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
    const { username, password } = req.body;
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
      password: hashedPassword,
      watchHistory: []
    });

    await newUser.save();
    
    // Create token
    const token = jwt.sign({ id: newUser._id, username: newUser.username }, JWT_SECRET, { expiresIn: '30d' });
    
    res.status(201).json({
      token,
      user: {
        username: newUser.username
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
        username: user.username
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi máy chủ khi đăng nhập: ' + error.message });
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
    const { slug, name, thumb_url, currentEpisodeSlug, currentTime } = req.body;
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
    } else {
      // Add new to history
      user.watchHistory.push({
        slug,
        name,
        thumb_url,
        timestamp: Date.now(),
        currentEpisodeSlug,
        currentTime
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
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
