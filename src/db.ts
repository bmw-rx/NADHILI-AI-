import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { neon } from '@neondatabase/serverless';

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

interface LocalSchema {
  users: User[];
  conversations: Conversation[];
  messages: Message[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

class DatabaseManager {
  private localData: LocalSchema = {
    users: [],
    conversations: [],
    messages: [],
  };

  private databaseUrl: string = process.env.DATABASE_URL || '';
  private sql: any = null;
  private neonConnected: boolean = false;
  private neonHost: string = '';

  constructor() {
    this.initLocal();
    this.loadSavedConfig();
    if (this.databaseUrl) {
      this.initNeon(this.databaseUrl).catch((err) => {
        console.warn('Neon initial connection notice:', err.message);
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
      } catch (err) {
        this.saveLocal();
      }
    } else {
      this.saveLocal();
    }
  }

  private saveLocal() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.localData, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save local db.json', err);
    }
  }

  private loadSavedConfig() {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.databaseUrl) {
          this.databaseUrl = parsed.databaseUrl.trim().replace(/["';\\]+$/, '');
        }
      }
    } catch {}
  }

  private saveConfig(databaseUrl: string) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(CONFIG_FILE, JSON.stringify({ databaseUrl }, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save config.json', err);
    }
  }

  async initNeon(url: string): Promise<{ success: boolean; message: string }> {
    try {
      const trimmed = url.trim().replace(/["';\\]+$/, '');
      if (!trimmed.startsWith('postgres://') && !trimmed.startsWith('postgresql://')) {
        throw new Error('Invalid PostgreSQL format. Must start with postgresql:// or postgres://');
      }

      // Extract host for reporting
      const urlObj = new URL(trimmed);
      this.neonHost = urlObj.host;

      const neonClient = neon(trimmed);

      // Verify connection with simple query
      await neonClient`SELECT 1 as connected`;

      // Run schema migrations for Neon
      await neonClient`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          plan VARCHAR(50) DEFAULT 'free',
          created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
        );
      `;

      await neonClient`
        CREATE TABLE IF NOT EXISTS conversations (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          title TEXT NOT NULL,
          created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
          updated_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
        );
      `;

      await neonClient`
        CREATE TABLE IF NOT EXISTS messages (
          id VARCHAR(255) PRIMARY KEY,
          conversation_id VARCHAR(255) NOT NULL,
          role VARCHAR(50) NOT NULL,
          content TEXT NOT NULL,
          created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
          FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
        );
      `;

      await neonClient`
        CREATE INDEX IF NOT EXISTS idx_neon_conversations_user ON conversations(user_id, updated_at DESC);
      `;

      await neonClient`
        CREATE INDEX IF NOT EXISTS idx_neon_messages_conv ON messages(conversation_id, created_at ASC);
      `;

      this.sql = neonClient;
      this.databaseUrl = trimmed;
      this.neonConnected = true;
      this.saveConfig(trimmed);

      // Optionally sync local users if Neon is fresh
      await this.syncLocalToNeon();

      return { success: true, message: 'Cloud database connected and synchronized.' };
    } catch (err: any) {
      this.neonConnected = false;
      this.sql = null;
      throw new Error(`Database connection notice: ${err.message}`);
    }
  }

  private async syncLocalToNeon() {
    if (!this.sql) return;
    try {
      for (const u of this.localData.users) {
        await this.sql`
          INSERT INTO users (id, name, email, password_hash, plan, created_at)
          VALUES (${u.id}, ${u.name}, ${u.email}, ${u.password_hash}, ${u.plan}, ${u.created_at})
          ON CONFLICT (email) DO NOTHING;
        `;
      }
    } catch (e) {
      console.warn('Sync notice:', e);
    }
  }

  getStatus() {
    return {
      provider: this.neonConnected && this.sql ? 'Cloud Database (Active)' : 'Local Storage',
      connected: this.neonConnected,
    };
  }

  // --- USERS ---
  async findUserByEmail(email: string): Promise<User | undefined> {
    const cleanEmail = email.toLowerCase().trim();
    if (this.sql && this.neonConnected) {
      try {
        const rows = await this.sql`
          SELECT id, email, password_hash, COALESCE(name, display_name, username, 'User') as name, COALESCE(plan, 'free') as plan, EXTRACT(EPOCH FROM created_at)::BIGINT as created_at
          FROM users
          WHERE LOWER(email) = ${cleanEmail}
          LIMIT 1
        `;
        if (rows.length > 0) {
          const r: any = rows[0];
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
        console.error('Neon findUserByEmail error, falling back:', err);
      }
    }
    return this.localData.users.find((u) => u.email.toLowerCase() === cleanEmail);
  }

  async findUserById(id: string): Promise<User | undefined> {
    if (this.sql && this.neonConnected) {
      try {
        const isNum = !isNaN(Number(id));
        const rows = isNum
          ? await this.sql`
              SELECT id, email, password_hash, COALESCE(name, display_name, username, 'User') as name, COALESCE(plan, 'free') as plan, EXTRACT(EPOCH FROM created_at)::BIGINT as created_at
              FROM users
              WHERE id = ${Number(id)}
              LIMIT 1
            `
          : await this.sql`
              SELECT id, email, password_hash, COALESCE(name, display_name, username, 'User') as name, COALESCE(plan, 'free') as plan, EXTRACT(EPOCH FROM created_at)::BIGINT as created_at
              FROM users
              WHERE email = ${id}
              LIMIT 1
            `;
        if (rows.length > 0) {
          const r: any = rows[0];
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
        console.error('Neon findUserById error, falling back:', err);
      }
    }
    return this.localData.users.find((u) => u.id === id);
  }

  async createUser(name: string, email: string, passwordHash: string): Promise<User> {
    const cleanEmail = email.toLowerCase().trim();
    const cleanName = name.trim();
    const username = cleanEmail.split('@')[0] || 'user';
    const now = Math.floor(Date.now() / 1000);

    if (this.sql && this.neonConnected) {
      try {
        const rows = await this.sql`
          INSERT INTO users (username, email, password_hash, name, display_name, plan, created_at)
          VALUES (${username}, ${cleanEmail}, ${passwordHash}, ${cleanName}, ${cleanName}, 'free', NOW())
          RETURNING id, name, email, plan, EXTRACT(EPOCH FROM created_at)::BIGINT as created_at
        `;
        if (rows.length > 0) {
          const r: any = rows[0];
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
        console.error('Neon createUser error:', err);
      }
    }

    const user: User = {
      id: 'usr_' + crypto.randomUUID(),
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

  // --- CONVERSATIONS ---
  async getUserConversations(userId: string): Promise<Conversation[]> {
    if (this.sql && this.neonConnected) {
      try {
        const rows = await this.sql`
          SELECT id, user_id, title, EXTRACT(EPOCH FROM created_at)::BIGINT as created_at, EXTRACT(EPOCH FROM updated_at)::BIGINT as updated_at
          FROM conversations
          WHERE user_id = ${String(userId)}
          ORDER BY updated_at DESC
        `;
        return rows.map((r: any) => ({
          id: String(r.id),
          user_id: String(r.user_id),
          title: r.title,
          created_at: Number(r.created_at) || Math.floor(Date.now() / 1000),
          updated_at: Number(r.updated_at) || Math.floor(Date.now() / 1000),
        }));
      } catch (err) {
        console.error('Neon getUserConversations error, falling back:', err);
      }
    }
    return this.localData.conversations
      .filter((c) => c.user_id === userId)
      .sort((a, b) => b.updated_at - a.updated_at);
  }

  async getConversationById(id: string): Promise<Conversation | undefined> {
    if (this.sql && this.neonConnected) {
      try {
        const isNum = !isNaN(Number(id));
        if (isNum) {
          const rows = await this.sql`
            SELECT id, user_id, title, EXTRACT(EPOCH FROM created_at)::BIGINT as created_at, EXTRACT(EPOCH FROM updated_at)::BIGINT as updated_at
            FROM conversations
            WHERE id = ${Number(id)}
            LIMIT 1
          `;
          if (rows.length > 0) {
            const r: any = rows[0];
            return {
              id: String(r.id),
              user_id: String(r.user_id),
              title: r.title,
              created_at: Number(r.created_at) || Math.floor(Date.now() / 1000),
              updated_at: Number(r.updated_at) || Math.floor(Date.now() / 1000),
            };
          }
        }
      } catch (err) {
        console.error('Neon getConversationById error, falling back:', err);
      }
    }
    return this.localData.conversations.find((c) => c.id === id);
  }

  async createConversation(userId: string, title: string, customId?: string): Promise<Conversation> {
    const now = Math.floor(Date.now() / 1000);
    const cleanTitle = title || 'New Chat';

    if (this.sql && this.neonConnected) {
      try {
        const rows = await this.sql`
          INSERT INTO conversations (user_id, title, created_at, updated_at)
          VALUES (${String(userId)}, ${cleanTitle}, NOW(), NOW())
          RETURNING id, user_id, title, EXTRACT(EPOCH FROM created_at)::BIGINT as created_at, EXTRACT(EPOCH FROM updated_at)::BIGINT as updated_at
        `;
        if (rows.length > 0) {
          const r: any = rows[0];
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
        console.error('Neon createConversation error:', err);
      }
    }

    const conv: Conversation = {
      id: customId || 'conv_' + crypto.randomUUID(),
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
    if (this.sql && this.neonConnected && !isNaN(Number(id))) {
      try {
        await this.sql`UPDATE conversations SET updated_at = NOW() WHERE id = ${Number(id)}`;
      } catch (err) {
        console.error('Neon touchConversation error:', err);
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
    if (this.sql && this.neonConnected && !isNaN(Number(id))) {
      try {
        await this.sql`DELETE FROM messages WHERE conversation_id = ${Number(id)}`;
        await this.sql`DELETE FROM conversations WHERE id = ${Number(id)} AND user_id = ${String(userId)}`;
        deleted = true;
      } catch (err) {
        console.error('Neon deleteConversation error:', err);
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
    if (this.sql && this.neonConnected && !isNaN(Number(conversationId))) {
      try {
        const rows = await this.sql`
          SELECT id, conversation_id, role, content, EXTRACT(EPOCH FROM created_at)::BIGINT as created_at
          FROM messages
          WHERE conversation_id = ${Number(conversationId)}
          ORDER BY id ASC
        `;
        return rows.map((r: any) => ({
          id: String(r.id),
          conversation_id: String(r.conversation_id),
          role: r.role as any,
          content: r.content,
          created_at: Number(r.created_at) || Math.floor(Date.now() / 1000),
        }));
      } catch (err) {
        console.error('Neon getConversationMessages error, falling back:', err);
      }
    }
    return this.localData.messages
      .filter((m) => m.conversation_id === conversationId)
      .sort((a, b) => a.created_at - b.created_at);
  }

  async addMessage(conversationId: string, role: 'user' | 'assistant' | 'system', content: string): Promise<Message> {
    const now = Math.floor(Date.now() / 1000);

    if (this.sql && this.neonConnected && !isNaN(Number(conversationId))) {
      try {
        const rows = await this.sql`
          INSERT INTO messages (conversation_id, role, content, created_at)
          VALUES (${Number(conversationId)}, ${role}, ${content}, NOW())
          RETURNING id, conversation_id, role, content, EXTRACT(EPOCH FROM created_at)::BIGINT as created_at
        `;
        await this.sql`UPDATE conversations SET updated_at = NOW() WHERE id = ${Number(conversationId)}`;
        if (rows.length > 0) {
          const r: any = rows[0];
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
        console.error('Neon addMessage error:', err);
      }
    }

    const msg: Message = {
      id: 'msg_' + crypto.randomUUID(),
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
}

export const db = new DatabaseManager();
