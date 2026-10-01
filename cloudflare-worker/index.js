/**
 * NADHILI AI - Production Cloudflare Worker
 * Built by NADHILI DEVELOPER
 * Single-file Worker with Cloudflare D1 (SQLite) and Groq LLaMA 3.3 70B Streaming
 */

import htmlContent from './index.html';

const SYSTEM_PROMPT = "You are NADHILI AI, a helpful intelligent assistant created by NADHILI DEVELOPER. You are knowledgeable, friendly and thorough in your responses.";

// --- CRYPTO UTILITIES (Web Crypto API) ---
async function sha256(text) {
  const enc = new TextEncoder();
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(text));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function base64UrlEncode(str) {
  return btoa(str).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64UrlDecode(str) {
  let s = str.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return atob(s);
}

async function signJWT(payload, secret) {
  const enc = new TextEncoder();
  const header = { alg: 'HS256', typ: 'JWT' };
  const fullPayload = {
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
  };

  const unsigned = base64UrlEncode(JSON.stringify(header)) + '.' + base64UrlEncode(JSON.stringify(fullPayload));

  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(unsigned));
  const sigB64 = base64UrlEncode(String.fromCharCode(...new Uint8Array(sig)));
  return unsigned + '.' + sigB64;
}

async function verifyJWT(token, secret) {
  try {
    const enc = new TextEncoder();
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const unsigned = parts[0] + '.' + parts[1];

    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const sigBuf = Uint8Array.from(base64UrlDecode(parts[2]), (c) => c.charCodeAt(0));
    const valid = await crypto.subtle.verify('HMAC', key, sigBuf, enc.encode(unsigned));
    if (!valid) return null;

    const payload = JSON.parse(base64UrlDecode(parts[1]));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-groq-api-key',
  };
}

