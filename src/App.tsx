import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquarePlus,
  Search,
  Trash2,
  Square,
  Sparkles,
  Plus,
  ArrowUp,
  Mic,
  MicOff,
  Copy,
  Check,
  RotateCcw,
  Edit3,
  Download,
  Menu,
  X,
  Crown,
  ChevronDown,
  LogOut,
  User,
  Bot,
  FileText,
  FileCode,
  Image as ImageIcon,
  Paperclip,
  Database,
  Sliders,
  Settings,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { MarkdownRenderer } from './components/MarkdownRenderer';

interface AttachedFile {
  id: string;
  name: string;
  type: 'image' | 'document';
  size: number;
  dataBase64?: string; // For images
  textContent?: string; // For text/code documents
}

interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  attachments?: AttachedFile[];
  image?: string | null;
  created_at?: number;
}

interface Conversation {
  id: string;
  user_id: string;
  title: string;
  created_at: number;
  updated_at: number;
}

interface AuthUser {
  id: string;
  name: string;
  email: string;
  plan: string;
  created_at?: number;
}

interface ModelOption {
  id: string;
  name: string;
  tag: string;
  badge?: string;
  description: string;
  highlight?: boolean;
}

const MODELS: ModelOption[] = [
  {
    id: 'claude-3-7-sonnet',
    name: 'Sonnet 3.7',
    tag: 'Hybrid',
    badge: 'Latest',
    description: 'Hybrid reasoning • Code intelligence & extended thinking',
    highlight: true,
  },
  {
    id: 'claude-3-5-sonnet',
    name: 'Sonnet 3.5',
    tag: 'Smart',
    badge: 'Popular',
    description: 'High-speed reasoning, coding & thorough synthesis',
  },
  {
    id: 'claude-3-opus',
    name: 'Opus 3',
    tag: 'Deep',
    description: 'Complex analysis, research & deep domain expertise',
  },
  {
    id: 'claude-3-5-haiku',
    name: 'Haiku 3.5',
    tag: 'Fast',
    badge: 'Edge',
    description: 'Instant lightweight responses & lightning execution',
  },
];

