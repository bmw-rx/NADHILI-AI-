import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import pg from 'pg';
import { neon } from '@neondatabase/serverless';

const { Pool } = pg;

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  plan: string;
  created_at: number;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  created_at: number;
  updated_at: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: number;
}

export interface PaymentRecord {
  id: string;
  orderReference: string;
  userId?: string;
  plan: 'normal' | 'hard' | 'ultra' | string;
  amount: number;
  currency: string;
  phoneNumber: string;
  network?: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  rawResponse?: any;
  createdAt: number;
  updatedAt: number;
}

export interface NotificationRecord {
  id: string;
  title: string;
  message: string;
  targetPlan?: string;
  createdAt: number;
}

interface LocalSchema {
  users: User[];
  conversations: Conversation[];
  messages: Message[];
  payments: PaymentRecord[];
  notifications: NotificationRecord[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

class DatabaseManager {
  private localData: LocalSchema = {
    users: [],
    conversations: [],
    messages: [],
    payments: [],
    notifications: [],
  };

  private databaseUrl: string = process.env.DATABASE_URL || '';
  private pool: pg.Pool | null = null;
  private neonClient: any = null;
  private dbConnected: boolean = false;
  private isNeonServerless: boolean = false;

  constructor() {
    this.initLocal();
    if (this.databaseUrl) {
      this.initDatabase(this.databaseUrl).catch((err) => {
        console.warn('Database connection notice:', err.message);
      });
    }
  }

  private initLocal() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.localData = JSON.parse(raw);
      } catch {
        this.saveLocal();
      }
    } else {
      this.saveLocal();
    }
  }

  private saveLocal() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.localData, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save local db.json', err);
    }
  }

  async initDatabase(url: string): Promise<{ success: boolean; message: string }> {
    const trimmed = url.trim().replace(/["';\\]+$/, '');
    if (!trimmed.startsWith('postgres://') && !trimmed.startsWith('postgresql://')) {
      throw new Error('Invalid PostgreSQL format. Must start with postgresql:// or postgres://');
    }

    // Close any previous pool
    if (this.pool) {
      try {
        await this.pool.end();
      } catch {}
      this.pool = null;
    }
    this.neonClient = null;

    let connected = false;

    // Strategy 1: Standard pg.Pool with SSL support (works for Render, Supabase, Neon, AWS RDS, Cloud SQL)
    try {
      const isLocalhost = trimmed.includes('localhost') || trimmed.includes('127.0.0.1');
      const newPool = new Pool({
        connectionString: trimmed,
        ssl: isLocalhost ? false : { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000,
        idleTimeoutMillis: 30000,
      });

      const client = await newPool.connect();
      await client.query('SELECT 1 as connected');
      client.release();

      this.pool = newPool;
      this.isNeonServerless = false;
      connected = true;
    } catch (pgErr: any) {
      console.warn('Standard pg pool connection attempt:', pgErr.message);

      // Strategy 2: If neon.tech, fallback to @neondatabase/serverless over HTTPS
      if (trimmed.includes('neon.tech')) {
        try {
          const client = neon(trimmed);
          await client`SELECT 1 as connected`;
          this.neonClient = client;
          this.isNeonServerless = true;
          connected = true;
        } catch (neonErr: any) {
          throw new Error(`Database connection failed: ${pgErr.message}`);
        }
      } else {
        throw new Error(`Database connection failed: ${pgErr.message}`);
      }
    }

    if (connected) {
      this.dbConnected = true;
      this.databaseUrl = trimmed;

      // Initialize tables and indexes
      await this.runMigrations();

      // Synchronize existing local memory into the database
      await this.syncLocalToDatabase();

      return {
        success: true,
        message: 'Database connected and synchronized.',
      };
    }

    throw new Error('Could not establish database connection.');
  }

  // Alias for backward compatibility with existing route
  async initNeon(url: string) {
    return this.initDatabase(url);
  }

  private async executeQuery(text: string, params: any[] = []): Promise<any[]> {
    if (this.pool && this.dbConnected) {
      const res = await this.pool.query(text, params);
      return res.rows;
    }

    if (this.neonClient && this.dbConnected) {
      // Convert parameterized query for neon template tag if needed
      // Most queries we run are standardized
      let queryStr = text;
      params.forEach((param, i) => {
        const val = typeof param === 'string' ? `'${param.replace(/'/g, "''")}'` : param === null ? 'NULL' : param;
        queryStr = queryStr.replace(new RegExp(`\\$${i + 1}\\b`, 'g'), String(val));
      });
      const rows = (await (this.neonClient as any)(queryStr)) as any[];
      return rows || [];
    }

    throw new Error('Database not connected.');
  }

  private async runMigrations() {
    try {
      await this.executeQuery(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          plan VARCHAR(50) DEFAULT 'free',
          created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
        );
      `);

      await this.executeQuery(`
        CREATE TABLE IF NOT EXISTS conversations (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          title TEXT NOT NULL,
          created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
          updated_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
        );
      `);

      await this.executeQuery(`
        CREATE TABLE IF NOT EXISTS messages (
          id VARCHAR(255) PRIMARY KEY,
          conversation_id VARCHAR(255) NOT NULL,
          role VARCHAR(50) NOT NULL,
          content TEXT NOT NULL,
          created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
          FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
        );
      `);

      await this.executeQuery(`
        CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id, updated_at DESC);
      `);

      await this.executeQuery(`
        CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, created_at ASC);
      `);
    } catch (err) {
      console.warn('Migration notice:', err);
    }
  }

  private async syncLocalToDatabase() {
    if (!this.dbConnected) return;

    try {
      for (const u of this.localData.users) {
        await this.executeQuery(
          `INSERT INTO users (id, name, email, password_hash, plan, created_at)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO NOTHING;`,
          [u.id, u.name, u.email, u.password_hash, u.plan, u.created_at]
        );
      }

      for (const c of this.localData.conversations) {
        await this.executeQuery(
          `INSERT INTO conversations (id, user_id, title, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id) DO NOTHING;`,
          [c.id, c.user_id, c.title, c.created_at, c.updated_at]
        );
      }

      for (const m of this.localData.messages) {
        await this.executeQuery(
          `INSERT INTO messages (id, conversation_id, role, content, created_at)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id) DO NOTHING;`,
          [m.id, m.conversation_id, m.role, m.content, m.created_at]
        );
      }
    } catch (e) {
      console.warn('Sync to database notice:', e);
    }
  }

  getStatus() {
    return {
      connected: this.dbConnected,
      provider: this.dbConnected ? 'PostgreSQL Database' : 'Local Storage Engine',
    };
  }

  // --- USERS ---
  async findUserByEmail(email: string): Promise<User | undefined> {
    const cleanEmail = email.toLowerCase().trim();
    if (this.dbConnected) {
      try {
        const rows = await this.executeQuery(
          `SELECT id, email, password_hash, COALESCE(name, 'User') as name, COALESCE(plan, 'free') as plan, created_at
           FROM users
           WHERE LOWER(email) = $1
           LIMIT 1;`,
          [cleanEmail]
        );

        if (rows.length > 0) {
          const r = rows[0];
          return {
            id: String(r.id),
            name: r.name,
            email: r.email,
            password_hash: r.password_hash,
            plan: r.plan || 'free',
            created_at: Number(r.created_at) || Math.floor(Date.now() / 1000),
          };
        }
        return undefined;
      } catch (err) {
        console.error('Database findUserByEmail error, falling back:', err);
      }
    }
    return this.localData.users.find((u) => u.email.toLowerCase() === cleanEmail);
  }

  async findUserById(id: string): Promise<User | undefined> {
    if (this.dbConnected) {
      try {
        const rows = await this.executeQuery(
          `SELECT id, email, password_hash, COALESCE(name, 'User') as name, COALESCE(plan, 'free') as plan, created_at
           FROM users
           WHERE id = $1
           LIMIT 1;`,
          [id]
        );

        if (rows.length > 0) {
          const r = rows[0];
          return {
            id: String(r.id),
            name: r.name,
            email: r.email,
            password_hash: r.password_hash,
            plan: r.plan || 'free',
            created_at: Number(r.created_at) || Math.floor(Date.now() / 1000),
          };
        }
        return undefined;
      } catch (err) {
        console.error('Database findUserById error, falling back:', err);
      }
    }
    return this.localData.users.find((u) => u.id === id);
  }

  async getUserById(id: string): Promise<User | undefined> {
    return this.findUserById(id);
  }

  async createUser(name: string, email: string, passwordHash: string): Promise<User> {
    const cleanEmail = email.toLowerCase().trim();
    const cleanName = name.trim();
    const now = Math.floor(Date.now() / 1000);
    const userId = 'usr_' + crypto.randomUUID();

    if (this.dbConnected) {
      try {
        const rows = await this.executeQuery(
          `INSERT INTO users (id, name, email, password_hash, plan, created_at)
           VALUES ($1, $2, $3, $4, 'free', $5)
           RETURNING id, name, email, plan, created_at;`,
          [userId, cleanName, cleanEmail, passwordHash, now]
        );

        if (rows.length > 0) {
          const r = rows[0];
          const user: User = {
            id: String(r.id),
            name: r.name,
            email: r.email,
            password_hash: passwordHash,
            plan: r.plan || 'free',
            created_at: Number(r.created_at) || now,
          };
          this.localData.users.push(user);
          this.saveLocal();
          return user;
        }
      } catch (err) {
        console.error('Database createUser error, saving locally:', err);
      }
    }

    const user: User = {
      id: userId,
      name: cleanName,
      email: cleanEmail,
      password_hash: passwordHash,
      plan: 'free',
      created_at: now,
    };
    this.localData.users.push(user);
    this.saveLocal();
    return user;
  }

  async updateUserPlan(userId: string, plan: string): Promise<boolean> {
    if (this.dbConnected) {
      try {
        await this.executeQuery(
          `UPDATE users SET plan = $1 WHERE id = $2;`,
          [plan, userId]
        );
      } catch (err) {
        console.error('Database updateUserPlan error:', err);
      }
    }
    const u = this.localData.users.find((user) => user.id === userId);
    if (u) {
      u.plan = plan;
      this.saveLocal();
    }
    return true;
  }

  // --- ADMIN PANEL METHODS ---
  async getAllUsers(): Promise<Omit<User, 'password_hash'>[]> {
    if (this.dbConnected) {
      try {
        const rows = await this.executeQuery(
          `SELECT id, email, COALESCE(name, 'User') as name, COALESCE(plan, 'free') as plan, created_at
           FROM users
           ORDER BY created_at DESC;`
        );
        return rows.map((r: any) => ({
          id: String(r.id),
          email: String(r.email),
          name: String(r.name),
          plan: String(r.plan || 'free'),
          created_at: Number(r.created_at) || Math.floor(Date.now() / 1000),
        }));
      } catch (err) {
        console.error('Database getAllUsers error, falling back:', err);
      }
    }
    return this.localData.users.map(({ password_hash, ...u }) => u);
  }

  async createNotification(title: string, message: string, targetPlan?: string): Promise<NotificationRecord> {
    const notif: NotificationRecord = {
      id: 'notif_' + crypto.randomUUID(),
      title,
      message,
      targetPlan: targetPlan || 'all',
      createdAt: Date.now(),
    };
    if (!this.localData.notifications) {
      this.localData.notifications = [];
    }
    this.localData.notifications.unshift(notif);
    this.saveLocal();
    return notif;
  }

  async getNotifications(limit: number = 20): Promise<NotificationRecord[]> {
    if (!this.localData.notifications) {
      this.localData.notifications = [];
    }
    return this.localData.notifications.slice(0, limit);
  }

  async getAdminStats() {
    const users = await this.getAllUsers();
    const payments = this.localData.payments || [];
    const conversations = this.localData.conversations || [];
    const messages = this.localData.messages || [];

    const planCounts: Record<string, number> = {
      free: 0,
      normal: 0,
      hard: 0,
      ultra: 0,
    };
    users.forEach((u) => {
      const p = (u.plan || 'free').toLowerCase();
      planCounts[p] = (planCounts[p] || 0) + 1;
    });

    const totalRevenue = payments
      .filter((p) => p.status === 'SUCCESS')
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    return {
      totalUsers: users.length,
      planCounts,
      totalRevenue,
      totalPayments: payments.length,
      successfulPayments: payments.filter((p) => p.status === 'SUCCESS').length,
      totalConversations: conversations.length,
      totalMessages: messages.length,
      recentPayments: payments.slice(-10).reverse(),
      notificationsCount: (this.localData.notifications || []).length,
    };
  }

  // --- PAYMENTS & USSD TRANSACTIONS ---
  async savePayment(payment: PaymentRecord): Promise<PaymentRecord> {
    if (!this.localData.payments) {
      this.localData.payments = [];
    }
    const existingIndex = this.localData.payments.findIndex(
      (p) => p.orderReference === payment.orderReference
    );
    if (existingIndex !== -1) {
      this.localData.payments[existingIndex] = payment;
    } else {
      this.localData.payments.push(payment);
    }
    this.saveLocal();
    return payment;
  }

  async getPaymentByOrderRef(orderRef: string): Promise<PaymentRecord | undefined> {
    if (!this.localData.payments) {
      this.localData.payments = [];
    }
    return this.localData.payments.find((p) => p.orderReference === orderRef);
  }

  async updatePaymentStatus(
    orderRef: string,
    status: 'PENDING' | 'SUCCESS' | 'FAILED',
    rawResponse?: any
  ): Promise<PaymentRecord | undefined> {
    const payment = await this.getPaymentByOrderRef(orderRef);
    if (payment) {
      payment.status = status;
      payment.updatedAt = Date.now();
      if (rawResponse) payment.rawResponse = rawResponse;
      if (status === 'SUCCESS' && payment.userId) {
        await this.updateUserPlan(payment.userId, payment.plan);
      }
      this.saveLocal();
      return payment;
    }
    return undefined;
  }

  // --- CONVERSATIONS ---
  async getUserConversations(userId: string): Promise<Conversation[]> {
    if (this.dbConnected) {
      try {
        const rows = await this.executeQuery(
          `SELECT id, user_id, title, created_at, updated_at
           FROM conversations
           WHERE user_id = $1
           ORDER BY updated_at DESC;`,
          [userId]
        );

        return rows.map((r: any) => ({
          id: String(r.id),
          user_id: String(r.user_id),
          title: r.title,
          created_at: Number(r.created_at) || Math.floor(Date.now() / 1000),
          updated_at: Number(r.updated_at) || Math.floor(Date.now() / 1000),
        }));
      } catch (err) {
        console.error('Database getUserConversations error, falling back:', err);
      }
    }

    return this.localData.conversations
      .filter((c) => c.user_id === userId)
      .sort((a, b) => b.updated_at - a.updated_at);
  }

  async getConversationById(id: string): Promise<Conversation | undefined> {
    if (this.dbConnected) {
      try {
        const rows = await this.executeQuery(
          `SELECT id, user_id, title, created_at, updated_at
           FROM conversations
           WHERE id = $1
           LIMIT 1;`,
          [id]
        );

        if (rows.length > 0) {
          const r = rows[0];
          return {
            id: String(r.id),
            user_id: String(r.user_id),
            title: r.title,
            created_at: Number(r.created_at) || Math.floor(Date.now() / 1000),
            updated_at: Number(r.updated_at) || Math.floor(Date.now() / 1000),
          };
        }
      } catch (err) {
        console.error('Database getConversationById error, falling back:', err);
      }
    }

    return this.localData.conversations.find((c) => c.id === id);
  }

  async createConversation(userId: string, title: string, customId?: string): Promise<Conversation> {
    const now = Math.floor(Date.now() / 1000);
    const cleanTitle = title || 'New Chat';
    const convId = customId || 'conv_' + crypto.randomUUID();

    if (this.dbConnected) {
      try {
        const rows = await this.executeQuery(
          `INSERT INTO conversations (id, user_id, title, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id, user_id, title, created_at, updated_at;`,
          [convId, userId, cleanTitle, now, now]
        );

        if (rows.length > 0) {
          const r = rows[0];
          const conv: Conversation = {
            id: String(r.id),
            user_id: String(r.user_id),
            title: r.title,
            created_at: Number(r.created_at) || now,
            updated_at: Number(r.updated_at) || now,
          };
          this.localData.conversations.push(conv);
          this.saveLocal();
          return conv;
        }
      } catch (err) {
        console.error('Database createConversation error:', err);
      }
    }

    const conv: Conversation = {
      id: convId,
      user_id: userId,
      title: cleanTitle,
      created_at: now,
      updated_at: now,
    };
    this.localData.conversations.push(conv);
    this.saveLocal();
    return conv;
  }

  async touchConversation(id: string) {
    const now = Math.floor(Date.now() / 1000);
    if (this.dbConnected) {
      try {
        await this.executeQuery(
          `UPDATE conversations SET updated_at = $1 WHERE id = $2;`,
          [now, id]
        );
      } catch (err) {
        console.error('Database touchConversation error:', err);
      }
    }

    const conv = this.localData.conversations.find((c) => c.id === id);
    if (conv) {
      conv.updated_at = now;
      this.saveLocal();
    }
  }

  async deleteConversation(id: string, userId: string): Promise<boolean> {
    let deleted = false;
    if (this.dbConnected) {
      try {
        await this.executeQuery(`DELETE FROM messages WHERE conversation_id = $1;`, [id]);
        await this.executeQuery(`DELETE FROM conversations WHERE id = $1 AND user_id = $2;`, [id, userId]);
        deleted = true;
      } catch (err) {
        console.error('Database deleteConversation error:', err);
      }
    }

    const idx = this.localData.conversations.findIndex((c) => c.id === id && c.user_id === userId);
    if (idx !== -1) {
      this.localData.conversations.splice(idx, 1);
      this.localData.messages = this.localData.messages.filter((m) => m.conversation_id !== id);
      this.saveLocal();
      deleted = true;
    }

    return deleted;
  }

  // --- MESSAGES ---
  async getConversationMessages(conversationId: string): Promise<Message[]> {
    if (this.dbConnected) {
      try {
        const rows = await this.executeQuery(
          `SELECT id, conversation_id, role, content, created_at
           FROM messages
           WHERE conversation_id = $1
           ORDER BY created_at ASC, id ASC;`,
          [conversationId]
        );

        return rows.map((r: any) => ({
          id: String(r.id),
          conversation_id: String(r.conversation_id),
          role: r.role as any,
          content: r.content,
          created_at: Number(r.created_at) || Math.floor(Date.now() / 1000),
        }));
      } catch (err) {
        console.error('Database getConversationMessages error, falling back:', err);
      }
    }

    return this.localData.messages
      .filter((m) => m.conversation_id === conversationId)
      .sort((a, b) => a.created_at - b.created_at);
  }

  async addMessage(
    conversationId: string,
    role: 'user' | 'assistant' | 'system',
    content: string
  ): Promise<Message> {
    const now = Math.floor(Date.now() / 1000);
    const msgId = 'msg_' + crypto.randomUUID();

    if (this.dbConnected) {
      try {
        const rows = await this.executeQuery(
          `INSERT INTO messages (id, conversation_id, role, content, created_at)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id, conversation_id, role, content, created_at;`,
          [msgId, conversationId, role, content, now]
        );

        await this.executeQuery(
          `UPDATE conversations SET updated_at = $1 WHERE id = $2;`,
          [now, conversationId]
        );

        if (rows.length > 0) {
          const r = rows[0];
          const msg: Message = {
            id: String(r.id),
            conversation_id: String(r.conversation_id),
            role: r.role as any,
            content: r.content,
            created_at: Number(r.created_at) || now,
          };
          this.localData.messages.push(msg);
          this.saveLocal();
          return msg;
        }
      } catch (err) {
        console.error('Database addMessage error:', err);
      }
    }

    const msg: Message = {
      id: msgId,
      conversation_id: conversationId,
      role,
      content,
      created_at: now,
    };
    await this.touchConversation(conversationId);
    this.localData.messages.push(msg);
    this.saveLocal();
    return msg;
  }

  async deleteMessage(messageId: string): Promise<boolean> {
    if (this.dbConnected) {
      try {
        await this.executeQuery(`DELETE FROM messages WHERE id = $1;`, [messageId]);
      } catch (err) {
        console.error('Database deleteMessage error:', err);
      }
    }
    const idx = this.localData.messages.findIndex((m) => m.id === messageId);
    if (idx !== -1) {
      this.localData.messages.splice(idx, 1);
      this.saveLocal();
    }
    return true;
  }
}

export const db = new DatabaseManager();
