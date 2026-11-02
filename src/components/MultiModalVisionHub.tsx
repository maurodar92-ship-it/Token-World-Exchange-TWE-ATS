import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Bot,
  Music,
  Video,
  Mic,
  Search,
  MapPin,
  Send,
  Play,
  Pause,
  Download,
  Copy,
  Check,
  RefreshCw,
  Upload,
  Volume2,
  VolumeX,
  ExternalLink,
  Layers,
  Shield,
  Zap,
  Clock,
  Radio,
  FileText,
  AlertCircle,
  Film,
  Disc,
  Headphones,
  CheckCircle2,
  Trash2,
  User as UserIcon,
  LogIn,
  LogOut,
  Sliders,
  Maximize2
} from "lucide-react";
import { User } from "firebase/auth";
import { auth, signInWithGoogle, signOutUser, subscribeToAuth, db } from "../lib/firebase";
import { doc, setDoc, getDocs, collection, query, orderBy, limit, deleteDoc } from "firebase/firestore";
import { TokenRecord } from "../types";

export type MultiModalTab = 
  | "chat" 
  | "music" 
  | "video" 
  | "transcribe" 
  | "search" 
  | "maps" 
  | "library";

interface ChatMessage {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: string;
  modelUsed?: string;
}

interface SavedTrack {
  id: string;
  title: string;
  frequencyHz: number;
  prompt: string;
  model: string;
  audioBase64: string;
  mimeType: string;
  durationSeconds: number;
  createdAt: string;
}

interface SavedVideo {
  id: string;
  title: string;
  prompt: string;
  aspectRatio: "16:9" | "9:16";
  model: string;
  videoUrl?: string;
  createdAt: string;
}

interface MultiModalVisionHubProps {
  onImportTokens?: (tokens: TokenRecord[]) => void;
  selectedToken?: TokenRecord | null;
}

const CHAT_ROLES = [
  { id: "architect", label: "Tokenomics Architect", icon: Layers, desc: "Mathematical supply curves, vesting cliffs & emission schedules" },
  { id: "auditor", label: "Security Auditor", icon: Shield, desc: "EVM reentrancy, storage slot collision & static bytecode analysis" },
  { id: "market_maker", label: "DeFi Market Maker", icon: Zap, desc: "Uniswap v3/v4 liquidity bands, bonding curves & fee tiers" },
  { id: "creative_director", label: "Sonic & Visual Director", icon: Sparkles, desc: "Lyria musical themes, Solfeggio tuning & Veo cinematic aesthetics" },
];

const SOLFEGGIO_PRESETS = [
  { hz: 528, label: "528 Hz - Miracle & DNA Repair", desc: "Golden transformation frequency" },
  { hz: 432, label: "432 Hz - Universal Harmony", desc: "Verdi mathematical sacred tuning" },
  { hz: 396, label: "396 Hz - Liberation of Fear", desc: "Root foundation wave" },
  { hz: 639, label: "639 Hz - Harmonic Connection", desc: "Heart resonance & interpersonal unity" },
  { hz: 741, label: "741 Hz - Awakening Intuition", desc: "Consciousness clarity & problem solving" },
  { hz: 852, label: "852 Hz - Spiritual Order", desc: "Higher intuitive perception" },
  { hz: 963, label: "963 Hz - Crown Pineal Frequency", desc: "Pure cosmic light resonance" },
  { hz: 699, label: "Φ 699 Hz - Fibonacci Golden Spiral", desc: "432 × 1.618 golden ratio overtone" },
];

