import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../models/User.model';
import { env } from '../config/env';

const generateDisasterId = (city: string): string => {
  const code = city.slice(0, 3).toUpperCase();
  const year = new Date().getFullYear();
  const hex = uuidv4().replace(/-/g, '').slice(0, 4).toUpperCase();
  return `DM-${code}-${year}-${hex}`;
};

const signAccess = (userId: string) =>
  jwt.sign({ userId }, env.JWT_SECRET, { expiresIn: '7d' });

const signRefresh = (userId: string) =>
  jwt.sign({ userId }, env.JWT_REFRESH_SECRET, { expiresIn: '30d' });

// POST /auth/register
// Body: { username, phone, password, city }
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, phone, password, city } = req.body as {
      username: string;
      phone: string;
      password: string;
      city: string;
    };

    if (!username || !phone || !password || !city) {
      res.status(400).json({ error: 'Username, phone, password, and city are required' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters' });
      return;
    }

    // Check duplicates
    const existingPhone = await User.findOne({ phone });
    if (existingPhone) {
      res.status(409).json({ error: 'Phone number already registered. Please login.' });
      return;
    }

    const existingUsername = await User.findOne({ name: username });
    if (existingUsername) {
      res.status(409).json({ error: 'Username already taken. Please choose another.' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const disasterId = generateDisasterId(city);

    const user = await User.create({
      name: username,
      phone,
      password: hashedPassword,
      city,
      disasterId,
    });

    const accessToken = signAccess(user._id.toString());
    const refreshToken = signRefresh(user._id.toString());
    const hashedRefresh = await bcrypt.hash(refreshToken, 10);
    await User.updateOne({ _id: user._id }, { refreshToken: hashedRefresh });

    res.status(201).json({ accessToken, refreshToken, user });
  } catch (err) {
    console.error('[auth/register]', err);
    res.status(500).json({ error: 'Registration failed' });
  }
};

// POST /auth/login
// Body: { disasterId, password }
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { disasterId, password } = req.body as {
      disasterId: string;
      password: string;
    };

    if (!disasterId || !password) {
      res.status(400).json({ error: 'Disaster ID and password are required' });
      return;
    }

    const user = await User.findOne({ disasterId }).select('+password');
    if (!user) {
      res.status(404).json({ error: 'No account found with that Disaster ID.' });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ error: 'Account is deactivated.' });
      return;
    }

    if (!user.password) {
      res.status(400).json({ error: 'Account has no password set. Please contact support.' });
      return;
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      res.status(401).json({ error: 'Incorrect password.' });
      return;
    }

    await User.updateOne({ _id: user._id }, { lastSeen: new Date() });

    const accessToken = signAccess(user._id.toString());
    const refreshToken = signRefresh(user._id.toString());
    const hashedRefresh = await bcrypt.hash(refreshToken, 10);
    await User.updateOne({ _id: user._id }, { refreshToken: hashedRefresh });

    res.json({ accessToken, refreshToken, user });
  } catch (err) {
    console.error('[auth/login]', err);
    res.status(500).json({ error: 'Login failed' });
  }
};

// POST /auth/refresh
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken: token } = req.body as { refreshToken: string };
    if (!token) {
      res.status(400).json({ error: 'Refresh token required' });
      return;
    }

    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as { userId: string };
    const user = await User.findById(decoded.userId).select('+refreshToken');
    if (!user?.refreshToken) {
      res.status(401).json({ error: 'Invalid session' });
      return;
    }

    const valid = await bcrypt.compare(token, user.refreshToken);
    if (!valid) {
      res.status(401).json({ error: 'Invalid refresh token' });
      return;
    }

    const newAccess = signAccess(user._id.toString());
    const newRefresh = signRefresh(user._id.toString());
    const hashedRefresh = await bcrypt.hash(newRefresh, 10);
    await User.updateOne({ _id: user._id }, { refreshToken: hashedRefresh });

    res.json({ accessToken: newAccess, refreshToken: newRefresh });
  } catch {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
};

// DELETE /auth/logout
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.decode(token) as { userId?: string } | null;
      if (decoded?.userId) {
        await User.updateOne({ _id: decoded.userId }, { $unset: { refreshToken: 1 } });
      }
    }
    res.json({ message: 'Logged out successfully' });
  } catch {
    res.json({ message: 'Logged out' });
  }
};
