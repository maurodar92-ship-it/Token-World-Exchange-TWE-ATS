import React, { useState, useEffect, useMemo } from "react";
import {
  Mail,
  CheckSquare,
  Terminal,
  Send,
  Plus,
  Trash2,
  Pin,
  Tag,
  Copy,
  Check,
  RefreshCw,
  Search,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  FileText,
  User as UserIcon,
  Play,
  Cpu,
  Layers,
  Zap,
  Info,
  Archive,
  ArrowRight,
  Filter,
  Coins,
  Share2,
  Sparkles,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  Database,
} from "lucide-react";
import { User } from "firebase/auth";
import { TokenRecord } from "../types";
import {
  initWorkspaceAuth,
  authenticateWorkspace,
  signInWithGoogleWorkspace,
  logoutWorkspace,
  getWorkspaceAccessToken,
  fetchGmailMessages,
  fetchGmailThreads,
  fetchGmailThreadDetail,
  sendGmailEmail,
  createGmailDraft,
  subscribeToGoogleKeepNotes,
  fetchGoogleKeepNotes,
  saveGoogleKeepNote,
  deleteGoogleKeepNote,
  formatNoteAsTokenDescription,
  importNoteIntoToken,
  formatGmailThreadAsTokenDescription,
  GoogleKeepNote,
  GmailMessageSummary,
  GmailThreadSummary,
  SAMPLE_KEEP_NOTES,
  SAMPLE_GMAIL_MESSAGES,
  SAMPLE_GMAIL_THREADS,
} from "../services/workspaceService";
import {
  PYTHON_CONCURRENT_FUTURES_CODE_EXAMPLES,
  runSimulatedConcurrencyTest,
  ConcurrencyRunResult,
} from "../utils/pythonConcurrentFuturesEngine";

export interface GoogleWorkspaceAndFuturesHubProps {
  tokens?: TokenRecord[];
  onUpdateToken?: (tokenId: string, updates: Partial<TokenRecord>) => void;
  onSelectToken?: (token: TokenRecord) => void;
}

