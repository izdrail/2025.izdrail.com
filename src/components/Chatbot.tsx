"use client";

import {
  type ChangeEvent,
  type ClipboardEvent,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";

import ThemeToggle from "@/components/ThemeToggle";
import {
  ChatContainerContent,
  ChatContainerRoot,
  ChatContainerScrollAnchor,
} from "@/components/prompt-kit/chat-container";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
} from "@/components/prompt-kit/message";
import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/prompt-kit/prompt-input";
import { ScrollButton } from "@/components/prompt-kit/scroll-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowUp,
  Check,
  Copy,
  Image,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ThumbsDown,
  ThumbsUp,
  X,
  Cpu,
  Plus,
  Loader2,
  Bot,
  User,
  Download,
  Trash2,
} from "lucide-react";

type Role = "user" | "assistant";

type Attachment = {
  id: string;
  name: string;
  type: string;
  size: number;
  preview: string;
};

type ConversationMessage = {
  id: string;
  role: Role;
  name: string;
  avatarFallback: string;
  avatarUrl?: string;
  content: string;
  markdown?: boolean;
  attachments?: Attachment[];
  reaction?: "upvote" | "downvote" | null;
  timestamp?: Date;
};

type HistoryConversation = {
  id: string;
  title: string;
  preview: string;
  timestamp: string;
};

type HistoryGroup = {
  label: string;
  conversations: HistoryConversation[];
};

const API_BASE = "https://ai.izdrail.com/api";

const historySeed: HistoryGroup[] = [
  {
    label: "Today",
    conversations: [
      {
        id: "today-1",
        title: "Chat with Ollama",
        preview: "Powered by your private AI endpoint.",
        timestamp: "Just now",
      },
    ],
  },
];

function createId() {
  return Math.random().toString(36).slice(2, 10);
}

function formatFileSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function truncateText(text: string, limit = 80): string {
  if (text.length <= limit) return text;
  return `${text.slice(0, limit)}…`;
}

function findConversationTitle(
    groups: HistoryGroup[],
    conversationId: string
): string {
  for (const section of groups) {
    const conversation = section.conversations.find(
        (entry) => entry.id === conversationId
    );
    if (conversation) return conversation.title;
  }
  return "Untitled chat";
}

function cloneHistoryGroups(groups: HistoryGroup[]): HistoryGroup[] {
  return groups.map((section) => ({
    label: section.label,
    conversations: section.conversations.map((conversation) => ({ ...conversation })),
  }));
}

function updateConversationInGroups(
    groups: HistoryGroup[],
    conversationId: string,
    updater: (existing: HistoryConversation) => HistoryConversation
): HistoryGroup[] {
  const next = cloneHistoryGroups(groups);
  for (const section of next) {
    const index = section.conversations.findIndex((c) => c.id === conversationId);
    if (index !== -1) {
      const existing = section.conversations[index];
      section.conversations[index] = updater(existing);
      break;
    }
  }
  return next;
}

function createPlaceholderConversation(
    title: string,
    preview: string
): ConversationMessage[] {
  return [
    {
      id: createId(),
      role: "assistant",
      name: "Ollama",
      avatarFallback: "OL",
      markdown: true,
      reaction: null,
      content: `Placeholder for **${title}**. ${preview}`,
      timestamp: new Date(),
    },
  ];
}

/* -------------------------
   API helpers
------------------------- */