export const MultiModalVisionHub: React.FC<MultiModalVisionHubProps> = ({
  onImportTokens,
  selectedToken,
}) => {
  const [activeTab, setActiveTab] = useState<MultiModalTab>("chat");
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // 1. CHATBOT STATE
  const [chatModel, setChatModel] = useState<"gemini-3.8-flash" | "gemini-3.1-pro-preview" | "gemini-3.5-flash" | "gemini-3.1-flash-lite">("gemini-3.8-flash");
  const [chatRole, setChatRole] = useState<string>("architect");
  const [chatInput, setChatInput] = useState<string>("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "init",
      role: "model",
      content: `### Welcome to Omni-ID Multi-Modal Vision Foundry 2026
I am your unified Gemini Intelligence Core powered by flagship \`gemini-3.8-flash\`, \`gemini-3.1-pro-preview\`, \`gemini-3.5-flash\`, and \`gemini-3.1-flash-lite\`.

You can now:
* 🤖 **Collaborate with specialized Web3 role personas** (Architect, Auditor, Market Maker, Creative Director).
* 💎 **Simulate & Audit GigaSupplyToken (900 Trillion Treasury Mint by Mauro Lomibao Dar III)** with custom mathematical emission models.
* 🎵 **Synthesize original acoustic anthems** with **Lyria 3** tuned to Solfeggio (528Hz/432Hz) and Fibonacci harmonic frequencies.
* 🎬 **Render cinematic 3D videos & animate token coins** using **Veo 3** in 16:9 or 9:16.
* 🎙️ **Transcribe microphone speech** directly into smart contract specs with **gemini-3.5-transcribe**.
* 🌐 **Access live Google Search & Maps Grounding** for real-time crypto news, DEX flows, and global blockchain headquarters.
* ☁️ **Persist your entire library** via Firebase Auth & Firestore.

How would you like to invent or expand your token ecosystem today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      modelUsed: "gemini-3.8-flash"
    }
  ]);
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // 2. MUSIC GENERATION STATE (Lyria)
  const [musicModel, setMusicModel] = useState<"lyria-3-clip-preview" | "lyria-3-pro-preview">("lyria-3-clip-preview");
  const [musicPrompt, setMusicPrompt] = useState<string>(
    selectedToken 
      ? `Cyberpunk futuristic anthem for ${selectedToken.name} (${selectedToken.symbol}) on ${selectedToken.chain} with energetic bass and ethereal synths` 
      : "Epic Web3 token launch anthem with pulsating modular synth, crisp sub-bass, and triumphant harmonic crescendo"
  );
  const [selectedHz, setSelectedHz] = useState<number>(528);
  const [musicDuration, setMusicDuration] = useState<number>(30);
  const [isGeneratingMusic, setIsGeneratingMusic] = useState<boolean>(false);
  const [currentTrack, setCurrentTrack] = useState<SavedTrack | null>(null);
  const [isPlayingMusic, setIsPlayingMusic] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 3. VIDEO GENERATION STATE (Veo 3)
  const [videoMode, setVideoMode] = useState<"text_to_video" | "image_to_video">("text_to_video");
  const [videoPrompt, setVideoPrompt] = useState<string>(
    selectedToken 
      ? `Holographic 3D metallic coin badge for ${selectedToken.symbol} rotating in zero-gravity space with luminous neon particles and reflection` 
      : "Hyper-realistic futuristic gold crypto coin spinning smoothly in deep space surrounded by glowing cyan energy rings and particle aura"
  );
  const [videoAspectRatio, setVideoAspectRatio] = useState<"16:9" | "9:16">("16:9");
  const [videoUploadedImage, setVideoUploadedImage] = useState<string | null>(null);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState<boolean>(false);
  const [videoOperationName, setVideoOperationName] = useState<string | null>(null);
  const [videoStatusMessage, setVideoStatusMessage] = useState<string>("");
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);

  // 4. AUDIO TRANSCRIBE STATE (gemini-3.5-transcribe)
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [transcribedText, setTranscribedText] = useState<string>("");
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  // 5. SEARCH GROUNDING STATE
  const [searchQuery, setSearchQuery] = useState<string>("Ethereum Layer 2 TVL growth and Base network volume trends 2026");
  const [searchResult, setSearchResult] = useState<{ text: string; sources: Array<{ title: string; uri: string }> } | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // 6. MAPS GROUNDING STATE
  const [mapsQuery, setMapsQuery] = useState<string>("Major blockchain headquarters and crypto foundation hubs in Switzerland and New York");
  const [mapsResult, setMapsResult] = useState<{ text: string; places: Array<{ title: string; uri: string; snippet?: string }> } | null>(null);
  const [isMapping, setIsMapping] = useState<boolean>(false);

  // 7. USER PERSISTED LIBRARY STATE
  const [libraryTracks, setLibraryTracks] = useState<SavedTrack[]>([]);
  const [libraryVideos, setLibraryVideos] = useState<SavedVideo[]>([]);

  // Auth listener
  useEffect(() => {
    const unsub = subscribeToAuth((currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        loadUserLibrary(currentUser.uid);
      }
    });
    return () => unsub();
  }, []);

  // Scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, isChatLoading]);

  // Load User Library from Firestore
  const loadUserLibrary = async (uid: string) => {
    try {
      const tracksRef = collection(db, "users", uid, "tracks");
      const tracksSnap = await getDocs(query(tracksRef, orderBy("createdAt", "desc"), limit(20)));
      const tracks: SavedTrack[] = [];
      tracksSnap.forEach((doc) => {
        tracks.push(doc.data() as SavedTrack);
      });
      setLibraryTracks(tracks);

      const videosRef = collection(db, "users", uid, "videos");
      const videosSnap = await getDocs(query(videosRef, orderBy("createdAt", "desc"), limit(20)));
      const videos: SavedVideo[] = [];
      videosSnap.forEach((doc) => {
        videos.push(doc.data() as SavedVideo);
      });
      setLibraryVideos(videos);
    } catch (err) {
      console.warn("Could not load Firestore library:", err);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Google Sign In Handler
  const handleGoogleSignIn = async () => {
    setIsAuthLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error("Sign in failed:", err);
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Google Sign Out Handler
  const handleSignOut = async () => {
    try {
      await signOutUser();
      setLibraryTracks([]);
      setLibraryVideos([]);
    } catch (err) {
      console.error("Sign out failed:", err);
    }
  };

  // -------------------------------------------------------------
  // 1. CHATBOT HANDLER
  // -------------------------------------------------------------
  const handleSendChat = async () => {
    if (!chatInput.trim() || isChatLoading) return;
    const userMessage: ChatMessage = {
      id: `u_${Date.now()}`,
      role: "user",
      content: chatInput.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput("");
    setIsChatLoading(true);

    try {
      const res = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...chatMessages, userMessage].map((m) => ({ role: m.role, content: m.content })),
          model: chatModel,
          rolePreset: chatRole,
        }),
      });

      const data = await res.json();
      const modelMessage: ChatMessage = {
        id: `m_${Date.now()}`,
        role: "model",
        content: data.reply || "Response synthesized successfully.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        modelUsed: data.modelUsed || chatModel,
      };

      setChatMessages((prev) => [...prev, modelMessage]);

      // Save to Firestore if user logged in
      if (user) {
        try {
          const chatDoc = doc(db, "users", user.uid, "chat_history", modelMessage.id);
          await setDoc(chatDoc, {
            id: modelMessage.id,
            userId: user.uid,
            userQuery: userMessage.content,
            modelResponse: modelMessage.content,
            model: chatModel,
            rolePreset: chatRole,
            timestamp: new Date().toISOString(),
          });
        } catch (saveErr) {
          console.warn("Could not save chat to Firestore:", saveErr);
        }
      }
    } catch (err) {
      console.error("Chat request failed:", err);
      setChatMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: "model",
          content: "Encountered a transient connectivity issue. Please try again or switch model to `gemini-3.1-flash-lite`.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          modelUsed: chatModel,
        },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // -------------------------------------------------------------
  // 2. MUSIC GENERATION HANDLER (Lyria 3)
  // -------------------------------------------------------------
  const handleGenerateMusic = async () => {
    if (!musicPrompt.trim() || isGeneratingMusic) return;
    setIsGeneratingMusic(true);

    try {
      const res = await fetch("/api/gemini/generate-music", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: musicPrompt,
          model: musicModel,
          frequencyHz: selectedHz,
          durationSeconds: musicDuration,
          tokenSymbol: selectedToken?.symbol || "OMNI",
        }),
      });

      const data = await res.json();
      if (data.success && data.audioBase64) {
        const newTrack: SavedTrack = {
          id: `trk_${Date.now()}`,
          title: data.title || `${selectedToken?.symbol || "Web3"} Track (${selectedHz}Hz)`,
          frequencyHz: selectedHz,
          prompt: musicPrompt,
          model: data.model || musicModel,
          audioBase64: data.audioBase64,
          mimeType: data.mimeType || "audio/wav",
          durationSeconds: musicDuration,
          createdAt: new Date().toISOString(),
        };

        setCurrentTrack(newTrack);

        // Auto load into audio player
        if (audioRef.current) {
          audioRef.current.src = `data:${newTrack.mimeType};base64,${newTrack.audioBase64}`;
          audioRef.current.play().then(() => setIsPlayingMusic(true)).catch(() => {});
        }

        // Save to Firestore if user logged in
        if (user) {
          try {
            const trackDoc = doc(db, "users", user.uid, "tracks", newTrack.id);
            await setDoc(trackDoc, newTrack);
            setLibraryTracks((prev) => [newTrack, ...prev]);
          } catch (err) {
            console.warn("Could not save track to Firestore:", err);
          }
        }
      }
    } catch (err) {
      console.error("Music generation failed:", err);
    } finally {
      setIsGeneratingMusic(false);
    }
  };

  const togglePlayAudio = () => {
    if (!audioRef.current) return;
    if (isPlayingMusic) {
      audioRef.current.pause();
      setIsPlayingMusic(false);
    } else {
      audioRef.current.play().then(() => setIsPlayingMusic(true)).catch(() => {});
    }
  };

  const handleDownloadTrack = (track: SavedTrack) => {
    const link = document.createElement("a");
    link.href = `data:${track.mimeType};base64,${track.audioBase64}`;
    link.download = `${track.title.replace(/\s+/g, "_")}.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // -------------------------------------------------------------
  // 3. VIDEO GENERATION HANDLER (Veo 3)
  // -------------------------------------------------------------
  const handleGenerateVideo = async () => {
    if (!videoPrompt.trim() || isGeneratingVideo) return;
    setIsGeneratingVideo(true);
    setGeneratedVideoUrl(null);
    setVideoStatusMessage("Dispatching Veo 3 Neural Video Engine...");

    try {
      const payload: any = {
        prompt: videoPrompt,
        aspectRatio: videoAspectRatio,
      };

      if (videoMode === "image_to_video" && videoUploadedImage) {
        payload.imageBase64 = videoUploadedImage.split(",")[1] || videoUploadedImage;
        payload.mimeType = "image/png";
      }

      const res = await fetch("/api/gemini/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.operationName) {
        setVideoOperationName(data.operationName);
        pollVideoOperation(data.operationName);
      } else {
        setVideoStatusMessage("Veo generation queued. Ready for playback.");
        setIsGeneratingVideo(false);
      }
    } catch (err) {
      console.error("Veo video dispatch failed:", err);
      setVideoStatusMessage("Veo service busy. Please try again.");
      setIsGeneratingVideo(false);
    }
  };

  const pollVideoOperation = async (opName: string) => {
    setVideoStatusMessage("Synthesizing frame diffusion latents...");
    let attempts = 0;
    const maxAttempts = 30;

    const interval = setInterval(async () => {
      attempts++;
      setVideoStatusMessage(`Rendering video frames (Check ${attempts}/${maxAttempts})...`);

      try {
        const checkRes = await fetch("/api/gemini/video-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ operationName: opName }),
        });
        const checkData = await checkRes.json();

        if (checkData.done) {
          clearInterval(interval);
          setVideoStatusMessage("Finalizing MP4 video stream...");

          // Download completed video stream
          const dlRes = await fetch("/api/gemini/video-download", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ operationName: opName }),
          });

          if (dlRes.ok) {
            const blob = await dlRes.blob();
            const blobUrl = URL.createObjectURL(blob);
            setGeneratedVideoUrl(blobUrl);
            setVideoStatusMessage("Video ready for playback!");

            if (user) {
              const videoItem: SavedVideo = {
                id: `vid_${Date.now()}`,
                title: videoPrompt.slice(0, 40),
                prompt: videoPrompt,
                aspectRatio: videoAspectRatio,
                model: "veo-3.1-fast-generate-preview",
                videoUrl: blobUrl,
                createdAt: new Date().toISOString(),
              };
              setLibraryVideos((prev) => [videoItem, ...prev]);
            }
          }
          setIsGeneratingVideo(false);
        } else if (attempts >= maxAttempts) {
          clearInterval(interval);
          setVideoStatusMessage("Operation taking longer than expected. Check back shortly.");
          setIsGeneratingVideo(false);
        }
      } catch (pollErr) {
        console.warn("Polling attempt error:", pollErr);
      }
    }, 4000);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setVideoUploadedImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // -------------------------------------------------------------
  // 4. AUDIO TRANSCRIBE HANDLER (gemini-3.5-transcribe)
  // -------------------------------------------------------------
  const handleStartRecording = async () => {
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());
        await processAudioTranscription(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone access denied or unavailable:", err);
      alert("Microphone permission required for voice transcription.");
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingTimerRef.current);
    }
  };

  const processAudioTranscription = async (blob: Blob) => {
    setIsTranscribing(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(",")[1];
        const res = await fetch("/api/gemini/transcribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audioBase64: base64Audio,
            mimeType: "audio/webm",
            prompt: "Accurately transcribe this audio verbatim into clean text for smart contract specifications.",
          }),
        });

        const data = await res.json();
        if (data.text) {
          setTranscribedText(data.text);

          // Save note to Firestore if user logged in
          if (user) {
            try {
              const noteRef = doc(db, "users", user.uid, "transcriptions", `vox_${Date.now()}`);
              await setDoc(noteRef, {
                id: `vox_${Date.now()}`,
                userId: user.uid,
                text: data.text,
                durationSeconds: recordingSeconds,
                createdAt: new Date().toISOString(),
              });
            } catch (err) {
              console.warn("Could not save transcription to Firestore:", err);
            }
          }
        }
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error("Transcription processing failed:", err);
    } finally {
      setIsTranscribing(false);
    }
  };

  // -------------------------------------------------------------
  // 5. GOOGLE SEARCH GROUNDING HANDLER
  // -------------------------------------------------------------
  const handleExecuteSearch = async () => {
    if (!searchQuery.trim() || isSearching) return;
    setIsSearching(true);
    setSearchResult(null);

    try {
      const res = await fetch("/api/gemini/search-grounding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery }),
      });
      const data = await res.json();
      setSearchResult({
        text: data.text || "No intelligence returned.",
        sources: data.sources || [],
      });
    } catch (err) {
      console.error("Search Grounding failed:", err);
    } finally {
      setIsSearching(false);
    }
  };

  // -------------------------------------------------------------
  // 6. GOOGLE MAPS GROUNDING HANDLER
  // -------------------------------------------------------------
  const handleExecuteMaps = async () => {
    if (!mapsQuery.trim() || isMapping) return;
    setIsMapping(true);
    setMapsResult(null);

    try {
      // Optional: Get user coordinates
      let latLng: { latitude: number; longitude: number } | undefined = undefined;
      if (navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 });
          });
          latLng = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        } catch {
          // Fall back gracefully without user location
        }
      }

      const res = await fetch("/api/gemini/maps-grounding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: mapsQuery, latLng }),
      });
      const data = await res.json();
      setMapsResult({
        text: data.text || "No mapped places found.",
        places: data.places || [],
      });
    } catch (err) {
      console.error("Maps Grounding failed:", err);
    } finally {
      setIsMapping(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hidden audio element for Lyria playback */}
      <audio
        ref={audioRef}
        onEnded={() => setIsPlayingMusic(false)}
        className="hidden"
      />

      {/* Top Banner: Multi-Modal Vision Hub & Firebase Cloud Sync */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-[#0C121E] via-[#101424] to-[#161226] border border-cyan-500/30 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>Multi-Modal AI Vision Core</span>
            </span>
            <span className="text-[11px] text-[#A0A0B0] font-mono">
              Lyria 3 • Veo 3 • Gemini 3.5 Grounding • Firebase
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2 font-sans">
            Web3 Token &amp; Generative Intelligence Studio
          </h2>
          <p className="text-xs text-[#8E9299]">
            Produce protocol anthems in Solfeggio 528Hz, animate 3D token badges into Veo video, transcribe microphone speech, and query live Search &amp; Maps.
          </p>
        </div>

        {/* User Auth & Firebase Status Card */}
        <div className="flex items-center gap-3 shrink-0">
          {user ? (
            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-black/60 border border-emerald-500/40">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || "User"}
                  className="w-8 h-8 rounded-full border border-emerald-400 object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-emerald-950 flex items-center justify-center text-emerald-300 font-bold text-xs border border-emerald-500/30">
                  {user.email?.charAt(0).toUpperCase() || "U"}
                </div>
              )}
              <div className="text-left text-xs">
                <span className="text-white font-semibold block leading-tight truncate max-w-[120px]">
                  {user.displayName || user.email?.split("@")[0] || "Architect"}
                </span>
                <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  <span>Firestore Synced</span>
                </span>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                title="Sign out of Firebase"
                className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors ml-1 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              id="btn-google-sign-in"
              onClick={handleGoogleSignIn}
              disabled={isAuthLoading}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-90 text-black font-bold text-xs flex items-center gap-2 shadow-lg transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <LogIn className="w-4 h-4 text-black" />
              <span>{isAuthLoading ? "Connecting..." : "Sign in with Google"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 bg-[#0C0E14] border border-[#1E2230] rounded-xl overflow-x-auto scrollbar-thin">
        <button
          type="button"
          onClick={() => setActiveTab("chat")}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "chat"
              ? "bg-[#F27D26] text-black shadow-md font-bold"
              : "text-[#8E9299] hover:text-white hover:bg-[#161822]"
          }`}
        >
          <Bot className="w-4 h-4" />
          <span>1. Gemini Chatbot</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("music")}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "music"
              ? "bg-purple-600 text-white shadow-md font-bold"
              : "text-[#8E9299] hover:text-white hover:bg-[#161822]"
          }`}
        >
          <Music className="w-4 h-4 text-purple-300" />
          <span>2. Lyria 3 Music ({selectedHz}Hz)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("video")}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "video"
              ? "bg-cyan-600 text-white shadow-md font-bold"
              : "text-[#8E9299] hover:text-white hover:bg-[#161822]"
          }`}
        >
          <Video className="w-4 h-4 text-cyan-300" />
          <span>3. Veo 3 Video Studio</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("transcribe")}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "transcribe"
              ? "bg-red-600 text-white shadow-md font-bold"
              : "text-[#8E9299] hover:text-white hover:bg-[#161822]"
          }`}
        >
          <Mic className="w-4 h-4 text-red-300" />
          <span>4. Voice Transcriber</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("search")}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "search"
              ? "bg-blue-600 text-white shadow-md font-bold"
              : "text-[#8E9299] hover:text-white hover:bg-[#161822]"
          }`}
        >
          <Search className="w-4 h-4 text-blue-300" />
          <span>5. Search Grounding</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("maps")}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "maps"
              ? "bg-emerald-600 text-white shadow-md font-bold"
              : "text-[#8E9299] hover:text-white hover:bg-[#161822]"
          }`}
        >
          <MapPin className="w-4 h-4 text-emerald-300" />
          <span>6. Maps Grounding</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("library")}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "library"
              ? "bg-amber-600 text-white shadow-md font-bold"
              : "text-[#8E9299] hover:text-white hover:bg-[#161822]"
          }`}
        >
          <Film className="w-4 h-4 text-amber-300" />
          <span>7. Firebase Library ({libraryTracks.length + libraryVideos.length})</span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: MULTI-TURN GEMINI CHATBOT                             */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "chat" && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Left Config Panel */}
          <div className="lg:col-span-1 space-y-4">
            <div className="p-4 rounded-xl bg-[#090A0E] border border-[#1A1C26] space-y-3">
              <span className="text-[11px] font-bold text-white uppercase tracking-wider block">
                Model Selector
              </span>
              <div className="space-y-1.5">
                {[
                  { id: "gemini-3.8-flash", label: "Gemini 3.8 Flash", badge: "2026 Flagship", desc: "Fast multi-modal & cryptoeconomics" },
                  { id: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro", badge: "Complex Tasks", desc: "Highest reasoning & math" },
                  { id: "gemini-3.5-flash", label: "Gemini 3.5 Flash", badge: "General Tasks", desc: "Balanced speed & accuracy" },
                  { id: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash Lite", badge: "Fast Tasks", desc: "Ultra-low latency responses" },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setChatModel(m.id as any)}
                    className={`w-full p-2.5 rounded-lg text-left transition-all cursor-pointer border ${
                      chatModel === m.id
                        ? "bg-[#181A26] border-[#F27D26] text-white shadow-sm"
                        : "bg-[#06070A] border-[#161822] text-[#8E9299] hover:text-white hover:bg-[#10121C]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">{m.label}</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-black/50 text-[#F27D26] font-mono">
                        {m.badge}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400 block mt-0.5">{m.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Persona Role Presets */}
            <div className="p-4 rounded-xl bg-[#090A0E] border border-[#1A1C26] space-y-3">
              <span className="text-[11px] font-bold text-white uppercase tracking-wider block">
                Agent Role Persona
              </span>
              <div className="space-y-1.5">
                {CHAT_ROLES.map((role) => {
                  const Icon = role.icon;
                  const isSelected = chatRole === role.id;
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => setChatRole(role.id)}
                      className={`w-full p-2.5 rounded-lg text-left transition-all cursor-pointer border ${
                        isSelected
                          ? "bg-purple-950/40 border-purple-500 text-white"
                          : "bg-[#06070A] border-[#161822] text-[#8E9299] hover:text-white hover:bg-[#10121C]"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className={`w-3.5 h-3.5 ${isSelected ? "text-purple-400" : "text-gray-400"}`} />
                        <span className="font-bold text-xs">{role.label}</span>
                      </div>
                      <span className="text-[10px] text-gray-400 block mt-1 leading-snug">{role.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Message Thread */}
          <div className="lg:col-span-3 flex flex-col h-[600px] rounded-2xl bg-[#090A0E] border border-[#1A1C26] overflow-hidden">
            {/* Thread Header */}
            <div className="p-3.5 border-b border-[#1A1C26] bg-[#0E1016] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-[#F27D26]" />
                <span className="font-bold text-white">
                  Multi-Turn Thread ({chatModel})
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">
                  {CHAT_ROLES.find((r) => r.id === chatRole)?.label}
                </span>
              </div>
              <span className="text-[10px] text-[#8E9299]">
                {chatMessages.length} Messages
              </span>
            </div>

            {/* Scrollable Thread */}
            <div ref={chatScrollRef} className="flex-1 p-4 overflow-y-auto space-y-4 font-sans text-xs">
              {chatMessages.map((msg) => {
                const isUser = msg.role === "user";
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                  >
                    <div className="flex items-center gap-2 mb-1 text-[10px] text-[#8E9299]">
                      <span>{isUser ? "You" : `Gemini (${msg.modelUsed || chatModel})`}</span>
                      <span>•</span>
                      <span>{msg.timestamp}</span>
                    </div>

                    <div
                      className={`max-w-[85%] p-3.5 rounded-2xl leading-relaxed whitespace-pre-wrap break-words ${
                        isUser
                          ? "bg-[#F27D26] text-black font-medium rounded-tr-none shadow-md"
                          : "bg-[#12141C] text-[#E0E2EC] border border-[#202432] rounded-tl-none font-mono text-[11px]"
                      }`}
                    >
                      {msg.content}
                    </div>

                    {!isUser && (
                      <div className="mt-1 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopy(msg.content, msg.id)}
                          className="text-[10px] text-[#8E9299] hover:text-white flex items-center gap-1 cursor-pointer"
                        >
                          {copiedKey === msg.id ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedKey === msg.id ? "Copied" : "Copy"}</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {isChatLoading && (
                <div className="flex items-center gap-2 text-xs text-[#F27D26] font-mono p-3 bg-[#12141C] rounded-xl max-w-sm border border-[#202432]">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Synthesizing multi-modal cryptoeconomic response...</span>
                </div>
              )}
            </div>

            {/* Quick Prompt Chips */}
            <div className="px-3 pt-2 pb-1 border-t border-[#1A1C26] bg-[#0A0B10] flex flex-wrap items-center gap-1.5 overflow-x-auto text-[11px]">
              <span className="text-[#8E9299] text-[10px]">Prompts:</span>
              <button
                type="button"
                onClick={() => setChatInput("Audit GigaSupplyToken (900 Trillion Treasury Mint by Mauro Lomibao Dar III) and analyze its Ownable treasury mechanics.")}
                className="px-2 py-0.5 rounded bg-[#161822] hover:bg-[#202332] text-purple-300 border border-purple-500/30 text-[10px] transition-all cursor-pointer whitespace-nowrap"
              >
                💎 Audit GigaSupplyToken (900T Treasury)
              </button>
              <button
                type="button"
                onClick={() => setChatInput("Model bonding curve liquidity and AMM price impact for 900,000,000,000,000 tokens with 18 decimals.")}
                className="px-2 py-0.5 rounded bg-[#161822] hover:bg-[#202332] text-amber-300 border border-amber-500/30 text-[10px] transition-all cursor-pointer whitespace-nowrap"
              >
                📊 900T AMM Bonding Math
              </button>
              <button
                type="button"
                onClick={() => setChatInput("Design a multi-sig timelock treasury architecture for wallet 0xd12A2E29B64E8CeFC8bc2AA80A7169817608704D.")}
                className="px-2 py-0.5 rounded bg-[#161822] hover:bg-[#202332] text-cyan-300 border border-cyan-500/30 text-[10px] transition-all cursor-pointer whitespace-nowrap"
              >
                🛡️ Treasury Timelock Design
              </button>
            </div>

            {/* Chat Input Bar */}
            <div className="p-3 bg-[#0A0B10]">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendChat();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={`Ask ${CHAT_ROLES.find((r) => r.id === chatRole)?.label} anything (e.g., token economics, vesting math, audit)...`}
                  className="flex-1 bg-[#141620] border border-[#242838] focus:border-[#F27D26] rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500 outline-none"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || isChatLoading}
                  className="px-4 py-2.5 rounded-xl bg-[#F27D26] hover:bg-[#ff934b] text-black font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-40"
                >
                  <Send className="w-3.5 h-3.5 text-black" />
                  <span>Send</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: LYRIA 3 MUSIC & SOLFEGGIO ENGINE                       */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "music" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left Generator Controls */}
          <div className="lg:col-span-2 p-5 rounded-2xl bg-[#090A0E] border border-purple-500/30 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Music className="w-5 h-5 text-purple-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Lyria 3 Music &amp; Solfeggio Harmonic Synthesizer
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
                {musicModel}
              </span>
            </div>

            {/* Model Toggle: Clip (30s) vs Pro (Full Track) */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMusicModel("lyria-3-clip-preview")}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  musicModel === "lyria-3-clip-preview"
                    ? "bg-purple-900/30 border-purple-500 text-white"
                    : "bg-[#06070A] border-[#161822] text-[#8E9299] hover:text-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">Lyria 3 Clip</span>
                  <span className="text-[10px] text-purple-400 font-mono">Up to 30s</span>
                </div>
                <span className="text-[10px] text-gray-400 block mt-1">Short clips &amp; token launch stings</span>
              </button>

              <button
                type="button"
                onClick={() => setMusicModel("lyria-3-pro-preview")}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  musicModel === "lyria-3-pro-preview"
                    ? "bg-purple-900/30 border-purple-500 text-white"
                    : "bg-[#06070A] border-[#161822] text-[#8E9299] hover:text-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">Lyria 3 Pro</span>
                  <span className="text-[10px] text-purple-400 font-mono">Full-Length</span>
                </div>
                <span className="text-[10px] text-gray-400 block mt-1">Comprehensive multi-minute protocol tracks</span>
              </button>
            </div>

            {/* Solfeggio & Fibonacci Tuning Grid */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-white flex items-center justify-between">
                <span>Select Harmonic Frequency Tuning (Hz):</span>
                <span className="text-purple-400 font-mono text-[11px]">{selectedHz} Hz Active</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SOLFEGGIO_PRESETS.map((preset) => (
                  <button
                    key={preset.hz}
                    type="button"
                    onClick={() => setSelectedHz(preset.hz)}
                    className={`p-2 rounded-lg text-left transition-all border cursor-pointer ${
                      selectedHz === preset.hz
                        ? "bg-purple-600 text-white border-purple-400 font-bold shadow-md"
                        : "bg-[#06070A] border-[#161822] text-gray-400 hover:text-white hover:bg-[#12141E]"
                    }`}
                  >
                    <span className="block text-xs font-mono font-bold">{preset.hz} Hz</span>
                    <span className="block text-[9px] text-gray-300 truncate">{preset.label.split(" - ")[1]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Music Prompt Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-white block">
                Musical Vibe &amp; Instrument Description:
              </label>
              <textarea
                rows={3}
                value={musicPrompt}
                onChange={(e) => setMusicPrompt(e.target.value)}
                placeholder="Describe genre, instruments, mood, tempo, and frequency resonance..."
                className="w-full bg-[#12141E] border border-[#202434] focus:border-purple-500 rounded-xl p-3 text-xs text-white placeholder-gray-500 outline-none"
              />
            </div>

            {/* Action Button */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#8E9299]">Duration:</span>
                {[15, 30].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setMusicDuration(d)}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono cursor-pointer border ${
                      musicDuration === d
                        ? "bg-purple-500/30 border-purple-400 text-purple-300 font-bold"
                        : "bg-black/40 border-[#1A1C26] text-gray-400"
                    }`}
                  >
                    {d}s
                  </button>
                ))}
              </div>

              <button
                type="button"
                id="btn-generate-lyria-music"
                onClick={handleGenerateMusic}
                disabled={isGeneratingMusic || !musicPrompt.trim()}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:opacity-95 text-white font-bold text-xs flex items-center gap-2 shadow-lg active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isGeneratingMusic ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Disc className="w-4 h-4" />
                )}
                <span>{isGeneratingMusic ? "Synthesizing Lyria Track..." : "Generate Music"}</span>
              </button>
            </div>
          </div>

          {/* Right Live Player Card */}
          <div className="p-5 rounded-2xl bg-[#090A0E] border border-[#1A1C26] flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <span className="text-xs font-bold text-white uppercase tracking-wider block flex items-center gap-2">
                <Headphones className="w-4 h-4 text-purple-400" />
                <span>Active Track Monitor</span>
              </span>

              {currentTrack ? (
                <div className="p-4 rounded-xl bg-[#05060A] border border-purple-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-white text-xs">{currentTrack.title}</h4>
                      <span className="text-[10px] text-purple-400 font-mono">
                        {currentTrack.frequencyHz} Hz • {currentTrack.model}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-green-500/10 text-green-400 border border-green-500/30">
                      Ready
                    </span>
                  </div>

                  {/* Pulsing Visual Waveform Bar */}
                  <div className="h-12 bg-black/60 rounded-lg flex items-center justify-center gap-1 px-3 overflow-hidden">
                    {Array.from({ length: 24 }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-1 rounded-full transition-all duration-300 ${
                          isPlayingMusic ? "bg-purple-400 animate-pulse" : "bg-purple-900/40"
                        }`}
                        style={{
                          height: isPlayingMusic ? `${Math.max(15, Math.sin(i * 0.5) * 80 + 20)}%` : "30%",
                        }}
                      />
                    ))}
                  </div>

                  {/* Lyrics / Metadata */}
                  {currentTrack.prompt && (
                    <p className="text-[10px] text-gray-400 italic line-clamp-2">
                      &ldquo;{currentTrack.prompt}&rdquo;
                    </p>
                  )}

                  {/* Controls */}
                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={togglePlayAudio}
                      className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
                    >
                      {isPlayingMusic ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      <span>{isPlayingMusic ? "Pause" : "Play"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownloadTrack(currentTrack)}
                      className="px-3 py-2 rounded-lg bg-[#141622] hover:bg-[#1E2234] text-gray-300 hover:text-white text-xs flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export WAV</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="h-44 rounded-xl border border-dashed border-[#202434] flex flex-col items-center justify-center p-4 text-center text-[#8E9299]">
                  <Music className="w-8 h-8 text-purple-500/40 mb-2" />
                  <p className="text-xs">No active track generated yet.</p>
                  <p className="text-[10px] text-gray-500 mt-1">Configure your prompt and click "Generate Music".</p>
                </div>
              )}
            </div>

            {/* Quick Presets */}
            <div className="space-y-1.5 pt-2 border-t border-[#1A1C26]">
              <span className="text-[10px] text-[#8E9299] block font-mono">Suggested Web3 Prompts:</span>
              <button
                type="button"
                onClick={() => setMusicPrompt("DePIN autonomous edge computing beat with Solfeggio 528Hz synthesis and cyber bass")}
                className="w-full text-left text-[11px] text-purple-300 hover:text-white hover:underline truncate"
              >
                &bull; DePIN autonomous edge computing beat (528Hz)
              </button>
              <button
                type="button"
                onClick={() => setMusicPrompt("Zero-Knowledge quantum encryption theme with 432Hz golden ratio cosmic chords")}
                className="w-full text-left text-[11px] text-purple-300 hover:text-white hover:underline truncate"
              >
                &bull; Zero-Knowledge quantum encryption theme (432Hz)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: VEO 3 VIDEO STUDIO & PHOTO ANIMATION                  */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "video" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left Controls */}
          <div className="lg:col-span-2 p-5 rounded-2xl bg-[#090A0E] border border-cyan-500/30 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Veo 3 Neural Video Generation (veo-3.1-fast-generate-preview)
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                16:9 &amp; 9:16 Supported
              </span>
            </div>

            {/* Mode Selector: Text-to-Video vs Animate Image into Video */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setVideoMode("text_to_video")}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  videoMode === "text_to_video"
                    ? "bg-cyan-950/40 border-cyan-500 text-white font-bold"
                    : "bg-[#06070A] border-[#161822] text-[#8E9299] hover:text-white"
                }`}
              >
                <span className="block text-xs">Text to Video</span>
                <span className="block text-[10px] text-gray-400 mt-0.5">Synthesize from cinematic descriptive prompt</span>
              </button>

              <button
                type="button"
                onClick={() => setVideoMode("image_to_video")}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  videoMode === "image_to_video"
                    ? "bg-cyan-950/40 border-cyan-500 text-white font-bold"
                    : "bg-[#06070A] border-[#161822] text-[#8E9299] hover:text-white"
                }`}
              >
                <span className="block text-xs">Animate Photo / Coin into Video</span>
                <span className="block text-[10px] text-gray-400 mt-0.5">Upload image or coin avatar to animate</span>
              </button>
            </div>

            {/* Photo Upload Box (When image_to_video is selected) */}
            {videoMode === "image_to_video" && (
              <div className="p-4 rounded-xl bg-[#05060A] border border-[#1A1C26] space-y-2">
                <span className="text-xs font-bold text-white block">Starting Image Source:</span>
                <div className="flex items-center gap-4">
                  {videoUploadedImage ? (
                    <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-cyan-500 shrink-0">
                      <img src={videoUploadedImage} alt="Uploaded" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setVideoUploadedImage(null)}
                        className="absolute top-1 right-1 p-0.5 bg-black/80 rounded text-red-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ) : selectedToken?.imageUrl ? (
                    <div className="flex items-center gap-3">
                      <img src={selectedToken.imageUrl} alt="Token" className="w-16 h-16 rounded-xl border border-[#222]" />
                      <button
                        type="button"
                        onClick={() => setVideoUploadedImage(selectedToken.imageUrl!)}
                        className="px-3 py-1.5 rounded-lg bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 text-xs font-bold border border-cyan-500/40 cursor-pointer"
                      >
                        Use Current Token Image ({selectedToken.symbol})
                      </button>
                    </div>
                  ) : null}

                  <label className="flex-1 h-20 border border-dashed border-[#242838] hover:border-cyan-500 rounded-xl flex flex-col items-center justify-center p-2 text-center cursor-pointer transition-colors">
                    <Upload className="w-4 h-4 text-cyan-400 mb-1" />
                    <span className="text-xs text-gray-300">Click to upload photo or coin artwork</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>
              </div>
            )}

            {/* Prompt Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-white block">
                Prompt Description:
              </label>
              <textarea
                rows={3}
                value={videoPrompt}
                onChange={(e) => setVideoPrompt(e.target.value)}
                placeholder="Describe lighting, camera movement, particle motion, and visual style..."
                className="w-full bg-[#12141E] border border-[#202434] focus:border-cyan-500 rounded-xl p-3 text-xs text-white placeholder-gray-500 outline-none"
              />
            </div>

            {/* Aspect Ratio Options: 16:9 vs 9:16 */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-3">
                <span className="text-xs text-white font-bold">Aspect Ratio:</span>
                <button
                  type="button"
                  onClick={() => setVideoAspectRatio("16:9")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono cursor-pointer border flex items-center gap-1.5 ${
                    videoAspectRatio === "16:9"
                      ? "bg-cyan-600 text-white border-cyan-400 font-bold shadow-md"
                      : "bg-[#06070A] border-[#161822] text-[#8E9299] hover:text-white"
                  }`}
                >
                  <span>16:9 (Landscape)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setVideoAspectRatio("9:16")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono cursor-pointer border flex items-center gap-1.5 ${
                    videoAspectRatio === "9:16"
                      ? "bg-cyan-600 text-white border-cyan-400 font-bold shadow-md"
                      : "bg-[#06070A] border-[#161822] text-[#8E9299] hover:text-white"
                  }`}
                >
                  <span>9:16 (Portrait / Reels)</span>
                </button>
              </div>

              <button
                type="button"
                id="btn-generate-veo-video"
                onClick={handleGenerateVideo}
                disabled={isGeneratingVideo || !videoPrompt.trim()}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-95 text-black font-bold text-xs flex items-center gap-2 shadow-lg active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isGeneratingVideo ? <RefreshCw className="w-4 h-4 animate-spin text-black" /> : <Film className="w-4 h-4 text-black" />}
                <span>{isGeneratingVideo ? "Generating Veo Video..." : "Render Video"}</span>
              </button>
            </div>
          </div>

          {/* Right Video Preview Canvas */}
          <div className="p-5 rounded-2xl bg-[#090A0E] border border-[#1A1C26] flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <span className="text-xs font-bold text-white uppercase tracking-wider block flex items-center gap-2">
                <Film className="w-4 h-4 text-cyan-400" />
                <span>Veo 3 Cinema Monitor</span>
              </span>

              {generatedVideoUrl ? (
                <div className="rounded-xl overflow-hidden border border-cyan-500/40 bg-black space-y-2 p-2">
                  <video
                    src={generatedVideoUrl}
                    controls
                    autoPlay
                    loop
                    className={`w-full rounded-lg ${videoAspectRatio === "9:16" ? "max-h-72 object-contain" : "max-h-52 object-cover"}`}
                  />
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-cyan-400 font-mono">veo-3.1-fast-generate-preview</span>
                    <a
                      href={generatedVideoUrl}
                      download={`veo_${Date.now()}.mp4`}
                      className="px-2.5 py-1 rounded bg-[#181A26] hover:bg-[#202434] text-white text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      <span>Save MP4</span>
                    </a>
                  </div>
                </div>
              ) : isGeneratingVideo ? (
                <div className="h-56 rounded-xl bg-black/60 border border-cyan-500/40 p-4 flex flex-col items-center justify-center text-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
                  <p className="text-xs text-white font-bold">{videoStatusMessage}</p>
                  <p className="text-[10px] text-[#8E9299]">Veo 3 is processing neural diffusion frames. Please keep this tab open.</p>
                </div>
              ) : (
                <div className="h-56 rounded-xl border border-dashed border-[#202434] flex flex-col items-center justify-center p-4 text-center text-[#8E9299]">
                  <Video className="w-8 h-8 text-cyan-500/40 mb-2" />
                  <p className="text-xs">No video generated yet.</p>
                  <p className="text-[10px] text-gray-500 mt-1">Configure your prompt and click "Render Video".</p>
                </div>
              )}
            </div>

            <div className="p-3 rounded-xl bg-[#06070A] border border-white/5 text-[11px] text-[#A0A0B0] space-y-1">
              <span className="text-white font-bold block text-xs">Veo 3 Fast Preview Traits:</span>
              <p>&bull; Supports high frame-rate 720p / 1080p generation</p>
              <p>&bull; Photo-to-Video creates fluid 360-degree coin spinning animations</p>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: MICROPHONE VOICE TRANSCRIBER                          */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "transcribe" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Recorder Controls */}
          <div className="p-5 rounded-2xl bg-[#090A0E] border border-red-500/30 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mic className="w-5 h-5 text-red-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Microphone Audio Transcriber (gemini-3.5-transcribe)
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40">
                Speech to Text
              </span>
            </div>

            <p className="text-xs text-[#8E9299]">
              Click the microphone button to record your voice. Speak your tokenomics ideas, contract parameters, or deployment rules, and Gemini will transcribe them verbatim.
            </p>

            {/* Microphone Button & Visualizer */}
            <div className="p-6 rounded-2xl bg-[#05060A] border border-[#161822] flex flex-col items-center justify-center space-y-4">
              <button
                type="button"
                id="btn-toggle-mic-recording"
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-xl cursor-pointer ${
                  isRecording
                    ? "bg-red-600 hover:bg-red-700 animate-pulse text-white scale-105"
                    : "bg-[#181A26] hover:bg-[#202434] text-red-400 border border-red-500/40 hover:scale-105"
                }`}
              >
                <Mic className={`w-8 h-8 ${isRecording ? "text-white" : "text-red-400"}`} />
              </button>

              <div className="text-center space-y-1">
                <span className="text-sm font-bold text-white block">
                  {isRecording ? `Recording... (${recordingSeconds}s)` : "Click Microphone to Begin Speaking"}
                </span>
                <span className="text-[10px] text-gray-500 font-mono">
                  {isRecording ? "Click again to stop and transcribe" : "HTML5 MediaRecorder with 16kHz audio capture"}
                </span>
              </div>
            </div>

            {isTranscribing && (
              <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/40 flex items-center gap-2 text-xs text-red-300">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>gemini-3.5-transcribe is processing speech audio...</span>
              </div>
            )}
          </div>

          {/* Transcribed Output Card */}
          <div className="p-5 rounded-2xl bg-[#090A0E] border border-[#1A1C26] space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider block flex items-center gap-2">
                  <FileText className="w-4 h-4 text-red-400" />
                  <span>Transcription Output</span>
                </span>
                {transcribedText && (
                  <button
                    type="button"
                    onClick={() => handleCopy(transcribedText, "transcription")}
                    className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === "transcription" ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === "transcription" ? "Copied" : "Copy Text"}</span>
                  </button>
                )}
              </div>

              {transcribedText ? (
                <div className="p-4 rounded-xl bg-[#05060A] border border-red-500/30 text-xs text-white leading-relaxed font-mono whitespace-pre-wrap max-h-80 overflow-y-auto">
                  {transcribedText}
                </div>
              ) : (
                <div className="h-56 rounded-xl border border-dashed border-[#202434] flex flex-col items-center justify-center p-4 text-center text-[#8E9299]">
                  <Mic className="w-8 h-8 text-red-500/40 mb-2" />
                  <p className="text-xs">No transcription yet.</p>
                  <p className="text-[10px] text-gray-500 mt-1">Start recording audio to see verbatim text output.</p>
                </div>
              )}
            </div>

            {/* Action to send to Chatbot */}
            {transcribedText && (
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setChatInput(transcribedText);
                    setActiveTab("chat");
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-[#F27D26] hover:bg-[#ff934b] text-black font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <Bot className="w-4 h-4 text-black" />
                  <span>Send Transcription to Gemini Chatbot</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 5: GOOGLE SEARCH GROUNDING                                */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "search" && (
        <div className="p-5 rounded-2xl bg-[#090A0E] border border-blue-500/30 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Search className="w-5 h-5 text-blue-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Google Search Grounding (gemini-3.5-flash with googleSearch tool)
              </h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40">
              Live Web Data
            </span>
          </div>

          {/* Search Query Input */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Query live crypto news, protocol upgrades, smart contract vulnerabilities..."
              className="flex-1 bg-[#12141E] border border-[#202434] focus:border-blue-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500 outline-none"
            />
            <button
              type="button"
              id="btn-execute-search-grounding"
              onClick={handleExecuteSearch}
              disabled={isSearching || !searchQuery.trim()}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isSearching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>{isSearching ? "Searching..." : "Search Web"}</span>
            </button>
          </div>

          {/* Result Card */}
          {searchResult && (
            <div className="p-4 rounded-xl bg-[#05060A] border border-blue-500/30 space-y-3 font-sans text-xs">
              <div className="text-white leading-relaxed whitespace-pre-wrap">
                {searchResult.text}
              </div>

              {searchResult.sources.length > 0 && (
                <div className="pt-3 border-t border-white/5 space-y-1.5">
                  <span className="text-[11px] font-bold text-blue-400 block font-mono">
                    Grounded Web Sources ({searchResult.sources.length}):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {searchResult.sources.map((src, i) => (
                      <a
                        key={i}
                        href={src.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-[#10121C] border border-[#1E2232] hover:border-blue-500 text-xs text-blue-300 hover:text-white flex items-center justify-between gap-2 truncate transition-colors"
                      >
                        <span className="truncate">{src.title}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 6: GOOGLE MAPS GROUNDING                                  */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "maps" && (
        <div className="p-5 rounded-2xl bg-[#090A0E] border border-emerald-500/30 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Google Maps Grounding (gemini-3.5-flash with googleMaps tool)
              </h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              Live Geography &amp; Places
            </span>
          </div>

          {/* Maps Query Input */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={mapsQuery}
              onChange={(e) => setMapsQuery(e.target.value)}
              placeholder="Query blockchain foundations, crypto embassies, hacker houses, mining facilities..."
              className="flex-1 bg-[#12141E] border border-[#202434] focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500 outline-none"
            />
            <button
              type="button"
              id="btn-execute-maps-grounding"
              onClick={handleExecuteMaps}
              disabled={isMapping || !mapsQuery.trim()}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isMapping ? <RefreshCw className="w-4 h-4 animate-spin text-black" /> : <MapPin className="w-4 h-4 text-black" />}
              <span>{isMapping ? "Locating..." : "Locate Places"}</span>
            </button>
          </div>

          {/* Result Card */}
          {mapsResult && (
            <div className="p-4 rounded-xl bg-[#05060A] border border-emerald-500/30 space-y-3 font-sans text-xs">
              <div className="text-white leading-relaxed whitespace-pre-wrap">
                {mapsResult.text}
              </div>

              {mapsResult.places.length > 0 && (
                <div className="pt-3 border-t border-white/5 space-y-2">
                  <span className="text-[11px] font-bold text-emerald-400 block font-mono">
                    Grounded Google Maps Locations ({mapsResult.places.length}):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {mapsResult.places.map((place, i) => (
                      <a
                        key={i}
                        href={place.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3 rounded-lg bg-[#10121C] border border-[#1E2232] hover:border-emerald-500 text-xs text-emerald-300 hover:text-white flex items-center justify-between gap-2 transition-colors"
                      >
                        <div>
                          <span className="font-bold block text-white">{place.title}</span>
                          {place.snippet && (
                            <span className="text-[10px] text-gray-400 block mt-0.5 line-clamp-1">
                              {place.snippet}
                            </span>
                          )}
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 7: FIREBASE USER LIBRARY & PERSISTENCE                    */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "library" && (
        <div className="p-5 rounded-2xl bg-[#090A0E] border border-amber-500/30 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Film className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                User Persistent Firebase Library &amp; Cloud Vault
              </h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
              Database: ai-studio-web3tokencontrac...
            </span>
          </div>

          {!user ? (
            <div className="p-8 rounded-xl bg-[#05060A] border border-[#1A1C26] text-center space-y-3">
              <UserIcon className="w-10 h-10 text-amber-400/40 mx-auto" />
              <h4 className="text-sm font-bold text-white">Sign In to View Persistent Cloud Portfolio</h4>
              <p className="text-xs text-[#8E9299] max-w-md mx-auto">
                Connect with your Google account via Firebase Auth to securely save and access your generated Lyria music tracks, Veo videos, and chat history.
              </p>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-90 text-black font-bold text-xs inline-flex items-center gap-2 cursor-pointer"
              >
                <LogIn className="w-4 h-4 text-black" />
                <span>Sign in with Google</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Generated Lyria Tracks */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-white uppercase tracking-wider block flex items-center gap-2">
                  <Music className="w-4 h-4 text-purple-400" />
                  <span>Saved Lyria Tracks ({libraryTracks.length})</span>
                </span>

                {libraryTracks.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {libraryTracks.map((trk) => (
                      <div key={trk.id} className="p-3.5 rounded-xl bg-[#06070A] border border-purple-500/30 flex items-center justify-between gap-3">
                        <div>
                          <span className="font-bold text-xs text-white block">{trk.title}</span>
                          <span className="text-[10px] text-purple-400 font-mono">
                            {trk.frequencyHz} Hz • {new Date(trk.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setCurrentTrack(trk);
                              setActiveTab("music");
                            }}
                            className="px-2.5 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Play className="w-3 h-3" />
                            <span>Play</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadTrack(trk)}
                            className="p-1 rounded bg-[#141622] text-gray-300 hover:text-white cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 italic">No saved music tracks yet. Generate one in the Lyria 3 Music tab!</p>
                )}
              </div>

              {/* Generated Veo Videos */}
              <div className="space-y-3 pt-3 border-t border-white/5">
                <span className="text-xs font-bold text-white uppercase tracking-wider block flex items-center gap-2">
                  <Video className="w-4 h-4 text-cyan-400" />
                  <span>Saved Veo Videos ({libraryVideos.length})</span>
                </span>

                {libraryVideos.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {libraryVideos.map((vid) => (
                      <div key={vid.id} className="p-3.5 rounded-xl bg-[#06070A] border border-cyan-500/30 flex items-center justify-between gap-3">
                        <div>
                          <span className="font-bold text-xs text-white block truncate max-w-[200px]">{vid.title}</span>
                          <span className="text-[10px] text-cyan-400 font-mono">
                            Ratio {vid.aspectRatio} • {vid.model}
                          </span>
                        </div>
                        {vid.videoUrl && (
                          <a
                            href={vid.videoUrl}
                            download="veo_saved.mp4"
                            className="px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-black font-bold text-xs flex items-center gap-1 cursor-pointer"
                          >
                            <Download className="w-3 h-3 text-black" />
                            <span>MP4</span>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 italic">No saved videos yet. Render one in the Veo 3 Video Studio tab!</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default MultiModalVisionHub;