export const GoogleWorkspaceAndFuturesHub: React.FC<GoogleWorkspaceAndFuturesHubProps> = ({
  tokens = [],
  onUpdateToken,
  onSelectToken,
}) => {
  const [activeHubTab, setActiveHubTab] = useState<"gmail" | "keep" | "python_futures">("gmail");

  // =========================================================================
  // AUTH STATE (Google Workspace)
  // =========================================================================
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = initWorkspaceAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
      },
      () => {
        // Logged out or needs fresh token
        setUser(null);
        setToken(null);
      }
    );
    return () => unsub();
  }, []);

  const handleGoogleSignIn = async () => {
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      const res = await authenticateWorkspace();
      setUser(res.user);
      setToken(res.accessToken);
    } catch (err: any) {
      setAuthError(err.message || "Failed to sign in with Google.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logoutWorkspace();
    setUser(null);
    setToken(null);
  };

  // =========================================================================
  // GMAIL TAB STATE (MESSAGES & THREADS)
  // =========================================================================
  const [gmailViewMode, setGmailViewMode] = useState<"threads" | "messages">("threads");
  const [emails, setEmails] = useState<GmailMessageSummary[]>(SAMPLE_GMAIL_MESSAGES);
  const [threads, setThreads] = useState<GmailThreadSummary[]>(SAMPLE_GMAIL_THREADS);
  const [isLoadingEmails, setIsLoadingEmails] = useState<boolean>(false);
  const [emailSearchQuery, setEmailSearchQuery] = useState<string>("in:inbox");
  const [selectedEmail, setSelectedEmail] = useState<GmailMessageSummary | null>(SAMPLE_GMAIL_MESSAGES[0] || null);
  const [selectedThread, setSelectedThread] = useState<GmailThreadSummary | null>(SAMPLE_GMAIL_THREADS[0] || null);
  const [expandedThreadId, setExpandedThreadId] = useState<string | null>(SAMPLE_GMAIL_THREADS[0]?.id || null);
  const [emailNotice, setEmailNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Compose State
  const [isComposing, setIsComposing] = useState<boolean>(false);
  const [composeTo, setComposeTo] = useState<string>("");
  const [composeSubject, setComposeSubject] = useState<string>("");
  const [composeBody, setComposeBody] = useState<string>("");
  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false);

  const loadGmailData = async (query = emailSearchQuery) => {
    setIsLoadingEmails(true);
    setEmailNotice(null);
    try {
      const [messagesList, threadsList] = await Promise.all([
        fetchGmailMessages(query, 12),
        fetchGmailThreads(query, 10),
      ]);
      setEmails(messagesList);
      setThreads(threadsList);
      if (messagesList.length > 0 && !selectedEmail) {
        setSelectedEmail(messagesList[0]);
      }
      if (threadsList.length > 0 && !selectedThread) {
        setSelectedThread(threadsList[0]);
        setExpandedThreadId(threadsList[0].id);
      }
    } catch (err: any) {
      console.warn("Gmail load warning:", err);
      setEmailNotice({ type: "error", text: err.message || "Failed to load Gmail content." });
    } finally {
      setIsLoadingEmails(false);
    }
  };

  useEffect(() => {
    loadGmailData();
  }, [token]);

  const handleSendEmail = async () => {
    if (!composeTo || !composeSubject) {
      setEmailNotice({ type: "error", text: "Please provide recipient and subject." });
      return;
    }
    setIsSendingEmail(true);
    setEmailNotice(null);
    try {
      await sendGmailEmail({
        to: composeTo,
        subject: composeSubject,
        body: composeBody,
      });
      setEmailNotice({ type: "success", text: `Email sent to ${composeTo} successfully!` });
      setIsComposing(false);
      setComposeTo("");
      setComposeSubject("");
      setComposeBody("");
      loadGmailData();
    } catch (err: any) {
      setEmailNotice({ type: "error", text: err.message || "Failed to send email." });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!composeTo && !composeSubject) {
      setEmailNotice({ type: "error", text: "Provide at least a recipient or subject for draft." });
      return;
    }
    try {
      await createGmailDraft({
        to: composeTo,
        subject: composeSubject,
        body: composeBody,
      });
      setEmailNotice({ type: "success", text: "Saved as Gmail draft!" });
      setIsComposing(false);
    } catch (err: any) {
      setEmailNotice({ type: "error", text: err.message || "Failed to save draft." });
    }
  };

  // =========================================================================
  // GOOGLE KEEP STATE (FIRESTORE SYNC)
  // =========================================================================
  const [keepNotes, setKeepNotes] = useState<GoogleKeepNote[]>(SAMPLE_KEEP_NOTES);
  const [noteSearch, setNoteSearch] = useState<string>("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // New Note Composer
  const [newNoteTitle, setNewNoteTitle] = useState<string>("");
  const [newNoteContent, setNewNoteContent] = useState<string>("");
  const [newNoteColor, setNewNoteColor] = useState<string>("#1E1E24");
  const [newNoteTagInput, setNewNoteTagInput] = useState<string>("");
  const [isChecklistMode, setIsChecklistMode] = useState<boolean>(false);
  const [newChecklistItems, setNewChecklistItems] = useState<string[]>([""]);

  useEffect(() => {
    const unsub = subscribeToGoogleKeepNotes((firestoreNotes) => {
      if (firestoreNotes && firestoreNotes.length > 0) {
        setKeepNotes(firestoreNotes);
      }
    });
    return () => unsub();
  }, []);

  const handleCreateNote = async () => {
    if (!newNoteTitle.trim() && !newNoteContent.trim() && newChecklistItems.every((i) => !i.trim())) {
      return;
    }

    const tags = newNoteTagInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const items = isChecklistMode
      ? newChecklistItems
          .filter((i) => i.trim())
          .map((text, idx) => ({
            id: `item-${Date.now()}-${idx}`,
            text,
            completed: false,
          }))
      : [];

    const newNote: GoogleKeepNote = {
      id: `keep-${Date.now()}`,
      title: newNoteTitle.trim() || "Untitled Note",
      content: newNoteContent,
      items,
      color: newNoteColor,
      pinned: false,
      archived: false,
      tags,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId: user?.uid,
      source: "manual",
    };

    // Optimistic local update + Firestore sync
    const updated = [newNote, ...keepNotes];
    setKeepNotes(updated);
    try {
      await saveGoogleKeepNote(newNote);
    } catch (err) {
      console.warn("Could not save to Firestore, stored locally:", err);
    }

    // Reset form
    setNewNoteTitle("");
    setNewNoteContent("");
    setNewNoteTagInput("");
    setNewChecklistItems([""]);
    setIsChecklistMode(false);
  };

  const handleTogglePin = async (note: GoogleKeepNote) => {
    const updated = { ...note, pinned: !note.pinned };
    setKeepNotes((prev) => prev.map((n) => (n.id === note.id ? updated : n)));
    try {
      await saveGoogleKeepNote(updated);
    } catch (e) {
      console.warn(e);
    }
  };

  const handleToggleChecklistItem = async (note: GoogleKeepNote, itemId: string) => {
    if (!note.items) return;
    const updatedItems = note.items.map((item) =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    const updatedNote = { ...note, items: updatedItems };
    setKeepNotes((prev) => prev.map((n) => (n.id === note.id ? updatedNote : n)));
    try {
      await saveGoogleKeepNote(updatedNote);
    } catch (e) {
      console.warn(e);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    setKeepNotes((prev) => prev.filter((n) => n.id !== noteId));
    try {
      await deleteGoogleKeepNote(noteId);
    } catch (e) {
      console.warn(e);
    }
  };

  const handleExportKeepToGmail = (note: GoogleKeepNote) => {
    setActiveHubTab("gmail");
    setIsComposing(true);
    setComposeSubject(`[Keep Note] ${note.title}`);
    let body = note.content;
    if (note.items && note.items.length > 0) {
      body += "\n\nChecklist Items:\n" + note.items.map((i) => `[${i.completed ? "X" : " "}] ${i.text}`).join("\n");
    }
    setComposeBody(body);
  };

  const handleClipEmailToKeep = async (email: GmailMessageSummary) => {
    const newNote: GoogleKeepNote = {
      id: `keep-email-${Date.now()}`,
      title: `✉️ ${email.subject}`,
      content: `From: ${email.from}\nDate: ${email.date}\n\n${email.snippet}`,
      items: [],
      color: "#18202F",
      pinned: true,
      archived: false,
      tags: ["Gmail", "Email-Clip"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: "gmail_clip",
    };
    setKeepNotes([newNote, ...keepNotes]);
    try {
      await saveGoogleKeepNote(newNote);
    } catch (e) {
      console.warn(e);
    }
    setActiveHubTab("keep");
  };

  const handleClipThreadToKeep = async (thread: GmailThreadSummary) => {
    const threadLog = thread.messages
      .map((m) => `[${m.from.split("<")[0].trim()} - ${m.date}]:\n${m.snippet}`)
      .join("\n\n");

    const newNote: GoogleKeepNote = {
      id: `keep-thread-${Date.now()}`,
      title: `💬 Thread: ${thread.subject}`,
      content: `Participants: ${thread.senders.join(", ")}\nLatest: ${thread.latestDate}\n\n${threadLog}`,
      items: thread.messages.map((m, idx) => ({
        id: `t-item-${idx}`,
        text: `Message ${idx + 1} (${m.from.split("<")[0].trim()}): ${m.snippet.slice(0, 70)}...`,
        completed: true,
      })),
      color: "#1B2A32",
      pinned: true,
      archived: false,
      tags: ["Gmail", "Thread", "Audit"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: "gmail_clip",
    };
    setKeepNotes([newNote, ...keepNotes]);
    try {
      await saveGoogleKeepNote(newNote);
    } catch (e) {
      console.warn(e);
    }
    setActiveHubTab("keep");
  };

  // =========================================================================
  // TOKEN DESCRIPTION IMPORT MODAL STATE
  // =========================================================================
  const [importModalNote, setImportModalNote] = useState<GoogleKeepNote | null>(null);
  const [importModalThread, setImportModalThread] = useState<GmailThreadSummary | null>(null);
  const [targetTokenId, setTargetTokenId] = useState<string>("");
  const [importMode, setImportMode] = useState<"replace" | "append">("replace");
  const [tokenSearchFilter, setTokenSearchFilter] = useState<string>("");
  const [syncTagsToToken, setSyncTagsToToken] = useState<boolean>(true);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);

  // Available tokens for import (either passed via props, or default sample token list)
  const availableTokens: TokenRecord[] = useMemo(() => {
    if (tokens && tokens.length > 0) return tokens;
    // Fallback sample tokens if user has not loaded any batch yet
    return [
      {
        id: "tok-dar-1",
        name: "Einstein-Dar Sovereign Reserve",
        symbol: "DAR",
        chain: "ethereum",
        networkId: 1,
        contractAddress: "0x70AcE1837651c6bEbA4A9C1e92dAc16C978D4dE1",
        isVanity: true,
        tokenId: "1",
        tokenStandard: "ERC-20",
        narrative: "quantum_defi",
        launchStatus: "Deployed",
        initialSupply: "1000000000",
        decimals: 18,
        marketCap: 4500000000,
        priceUsd: 4.5,
        liquidityPair: "DAR/USDC",
        holderCount: 1420,
        auditFirm: "CertiK",
        securityScore: 98,
        createdAt: new Date().toISOString(),
        creationTx: "0x89ab...71c2",
        deployerAddress: "0x3e1740d04961d67da91c94d01bfae829377484df",
        quantum_entropy_signature: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        description: "Primary algorithmic liquidity reserve token pegged to multi-chain treasury assets with sovereign multi-sig backing.",
        tags: ["DeFi", "Liquidity", "Sovereign"],
      },
      {
        id: "tok-fossi-2",
        name: "Fossibot Decentralized Telemetry",
        symbol: "FOSSI",
        chain: "base",
        networkId: 8453,
        contractAddress: "0x00F055106967Fa819d4b067aA9e729aE957d19A8",
        isVanity: true,
        tokenId: "2",
        tokenStandard: "ERC-20",
        narrative: "depin",
        launchStatus: "Liquidity Locked",
        initialSupply: "500000000",
        decimals: 18,
        marketCap: 1250000000,
        priceUsd: 2.5,
        liquidityPair: "FOSSI/WETH",
        holderCount: 890,
        auditFirm: "OpenZeppelin",
        securityScore: 95,
        createdAt: new Date().toISOString(),
        creationTx: "0x12cd...89ef",
        deployerAddress: "0x3e1740d04961d67da91c94d01bfae829377484df",
        quantum_entropy_signature: "a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e",
        description: "DePIN hardware telemetry verification token settling micro-transactions across rugged IoT modules.",
        tags: ["DePIN", "Hardware", "Telemetry"],
      },
      {
        id: "tok-tree3-3",
        name: "Tree3 Autonomous Multiverse",
        symbol: "TREE3",
        chain: "arbitrum",
        networkId: 42161,
        contractAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
        isVanity: false,
        tokenId: "3",
        tokenStandard: "ERC-721",
        narrative: "autonomous_worlds",
        launchStatus: "Audited",
        initialSupply: "10000",
        decimals: 0,
        marketCap: 890000000,
        priceUsd: 89.0,
        liquidityPair: "TREE3/ETH",
        holderCount: 520,
        auditFirm: "Trail of Bits",
        securityScore: 94,
        createdAt: new Date().toISOString(),
        creationTx: "0x77aa...22cc",
        deployerAddress: "0x3e1740d04961d67da91c94d01bfae829377484df",
        quantum_entropy_signature: "c4ca4238a0b923820dcc509a6f75849b29c9be55d5be5a242c2d43b22cf9c193",
        description: "Procedural on-chain multiverse assets with mutable DNA state variables.",
        tags: ["Gaming", "NFT", "Multiverse"],
      },
    ];
  }, [tokens]);

  const filteredTokensForImport = useMemo(() => {
    return availableTokens.filter((tok) => {
      const match =
        tok.name.toLowerCase().includes(tokenSearchFilter.toLowerCase()) ||
        tok.symbol.toLowerCase().includes(tokenSearchFilter.toLowerCase()) ||
        tok.contractAddress.toLowerCase().includes(tokenSearchFilter.toLowerCase());
      return match;
    });
  }, [availableTokens, tokenSearchFilter]);

  const selectedTargetToken = useMemo(() => {
    return availableTokens.find((t) => t.id === targetTokenId) || availableTokens[0] || null;
  }, [availableTokens, targetTokenId]);

  const handleOpenImportModalForNote = (note: GoogleKeepNote) => {
    setImportModalNote(note);
    setImportModalThread(null);
    if (!targetTokenId && availableTokens.length > 0) {
      setTargetTokenId(availableTokens[0].id);
    }
  };

  const handleOpenImportModalForThread = (thread: GmailThreadSummary) => {
    setImportModalThread(thread);
    setImportModalNote(null);
    if (!targetTokenId && availableTokens.length > 0) {
      setTargetTokenId(availableTokens[0].id);
    }
  };

  const handleExecuteImportToToken = () => {
    if (!selectedTargetToken) return;

    let updatedDescription = "";
    let updatedTags = selectedTargetToken.tags || [];

    if (importModalNote) {
      const formattedNoteDesc = formatNoteAsTokenDescription(importModalNote, {
        includeTitle: true,
        includeChecklist: true,
        includeTags: true,
      });

      if (importMode === "append" && selectedTargetToken.description) {
        updatedDescription = `${selectedTargetToken.description.trim()}\n\n---\n${formattedNoteDesc}`;
      } else {
        updatedDescription = formattedNoteDesc;
      }

      if (syncTagsToToken && importModalNote.tags) {
        const tagSet = new Set([...updatedTags, ...importModalNote.tags]);
        updatedTags = Array.from(tagSet);
      }

      // Mark the note with the imported token
      const updatedNote: GoogleKeepNote = {
        ...importModalNote,
        importedToTokenId: selectedTargetToken.id,
      };
      setKeepNotes((prev) => prev.map((n) => (n.id === updatedNote.id ? updatedNote : n)));
      saveGoogleKeepNote(updatedNote).catch(console.warn);

      setImportSuccessMessage(
        `Successfully imported note "${importModalNote.title}" into ${selectedTargetToken.name} ($${selectedTargetToken.symbol}) description!`
      );
    } else if (importModalThread) {
      const formattedThreadDesc = formatGmailThreadAsTokenDescription(importModalThread);
      if (importMode === "append" && selectedTargetToken.description) {
        updatedDescription = `${selectedTargetToken.description.trim()}\n\n---\n${formattedThreadDesc}`;
      } else {
        updatedDescription = formattedThreadDesc;
      }

      setImportSuccessMessage(
        `Successfully imported Gmail thread "${importModalThread.subject}" into ${selectedTargetToken.name} ($${selectedTargetToken.symbol}) description!`
      );
    }

    if (onUpdateToken) {
      onUpdateToken(selectedTargetToken.id, {
        description: updatedDescription,
        tags: updatedTags,
        marketEvolutionNote: `Updated with Google Workspace Note on ${new Date().toLocaleDateString()}`,
      });
    }

    // Close modal after brief feedback
    setTimeout(() => {
      setImportModalNote(null);
      setImportModalThread(null);
    }, 1200);

    setTimeout(() => {
      setImportSuccessMessage(null);
    }, 5000);
  };

  // =========================================================================
  // PYTHON CONCURRENT.FUTURES BENCHMARK & SIMULATOR
  // =========================================================================
  const [selectedRecipeKey, setSelectedRecipeKey] = useState<keyof typeof PYTHON_CONCURRENT_FUTURES_CODE_EXAMPLES>("thread_pool_basic");
  const [simExecutorType, setSimExecutorType] = useState<"ThreadPoolExecutor" | "ProcessPoolExecutor">("ThreadPoolExecutor");
  const [simMaxWorkers, setSimMaxWorkers] = useState<number>(4);
  const [simTaskCount, setSimTaskCount] = useState<number>(8);
  const [simTaskType, setSimTaskType] = useState<"io" | "cpu">("io");
  const [simulateException, setSimulateException] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [benchmarkResult, setBenchmarkResult] = useState<ConcurrencyRunResult>(() =>
    runSimulatedConcurrencyTest({
      executorType: "ThreadPoolExecutor",
      maxWorkers: 4,
      taskCount: 8,
      taskType: "io",
    })
  );

  const handleRunBenchmark = () => {
    const res = runSimulatedConcurrencyTest({
      executorType: simExecutorType,
      maxWorkers: simMaxWorkers,
      taskCount: simTaskCount,
      taskType: simTaskType,
      simulateFailureOnIndex: simulateException ? 2 : undefined,
    });
    setBenchmarkResult(res);
  };

  const handleCopyCode = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const allTags = Array.from(new Set(keepNotes.flatMap((n) => n.tags)));
  const filteredNotes = keepNotes.filter((note) => {
    const matchesSearch =
      note.title.toLowerCase().includes(noteSearch.toLowerCase()) ||
      note.content.toLowerCase().includes(noteSearch.toLowerCase());
    const matchesTag = selectedTag ? note.tags.includes(selectedTag) : true;
    return matchesSearch && matchesTag;
  });

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20">
      {/* Top Banner / Hero */}
      <div className="bg-[#121217] border border-[#22222D] rounded-2xl p-6 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-orange-500/10 via-red-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                Google Workspace & Concurrency Suite
              </span>
              <span className="px-2.5 py-0.5 rounded text-[11px] font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Gmail Threads API • Keep Firestore • Token Description Importer
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Google Workspace (Gmail & Keep) & Python Futures Engine
            </h1>
            <p className="text-gray-400 text-xs sm:text-sm max-w-3xl leading-relaxed">
              Authenticate authorized Workspace OAuth scopes, inspect multi-message Gmail discussion threads, synchronize Google Keep notes to Firestore, and <strong>import operational task notes directly as on-chain token descriptions</strong> with 1-click tokenomics formatting.
            </p>
          </div>

          {/* User Sign-In Action Bar (Official GSI Spec) */}
          <div className="shrink-0 flex flex-col items-end gap-2">
            {user ? (
              <div className="flex items-center gap-3 p-2.5 bg-[#181822] border border-[#262635] rounded-xl">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || "User"} className="w-8 h-8 rounded-full border border-orange-400/40" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold text-xs">
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}
                <div className="text-left">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    {user.displayName || user.email}
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div className="text-[10px] text-gray-400 font-mono truncate max-w-[160px]">{user.email}</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="ml-2 px-2.5 py-1 text-xs text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 rounded-lg border border-rose-500/30 transition cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-end gap-2">
                <button
                  onClick={handleGoogleSignIn}
                  disabled={isLoggingIn}
                  className="gsi-material-button flex items-center gap-2.5 px-4 py-2 bg-white hover:bg-gray-100 text-gray-800 rounded-xl font-medium text-xs sm:text-sm shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  </svg>
                  <span>{isLoggingIn ? "Connecting..." : "Sign in with Google"}</span>
                </button>
                <span className="text-[10px] text-gray-400">Authenticates Gmail & Google Keep scopes</span>
              </div>
            )}

            {authError && (
              <div className="text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2.5 py-1 rounded max-w-xs text-right">
                {authError}
              </div>
            )}
          </div>
        </div>

        {/* Global Import Success Banner */}
        {importSuccessMessage && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{importSuccessMessage}</span>
            </div>
            <button
              onClick={() => setImportSuccessMessage(null)}
              className="text-gray-400 hover:text-white text-xs font-bold px-2 py-0.5"
            >
              ✕
            </button>
          </div>
        )}

        {/* Subtabs Bar */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-[#1E1E26] overflow-x-auto">
          {[
            { id: "gmail", label: "📧 1. Gmail Workspace Client & Threads", icon: Mail, count: threads.length },
            { id: "keep", label: "📝 2. Google Keep Notes & Token Importer", icon: CheckSquare, count: keepNotes.length },
            { id: "python_futures", label: "🐍 3. Python concurrent.futures Studio", icon: Terminal },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeHubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveHubTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition cursor-pointer ${
                  isActive
                    ? "bg-[#F27D26] text-white shadow-md shadow-orange-500/20"
                    : "bg-[#181822] text-gray-300 hover:bg-[#20202C] hover:text-white border border-[#2B2B38]"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${isActive ? "bg-white/20 text-white" : "bg-[#252533] text-gray-400"}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: GMAIL WORKSPACE CLIENT & THREADS */}
      {/* ===================================================================== */}
      {activeHubTab === "gmail" && (
        <div className="space-y-6">
          {/* Email notice message */}
          {emailNotice && (
            <div
              className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
                emailNotice.type === "success"
                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                  : "bg-rose-500/15 border-rose-500/30 text-rose-300"
              }`}
            >
              <span>{emailNotice.text}</span>
              <button onClick={() => setEmailNotice(null)} className="text-gray-400 hover:text-white font-bold text-xs ml-4">
                ✕
              </button>
            </div>
          )}

          {/* Quick Actions & Search Bar */}
          <div className="bg-[#121217] border border-[#22222D] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search Gmail threads or messages (e.g. in:inbox, is:unread, subject:audit)..."
                  value={emailSearchQuery}
                  onChange={(e) => setEmailSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && loadGmailData(emailSearchQuery)}
                  className="w-full bg-[#181822] border border-[#262635] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 font-mono focus:outline-none focus:border-orange-500/50"
                />
              </div>
              <button
                onClick={() => loadGmailData(emailSearchQuery)}
                disabled={isLoadingEmails}
                className="px-3.5 py-2 bg-[#181822] hover:bg-[#232330] border border-[#262635] text-xs text-gray-300 rounded-xl flex items-center gap-1.5 transition disabled:opacity-40 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingEmails ? "animate-spin text-orange-400" : ""}`} />
                Search
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center bg-[#181822] p-1 rounded-xl border border-[#262635]">
                <button
                  onClick={() => setGmailViewMode("threads")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                    gmailViewMode === "threads"
                      ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Threads ({threads.length})
                </button>
                <button
                  onClick={() => setGmailViewMode("messages")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                    gmailViewMode === "messages"
                      ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  Messages ({emails.length})
                </button>
              </div>

              <button
                onClick={() => setIsComposing(true)}
                className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-orange-500/20 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Compose
              </button>
            </div>
          </div>

          {/* MAIN GMAIL VIEW SPLIT */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Thread / Message List (Col 5) */}
            <div className="lg:col-span-5 bg-[#121217] border border-[#22222D] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#1E1E26]">
                <span className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                  {gmailViewMode === "threads" ? (
                    <>
                      <MessageSquare className="w-3.5 h-3.5 text-orange-400" />
                      Gmail Threads Stream
                    </>
                  ) : (
                    <>
                      <Mail className="w-3.5 h-3.5 text-orange-400" />
                      Individual Messages
                    </>
                  )}
                </span>
                <span className="text-[11px] text-gray-500 font-mono">
                  {gmailViewMode === "threads" ? `${threads.length} Threads` : `${emails.length} Messages`}
                </span>
              </div>

              {isLoadingEmails ? (
                <div className="p-8 text-center space-y-2">
                  <RefreshCw className="w-6 h-6 text-orange-400 animate-spin mx-auto" />
                  <span className="text-xs text-gray-400 font-mono">Fetching data via Gmail API v1...</span>
                </div>
              ) : gmailViewMode === "threads" ? (
                <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                  {threads.map((th) => {
                    const isSelected = selectedThread?.id === th.id;
                    return (
                      <div
                        key={th.id}
                        onClick={() => {
                          setSelectedThread(th);
                          setExpandedThreadId(th.id);
                        }}
                        className={`p-3.5 rounded-xl border text-left transition cursor-pointer space-y-1.5 ${
                          isSelected
                            ? "bg-[#1B1B26] border-orange-500/50 shadow-md"
                            : "bg-[#14141B] border-[#22222D] hover:border-gray-600 hover:bg-[#181822]"
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="font-semibold text-gray-300 truncate max-w-[200px]">
                            {th.senders.join(", ")}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 font-mono">
                              {th.messagesCount} msg
                            </span>
                            <span className="text-[10px] text-gray-500 font-mono">{th.latestDate}</span>
                          </div>
                        </div>

                        <div className={`text-xs font-bold leading-tight ${th.unread ? "text-white" : "text-gray-300"}`}>
                          {th.subject || "(No Subject)"}
                        </div>

                        <p className="text-[11px] text-gray-400 line-clamp-1">{th.snippet}</p>

                        <div className="flex items-center justify-between pt-1">
                          <div className="flex items-center gap-1.5">
                            {th.unread && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">
                                NEW
                              </span>
                            )}
                            {th.starred && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                ★ STARRED
                              </span>
                            )}
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenImportModalForThread(th);
                            }}
                            className="text-[10px] text-orange-400 hover:text-orange-300 bg-orange-500/10 hover:bg-orange-500/20 px-2 py-0.5 rounded border border-orange-500/20 flex items-center gap-1"
                            title="Import thread into Token Description"
                          >
                            <Coins className="w-3 h-3" />
                            Import to Token
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                  {emails.map((msg) => {
                    const isSelected = selectedEmail?.id === msg.id;
                    return (
                      <div
                        key={msg.id}
                        onClick={() => setSelectedEmail(msg)}
                        className={`p-3.5 rounded-xl border text-left transition cursor-pointer space-y-1.5 ${
                          isSelected
                            ? "bg-[#1B1B26] border-orange-500/50 shadow-md"
                            : "bg-[#14141B] border-[#22222D] hover:border-gray-600 hover:bg-[#181822]"
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-gray-300 truncate max-w-[200px]">{msg.from}</span>
                          <span className="text-[10px] text-gray-500 font-mono">{msg.date}</span>
                        </div>
                        <div className={`text-xs font-bold leading-tight ${msg.unread ? "text-white" : "text-gray-300"}`}>
                          {msg.subject || "(No Subject)"}
                        </div>
                        <p className="text-[11px] text-gray-400 line-clamp-1">{msg.snippet}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Email / Thread Detail Panel (Col 7) */}
            <div className="lg:col-span-7 bg-[#121217] border border-[#22222D] rounded-xl p-5 space-y-4">
              {gmailViewMode === "threads" && selectedThread ? (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-[#1E1E26]">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-orange-500/20 text-orange-400 border border-orange-500/30">
                          {selectedThread.messagesCount} Message Thread
                        </span>
                        <span className="text-xs text-gray-500">ID: {selectedThread.id}</span>
                      </div>
                      <h2 className="text-base sm:text-lg font-bold text-white leading-snug mt-1">
                        {selectedThread.subject}
                      </h2>
                      <div className="text-xs text-gray-400 mt-1 flex flex-col gap-0.5">
                        <div>
                          <span className="text-gray-500">Participants:</span>{" "}
                          <span className="text-orange-300 font-mono">{selectedThread.senders.join(", ")}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Last activity:</span>{" "}
                          <span className="text-gray-300">{selectedThread.latestDate}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <button
                        onClick={() => handleOpenImportModalForThread(selectedThread)}
                        className="px-3 py-1.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-md shadow-orange-500/20 transition cursor-pointer"
                        title="Import thread into Token Description"
                      >
                        <Coins className="w-3.5 h-3.5" />
                        Import as Token Desc
                      </button>
                      <button
                        onClick={() => handleClipThreadToKeep(selectedThread)}
                        className="px-3 py-1.5 bg-[#181822] hover:bg-[#232330] border border-[#262635] text-xs text-amber-400 hover:text-amber-300 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                        title="Clip entire thread to Google Keep"
                      >
                        <CheckSquare className="w-3.5 h-3.5" />
                        Clip Thread to Keep
                      </button>
                    </div>
                  </div>

                  {/* Thread messages list */}
                  <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                    {selectedThread.messages.length > 0 ? (
                      selectedThread.messages.map((m, idx) => (
                        <div key={m.id || idx} className="p-4 bg-[#0D0D11] border border-[#1C1C24] rounded-xl space-y-2">
                          <div className="flex items-center justify-between text-xs pb-1.5 border-b border-white/5">
                            <span className="font-bold text-orange-300 font-mono">{m.from}</span>
                            <span className="text-gray-500 text-[11px]">{m.date}</span>
                          </div>
                          <div className="text-xs sm:text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                            {m.snippet}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 bg-[#0D0D11] border border-[#1C1C24] rounded-xl text-xs text-gray-300">
                        {selectedThread.snippet}
                      </div>
                    )}
                  </div>
                </div>
              ) : selectedEmail ? (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-[#1E1E26]">
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-white leading-snug">{selectedEmail.subject}</h2>
                      <div className="text-xs text-gray-400 mt-1 flex flex-col gap-0.5">
                        <div>
                          <span className="text-gray-500">From:</span>{" "}
                          <span className="text-orange-300 font-mono">{selectedEmail.from}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">To:</span> <span className="text-gray-300 font-mono">{selectedEmail.to}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Date:</span> <span className="text-gray-300">{selectedEmail.date}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleClipEmailToKeep(selectedEmail)}
                        className="px-3 py-1.5 bg-[#181822] hover:bg-[#232330] border border-[#262635] text-xs text-amber-400 hover:text-amber-300 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                        title="Save to Google Keep"
                      >
                        <CheckSquare className="w-3.5 h-3.5" />
                        Clip to Keep
                      </button>
                      <button
                        onClick={() => {
                          setIsComposing(true);
                          setComposeTo(selectedEmail.from.match(/<([^>]+)>/)?.[1] || selectedEmail.from);
                          setComposeSubject(`Re: ${selectedEmail.subject}`);
                          setComposeBody(`\n\n--- On ${selectedEmail.date}, ${selectedEmail.from} wrote:\n> ${selectedEmail.snippet}`);
                        }}
                        className="px-3 py-1.5 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 text-xs text-orange-300 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Reply
                      </button>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 bg-[#0D0D11] border border-[#1C1C24] rounded-xl text-xs sm:text-sm text-gray-300 leading-relaxed font-sans whitespace-pre-wrap min-h-[220px]">
                    {selectedEmail.snippet || "(No content in preview)"}
                  </div>

                  {/* Labels Tag Row */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-2">
                    <span className="text-[11px] text-gray-500 font-mono">Labels:</span>
                    {selectedEmail.labelIds.map((lbl) => (
                      <span key={lbl} className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#181822] border border-[#262635] text-gray-400">
                        {lbl}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-16 text-center text-xs text-gray-500 space-y-2">
                  <Mail className="w-10 h-10 text-gray-700 mx-auto" />
                  <p>Select a thread or message to view content.</p>
                </div>
              )}
            </div>
          </div>

          {/* Compose Email Modal / Slide-out */}
          {isComposing && (
            <div className="p-6 bg-[#121217] border border-orange-500/30 rounded-2xl space-y-4 shadow-2xl relative">
              <div className="flex items-center justify-between pb-3 border-b border-[#1E1E26]">
                <span className="text-sm font-bold text-white flex items-center gap-2">
                  <Send className="w-4 h-4 text-orange-400" />
                  New Gmail Message
                </span>
                <button onClick={() => setIsComposing(false)} className="text-gray-400 hover:text-white text-xs font-bold">
                  ✕ Close
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Recipient (To:)</label>
                  <input
                    type="email"
                    placeholder="recipient@example.com"
                    value={composeTo}
                    onChange={(e) => setComposeTo(e.target.value)}
                    className="w-full bg-[#181822] border border-[#262635] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 font-mono focus:outline-none focus:border-orange-500/50"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400 block mb-1">Subject</label>
                  <input
                    type="text"
                    placeholder="Subject line..."
                    value={composeSubject}
                    onChange={(e) => setComposeSubject(e.target.value)}
                    className="w-full bg-[#181822] border border-[#262635] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 font-mono focus:outline-none focus:border-orange-500/50"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400 block mb-1">Email Body</label>
                  <textarea
                    rows={6}
                    placeholder="Compose message..."
                    value={composeBody}
                    onChange={(e) => setComposeBody(e.target.value)}
                    className="w-full bg-[#181822] border border-[#262635] rounded-xl p-3 text-xs text-white placeholder-gray-500 font-sans focus:outline-none focus:border-orange-500/50"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={handleSaveDraft}
                  className="px-3.5 py-2 bg-[#181822] hover:bg-[#222230] text-gray-300 text-xs font-semibold rounded-xl border border-[#262635] transition cursor-pointer"
                >
                  Save as Draft
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSendEmail}
                    disabled={isSendingEmail}
                    className="px-5 py-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-orange-500/20 transition cursor-pointer disabled:opacity-50 flex items-center gap-2"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {isSendingEmail ? "Sending..." : "Send Message"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: GOOGLE KEEP NOTES & TOKEN IMPORTER */}
      {/* ===================================================================== */}
      {activeHubTab === "keep" && (
        <div className="space-y-6">
          {/* Keep New Note Creator Banner */}
          <div className="bg-[#121217] border border-[#22222D] rounded-2xl p-5 space-y-3 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-[#1E1E26]">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4" />
                Google Keep Quick Note & Token Spec Creator
              </span>
              <span className="text-[11px] text-gray-500 font-mono">
                Persisted in Firestore &bull; Real-time Sync
              </span>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="Title (e.g. ⚡ Tokenomics & Buyback Specification)..."
                value={newNoteTitle}
                onChange={(e) => setNewNoteTitle(e.target.value)}
                className="w-full bg-[#181822] border border-[#262635] rounded-xl px-3 py-2 text-xs sm:text-sm font-bold text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
              />

              {isChecklistMode ? (
                <div className="space-y-2 p-3 bg-[#0D0D11] border border-[#1E1E26] rounded-xl">
                  <span className="text-[11px] font-mono text-gray-400">Checklist Items:</span>
                  {newChecklistItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded border border-gray-600 flex items-center justify-center text-[10px] text-gray-500">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        placeholder={`Milestone or specification item #${idx + 1}...`}
                        value={item}
                        onChange={(e) => {
                          const updated = [...newChecklistItems];
                          updated[idx] = e.target.value;
                          setNewChecklistItems(updated);
                        }}
                        className="flex-1 bg-[#181822] border border-[#262635] rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                  ))}
                  <button
                    onClick={() => setNewChecklistItems([...newChecklistItems, ""])}
                    className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-mono pt-1 cursor-pointer"
                  >
                    + Add item
                  </button>
                </div>
              ) : (
                <textarea
                  rows={3}
                  placeholder="Take a note or write token narrative / deliverables..."
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  className="w-full bg-[#181822] border border-[#262635] rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
                />
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[#1E1E26]">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsChecklistMode(!isChecklistMode)}
                    className={`px-2.5 py-1 text-xs rounded-lg border font-mono transition cursor-pointer ${
                      isChecklistMode
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/30 font-bold"
                        : "bg-[#181822] text-gray-400 border-[#262635] hover:text-white"
                    }`}
                  >
                    ☑️ {isChecklistMode ? "Checklist Mode Active" : "Convert to Checklist"}
                  </button>

                  <input
                    type="text"
                    placeholder="Tags (comma separated)..."
                    value={newNoteTagInput}
                    onChange={(e) => setNewNoteTagInput(e.target.value)}
                    className="bg-[#181822] border border-[#262635] rounded-lg px-2.5 py-1 text-xs text-gray-300 placeholder-gray-500 font-mono w-44"
                  />
                </div>

                <button
                  onClick={handleCreateNote}
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
                >
                  Save to Keep
                </button>
              </div>
            </div>
          </div>

          {/* Filter & Tag Row */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-400 font-mono flex items-center gap-1">
                <Tag className="w-3.5 h-3.5" /> Filter:
              </span>
              <button
                onClick={() => setSelectedTag(null)}
                className={`px-2.5 py-1 text-xs rounded-lg font-mono transition cursor-pointer ${
                  selectedTag === null ? "bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40" : "bg-[#181822] text-gray-400 border border-[#262635]"
                }`}
              >
                All ({keepNotes.length})
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                  className={`px-2.5 py-1 text-xs rounded-lg font-mono transition cursor-pointer ${
                    selectedTag === tag ? "bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40" : "bg-[#181822] text-gray-400 border border-[#262635]"
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>

            <div className="relative w-56">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search notes..."
                value={noteSearch}
                onChange={(e) => setNoteSearch(e.target.value)}
                className="w-full bg-[#181822] border border-[#262635] rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-gray-500 font-mono"
              />
            </div>
          </div>

          {/* Notes Grid Display */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNotes.map((note) => {
              const linkedToken = availableTokens.find((t) => t.id === note.importedToTokenId);
              return (
                <div
                  key={note.id}
                  className="p-5 rounded-2xl border border-[#2A2A38] bg-[#14141B] space-y-3 relative group transition hover:border-amber-500/40 shadow-lg flex flex-col justify-between"
                  style={{ backgroundColor: note.color || "#14141B" }}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-white text-sm leading-snug">{note.title}</h3>
                        {linkedToken && (
                          <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                            Imported to ${linkedToken.symbol}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleTogglePin(note)}
                          className={`p-1 rounded hover:bg-white/10 transition cursor-pointer ${note.pinned ? "text-amber-400" : "text-gray-500"}`}
                          title={note.pinned ? "Unpin note" : "Pin note"}
                        >
                          <Pin className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="p-1 rounded hover:bg-rose-500/20 text-gray-500 hover:text-rose-400 transition cursor-pointer"
                          title="Delete note"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {note.content && (
                      <p className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">{note.content}</p>
                    )}

                    {note.items && note.items.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        {note.items.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => handleToggleChecklistItem(note, item.id)}
                            className="flex items-center gap-2 text-xs cursor-pointer select-none"
                          >
                            <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[10px] ${item.completed ? "bg-emerald-500/20 border-emerald-500 text-emerald-400" : "border-gray-500 text-transparent"}`}>
                              ✓
                            </span>
                            <span className={item.completed ? "line-through text-gray-500" : "text-gray-200"}>
                              {item.text}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-white/5 space-y-2.5">
                    {note.tags && note.tags.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {note.tags.map((t) => (
                          <span key={t} className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/30 text-amber-300/80 border border-amber-500/20">
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Action Bar for Note: Import as Token Description + Export to Gmail */}
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
                      <button
                        onClick={() => handleOpenImportModalForNote(note)}
                        className="px-2.5 py-1 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border border-orange-500/40 text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer"
                        title="Import this note directly as an ERC-20 / NFT token description"
                      >
                        <Coins className="w-3.5 h-3.5 text-orange-400" />
                        Import as Token Desc
                      </button>

                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-gray-500 font-mono">
                          {new Date(note.updatedAt).toLocaleDateString()}
                        </span>
                        <button
                          onClick={() => handleExportKeepToGmail(note)}
                          className="text-amber-400 hover:text-amber-300 font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                        >
                          Email <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* IMPORT NOTE / THREAD INTO TOKEN DESCRIPTION MODAL */}
      {/* ===================================================================== */}
      {(importModalNote || importModalThread) && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121217] border border-orange-500/40 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E1E26]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">
                    Import to Token Description
                  </h3>
                  <p className="text-xs text-gray-400">
                    Convert Google Workspace note/thread into structured Web3 token narrative & roadmap status.
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setImportModalNote(null);
                  setImportModalThread(null);
                }}
                className="text-gray-400 hover:text-white text-xs font-bold px-2 py-1"
              >
                ✕ Close
              </button>
            </div>

            {/* Source Item Overview */}
            <div className="p-4 bg-[#181822] border border-[#282836] rounded-xl space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-orange-400 font-bold block">
                Source Document:
              </span>
              <div className="font-bold text-sm text-white">
                {importModalNote ? importModalNote.title : importModalThread?.subject}
              </div>
              <div className="text-xs text-gray-300 line-clamp-3">
                {importModalNote
                  ? importModalNote.content || `${importModalNote.items?.length || 0} checklist items`
                  : importModalThread?.snippet}
              </div>
              {importModalNote?.items && importModalNote.items.length > 0 && (
                <div className="text-[11px] text-gray-400 font-mono">
                  Contains {importModalNote.items.length} milestone checklist items (will be included as audited roadmap items).
                </div>
              )}
            </div>

            {/* Target Token Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-300 block">
                Target Token to Update:
              </label>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search token by name, symbol, or address..."
                  value={tokenSearchFilter}
                  onChange={(e) => setTokenSearchFilter(e.target.value)}
                  className="w-full bg-[#181822] border border-[#282836] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 font-mono mb-2 focus:outline-none focus:border-orange-500/50"
                />
              </div>

              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {filteredTokensForImport.map((tok) => {
                  const isSelected = selectedTargetToken?.id === tok.id;
                  return (
                    <div
                      key={tok.id}
                      onClick={() => setTargetTokenId(tok.id)}
                      className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition text-xs ${
                        isSelected
                          ? "bg-orange-500/15 border-orange-500/50 text-white font-semibold"
                          : "bg-[#14141B] border-[#22222D] text-gray-300 hover:bg-[#1A1A24]"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-bold text-orange-400 font-mono">${tok.symbol}</span>
                        <span className="truncate">{tok.name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-gray-400">
                          {tok.chain}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {tok.description && (
                          <span className="text-[10px] text-gray-500 italic">Has Description</span>
                        )}
                        <span className="text-xs text-orange-400 font-bold">{isSelected ? "✓ Selected" : "Select"}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mode & Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-gray-400 font-mono block">Import Mode:</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setImportMode("replace")}
                    className={`flex-1 py-1.5 px-3 rounded-lg border font-semibold text-center transition cursor-pointer ${
                      importMode === "replace"
                        ? "bg-orange-500/20 text-orange-300 border-orange-500/40"
                        : "bg-[#181822] text-gray-400 border-[#262635]"
                    }`}
                  >
                    Replace Description
                  </button>
                  <button
                    onClick={() => setImportMode("append")}
                    className={`flex-1 py-1.5 px-3 rounded-lg border font-semibold text-center transition cursor-pointer ${
                      importMode === "append"
                        ? "bg-orange-500/20 text-orange-300 border-orange-500/40"
                        : "bg-[#181822] text-gray-400 border-[#262635]"
                    }`}
                  >
                    Append to Existing
                  </button>
                </div>
              </div>

              <div className="flex flex-col justify-end space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-gray-300 select-none">
                  <input
                    type="checkbox"
                    checked={syncTagsToToken}
                    onChange={(e) => setSyncTagsToToken(e.target.checked)}
                    className="rounded border-gray-600 text-orange-500 focus:ring-0"
                  />
                  <span>Sync note tags into token narrative tags</span>
                </label>
              </div>
            </div>

            {/* Formatted Preview Box */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-mono text-gray-400">Formatted Token Description Preview:</span>
              <div className="p-3 bg-[#0A0A0E] border border-[#1E1E28] rounded-xl text-xs font-mono text-gray-300 whitespace-pre-wrap max-h-36 overflow-y-auto leading-relaxed">
                {importModalNote
                  ? formatNoteAsTokenDescription(importModalNote, {
                      includeTitle: true,
                      includeChecklist: true,
                      includeTags: true,
                    })
                  : importModalThread
                  ? formatGmailThreadAsTokenDescription(importModalThread)
                  : ""}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-[#1E1E26]">
              <button
                onClick={() => {
                  setImportModalNote(null);
                  setImportModalThread(null);
                }}
                className="px-4 py-2 bg-[#181822] hover:bg-[#20202C] text-gray-300 text-xs font-semibold rounded-xl border border-[#282836] transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                onClick={handleExecuteImportToToken}
                disabled={!selectedTargetToken}
                className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-orange-500/25 transition cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Confirm & Import into ${selectedTargetToken?.symbol || "TOKEN"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: PYTHON CONCURRENT.FUTURES STUDIO */}
      {/* ===================================================================== */}
      {activeHubTab === "python_futures" && (
        <div className="space-y-6">
          {/* Top Architectural Guide Overview (Mauro Lomibao Dar III) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-[#14141A] border border-[#22222D] rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                <Layers className="w-4 h-4" />
                ThreadPoolExecutor
              </div>
              <p className="text-gray-300 text-xs leading-relaxed">
                Manages a pool of threads. Ideal for <strong>I/O-bound</strong> tasks like Web3 RPC queries, network requests, and disk operations where threads spend time awaiting external latency.
              </p>
            </div>

            <div className="p-4 bg-[#14141A] border border-[#22222D] rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
                <Cpu className="w-4 h-4" />
                ProcessPoolExecutor
              </div>
              <p className="text-gray-300 text-xs leading-relaxed">
                Manages separate OS processes for true multi-core parallel execution. Bypasses Python’s <strong>Global Interpreter Lock (GIL)</strong> for CPU-bound cryptography & hashing.
              </p>
            </div>

            <div className="p-4 bg-[#14141A] border border-[#22222D] rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                <Zap className="w-4 h-4" />
                as_completed & wait()
              </div>
              <p className="text-gray-300 text-xs leading-relaxed">
                <code className="text-emerald-300 font-mono">as_completed()</code> streams resolved Future instances as they finish. <code className="text-emerald-300 font-mono">wait(FIRST_COMPLETED)</code> enables ultra-fast failover across redundant relays.
              </p>
            </div>
          </div>

          {/* Interactive Concurrency Benchmark Runner */}
          <div className="bg-[#121217] border border-[#22222D] rounded-2xl p-6 space-y-5 shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1E1E26]">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Play className="w-4 h-4 text-orange-400" />
                  Live Concurrent Benchmark Simulator
                </h3>
                <p className="text-xs text-gray-400">
                  Simulate async worker pool execution, task scheduling, exception handling, and speedup benchmarks.
                </p>
              </div>

              <button
                onClick={handleRunBenchmark}
                className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-orange-500/20 transition cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                Run Benchmark
              </button>
            </div>

            {/* Config Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-gray-400 font-mono">Executor Type:</label>
                <select
                  value={simExecutorType}
                  onChange={(e) => setSimExecutorType(e.target.value as any)}
                  className="w-full bg-[#181822] border border-[#262635] rounded-xl px-3 py-2 text-white font-mono focus:outline-none"
                >
                  <option value="ThreadPoolExecutor">ThreadPoolExecutor (I/O Threads)</option>
                  <option value="ProcessPoolExecutor">ProcessPoolExecutor (CPU Multi-core)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-gray-400 font-mono">Max Workers Pool ({simMaxWorkers}):</label>
                <input
                  type="range"
                  min={1}
                  max={16}
                  value={simMaxWorkers}
                  onChange={(e) => setSimMaxWorkers(Number(e.target.value))}
                  className="w-full accent-orange-500 cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-gray-400 font-mono">Task Count ({simTaskCount}):</label>
                <input
                  type="range"
                  min={2}
                  max={32}
                  value={simTaskCount}
                  onChange={(e) => setSimTaskCount(Number(e.target.value))}
                  className="w-full accent-orange-500 cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-gray-400 font-mono">Task Type:</label>
                <select
                  value={simTaskType}
                  onChange={(e) => setSimTaskType(e.target.value as any)}
                  className="w-full bg-[#181822] border border-[#262635] rounded-xl px-3 py-2 text-white font-mono focus:outline-none"
                >
                  <option value="io">I/O Bound (RPC, Network Latency)</option>
                  <option value="cpu">CPU Bound (Keccak Hashing, Math)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-300 select-none">
                <input
                  type="checkbox"
                  checked={simulateException}
                  onChange={(e) => setSimulateException(e.target.checked)}
                  className="rounded border-gray-600 text-orange-500 focus:ring-0"
                />
                <span>Simulate Future Exception &amp; Graceful Error Handling</span>
              </label>
            </div>

            {/* Results Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3 bg-[#181822] border border-[#262635] rounded-xl text-center">
                <div className="text-[10px] text-gray-400 font-mono uppercase">Sequential Estimate</div>
                <div className="text-sm sm:text-base font-bold text-gray-300 font-mono">
                  {benchmarkResult.sequentialTimeSec.toFixed(2)} s
                </div>
              </div>

              <div className="p-3 bg-[#181822] border border-orange-500/30 rounded-xl text-center">
                <div className="text-[10px] text-orange-400 font-mono uppercase">Parallel Wall Time</div>
                <div className="text-sm sm:text-base font-bold text-orange-300 font-mono">
                  {benchmarkResult.executionTimeSec.toFixed(2)} s
                </div>
              </div>

              <div className="p-3 bg-[#181822] border border-emerald-500/30 rounded-xl text-center">
                <div className="text-[10px] text-emerald-400 font-mono uppercase">Theoretical Speedup</div>
                <div className="text-sm sm:text-base font-bold text-emerald-300 font-mono">
                  {benchmarkResult.speedupFactor.toFixed(2)}x
                </div>
              </div>

              <div className="p-3 bg-[#181822] border border-[#262635] rounded-xl text-center">
                <div className="text-[10px] text-gray-400 font-mono uppercase">GIL Bypass Status</div>
                <div className="text-sm sm:text-base font-bold text-cyan-400 font-mono">
                  {simExecutorType === "ProcessPoolExecutor" ? "GIL Bypassed (Multi-core)" : "Thread-level (GIL Active)"}
                </div>
              </div>
            </div>

            {/* Visual Task Execution Stream */}
            <div className="space-y-2 pt-2">
              <span className="text-xs text-gray-400 font-mono">Worker Task Timeline Log:</span>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {benchmarkResult.tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`p-2 rounded-lg text-xs font-mono flex items-center justify-between border ${
                      task.status === "FAILED"
                        ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                        : "bg-[#181822] border-[#262635] text-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${task.status === "FAILED" ? "bg-rose-500" : "bg-emerald-400"}`} />
                      <span className="font-bold">{task.name}</span>
                      <span className="text-gray-500">[{task.workerId ? `Worker ${task.workerId}` : "Queued"}]</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span>{task.durationMs.toFixed(0)} ms</span>
                      <span className="text-gray-400 truncate max-w-xs">{task.result || task.error}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Code Recipes Navigator */}
          <div className="bg-[#121217] border border-[#22222D] rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1E1E26]">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-orange-400" />
                  Official concurrent.futures Blueprint Recipes (Mauro Lomibao Dar III)
                </h3>
                <p className="text-xs text-gray-400">
                  Executable, copy-ready Python concurrency patterns from the manual.
                </p>
              </div>

              <button
                onClick={() => handleCopyCode(PYTHON_CONCURRENT_FUTURES_CODE_EXAMPLES[selectedRecipeKey] || "", selectedRecipeKey)}
                className="px-3.5 py-1.5 bg-[#181822] hover:bg-[#232330] border border-[#262635] text-xs text-gray-300 rounded-xl flex items-center gap-1.5 transition cursor-pointer self-start sm:self-auto"
              >
                {copiedKey === selectedRecipeKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-orange-400" />}
                {copiedKey === selectedRecipeKey ? "Copied!" : "Copy Code"}
              </button>
            </div>

            {/* Recipe Selection Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {(Object.keys(PYTHON_CONCURRENT_FUTURES_CODE_EXAMPLES) as Array<keyof typeof PYTHON_CONCURRENT_FUTURES_CODE_EXAMPLES>).map((key) => {
                const label = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
                const isSelected = selectedRecipeKey === key;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedRecipeKey(key)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer border ${
                      isSelected
                        ? "bg-orange-500/20 text-orange-400 border-orange-500/40"
                        : "bg-[#181822] text-gray-400 border-[#262635] hover:text-white"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Code Display */}
            <div className="space-y-3">
              <div className="relative">
                <pre className="p-4 bg-[#0A0A0E] border border-[#1E1E28] rounded-xl text-xs font-mono text-gray-200 overflow-x-auto leading-relaxed max-h-96">
                  <code>{PYTHON_CONCURRENT_FUTURES_CODE_EXAMPLES[selectedRecipeKey]}</code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