// --- WORKER HANDLER ---
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname } = url;
    const jwtSecret = env.JWT_SECRET || 'nadhili-ai-cf-worker-secret-key-2025';

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    // 1. SERVE HTML FRONTEND
    if (pathname === '/' || pathname === '/index.html') {
      return new Response(htmlContent, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // Helper: Authenticate request via Bearer JWT
    async function getAuthUser() {
      const auth = request.headers.get('Authorization');
      if (!auth || !auth.startsWith('Bearer ')) return null;
      const token = auth.slice(7);
      return await verifyJWT(token, jwtSecret);
    }

    // 2. AUTH: SIGN UP
    if (pathname === '/api/auth/signup' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { name, email, password } = body;
        if (!name || !email || !password || password.length < 6) {
          return Response.json(
            { error: 'Name, valid email, and password (min 6 chars) are required' },
            { status: 400, headers: corsHeaders() }
          );
        }

        const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?')
          .bind(email.toLowerCase().trim())
          .first();
        if (existing) {
          return Response.json({ error: 'Email already registered' }, { status: 409, headers: corsHeaders() });
        }

        const userId = 'usr_' + crypto.randomUUID();
        const passwordHash = await sha256(password);
        const now = Math.floor(Date.now() / 1000);

        await env.DB.prepare(
          'INSERT INTO users (id, name, email, password_hash, plan, created_at) VALUES (?, ?, ?, ?, ?, ?)'
        )
          .bind(userId, name.trim(), email.toLowerCase().trim(), passwordHash, 'free', now)
          .run();

        const token = await signJWT({ userId, email: email.toLowerCase().trim(), name: name.trim() }, jwtSecret);
        return Response.json(
          {
            token,
            user: { id: userId, name: name.trim(), email: email.toLowerCase().trim(), plan: 'free' },
          },
          { headers: corsHeaders() }
        );
      } catch (err) {
        return Response.json({ error: err.message }, { status: 500, headers: corsHeaders() });
      }
    }

    // 3. AUTH: SIGN IN
    if (pathname === '/api/auth/signin' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { email, password } = body;
        if (!email || !password) {
          return Response.json({ error: 'Email and password required' }, { status: 400, headers: corsHeaders() });
        }

        const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?')
          .bind(email.toLowerCase().trim())
          .first();
        if (!user) {
          return Response.json({ error: 'Invalid email or password' }, { status: 401, headers: corsHeaders() });
        }

        const hash = await sha256(password);
        if (user.password_hash !== hash) {
          return Response.json({ error: 'Invalid email or password' }, { status: 401, headers: corsHeaders() });
        }

        const token = await signJWT({ userId: user.id, email: user.email, name: user.name }, jwtSecret);
        return Response.json(
          {
            token,
            user: { id: user.id, name: user.name, email: user.email, plan: user.plan },
          },
          { headers: corsHeaders() }
        );
      } catch (err) {
        return Response.json({ error: err.message }, { status: 500, headers: corsHeaders() });
      }
    }

    // 4. AUTH: GET CURRENT USER
    if (pathname === '/api/auth/me' && request.method === 'GET') {
      const auth = await getAuthUser();
      if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders() });
      const user = await env.DB.prepare('SELECT id, name, email, plan, created_at FROM users WHERE id = ?')
        .bind(auth.userId)
        .first();
      if (!user) return Response.json({ error: 'User not found' }, { status: 404, headers: corsHeaders() });
      return Response.json({ user }, { headers: corsHeaders() });
    }

    // 5. CONVERSATIONS: LIST
    if (pathname === '/api/conversations' && request.method === 'GET') {
      const auth = await getAuthUser();
      if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders() });
      const { results } = await env.DB.prepare(
        'SELECT * FROM conversations WHERE user_id = ? ORDER BY updated_at DESC'
      )
        .bind(auth.userId)
        .all();
      return Response.json(results || [], { headers: corsHeaders() });
    }

    // 6. CONVERSATIONS: GET SINGLE
    if (pathname.startsWith('/api/conversations/') && request.method === 'GET') {
      const auth = await getAuthUser();
      if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders() });
      const id = pathname.replace('/api/conversations/', '');
      const conv = await env.DB.prepare('SELECT * FROM conversations WHERE id = ? AND user_id = ?')
        .bind(id, auth.userId)
        .first();
      if (!conv) return Response.json({ error: 'Conversation not found' }, { status: 404, headers: corsHeaders() });

      const { results: messages } = await env.DB.prepare(
        'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC'
      )
        .bind(id)
        .all();
      return Response.json({ conversation: conv, messages: messages || [] }, { headers: corsHeaders() });
    }

    // 7. CONVERSATIONS: DELETE
    if (pathname.startsWith('/api/conversations/') && request.method === 'DELETE') {
      const auth = await getAuthUser();
      if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders() });
      const id = pathname.replace('/api/conversations/', '');
      await env.DB.prepare('DELETE FROM messages WHERE conversation_id = ?').bind(id).run();
      await env.DB.prepare('DELETE FROM conversations WHERE id = ? AND user_id = ?').bind(id, auth.userId).run();
      return Response.json({ success: true }, { headers: corsHeaders() });
    }

    // 8. CHAT: STREAMING SSE VIA GROQ API
    if (pathname === '/api/chat' && request.method === 'POST') {
      try {
        const body = await request.json();
        let { conversationId, message, messages, model, imageBase64 } = body;
        const auth = await getAuthUser();
        const groqKey = request.headers.get('x-groq-api-key') || env.GROQ_API_KEY;

        if (!groqKey) {
          return Response.json(
            { error: 'GROQ_API_KEY is not configured in Worker secrets or settings.' },
            { status: 500, headers: corsHeaders() }
          );
        }

        const now = Math.floor(Date.now() / 1000);
        let activeConvId = conversationId;

        // Persist to D1 if logged in
        if (auth) {
          if (!activeConvId) {
            activeConvId = 'conv_' + crypto.randomUUID();
            const title = message ? (message.length > 40 ? message.slice(0, 40) + '...' : message) : 'Image Query';
            await env.DB.prepare(
              'INSERT INTO conversations (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
            )
              .bind(activeConvId, auth.userId, title, now, now)
              .run();
          } else {
            await env.DB.prepare('UPDATE conversations SET updated_at = ? WHERE id = ?').bind(now, activeConvId).run();
          }

          if (message) {
            await env.DB.prepare(
              'INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)'
            )
              .bind('msg_' + crypto.randomUUID(), activeConvId, 'user', message, now)
              .run();
          }
        }

        // Prepare messages for Groq API
        const groqMessages = [{ role: 'system', content: SYSTEM_PROMPT }];

        if (Array.isArray(messages)) {
          for (const m of messages) {
            if (m.role === 'user' || m.role === 'assistant') {
              groqMessages.push({ role: m.role, content: m.content });
            }
          }
        }

        // Handle vision image or plain text
        if (imageBase64) {
          model = 'llama-3.2-11b-vision-preview';
          groqMessages.push({
            role: 'user',
            content: [
              { type: 'text', text: message || 'Analyze this image.' },
              { type: 'image_url', image_url: { url: imageBase64 } },
            ],
          });
        } else {
          groqMessages.push({ role: 'user', content: message || '' });
        }

        const groqModel = model || env.GROQ_MODEL || 'llama-3.3-70b-versatile';
        const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + groqKey,
          },
          body: JSON.stringify({
            model: groqModel,
            messages: groqMessages,
            temperature: 0.7,
            stream: true,
          }),
        });

        if (!groqResponse.ok) {
          const errText = await groqResponse.text();
          return Response.json(
            { error: 'Groq API Error: ' + errText },
            { status: groqResponse.status, headers: corsHeaders() }
          );
        }

        // Transform Groq SSE stream to NADHILI SSE stream
        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();
        const reader = groqResponse.body.getReader();
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();

        ctx.waitUntil(
          (async () => {
            let buffer = '';
            let fullAssistantReply = '';

            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop();

                for (const line of lines) {
                  const trimmed = line.trim();
                  if (trimmed.startsWith('data: ')) {
                    const dataStr = trimmed.slice(6);
                    if (dataStr === '[DONE]') continue;
                    try {
                      const parsed = JSON.parse(dataStr);
                      const delta = parsed.choices?.[0]?.delta?.content || '';
                      if (delta) {
                        fullAssistantReply += delta;
                        await writer.write(
                          encoder.encode(
                            'data: ' + JSON.stringify({ text: delta, conversationId: activeConvId }) + '\n\n'
                          )
                        );
                      }
                    } catch {}
                  }
                }
              }

              // Save assistant message to D1
              if (auth && activeConvId && fullAssistantReply) {
                await env.DB.prepare(
                  'INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)'
                )
                  .bind(
                    'msg_' + crypto.randomUUID(),
                    activeConvId,
                    'assistant',
                    fullAssistantReply,
                    Math.floor(Date.now() / 1000)
                  )
                  .run();
              }

              await writer.write(encoder.encode('data: [DONE]\n\n'));
            } catch (streamErr) {
              console.error('Streaming error', streamErr);
            } finally {
              await writer.close();
            }
          })()
        );

        return new Response(readable, {
          headers: {
            ...corsHeaders(),
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        });
      } catch (err) {
        return Response.json({ error: err.message }, { status: 500, headers: corsHeaders() });
      }
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders() });
  },
};