export default function App() {
  // --- STATE ---
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('nadhili_token'));
  const [user, setUser] = useState<AuthUser | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);

  const [selectedModel, setSelectedModel] = useState<string>(() => {
    return localStorage.getItem('nadhili_model') || 'claude-3-7-sonnet';
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // UI state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);

  // Modals
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authTab, setAuthTab] = useState<'signin' | 'signup'>('signin');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authError, setAuthError] = useState('');

  const [proModalOpen, setProModalOpen] = useState(false);
  const [deployModalOpen, setDeployModalOpen] = useState(false);
  const [deployTab, setDeployTab] = useState<'quick' | 'worker' | 'schema' | 'wrangler'>('quick');
  const [deployFiles, setDeployFiles] = useState<{ workerCode: string; schemaSql: string; wranglerToml: string }>({
    workerCode: '',
    schemaSql: '',
    wranglerToml: '',
  });

  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [creativityLevel, setCreativityLevel] = useState<'balanced' | 'creative' | 'precise'>('balanced');
  const [systemPersona, setSystemPersona] = useState<string>('default');

  // Cloud Database Status
  const [dbStatus, setDbStatus] = useState<{ provider: string; connected: boolean }>({
    provider: 'Cloud Database (Active)',
    connected: true,
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Refs
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const speechRecognitionRef = useRef<any>(null);

  // --- TOAST HELPER ---
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 2800);
  };

  // --- INITIAL LOAD & AUTH ---
  useEffect(() => {
    fetchDbStatus();
    if (token) {
      fetchUser();
      fetchConversations();
    }
  }, [token]);

  const fetchDbStatus = async () => {
    try {
      const res = await fetch('/api/neon/status');
      if (res.ok) {
        const data = await res.json();
        setDbStatus(data);
      }
    } catch {
      // Backend handles fallback
    }
  };

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else if (res.status === 401) {
        handleSignOut();
      }
    } catch {
      // Offline fallback
    }
  };

  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/conversations', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch {
      // Fallback
    }
  };

  const loadConversation = async (convId: string) => {
    try {
      const res = await fetch(`/api/conversations/${convId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentConversationId(data.conversation.id);
        const mappedMsgs: ChatMessage[] = data.messages.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          created_at: m.created_at,
        }));
        setMessages(mappedMsgs);
        setSidebarOpen(false);
      }
    } catch (err: any) {
      showToast('Could not load chat');
    }
  };

  const startNewChat = () => {
    setCurrentConversationId(null);
    setMessages([]);
    setAttachedFiles([]);
    setInputPrompt('');
    setSidebarOpen(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.focus();
    }
  };

  const deleteConversation = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/conversations/${convId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== convId));
        if (currentConversationId === convId) {
          startNewChat();
        }
        showToast('Conversation deleted');
      }
    } catch {
      showToast('Failed to delete');
    }
  };

  // --- AUTH HANDLERS ---
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const isSignUp = authTab === 'signup';
    const endpoint = isSignUp ? '/api/auth/signup' : '/api/auth/signin';
    const payload = isSignUp
      ? { name: authName, email: authEmail, password: authPassword }
      : { email: authEmail, password: authPassword };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      localStorage.setItem('nadhili_token', data.token);
      setToken(data.token);
      setUser(data.user);
      setAuthModalOpen(false);
      setAuthPassword('');
      showToast(`Welcome, ${data.user.name}!`);
      fetchConversations();
    } catch (err: any) {
      setAuthError(err.message || 'Error occurred');
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('nadhili_token');
    setToken(null);
    setUser(null);
    setConversations([]);
    setCurrentConversationId(null);
    setMessages([]);
    showToast('Signed out');
  };

  // --- ATTACHMENTS HANDLING (The circled '+' button) ---
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showToast('Image file too large (max 10MB)');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const newFile: AttachedFile = {
        id: 'file_' + Math.random().toString(36).slice(2, 9),
        name: file.name,
        type: 'image',
        size: file.size,
        dataBase64: base64,
      };
      setAttachedFiles((prev) => [...prev, newFile]);
      showToast(`Attached image: ${file.name}`);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
    setAttachMenuOpen(false);
  };

  const handleDocumentFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      showToast('Document too large (max 15MB)');
      return;
    }

    const isImage = file.type.startsWith('image/');
    if (isImage) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setAttachedFiles((prev) => [
          ...prev,
          {
            id: 'file_' + Math.random().toString(36).slice(2, 9),
            name: file.name,
            type: 'image',
            size: file.size,
            dataBase64: base64,
          },
        ]);
        showToast(`Attached photo: ${file.name}`);
      };
      reader.readAsDataURL(file);
      e.target.value = '';
      setAttachMenuOpen(false);
      return;
    }

    // Read text/code document
    const reader = new FileReader();
    reader.onload = () => {
      const text = (reader.result as string) || '';
      setAttachedFiles((prev) => [
        ...prev,
        {
          id: 'file_' + Math.random().toString(36).slice(2, 9),
          name: file.name,
          type: 'document',
          size: file.size,
          textContent: text,
        },
      ]);
      showToast(`Attached document: ${file.name}`);
    };
    reader.readAsText(file);
    e.target.value = '';
    setAttachMenuOpen(false);
  };

  const removeAttachedFile = (id: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // --- SEND MESSAGE & SSE STREAMING ---
  const handleSendMessage = async (customPrompt?: string) => {
    const promptToSend = (customPrompt !== undefined ? customPrompt : inputPrompt).trim();
    if (!promptToSend && attachedFiles.length === 0) return;
    if (isGenerating) return;

    // Build compound message with text documents if any attached
    let combinedPrompt = promptToSend;
    const documentFiles = attachedFiles.filter((f) => f.type === 'document' && f.textContent);
    if (documentFiles.length > 0) {
      const docContext = documentFiles
        .map((d) => `\n\n--- [Attached Document: ${d.name}] ---\n${d.textContent}\n--- [End Document] ---\n`)
        .join('');
      combinedPrompt = `${promptToSend ? promptToSend + '\n' : ''}${docContext}`;
    }

    // Check for primary image attachment for multimodal vision
    const imageAttachment = attachedFiles.find((f) => f.type === 'image' && f.dataBase64);
    const imageBase64 = imageAttachment?.dataBase64;

    const userMessage: ChatMessage = {
      role: 'user',
      content: promptToSend || (attachedFiles.length > 0 ? `Attached ${attachedFiles.length} file(s)` : 'Hello'),
      attachments: [...attachedFiles],
      image: imageBase64 || null,
      created_at: Math.floor(Date.now() / 1000),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputPrompt('');
    setAttachedFiles([]);
    setIsGenerating(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Scroll to bottom
    setTimeout(() => {
      chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: 'smooth' });
    }, 50);

    // Empty assistant placeholder for streaming
    const assistantIndex = newMessages.length;
    setMessages([...newMessages, { role: 'assistant', content: '', created_at: Math.floor(Date.now() / 1000) }]);

    abortControllerRef.current = new AbortController();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          conversationId: currentConversationId,
          message: combinedPrompt || 'Analyze the attached files.',
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          model: selectedModel,
          imageBase64: imageBase64 || undefined,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Server Error (${res.status}): ${errorText}`);
      }

      if (!res.body) throw new Error('ReadableStream not supported.');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let streamedResponse = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.slice(6);
            if (dataStr === '[DONE]') break;
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.text) {
                streamedResponse += parsed.text;
                setMessages((prev) => {
                  const updated = [...prev];
                  if (updated[assistantIndex]) {
                    updated[assistantIndex] = {
                      ...updated[assistantIndex],
                      content: streamedResponse,
                    };
                  }
                  return updated;
                });
                chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: 'auto' });
              }
              if (parsed.conversationId && !currentConversationId) {
                setCurrentConversationId(parsed.conversationId);
                fetchConversations();
              }
            } catch {}
          }
        }
      }

      if (token) {
        fetchConversations();
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        showToast('Generation stopped');
      } else {
        setMessages((prev) => {
          const updated = [...prev];
          if (updated[assistantIndex]) {
            updated[assistantIndex] = {
              ...updated[assistantIndex],
              content:
                updated[assistantIndex].content ||
                `I apologize, but an unexpected error occurred while processing your request. Please try again.`,
            };
          }
          return updated;
        });
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsGenerating(false);
    }
  };

  const handleRegenerate = (msgIndex: number) => {
    let userPrompt = '';
    for (let i = msgIndex - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        userPrompt = messages[i].content;
        break;
      }
    }
    if (userPrompt) {
      setMessages((prev) => prev.slice(0, msgIndex));
      handleSendMessage(userPrompt);
    }
  };

  const handleEditMessage = (msgIndex: number) => {
    const msg = messages[msgIndex];
    if (msg.role === 'user') {
      setInputPrompt(msg.content);
      setMessages((prev) => prev.slice(0, msgIndex));
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  };

  // --- COPY HELPER ---
  const copyText = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      showToast('Copied to clipboard');
    } catch {}
  };

  // --- VOICE SPEECH TO TEXT ---
  const toggleRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast('Speech recognition not supported in this browser');
      return;
    }

    if (isRecording) {
      speechRecognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsRecording(true);
        showToast('Listening... Speak now');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputPrompt((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };

      recognition.onerror = () => {
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      speechRecognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsRecording(false);
    }
  };

  // --- CLOUDFLARE DEPLOY BUNDLE ---
  const openDeployModal = async () => {
    setDeployModalOpen(true);
    try {
      const res = await fetch('/api/cloudflare/files');
      if (res.ok) {
        const data = await res.json();
        setDeployFiles(data);
      }
    } catch {}
  };

  const downloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Downloaded ${filename}`);
  };

  // --- ACTIVE MODEL DETAILS ---
  const activeModelObj = MODELS.find((m) => m.id === selectedModel) || MODELS[0];

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#141413] text-[#ede8dd] font-sans selection:bg-[#da7756]/30 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#272725] border border-[#3e3e3a] text-white text-xs px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top duration-200">
          <Sparkles className="w-3.5 h-3.5 text-[#da7756]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hidden File Inputs for '+' button */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageFileChange}
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="*/*"
        onChange={handleDocumentFileChange}
        className="hidden"
      />

      {/* --- SIDEBAR OVERLAY (Mobile) --- */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm transition-opacity"
        />
      )}

      {/* --- SIDEBAR --- */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-72 bg-[#0e0e0d] border-r border-[#262624] flex flex-col transition-transform duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 flex items-center justify-between border-b border-[#222220]">
          <div className="flex items-center gap-2.5">
            {/* Claude Terracotta Star */}
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#da7756] to-[#eb947a] text-white font-serif font-bold text-sm flex items-center justify-center shadow-[0_0_12px_rgba(218,119,86,0.3)]">
              C
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold tracking-wide text-white">NADHILI AI</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-medium border bg-emerald-500/10 text-emerald-400 border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Synced
                </span>
              </div>
              <p className="text-[10px] text-neutral-400">Claude-Powered Edge Architecture</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden text-neutral-400 hover:text-white p-1 rounded-md hover:bg-[#1f1f1d]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* New Chat & Search */}
        <div className="p-3 space-y-2">
          <button
            onClick={startNewChat}
            className="w-full bg-[#1c1c1a] hover:bg-[#252522] border border-[#2d2d29] hover:border-[#da7756]/50 text-white rounded-xl px-3.5 py-2.5 text-xs font-medium flex items-center justify-between transition-colors shadow-sm"
          >
            <span className="flex items-center gap-2.5">
              <MessageSquarePlus className="w-4 h-4 text-[#da7756]" />
              Start new chat
            </span>
            <kbd className="text-[10px] text-neutral-400 bg-[#141413] px-1.5 py-0.5 rounded border border-[#2d2d2a] font-mono">
              ⌘K
            </kbd>
          </button>

          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full bg-[#161615] border border-[#262624] focus:border-[#da7756] focus:outline-none rounded-xl px-3 py-2 pl-8 text-xs text-neutral-200 placeholder-neutral-500 transition"
            />
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-2.5" />
          </div>
        </div>

        {/* Conversations History List */}
        <div className="flex-1 overflow-y-auto px-2 space-y-1">
          {!token ? (
            <div className="p-4 text-center">
              <div className="w-9 h-9 rounded-full bg-[#1b1b19] border border-[#2a2a27] text-neutral-400 mx-auto mb-2 flex items-center justify-center">
                <Database className="w-4 h-4 text-[#da7756]" />
              </div>
              <p className="text-xs text-neutral-300 font-medium">Cloud Storage Memory</p>
              <p className="text-[11px] text-neutral-500 mt-1 mb-3">
                Sign in to save and sync full conversations across your devices.
              </p>
              <button
                onClick={() => {
                  setAuthTab('signin');
                  setAuthModalOpen(true);
                }}
                className="w-full bg-[#1f1f1d] hover:bg-[#2a2a27] border border-[#333330] text-white py-2 rounded-xl text-xs font-medium transition"
              >
                Sign In
              </button>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-6 text-center text-xs text-neutral-500">
              {searchQuery ? 'No matching conversations' : 'No past conversations found'}
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isActive = conv.id === currentConversationId;
              return (
                <div
                  key={conv.id}
                  onClick={() => loadConversation(conv.id)}
                  className={`group relative flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition ${
                    isActive
                      ? 'bg-[#20201d] text-white font-medium border border-[#333330]'
                      : 'text-neutral-400 hover:bg-[#181816] hover:text-neutral-200'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate pr-6">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? 'bg-[#da7756]' : 'bg-neutral-600'}`} />
                    <span className="truncate">{conv.title}</span>
                  </div>
                  <button
                    onClick={(e) => deleteConversation(e, conv.id)}
                    title="Delete conversation"
                    className="opacity-0 group-hover:opacity-100 hover:text-red-400 p-1 transition absolute right-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Quick Links & Cloudflare edge bundle */}
        <div className="px-3 py-2 border-t border-[#1f1f1d] space-y-1">
          <button
            onClick={openDeployModal}
            className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-neutral-400 hover:text-neutral-200 hover:bg-[#181816] flex items-center justify-between transition"
          >
            <span className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-[#da7756]" />
              Edge Deployment Bundle
            </span>
            <span className="text-[10px] text-neutral-500 font-mono">CF D1</span>
          </button>
          <button
            onClick={() => setSettingsModalOpen(true)}
            className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-neutral-400 hover:text-neutral-200 hover:bg-[#181816] flex items-center gap-2 transition"
          >
            <Settings className="w-3.5 h-3.5 text-neutral-400" />
            Preferences
          </button>
        </div>

        {/* User Footer */}
        <div className="p-3 border-t border-[#222220] bg-[#0c0c0b]">
          {user ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-[#da7756]/20 border border-[#da7756]/40 text-[#da7756] flex items-center justify-center font-bold text-xs shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="truncate">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-white truncate">{user.name}</span>
                    <span className="text-[9px] uppercase tracking-wider bg-[#da7756]/10 text-[#da7756] border border-[#da7756]/30 px-1 rounded font-mono">
                      {user.plan}
                    </span>
                  </div>
                  <p className="text-[10px] text-neutral-400 truncate">{user.email}</p>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                title="Sign out"
                className="text-neutral-400 hover:text-white p-1.5 rounded-lg hover:bg-[#20201d] transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-[11px] text-neutral-400">
                <span className="flex items-center gap-1.5">
                  <User className="w-3 h-3 text-neutral-500" /> Guest Session
                </span>
                <span className="text-emerald-400 font-mono text-[10px] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Cloud Active
                </span>
              </div>
              <button
                onClick={() => {
                  setAuthTab('signin');
                  setAuthModalOpen(true);
                }}
                className="w-full bg-[#1c1c1a] hover:bg-[#262624] border border-[#2d2d2a] text-white py-2 rounded-xl text-xs font-medium transition"
              >
                Sign In / Sign Up
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* --- MAIN CHAT CONTAINER --- */}
      <main className="flex-1 flex flex-col h-full bg-[#141413] relative overflow-hidden">
        {/* Top Navbar */}
        <header className="h-14 flex items-center justify-between px-4 shrink-0 bg-[#141413]/90 backdrop-blur z-20">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-neutral-400 hover:text-white p-2 rounded-xl transition hover:bg-[#20201d]"
              title="Open sidebar"
            >
              <Menu className="w-5 h-5 text-neutral-300" />
            </button>
            <span className="text-xs text-neutral-400 hidden sm:inline-block">
              {currentConversationId ? 'Current Chat' : 'New Session'}
            </span>
          </div>

          {/* Account / User Avatar */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setProModalOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#da7756]/10 text-[#da7756] border border-[#da7756]/30 hover:bg-[#da7756]/20 transition"
            >
              <Crown className="w-3.5 h-3.5" />
              <span>Pro Plan</span>
            </button>

            <button
              onClick={() => {
                if (user) {
                  setAuthModalOpen(true);
                } else {
                  setAuthTab('signin');
                  setAuthModalOpen(true);
                }
              }}
              title={user ? user.email : 'Account'}
              className="w-8 h-8 rounded-full bg-[#20201e] hover:bg-[#2c2c29] border border-[#333330] flex items-center justify-center text-neutral-300 hover:text-white transition shadow-sm"
            >
              {user ? (
                <span className="font-bold text-xs text-[#da7756]">{user.name.charAt(0).toUpperCase()}</span>
              ) : (
                <Bot className="w-4 h-4 text-neutral-400" />
              )}
            </button>
          </div>
        </header>

        {/* Chat Messages Stream */}
        <div ref={chatScrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          {messages.length === 0 ? (
            <div className="max-w-2xl mx-auto my-auto text-center pt-24 pb-12 flex flex-col items-center justify-center">
              {/* Claude Signature Terracotta Star */}
              <div className="w-12 h-12 flex items-center justify-center mx-auto mb-4 select-none">
                <svg viewBox="0 0 24 24" className="w-10 h-10 text-[#da7756]" fill="currentColor">
                  <path d="M12 1.5a1 1 0 0 1 1 1v3.2a1 1 0 0 1-2 0v-3.2a1 1 0 0 1 1-1zm4.72 2.05a1 1 0 0 1 1.37.37l1.6 2.77a1 1 0 1 1-1.73 1l-1.6-2.77a1 1 0 0 1 .36-1.37zm4.23 4.23a1 1 0 0 1 .37 1.37l-1.6 2.77a1 1 0 0 1-1.73-1l1.6-2.77a1 1 0 0 1 1.36-.37zM22.5 12a1 1 0 0 1-1 1h-3.2a1 1 0 0 1 0-2h3.2a1 1 0 0 1 1 1zm-2.05 4.72a1 1 0 0 1-.37 1.37l-2.77 1.6a1 1 0 1 1-1-1.73l2.77-1.6a1 1 0 0 1 1.37.36zm-4.23 4.23a1 1 0 0 1-1.37.37l-2.77-1.6a1 1 0 0 1 1-1.73l2.77 1.6a1 1 0 0 1 .37 1.36zM12 22.5a1 1 0 0 1-1-1v-3.2a1 1 0 0 1 2 0v3.2a1 1 0 0 1-1 1zm-4.72-2.05a1 1 0 0 1-1.37-.37l-1.6-2.77a1 1 0 1 1 1.73-1l1.6 2.77a1 1 0 0 1-.36 1.37zm-4.23-4.23a1 1 0 0 1-.37-1.37l1.6-2.77a1 1 0 0 1 1.73 1l-1.6 2.77a1 1 0 0 1-1.36.37zM1.5 12a1 1 0 0 1 1-1h3.2a1 1 0 0 1 0 2H2.5a1 1 0 0 1-1-1zm2.05-4.72a1 1 0 0 1 .37-1.37l2.77-1.6a1 1 0 1 1 1 1.73l-2.77 1.6a1 1 0 0 1-1.37-.36zm4.23-4.23a1 1 0 0 1 1.37-.37l2.77 1.6a1 1 0 1 1-1 1.73l-2.77-1.6a1 1 0 0 1-.37-1.36z" />
                </svg>
              </div>

              {/* Claude Serif "Let's noodle" */}
              <h2 className="text-3xl sm:text-4xl font-serif text-[#ede8dd] font-normal tracking-tight mb-3">
                Let&apos;s noodle
              </h2>
              <p className="text-sm text-neutral-400 max-w-md mx-auto mb-8">
                Ask a question, write code, analyze data, or upload files and images using the <span className="text-[#da7756] font-semibold">+</span> button below.
              </p>

              {/* Quick suggestion cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-xl text-left">
                {[
                  { title: 'Explain Edge computing', desc: 'How microsecond Cloudflare Workers function' },
                  { title: 'Write a TypeScript API', desc: 'Build an Express endpoint with streaming' },
                  { title: 'Analyze attached code', desc: 'Upload documents or scripts for review' },
                  { title: 'Draft technical memo', desc: 'System architecture & database design' },
                ].map((item, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInputPrompt(item.title);
                      handleSendMessage(item.title);
                    }}
                    className="p-3 rounded-2xl bg-[#1b1b19] hover:bg-[#242421] border border-[#2d2d2a] hover:border-[#da7756]/40 transition text-left group"
                  >
                    <p className="text-xs font-semibold text-[#ede8dd] group-hover:text-[#da7756] transition">{item.title}</p>
                    <p className="text-[11px] text-neutral-500 mt-0.5">{item.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((msg, index) => {
                const isUser = msg.role === 'user';
                const isLastAssistant = !isUser && index === messages.length - 1 && isGenerating;

                if (isUser) {
                  return (
                    <div key={index} className="flex justify-end group">
                      <div className="max-w-[85%] bg-[#242422] border border-[#333330] rounded-2xl px-4 py-3 text-sm text-[#ede8dd] shadow-sm">
                        {/* Render attached files on user message */}
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-2.5">
                            {msg.attachments.map((att) => (
                              <div
                                key={att.id}
                                className="flex items-center gap-2 p-1.5 pr-2.5 bg-[#1a1a18] border border-[#333330] rounded-lg text-xs"
                              >
                                {att.type === 'image' && att.dataBase64 ? (
                                  <img src={att.dataBase64} alt={att.name} className="w-7 h-7 object-cover rounded" />
                                ) : (
                                  <FileText className="w-4 h-4 text-[#da7756]" />
                                )}
                                <div className="truncate max-w-[140px]">
                                  <p className="font-medium text-[11px] text-white truncate">{att.name}</p>
                                  <p className="text-[9px] text-neutral-400">{formatFileSize(att.size)}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Backwards compatibility for single image */}
                        {!msg.attachments && msg.image && (
                          <div className="mb-2">
                            <img src={msg.image} alt="User attachment" className="max-h-60 rounded-lg object-contain border border-[#333]" />
                          </div>
                        )}

                        <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>

                        <div className="flex items-center justify-end gap-2 mt-2 pt-1 border-t border-[#2d2d2a] opacity-0 group-hover:opacity-100 transition text-[11px] text-neutral-400">
                          <button
                            onClick={() => handleEditMessage(index)}
                            title="Edit prompt"
                            className="hover:text-[#da7756] flex items-center gap-1 transition"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => copyText(msg.content, `msg-${index}`)}
                            title="Copy message"
                            className="hover:text-white flex items-center gap-1 transition"
                          >
                            {copiedId === `msg-${index}` ? (
                              <Check className="w-3.5 h-3.5 text-[#da7756]" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                            <span>Copy</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={index} className="flex gap-3.5 group">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#da7756] to-[#eb947a] text-white font-serif font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-[0_0_10px_rgba(218,119,86,0.25)]">
                      C
                    </div>
                    <div className="flex-1 max-w-[90%] min-w-0">
                      <div className="text-xs font-semibold text-neutral-300 mb-1 flex items-center gap-2">
                        <span>Claude</span>
                        <span className="text-[10px] text-neutral-500 font-normal font-mono">{activeModelObj.name}</span>
                      </div>

                      {/* Content or Streaming Dots */}
                      {isLastAssistant && !msg.content ? (
                        <div className="flex items-center gap-2 py-2 text-[#da7756]">
                          <span className="w-2 h-2 rounded-full bg-[#da7756] animate-bounce [animation-delay:-0.3s]" />
                          <span className="w-2 h-2 rounded-full bg-[#da7756] animate-bounce [animation-delay:-0.15s]" />
                          <span className="w-2 h-2 rounded-full bg-[#da7756] animate-bounce" />
                          <span className="text-xs text-neutral-400 font-mono ml-2">Thinking...</span>
                        </div>
                      ) : (
                        <MarkdownRenderer content={msg.content} />
                      )}

                      {/* Actions */}
                      {!isLastAssistant && (
                        <div className="flex items-center gap-3 mt-3 text-xs text-neutral-400 opacity-0 group-hover:opacity-100 transition">
                          <button
                            onClick={() => copyText(msg.content, `msg-${index}`)}
                            className="hover:text-white flex items-center gap-1 transition"
                          >
                            {copiedId === `msg-${index}` ? (
                              <Check className="w-3.5 h-3.5 text-[#da7756]" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                            <span>Copy</span>
                          </button>
                          <button
                            onClick={() => handleRegenerate(index)}
                            className="hover:text-[#da7756] flex items-center gap-1 transition"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Regenerate</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* --- CLAUDE FLOATING INPUT BAR (Matching user circled image) --- */}
        <div className="p-4 pt-1 bg-[#141413] shrink-0">
          <div className="max-w-3xl mx-auto">
            {/* Input Island Card */}
            <div className="bg-[#1c1c1a] border border-[#2d2d2a] focus-within:border-[#444] rounded-[26px] p-3 shadow-2xl transition">
              {/* Top Banner (Upgrade to Pro) */}
              <div className="flex items-center justify-between px-2 pt-0.5 pb-2 text-[11px] text-neutral-400 border-b border-[#292928] mb-1.5">
                <span>Get more with Claude Pro</span>
                <button
                  onClick={() => setProModalOpen(true)}
                  className="text-[#b197fc] hover:text-[#c7b5fd] font-semibold transition"
                >
                  Upgrade to Pro
                </button>
              </div>

              {/* Attachment Preview Chips inside Prompt Box */}
              {attachedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 px-2 py-1.5 mb-1.5">
                  {attachedFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center gap-2 p-1.5 pr-2 bg-[#252522] border border-[#383834] rounded-xl text-xs shadow-md animate-in fade-in"
                    >
                      {file.type === 'image' && file.dataBase64 ? (
                        <img src={file.dataBase64} alt={file.name} className="w-8 h-8 object-cover rounded-lg" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-[#2e2e2a] flex items-center justify-center text-[#da7756]">
                          <FileText className="w-4 h-4" />
                        </div>
                      )}
                      <div className="text-xs">
                        <p className="text-neutral-200 font-medium truncate max-w-[150px]">{file.name}</p>
                        <p className="text-[10px] text-neutral-400">{formatFileSize(file.size)}</p>
                      </div>
                      <button
                        onClick={() => removeAttachedFile(file.id)}
                        className="text-neutral-400 hover:text-white p-1 rounded-md hover:bg-[#333330] transition ml-1"
                        title="Remove attachment"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                rows={1}
                value={inputPrompt}
                onChange={(e) => {
                  setInputPrompt(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Reply to Claude..."
                className="w-full bg-transparent resize-none focus:outline-none text-[15px] text-[#ede8dd] placeholder-neutral-500 max-h-48 px-2 py-1 leading-relaxed"
              />

              {/* Bottom Controls Row: Circled areas in user request */}
              <div className="flex items-center justify-between pt-2 px-1 relative">
                {/* Left group: [ + ] Upload Button & [ Sonnet 3.5 ] Model Pill */}
                <div className="flex items-center gap-2">
                  {/* The '+' Plus Button ("ako ka jumlisha kakupakulia vitu") */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setAttachMenuOpen(!attachMenuOpen)}
                      title="Add content or attach files"
                      className="w-9 h-9 rounded-full bg-[#272725] hover:bg-[#333330] text-neutral-300 flex items-center justify-center transition border border-[#383835] active:scale-95"
                    >
                      <Plus className="w-5 h-5 text-neutral-300" />
                    </button>

                    {/* Attachment Selection Menu */}
                    {attachMenuOpen && (
                      <div className="absolute bottom-full left-0 mb-2 w-56 bg-[#1e1e1c] border border-[#33332f] rounded-2xl shadow-2xl py-2 z-50 text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            setAttachMenuOpen(false);
                            fileInputRef.current?.click();
                          }}
                          className="w-full text-left px-3.5 py-2 hover:bg-[#282824] transition flex items-center gap-2.5 text-neutral-200"
                        >
                          <Paperclip className="w-4 h-4 text-[#da7756]" />
                          <div>
                            <p className="font-medium text-white">Upload from computer</p>
                            <p className="text-[10px] text-neutral-400">PDF, TXT, CSV, JSON, code</p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setAttachMenuOpen(false);
                            imageInputRef.current?.click();
                          }}
                          className="w-full text-left px-3.5 py-2 hover:bg-[#282824] transition flex items-center gap-2.5 text-neutral-200"
                        >
                          <ImageIcon className="w-4 h-4 text-[#da7756]" />
                          <div>
                            <p className="font-medium text-white">Add photos or images</p>
                            <p className="text-[10px] text-neutral-400">PNG, JPG, WEBP, GIF</p>
                          </div>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Model Selector Pill ("na ivyo vingine vya ku change model") */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                      className="flex items-center gap-1.5 bg-[#272725] hover:bg-[#333330] border border-[#383835] rounded-full px-3 py-1.5 text-xs text-neutral-200 transition active:scale-95"
                    >
                      <span className="font-medium text-neutral-100">{activeModelObj.name}</span>
                      <span className="text-[10px] text-neutral-400 font-mono">{activeModelObj.tag}</span>
                      <ChevronDown className="w-3 h-3 text-neutral-400 ml-0.5" />
                    </button>

                    {/* Model Dropdown Menu */}
                    {modelDropdownOpen && (
                      <div className="absolute bottom-full left-0 mb-2 w-72 bg-[#1b1b19] border border-[#33332f] rounded-2xl shadow-2xl py-2 z-50 text-xs">
                        <div className="px-3.5 py-1.5 text-[10px] uppercase tracking-wider font-semibold text-neutral-500 border-b border-[#292925] mb-1">
                          Select Claude Model
                        </div>
                        {MODELS.map((m) => {
                          const isSelected = m.id === selectedModel;
                          return (
                            <button
                              key={m.id}
                              onClick={() => {
                                setSelectedModel(m.id);
                                localStorage.setItem('nadhili_model', m.id);
                                setModelDropdownOpen(false);
                                showToast(`Switched to ${m.name}`);
                              }}
                              className={`w-full text-left px-3.5 py-2.5 hover:bg-[#262622] transition flex flex-col gap-0.5 ${
                                isSelected ? 'bg-[#242420]' : ''
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-white flex items-center gap-1.5">
                                  {m.name}
                                  {m.badge && (
                                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-[#da7756]/20 text-[#da7756] border border-[#da7756]/30">
                                      {m.badge}
                                    </span>
                                  )}
                                  {isSelected && <Check className="w-3.5 h-3.5 text-[#da7756]" />}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#2b2b28] text-neutral-300 font-mono">
                                  {m.tag}
                                </span>
                              </div>
                              <span className="text-[11px] text-neutral-400">{m.description}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right group: [Mic] & [Send / Stop] */}
                <div className="flex items-center gap-2">
                  {/* Mic button */}
                  <button
                    type="button"
                    onClick={toggleRecording}
                    title={isRecording ? 'Stop recording' : 'Dictate with voice'}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition border ${
                      isRecording
                        ? 'bg-red-500 text-white border-red-400 animate-pulse'
                        : 'bg-[#272725] hover:bg-[#333330] text-neutral-300 border-[#383835]'
                    }`}
                  >
                    {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>

                  {/* Send or Stop button */}
                  {isGenerating ? (
                    <button
                      type="button"
                      onClick={handleStopGeneration}
                      title="Stop response"
                      className="w-9 h-9 rounded-full bg-[#da7756] hover:bg-[#eb947a] text-white flex items-center justify-center transition shadow-md active:scale-95"
                    >
                      <Square className="w-4 h-4 fill-white" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSendMessage()}
                      disabled={!inputPrompt.trim() && attachedFiles.length === 0}
                      title="Send message"
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition shadow-md active:scale-95 ${
                        inputPrompt.trim() || attachedFiles.length > 0
                          ? 'bg-[#da7756] hover:bg-[#e48364] text-white cursor-pointer'
                          : 'bg-[#272725] text-neutral-500 border border-[#383835] cursor-not-allowed'
                      }`}
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <p className="text-[11px] text-neutral-500 text-center mt-2.5">
              Claude can make mistakes. Please verify important technical and legal information.
            </p>
          </div>
        </div>
      </main>

      {/* --- PRO MODAL --- */}
      {proModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1b1b19] border border-[#2e2e2a] rounded-3xl max-w-md w-full p-6 text-neutral-200 relative shadow-2xl">
            <button
              onClick={() => setProModalOpen(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded-full hover:bg-[#282824]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#b197fc] to-[#da7756] text-white flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Crown className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-bold text-center text-white mb-1">Upgrade to Claude Pro</h3>
            <p className="text-xs text-center text-neutral-400 mb-6">
              5x more usage, priority edge processing, and access to all preview models.
            </p>

            <div className="space-y-3 mb-6">
              {[
                'Extended reasoning context for complex tasks',
                'Fast-lane processing even during peak hours',
                'Unlimited multi-turn conversations and file uploads',
                'Advanced code execution and architectural analysis',
              ].map((feat, i) => (
                <div key={i} className="flex items-center gap-2.5 text-xs text-neutral-300">
                  <Check className="w-4 h-4 text-[#da7756] shrink-0" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>

            <div className="bg-[#242420] border border-[#33332f] rounded-2xl p-4 text-center mb-5">
              <span className="text-2xl font-bold text-white">$20</span>
              <span className="text-xs text-neutral-400"> / month</span>
            </div>

            <button
              onClick={() => {
                showToast('Pro features unlocked for your session!');
                setProModalOpen(false);
              }}
              className="w-full bg-gradient-to-r from-[#da7756] to-[#eb947a] hover:brightness-110 text-white font-semibold py-3 rounded-xl text-xs transition shadow-lg"
            >
              Activate Pro Membership
            </button>
          </div>
        </div>
      )}

      {/* --- PREFERENCES MODAL (Clean, ZERO secret or URL words) --- */}
      {settingsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1b1b19] border border-[#2e2e2a] rounded-3xl max-w-md w-full p-6 text-neutral-200 relative shadow-2xl">
            <button
              onClick={() => setSettingsModalOpen(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded-full hover:bg-[#282824]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-[#272724] border border-[#383834] text-[#da7756] flex items-center justify-center">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Assistant Preferences</h3>
                <p className="text-xs text-neutral-400">Personalize model behavior and storage</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Storage Status (Clean, no secret strings) */}
              <div className="bg-[#222220] border border-[#33332f] rounded-2xl p-3.5">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-neutral-400">Data Persistence:</span>
                  <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Cloud Active & Synced
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400">
                  Your conversations and multi-turn message history are stored securely and synchronized across sessions.
                </p>
              </div>

              {/* Creativity / Tone */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-2">Response Style</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'precise', label: 'Precise', desc: 'Concise & code' },
                    { id: 'balanced', label: 'Balanced', desc: 'Everyday standard' },
                    { id: 'creative', label: 'Creative', desc: 'Exploratory' },
                  ].map((lvl) => (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => setCreativityLevel(lvl.id as any)}
                      className={`p-2.5 rounded-xl border text-left transition ${
                        creativityLevel === lvl.id
                          ? 'bg-[#da7756]/15 border-[#da7756] text-white'
                          : 'bg-[#222220] border-[#33332f] text-neutral-400 hover:text-white'
                      }`}
                    >
                      <p className="text-xs font-medium">{lvl.label}</p>
                      <p className="text-[10px] text-neutral-500 mt-0.5">{lvl.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* System Persona */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">Claude Persona Focus</label>
                <select
                  value={systemPersona}
                  onChange={(e) => setSystemPersona(e.target.value)}
                  className="w-full bg-[#222220] border border-[#33332f] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#da7756]"
                >
                  <option value="default">General Intelligence (Default)</option>
                  <option value="code">Senior Software Architect</option>
                  <option value="research">Academic & Research Synthesizer</option>
                  <option value="creative">Writer & Creative Partner</option>
                </select>
              </div>
            </div>

            <button
              onClick={() => {
                showToast('Preferences saved');
                setSettingsModalOpen(false);
              }}
              className="mt-6 w-full bg-[#da7756] hover:bg-[#eb947a] text-white font-medium py-2.5 rounded-xl text-xs transition"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* --- AUTH MODAL --- */}
      {authModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1b1b19] border border-[#2e2e2a] rounded-3xl max-w-sm w-full p-6 text-neutral-200 relative shadow-2xl">
            <button
              onClick={() => setAuthModalOpen(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded-full hover:bg-[#282824]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-11 h-11 rounded-2xl bg-[#da7756]/20 border border-[#da7756]/30 text-[#da7756] flex items-center justify-center mx-auto mb-3">
              <Bot className="w-5 h-5" />
            </div>

            <h3 className="text-lg font-bold text-center text-white mb-1">
              {authTab === 'signin' ? 'Sign in to Claude' : 'Create Claude Account'}
            </h3>
            <p className="text-xs text-center text-neutral-400 mb-5">
              Sync multi-turn conversations and access advanced models.
            </p>

            {/* Tabs */}
            <div className="flex bg-[#232320] p-1 rounded-xl mb-4 border border-[#33332e]">
              <button
                type="button"
                onClick={() => setAuthTab('signin')}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition ${
                  authTab === 'signin' ? 'bg-[#da7756] text-white shadow-sm' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setAuthTab('signup')}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition ${
                  authTab === 'signup' ? 'bg-[#da7756] text-white shadow-sm' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Sign Up
              </button>
            </div>

            {authError && (
              <div className="mb-4 text-xs text-red-400 bg-red-950/40 p-2.5 rounded-xl border border-red-900">
                {authError}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-3">
              {authTab === 'signup' && (
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    placeholder="Your Name"
                    className="w-full bg-[#222220] border border-[#33332f] rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:border-[#da7756] focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-[#222220] border border-[#33332f] rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:border-[#da7756] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#222220] border border-[#33332f] rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:border-[#da7756] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full mt-2 bg-[#da7756] hover:bg-[#eb947a] text-white font-semibold py-2.5 rounded-xl text-xs transition shadow-lg"
              >
                {authTab === 'signin' ? 'Sign In' : 'Create Account'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- CLOUDFLARE DEPLOY BUNDLE MODAL (Safe, Clean, Zero Secrets) --- */}
      {deployModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1b1b19] border border-[#2e2e2a] rounded-3xl max-w-2xl w-full p-6 text-neutral-200 relative shadow-2xl flex flex-col max-h-[90vh]">
            <button
              onClick={() => setDeployModalOpen(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded-full hover:bg-[#282824]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#da7756]/20 border border-[#da7756]/30 text-[#da7756] flex items-center justify-center">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Edge Deployment Architecture</h3>
                <p className="text-xs text-neutral-400">Standalone Cloudflare Workers bundle</p>
              </div>
            </div>

            {/* Tab navigation */}
            <div className="flex bg-[#232320] p-1 rounded-xl mb-4 border border-[#33332e] text-xs">
              {[
                { id: 'quick', label: 'Quick Start' },
                { id: 'worker', label: 'index.js' },
                { id: 'schema', label: 'schema.sql' },
                { id: 'wrangler', label: 'wrangler.toml' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setDeployTab(tab.id as any)}
                  className={`flex-1 py-1.5 rounded-lg transition font-medium ${
                    deployTab === tab.id ? 'bg-[#da7756] text-white shadow-sm' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
              {deployTab === 'quick' && (
                <div className="space-y-4">
                  <div className="bg-[#222220] p-4 rounded-2xl border border-[#33332f] space-y-2">
                    <p className="font-semibold text-white">Production Edge Highlights:</p>
                    <ul className="list-disc list-inside space-y-1 text-neutral-300">
                      <li>Microsecond edge latency across global data centers</li>
                      <li>Cloud storage synchronization for multi-turn chats</li>
                      <li>High-concurrency streaming response pipeline</li>
                    </ul>
                  </div>

                  <div className="bg-[#121211] p-3 rounded-2xl border border-[#2a2a26] font-mono text-[11px] space-y-1">
                    <p className="text-neutral-500"># Deploy in terminal</p>
                    <p className="text-[#da7756]">npx wrangler deploy</p>
                  </div>
                </div>
              )}

              {deployTab === 'worker' && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[11px] text-neutral-400 font-mono">cloudflare-worker/index.js</span>
                    <button
                      onClick={() => downloadFile('index.js', deployFiles.workerCode)}
                      className="px-2.5 py-1 bg-[#282824] hover:bg-[#33332e] rounded-lg text-white text-[11px] flex items-center gap-1.5 transition"
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </button>
                  </div>
                  <pre className="bg-[#10100f] p-3.5 rounded-2xl text-[11px] font-mono text-neutral-300 overflow-x-auto max-h-72 border border-[#262623]">
                    {deployFiles.workerCode || '// Loading worker source...'}
                  </pre>
                </div>
              )}

              {deployTab === 'schema' && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[11px] text-neutral-400 font-mono">cloudflare-worker/schema.sql</span>
                    <button
                      onClick={() => downloadFile('schema.sql', deployFiles.schemaSql)}
                      className="px-2.5 py-1 bg-[#282824] hover:bg-[#33332e] rounded-lg text-white text-[11px] flex items-center gap-1.5 transition"
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </button>
                  </div>
                  <pre className="bg-[#10100f] p-3.5 rounded-2xl text-[11px] font-mono text-neutral-300 overflow-x-auto max-h-72 border border-[#262623]">
                    {deployFiles.schemaSql || '-- Loading database schema...'}
                  </pre>
                </div>
              )}

              {deployTab === 'wrangler' && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[11px] text-neutral-400 font-mono">cloudflare-worker/wrangler.toml</span>
                    <button
                      onClick={() => downloadFile('wrangler.toml', deployFiles.wranglerToml)}
                      className="px-2.5 py-1 bg-[#282824] hover:bg-[#33332e] rounded-lg text-white text-[11px] flex items-center gap-1.5 transition"
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </button>
                  </div>
                  <pre className="bg-[#10100f] p-3.5 rounded-2xl text-[11px] font-mono text-neutral-300 overflow-x-auto max-h-72 border border-[#262623]">
                    {deployFiles.wranglerToml || '# Loading wrangler config...'}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