async function apiGetConversations(): Promise<HistoryConversation[]> {
  try {
    const res = await fetch(`${API_BASE}/conversations`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : data.results ?? [];
  } catch {
    return [];
  }
}

async function apiCreateConversation(payload: {
  id: string;
  title: string;
  preview?: string;
  timestamp?: string;
}): Promise<HistoryConversation | null> {
  try {
    const res = await fetch(`${API_BASE}/conversations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    try {
      const data = await res.json();
      if (data && data.id) return data;
    } catch {}
    return {
      id: payload.id,
      title: payload.title,
      preview: payload.preview ?? "New conversation",
      timestamp: payload.timestamp ?? "Just now",
    };
  } catch {
    return null;
  }
}

async function apiGetMessages(
    conversationId: string
): Promise<ConversationMessage[]> {
  try {
    const res = await fetch(`${API_BASE}/messages/${conversationId}`);
    if (!res.ok) return [];
    const data = await res.json();
    if (Array.isArray(data)) return data.map(msg => ({
      ...msg,
      timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date()
    }));
    if (data?.results) return data.results.map((msg: any) => ({
      ...msg,
      timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date()
    }));
    return [];
  } catch {
    return [];
  }
}

async function apiCreateMessage(payload: {
  id?: string;
  conversation_id: string;
  role: Role;
  name: string;
  avatarFallback: string;
  content: string;
  markdown?: boolean;
  attachments?: Attachment[] | null;
}): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        timestamp: new Date().toISOString(),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/* -------------------------
   Component
------------------------- */

const seedActiveConversationId = historySeed[0]?.conversations[0]?.id ?? createId();

// Loading spinner component
const LoadingSpinner = ({ size = 20, className = "" }: { size?: number; className?: string }) => (
    <Loader2 className={cn("animate-spin", className)} size={size} />
);

// Typing indicator component
const TypingIndicator = () => (
    <div className="flex items-center space-x-1 px-4 py-2">
      <div className="flex space-x-1">
        <div className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="text-xs text-muted-foreground">AI is thinking...</span>
    </div>
);

// Model selector component
const ModelSelector = ({
                         models,
                         selectedModel,
                         onModelChange,
                         isLoading = false
                       }: {
  models: { id: string; name: string }[];
  selectedModel: string;
  onModelChange: (model: string) => void;
  isLoading?: boolean;
}) => (
    <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-muted/50">
      {isLoading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <LoadingSpinner size={12} />
            Loading models...
          </div>
      ) : (
          <>
            <Cpu className="h-3 w-3 text-muted-foreground" />
            <select
                value={selectedModel}
                onChange={(e) => onModelChange(e.target.value)}
                className="text-xs bg-transparent border-none focus:outline-none focus:ring-0 text-muted-foreground"
            >
              {models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
              ))}
            </select>
          </>
      )}
    </div>
);

function Chatbot() {
  const [historyGroups, setHistoryGroups] = useState<HistoryGroup[]>(() =>
      cloneHistoryGroups(historySeed)
  );
  const [conversations, setConversations] = useState<Record<string, ConversationMessage[]>>(() => {
    const map: Record<string, ConversationMessage[]> = {};
    map[seedActiveConversationId] = [
      {
        id: createId(),
        role: "assistant",
        name: "Ollama",
        avatarFallback: "OL",
        markdown: true,
        reaction: null,
        content:
            "Hello! I'm running on your private Ollama instance via **ai.izdrail.com**. Ask me anything!",
        timestamp: new Date(),
      },
    ];
    return map;
  });
  const [activeConversationId, setActiveConversationId] = useState(seedActiveConversationId);
  const [chatCounter, setChatCounter] = useState(2);
  const [composerAttachments, setComposerAttachments] = useState<Attachment[]>([]);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [models, setModels] = useState<{ id: string; name: string }[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("llama3.2:1b");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);

  const activeConversationTitle = useMemo(() => {
    return findConversationTitle(historyGroups, activeConversationId);
  }, [historyGroups, activeConversationId]);

  const messages = useMemo(
      () => conversations[activeConversationId] ?? [],
      [conversations, activeConversationId]
  );

  const hasPendingInput = input.trim().length > 0 || composerAttachments.length > 0;

  /* -------------------------
     Fetch models
  ------------------------- */
  useEffect(() => {
    const fetchModels = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`${API_BASE}/tags`);
        if (!res.ok) throw new Error("Failed to fetch models");
        const data = await res.json();
        const modelList = (data.models || []).map((m: any) => ({
          id: m.name,
          name: m.name,
        }));
        setModels(modelList);
        if (modelList.length > 0) setSelectedModel(modelList[0].id);
      } catch {
        setModels([{ id: "llama3.2:1b", name: "llama3.2:1b" }]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchModels();
  }, []);

  /* -------------------------
     Load initial conversations
  ------------------------- */
  useEffect(() => {
    async function loadInitial() {
      setIsLoadingHistory(true);
      const convos = await apiGetConversations();

      if (convos.length === 0) {
        const id = createId();
        const title = "Chat 1";
        const created = await apiCreateConversation({
          id,
          title,
          preview: "New chat",
          timestamp: "Just now",
        });
        if (created) {
          setHistoryGroups([{ label: "Today", conversations: [created] }]);
          setConversations({
            [created.id]: [
              {
                id: createId(),
                role: "assistant",
                name: "Ollama",
                avatarFallback: "OL",
                markdown: true,
                reaction: null,
                content: "Hello! I'm running on your private Ollama instance.",
                timestamp: new Date(),
              },
            ],
          });
          setActiveConversationId(created.id);
        } else {
          setHistoryGroups(cloneHistoryGroups(historySeed));
          setActiveConversationId(seedActiveConversationId);
        }
        setIsLoadingHistory(false);
        return;
      }

      setHistoryGroups([{ label: "Today", conversations: convos }]);
      const first = convos[0];
      setActiveConversationId(first.id);
      const msgs = await apiGetMessages(first.id);
      if (msgs.length === 0) {
        setConversations({
          [first.id]: createPlaceholderConversation(first.title, first.preview),
        });
      } else {
        setConversations({ [first.id]: msgs });
      }
      setIsLoadingHistory(false);
    }

    loadInitial();
  }, []);

  /* -------------------------
     Update conversation messages
  ------------------------- */
  const updateConversationMessages = (
      conversationId: string,
      updater: (current: ConversationMessage[]) => ConversationMessage[]
  ) => {
    setConversations((prev) => {
      const current = prev[conversationId] ?? [];
      const updated = updater(current);
      return { ...prev, [conversationId]: updated };
    });
  };

  const refreshHistoryPreview = (conversationId: string, preview: string, title?: string) => {
    setHistoryGroups((prev) =>
        updateConversationInGroups(prev, conversationId, (existing) => ({
          id: existing.id,
          title: title ?? existing.title,
          preview: truncateText(preview),
          timestamp: "Just now",
        }))
    );
  };

  /* -------------------------
     Attachments
  ------------------------- */
  const addAttachmentFromFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      setComposerAttachments((prev) => [
        ...prev,
        {
          id: createId(),
          name: file.name || `pasted-image-${prev.length + 1}.png`,
          type: file.type,
          size: file.size,
          preview: reader.result,
        },
      ]);
    };
    reader.readAsDataURL(file);
  };

  const handlePasteImages = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(event.clipboardData?.files ?? []).filter((file) =>
        file.type.startsWith("image/")
    );
    if (files.length === 0) return;
    event.preventDefault();
    files.forEach(addAttachmentFromFile);
  };

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).filter((file) =>
        file.type.startsWith("image/")
    );
    if (files.length === 0) return;
    files.forEach(addAttachmentFromFile);
    event.target.value = "";
  };

  const handleRemoveAttachment = (attachmentId: string) => {
    setComposerAttachments((prev) =>
        prev.filter((attachment) => attachment.id !== attachmentId)
    );
  };

  /* -------------------------
     Copy / reactions
  ------------------------- */
  const handleCopy = async (message: ConversationMessage) => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedMessageId(message.id);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch {
      setCopiedMessageId(null);
    }
  };

  const toggleReaction = (messageId: string, reaction: "upvote" | "downvote") => {
    updateConversationMessages(activeConversationId, (current) =>
        current.map((msg) =>
            msg.id === messageId
                ? { ...msg, reaction: msg.reaction === reaction ? null : reaction }
                : msg
        )
    );
  };

  /* -------------------------
     Send / streaming
  ------------------------- */
  const handleSubmit = async () => {
    if (!hasPendingInput || isGenerating) return;

    const userContent = input.trim() || "Sent a message";
    const userMessageId = createId();
    const userMessage: ConversationMessage = {
      id: userMessageId,
      role: "user",
      name: "You",
      avatarFallback: "YO",
      content: userContent,
      attachments: composerAttachments.length ? [...composerAttachments] : undefined,
      reaction: null,
      timestamp: new Date(),
    };

    updateConversationMessages(activeConversationId, (curr) => [...curr, userMessage]);
    refreshHistoryPreview(activeConversationId, userContent);

    setInput("");
    setComposerAttachments([]);
    setCopiedMessageId(null);
    setIsGenerating(true);

    apiCreateMessage({
      id: userMessageId,
      conversation_id: activeConversationId,
      role: "user",
      name: "You",
      avatarFallback: "YO",
      content: userContent,
      markdown: false,
      attachments: userMessage.attachments ?? null,
    }).catch(console.warn);

    const chatHistory = messages
        .filter((msg) => msg.role === "user" || msg.role === "assistant")
        .map((msg) => ({ role: msg.role, content: msg.content }))
        .concat([{ role: "user", content: userContent }]);

    try {
      const response = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: selectedModel,
          messages: chatHistory,
          stream: true,
        }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (!response.body) throw new Error("ReadableStream not supported");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantContent = "";
      const assistantMessageId = createId();

      setStreamingMessageId(assistantMessageId);

      updateConversationMessages(activeConversationId, (curr) => [
        ...curr,
        {
          id: assistantMessageId,
          role: "assistant",
          name: "Ollama",
          avatarFallback: "OL",
          markdown: true,
          reaction: null,
          content: "",
          timestamp: new Date(),
        },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIndex;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);
          if (!line) continue;

          try {
            const parsed = JSON.parse(line);
            if (parsed.message?.content != null) {
              assistantContent += parsed.message.content;
              updateConversationMessages(activeConversationId, (curr) =>
                  curr.map((msg) =>
                      msg.id === assistantMessageId ? { ...msg, content: assistantContent } : msg
                  )
              );
            }
          } catch {}
        }
      }

      if (buffer.trim()) {
        try {
          const parsed = JSON.parse(buffer.trim());
          if (parsed.message?.content != null) {
            assistantContent += parsed.message.content;
            updateConversationMessages(activeConversationId, (curr) =>
                curr.map((msg) =>
                    msg.id === assistantMessageId ? { ...msg, content: assistantContent } : msg
                )
            );
          }
        } catch {}
      }

      await apiCreateMessage({
        id: assistantMessageId,
        conversation_id: activeConversationId,
        role: "assistant",
        name: "Ollama",
        avatarFallback: "OL",
        content: assistantContent,
        markdown: true,
        attachments: null,
      });

      refreshHistoryPreview(activeConversationId, assistantContent);
    } catch {
      const errorMessage: ConversationMessage = {
        id: createId(),
        role: "assistant",
        name: "Ollama",
        avatarFallback: "OL",
        markdown: false,
        reaction: null,
        content: "⚠️ Failed to reach AI. Check your connection.",
        timestamp: new Date(),
      };
      updateConversationMessages(activeConversationId, (curr) => [...curr, errorMessage]);
      apiCreateMessage({
        id: errorMessage.id,
        conversation_id: activeConversationId,
        role: "assistant",
        name: "Ollama",
        avatarFallback: "OL",
        content: errorMessage.content,
        markdown: false,
        attachments: null,
      }).catch(() => {});
    } finally {
      setIsGenerating(false);
      setStreamingMessageId(null);
    }
  };

  /* -------------------------
     New chat
  ------------------------- */
  const handleNewChat = async () => {
    const conversationId = createId();
    const conversationTitle = `Chat ${chatCounter}`;
    const created = await apiCreateConversation({
      id: conversationId,
      title: conversationTitle,
      preview: "New conversation started.",
      timestamp: "Just now",
    });

    setChatCounter((c) => c + 1);
    setConversations((prev) => ({ ...prev, [conversationId]: [] }));
    setActiveConversationId(conversationId);
    setComposerAttachments([]);
    setInput("");
    setCopiedMessageId(null);
    setIsGenerating(false);
    setIsSidebarOpen(false);

    setHistoryGroups((prev) => {
      const next = cloneHistoryGroups(prev);
      if (next.length === 0) next.push({ label: "Today", conversations: [] });
      next[0].conversations = [
        {
          id: conversationId,
          title: conversationTitle,
          preview: "New conversation started.",
          timestamp: "Just now",
        },
        ...next[0].conversations,
      ];
      return next;
    });

    const initialAssistant: ConversationMessage = {
      id: createId(),
      role: "assistant",
      name: "Ollama",
      avatarFallback: "OL",
      markdown: true,
      reaction: null,
      content: "New chat started. How can I help you today?",
      timestamp: new Date(),
    };

    setConversations((prev) => ({ ...prev, [conversationId]: [initialAssistant] }));
    apiCreateMessage({
      id: initialAssistant.id,
      conversation_id: conversationId,
      role: "assistant",
      name: "Ollama",
      avatarFallback: "OL",
      content: initialAssistant.content,
      markdown: true,
      attachments: null,
    }).catch(() => {});
  };

  /* -------------------------
     Select conversation
  ------------------------- */
  const handleSelectConversation = async (conversation: HistoryConversation) => {
    if (conversation.id === activeConversationId) return;

    setActiveConversationId(conversation.id);
    setIsSidebarOpen(false);
    setComposerAttachments([]);
    setInput("");
    setCopiedMessageId(null);
    setIsGenerating(false);

    // Check if we already have messages for this conversation
    if (!conversations[conversation.id]) {
      setIsLoadingHistory(true);
      const msgs = await apiGetMessages(conversation.id);
      if (msgs.length === 0) {
        setConversations((prev) => ({
          ...prev,
          [conversation.id]: createPlaceholderConversation(conversation.title, conversation.preview),
        }));
      } else {
        setConversations((prev) => ({
          ...prev,
          [conversation.id]: msgs,
        }));
      }
      setIsLoadingHistory(false);
    }
  };

  /* -------------------------
     Format timestamp
  ------------------------- */
  const formatMessageTime = (timestamp?: Date) => {
    if (!timestamp) return '';
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  /* -------------------------
     JSX
  ------------------------- */
  return (
      <div className="relative flex h-full overflow-hidden bg-background text-foreground">
        {/* Sidebar overlay */}
        <div
            className={cn(
                "fixed inset-0 z-20 bg-black/40 backdrop-blur-sm lg:hidden transition-opacity duration-300",
                isSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            )}
            onClick={() => setIsSidebarOpen(false)}
            aria-hidden="true"
        />

        {/* Sidebar */}
        <aside
            className={cn(
                "fixed inset-y-0 left-0 z-30 flex w-72 flex-col border-r border-border bg-card shadow-xl transition-transform duration-300 ease-in-out",
                isSidebarOpen ? "translate-x-0" : "-translate-x-full",
                "lg:static lg:h-full lg:shadow-none",
                isSidebarCollapsed ? "lg:hidden" : "lg:flex lg:translate-x-0"
            )}
        >
          {/* Sidebar header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                History
              </p>
              <p className="text-sm font-medium text-foreground">Recent chats</p>
            </div>
            <div className="flex items-center gap-1">
              <ThemeToggle className="lg:hidden" />
              <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  onClick={() => setIsSidebarOpen(false)}
                  aria-label="Close chat history"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* New chat button */}
          <div className="border-b border-border px-4 pb-4 pt-3">
            <Button variant="outline" size="sm" className="w-full" onClick={handleNewChat}>
              <Plus className="h-4 w-4" />
              <span className="ml-2">New chat</span>
            </Button>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto pb-6">
            {isLoadingHistory ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner />
                  <span className="ml-2 text-sm text-muted-foreground">Loading conversations...</span>
                </div>
            ) : historyGroups.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                  <div className="rounded-full bg-muted p-3 mb-3">
                    <Bot className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">No conversations yet</p>
                  <p className="text-xs text-muted-foreground">Start a new chat to begin</p>
                </div>
            ) : (
                historyGroups.map((section) => (
                    <div key={section.label} className="px-4 pt-6">
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                        {section.label}
                      </p>
                      <div className="mt-3 space-y-2">
                        {section.conversations.map((conversation) => {
                          const isActive = conversation.id === activeConversationId;
                          return (
                              <button
                                  key={conversation.id}
                                  type="button"
                                  className={cn(
                                      "w-full rounded-xl border border-transparent bg-transparent px-3 py-2 text-left transition hover:border-border hover:bg-accent/40",
                                      isActive && "border-border bg-accent/40"
                                  )}
                                  onClick={() => handleSelectConversation(conversation)}
                              >
                                <div className="flex items-center justify-between text-sm font-medium text-foreground">
                                  <span className="truncate">{conversation.title}</span>
                                  <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                            {conversation.timestamp}
                          </span>
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">{conversation.preview}</p>
                              </button>
                          );
                        })}
                      </div>
                    </div>
                ))
            )}
          </div>
        </aside>

        {/* Main */}
        <main className="flex h-full flex-1 flex-col overflow-hidden">
          {/* Header */}
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-8">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex items-center gap-2">
                <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden"
                    onClick={() => setIsSidebarOpen(true)}
                    aria-label="Open chat history"
                >
                  <Menu className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="hidden lg:inline-flex"
                    onClick={() => setIsSidebarCollapsed((v) => !v)}
                    aria-label={isSidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
                >
                  {isSidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
                </Button>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Ollama</p>
                <h1 className="truncate text-lg font-semibold text-foreground sm:text-xl">
                  {activeConversationTitle}
                </h1>
                <ModelSelector
                    models={models}
                    selectedModel={selectedModel}
                    onModelChange={setSelectedModel}
                    isLoading={isLoading}
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ThemeToggle className="hidden lg:inline-flex" />
            </div>
          </header>

          {/* Chat area */}
          <div className="flex flex-1 flex-col overflow-hidden px-4 pb-6 pt-4 sm:px-8">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <ChatContainerRoot className="relative flex min-h-0 flex-1 flex-col rounded-2xl border border-border bg-card/80 p-4 shadow-sm backdrop-blur-sm sm:p-6">
                {isLoadingHistory ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <LoadingSpinner size={32} className="mx-auto mb-4" />
                        <p className="text-sm text-muted-foreground">Loading conversation...</p>
                      </div>
                    </div>
                ) : (
                    <ChatContainerContent className="flex w-full flex-col gap-6">
                      {messages.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full text-center py-12">
                            <div className="rounded-full bg-primary/10 p-4 mb-4">
                              <Bot className="h-8 w-8 text-primary" />
                            </div>
                            <h3 className="text-lg font-semibold text-foreground mb-2">Welcome to Ollama Chat</h3>
                            <p className="text-sm text-muted-foreground max-w-md mb-6">
                              Start a conversation by typing a message below. I'm powered by your private AI endpoint.
                            </p>
                            <div className="flex flex-wrap gap-2 justify-center">
                              <Button variant="outline" size="sm" onClick={handleNewChat}>
                                <Plus className="h-4 w-4 mr-2" />
                                New Chat
                              </Button>
                            </div>
                          </div>
                      ) : (
                          messages.map((message, index) => {
                            const isUser = message.role === "user";
                            const isLatestAssistant = !isUser && index === messages.length - 1;
                            const isStreaming = message.id === streamingMessageId;

                            return (
                                <Message key={message.id} className={cn(isUser ? "justify-end" : "justify-start")} aria-live="polite">
                                  <div className={cn("flex max-w-[38rem] flex-col gap-2", isUser ? "items-end" : "items-start")}>
                                    <div className="flex items-center gap-2">
                                      <div className={cn(
                                          "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                                          isUser ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                      )}>
                                        {isUser ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                                      </div>
                                      <span className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                                {message.name}
                              </span>
                                      <span className="text-xs text-muted-foreground/70">
                                {formatMessageTime(message.timestamp)}
                              </span>
                                    </div>
                                    <div className="group flex w-full flex-col gap-2">
                                      <MessageContent
                                          markdown={message.markdown}
                                          className={cn(
                                              "rounded-3xl px-5 py-3 text-sm leading-6 shadow-sm transition-colors text-left relative",
                                              isUser
                                                  ? "bg-primary text-primary-foreground"
                                                  : "bg-muted text-foreground prose-headings:mt-0 prose-headings:font-semibold prose-p:mt-2",
                                              isStreaming && "pr-10"
                                          )}
                                      >
                                        {message.content}
                                        {isStreaming && (
                                            <div className="absolute right-3 top-3">
                                              <div className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-pulse" />
                                            </div>
                                        )}
                                      </MessageContent>

                                      {/* Attachments */}
                                      {message.attachments && message.attachments.length > 0 && (
                                          <div className="mt-2 grid gap-3 sm:grid-cols-2">
                                            {message.attachments.map((attachment) => (
                                                <figure
                                                    key={attachment.id}
                                                    className="overflow-hidden rounded-xl border border-border bg-background/40 group/attachment"
                                                >
                                                  <img
                                                      src={attachment.preview}
                                                      alt={attachment.name}
                                                      className="h-32 w-full object-cover transition-transform group-hover/attachment:scale-105"
                                                  />
                                                  <figcaption className="flex items-center justify-between truncate px-3 py-2 text-xs text-muted-foreground">
                                                    <span className="truncate">{attachment.name}</span>
                                                    <div className="flex items-center gap-1">
                                                      <span className="shrink-0 pl-2">{formatFileSize(attachment.size)}</span>
                                                      <Button
                                                          variant="ghost"
                                                          size="icon"
                                                          className="h-6 w-6 rounded-full opacity-0 transition-opacity group-hover/attachment:opacity-100"
                                                          onClick={() => window.open(attachment.preview, '_blank')}
                                                      >
                                                        <Download className="h-3 w-3" />
                                                      </Button>
                                                    </div>
                                                  </figcaption>
                                                </figure>
                                            ))}
                                          </div>
                                      )}

                                      {/* Actions for assistant */}
                                      {!isUser && (
                                          <MessageActions
                                              className={cn(
                                                  "-ml-1.5 flex gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100",
                                                  (isLatestAssistant || isStreaming) && "opacity-100"
                                              )}
                                          >
                                            <MessageAction tooltip={copiedMessageId === message.id ? "Copied" : "Copy message"} delayDuration={100}>
                                              <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  className={cn("rounded-full", copiedMessageId === message.id && "bg-emerald-500/10 text-emerald-400")}
                                                  onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    handleCopy(message);
                                                  }}
                                                  aria-label={copiedMessageId === message.id ? "Message copied" : "Copy message"}
                                              >
                                                {copiedMessageId === message.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                              </Button>
                                            </MessageAction>

                                            <MessageAction tooltip={message.reaction === "upvote" ? "Remove like" : "Mark response as helpful"} delayDuration={100}>
                                              <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  className={cn("rounded-full", message.reaction === "upvote" && "bg-primary/10 text-primary")}
                                                  onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    toggleReaction(message.id, "upvote");
                                                  }}
                                                  aria-pressed={message.reaction === "upvote"}
                                                  aria-label="Mark response as helpful"
                                              >
                                                <ThumbsUp className="h-4 w-4" />
                                              </Button>
                                            </MessageAction>

                                            <MessageAction tooltip={message.reaction === "downvote" ? "Remove dislike" : "Mark response as not helpful"} delayDuration={100}>
                                              <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  className={cn("rounded-full", message.reaction === "downvote" && "bg-destructive/10 text-destructive")}
                                                  onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    toggleReaction(message.id, "downvote");
                                                  }}
                                                  aria-pressed={message.reaction === "downvote"}
                                                  aria-label="Mark response as not helpful"
                                              >
                                                <ThumbsDown className="h-4 w-4" />
                                              </Button>
                                            </MessageAction>
                                          </MessageActions>
                                      )}
                                    </div>
                                  </div>
                                </Message>
                            );
                          })
                      )}

                      {/* Typing indicator */}
                      {isGenerating && streamingMessageId === null && (
                          <div className="flex justify-start">
                            <div className="flex max-w-[38rem] flex-col gap-2 items-start">
                              <div className="flex items-center gap-2">
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground text-xs font-medium">
                                  <Bot className="h-3 w-3" />
                                </div>
                                <span className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                            Ollama
                          </span>
                              </div>
                              <TypingIndicator />
                            </div>
                          </div>
                      )}

                      <ChatContainerScrollAnchor />
                    </ChatContainerContent>
                )}

                <div className="pointer-events-none absolute bottom-4 right-4">
                  <ScrollButton className="pointer-events-auto shadow-md" />
                </div>
              </ChatContainerRoot>
            </div>

            {/* Input */}
            <PromptInput
                value={input}
                onValueChange={setInput}
                onSubmit={handleSubmit}
                isLoading={isGenerating}
                className="mt-6 mb-4 border-border/90 bg-card/80 backdrop-blur transition-all duration-200"
                disabled={isGenerating}
            >
              <div className="flex flex-col gap-3">
                {composerAttachments.length > 0 && (
                    <div className="space-y-2 animate-in fade-in duration-200">
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                        Attachments ({composerAttachments.length})
                      </p>
                      <div className="flex flex-wrap gap-3">
                        {composerAttachments.map((attachment) => (
                            <div
                                key={attachment.id}
                                className="relative h-24 w-24 overflow-hidden rounded-xl border border-border bg-muted/40 group/attachment animate-in slide-in-from-left-4 duration-300"
                            >
                              <img src={attachment.preview} alt={attachment.name} className="h-full w-full object-cover transition-transform group-hover/attachment:scale-110" />
                              <button
                                  type="button"
                                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white transition-all hover:bg-destructive hover:scale-110"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleRemoveAttachment(attachment.id);
                                  }}
                                  aria-label={`Remove ${attachment.name}`}
                              >
                                <X className="h-3 w-3" />
                              </button>
                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1 text-[10px] text-white">
                                <span className="block truncate">{attachment.name}</span>
                                <span className="opacity-70">{formatFileSize(attachment.size)}</span>
                              </div>
                            </div>
                        ))}
                      </div>
                    </div>
                )}

                <div className="relative">
                  <PromptInputTextarea
                      aria-label="Message"
                      placeholder="Message Ollama..."
                      onPaste={handlePasteImages}
                      className="pr-12 min-h-[60px]"
                  />
                  {isGenerating && (
                      <div className="absolute right-3 top-3">
                        <LoadingSpinner size={16} />
                      </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <PromptInputAction tooltip="Attach image" side="top">
                      <Button asChild variant="ghost" size="icon" className="rounded-full">
                        <label className="flex cursor-pointer items-center justify-center transition-all hover:scale-105">
                          <Image className="h-5 w-5" />
                          <span className="sr-only">Attach image</span>
                          <input type="file" accept="image/*" multiple className="sr-only" onChange={handleImageUpload} />
                        </label>
                      </Button>
                    </PromptInputAction>

                    <PromptInputAction tooltip="Clear all attachments" side="top" disabled={composerAttachments.length === 0}>
                      <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="rounded-full"
                          onClick={() => setComposerAttachments([])}
                          disabled={composerAttachments.length === 0}
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </PromptInputAction>
                  </div>

                  <PromptInputActions>
                    <PromptInputAction
                        tooltip={hasPendingInput ? "Send message" : "Type a message to send"}
                        delayDuration={100}
                    >
                      <Button
                          type="button"
                          size="icon"
                          className="rounded-full transition-all hover:scale-105"
                          onClick={handleSubmit}
                          disabled={!hasPendingInput || isGenerating}
                      >
                        {isGenerating ? <LoadingSpinner size={16} /> : <ArrowUp className="h-4 w-4" />}
                      </Button>
                    </PromptInputAction>
                  </PromptInputActions>
                </div>
              </div>
            </PromptInput>
          </div>
        </main>
      </div>
  );
}

export default Chatbot;