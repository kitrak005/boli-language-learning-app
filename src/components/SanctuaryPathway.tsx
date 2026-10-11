import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Flame, 
  Volume2, 
  VolumeX, 
  BookOpen, 
  Play, 
  Star, 
  Lock, 
  CheckCircle, 
  Compass, 
  Home, 
  Swords, 
  Sparkles, 
  MessageSquare, 
  ChevronDown, 
  LogOut, 
  Trophy, 
  Mic, 
  Zap 
} from 'lucide-react';
import { LanguageTradition, SkillNode } from '../types';
import { sound } from '../utils/audio';

// Rotating array of Lottie URLs across Level Section Headers
const LEVEL_LOTTIE_URLS = [
  'https://lottie.host/0d7d5633-f6ab-45ea-9e32-147ee6188c4f/H4tG63u523.json', // Pink Bear
  'https://lottie.host/1d351d64-6656-4f80-911e-a199736aaff8/QJoxOhulm8.json',
  'https://lottie.host/b4159218-107d-4ada-8232-a64aa9c4f88c/aDxUTzEcrA.json',
  'https://lottie.host/2dfc25b8-6b48-4430-a53a-41537cae2fbe/mkJTflo2BQ.json',
];

// Custom hook to safely load the @dotlottie/player-component web component
export const useLottiePlayer = () => {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (window.customElements && window.customElements.get('dotlottie-player')) {
      setLoaded(true);
      return;
    }

    const existingScript = document.querySelector('script[src*="@dotlottie/player-component"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => setLoaded(true));
      if (window.customElements && window.customElements.get('dotlottie-player')) {
        setLoaded(true);
      }
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@dotlottie/player-component@latest/dist/dotlottie-player.mjs';
    script.type = 'module';
    script.onload = () => setLoaded(true);
    document.head.appendChild(script);
  }, []);

  return loaded;
};

export interface PathwayNodeItem {
  id: string | number;
  type: 'level_header' | 'star' | 'play' | 'book' | 'audio' | 'check';
  title: string;
  subtitle: string;
  tag?: string;
  status?: 'active' | 'completed' | 'locked';
  xp?: number;
  xOffset?: number;
  originalNode?: SkillNode;
}

const DEFAULT_LEVEL_DATA: {
  sectionTitle: string;
  language: string;
  description: string;
  nodes: PathwayNodeItem[];
} = {
  sectionTitle: "SANCTUARY PATHWAY",
  language: "SANSKRIT",
  description: "Language of classical Indian literature, philosophy, and science.",
  nodes: [
    {
      id: "lvl-1",
      type: "level_header",
      title: "LEVEL 1",
      subtitle: "Survival & First Touch",
      tag: "A1.1"
    },
    {
      id: "node-1",
      type: "star",
      title: "At the Food Stall",
      subtitle: "Bhojanam",
      status: "completed",
      xp: 15,
      xOffset: 0
    },
    {
      id: "node-2",
      type: "play",
      title: "My Family",
      subtitle: "Kutumbham",
      status: "active",
      xp: 20,
      xOffset: -30
    },
    {
      id: "node-3",
      type: "book",
      title: "Ancient Wisdom",
      subtitle: "Subhashitani",
      status: "locked",
      xp: 25,
      xOffset: 22
    },
    {
      id: "node-4",
      type: "audio",
      title: "Pronunciation & Chants",
      subtitle: "Uccaranam",
      status: "locked",
      xp: 15,
      xOffset: 44
    },
    {
      id: "lvl-2",
      type: "level_header",
      title: "LEVEL 2",
      subtitle: "Preferences & Choices",
      tag: "A1.2"
    },
    {
      id: "node-5",
      type: "star",
      title: "City Walk",
      subtitle: "Nagara Bhramanam",
      status: "locked",
      xp: 30,
      xOffset: 12
    },
    {
      id: "node-6",
      type: "book",
      title: "Grammar Basics",
      subtitle: "Vyakaranam",
      status: "locked",
      xp: 35,
      xOffset: -36
    },
    {
      id: "node-7",
      type: "audio",
      title: "Listening Mastery",
      subtitle: "Sravanam",
      status: "locked",
      xp: 40,
      xOffset: -16
    }
  ]
};

export interface SanctuaryPathwayProps {
  currentTradition?: LanguageTradition;
  nodes?: SkillNode[];
  onSelectNode?: (node: SkillNode) => void;
  streakCount?: number;
  coinsCount?: number;
  totalXp?: number;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  showTopNav?: boolean;
  onSignOut?: () => void;
  onOpenTraditions?: () => void;
}

export const SanctuaryPathway: React.FC<SanctuaryPathwayProps> = ({
  currentTradition,
  nodes: externalNodes,
  onSelectNode,
  streakCount: initialStreak = 1,
  coinsCount: initialCoins = 240,
  activeTab: controlledActiveTab,
  onTabChange,
  showTopNav = true,
  onSignOut,
  onOpenTraditions,
}) => {
  useLottiePlayer();
  const [internalActiveTab, setInternalActiveTab] = useState('LEARN');
  const currentTab = controlledActiveTab ? controlledActiveTab.toUpperCase() : internalActiveTab;

  const [streakCount] = useState(initialStreak);
  const [coinsCount] = useState(initialCoins);
  const [audioMuted, setAudioMuted] = useState(sound.getIsMuted());

  // DOM element refs for measuring exact coordinates of Level 1 card & all node buttons
  const containerRef = useRef<HTMLDivElement | null>(null);
  const levelCardRefs = useRef<Map<string | number, HTMLDivElement>>(new Map());
  const nodeBtnRefs = useRef<Map<string | number, HTMLButtonElement>>(new Map());

  // Dynamic measured SVG path & container size
  const [svgPathD, setSvgPathD] = useState<string>('');
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ width: 512, height: 1200 });

  const handleToggleAudio = () => {
    const nextMuted = sound.toggleMute();
    setAudioMuted(nextMuted);
    if (!nextMuted) {
      sound.playSuccessChime();
    }
  };

  const handleTabClick = (tabId: string) => {
    sound.playTileClick();
    if (onTabChange) {
      onTabChange(tabId.toLowerCase());
    } else {
      setInternalActiveTab(tabId);
    }
  };

  // Build the list of pathway items
  // If external skill nodes are provided from the app, adapt them into the luxury pathway format
  const pathwayItems: PathwayNodeItem[] = useMemo(() => {
    if (!externalNodes || externalNodes.length === 0) {
      return DEFAULT_LEVEL_DATA.nodes;
    }

    const items: PathwayNodeItem[] = [];
    const groupedByLevel: { [lvl: number]: SkillNode[] } = {};

    externalNodes.forEach((node) => {
      const lvl = node.levelNumber || 1;
      if (!groupedByLevel[lvl]) groupedByLevel[lvl] = [];
      groupedByLevel[lvl].push(node);
    });

    const levelNumbers = Object.keys(groupedByLevel).map(Number).sort((a, b) => a - b);
    const offsets = [0, -30, 24, 44, 12, -36, -16, 28, -22];

    let overallNodeIndex = 0;

    levelNumbers.forEach((lvl) => {
      const levelTitle = `LEVEL ${lvl}`;
      const levelSubtitle =
        lvl === 1 ? 'Survival & First Touch' :
        lvl === 2 ? 'Preferences & Choices' :
        lvl === 3 ? 'Time & Classical Tenses' :
        lvl === 4 ? 'Friction & Conversation' : 'Natural Nuance';

      items.push({
        id: `lvl-header-${lvl}`,
        type: 'level_header',
        title: levelTitle,
        subtitle: levelSubtitle,
        tag: lvl === 1 ? 'A1.1' : lvl === 2 ? 'A1.2' : lvl === 3 ? 'A2.1' : 'B1',
      });

      groupedByLevel[lvl].forEach((node) => {
        const offset = offsets[overallNodeIndex % offsets.length];
        const iconType: PathwayNodeItem['type'] = 
          node.iconType === 'star' ? 'star' :
          node.iconType === 'check' ? 'check' :
          node.iconType === 'play' ? 'play' :
          (overallNodeIndex % 2 === 0 ? 'book' : 'audio');

        items.push({
          id: node.id,
          type: iconType,
          title: node.title,
          subtitle: node.subtitle,
          status: node.status,
          xp: 20 + lvl * 5,
          xOffset: offset,
          originalNode: node,
        });

        overallNodeIndex++;
      });
    });

    return items;
  }, [externalNodes]);

  const headerTitle = currentTradition?.name || DEFAULT_LEVEL_DATA.language;
  const headerDescription = currentTradition?.description || DEFAULT_LEVEL_DATA.description;
  const nativeScript = currentTradition?.nativeScript || "संस्कृतम्";

  // Active node scroll anchor
  const activeNodeRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (activeNodeRef.current) {
      const timer = setTimeout(() => {
        activeNodeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 400);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleNodeClick = (node: PathwayNodeItem) => {
    if (node.status === 'locked') {
      sound.playErrorChime();
      return;
    }
    sound.playTileClick();
    const original = node.originalNode;
    const nodeToSelect = original || ({
      id: String(node.id),
      levelNumber: 1,
      title: node.title,
      subtitle: node.subtitle,
      status: node.status || 'active',
      iconType: 'play',
      alignment: 'center',
      exercises: [],
    } as SkillNode);

    if (onSelectNode) {
      onSelectNode(nodeToSelect);
    }
  };

  // Immediate fallback curve (starts at Level 1 bottom center) before dynamic layout finishes measuring
  const fallbackPathD = useMemo(() => {
    const points: { x: number; y: number }[] = [];
    let currentY = 100;

    // Start directly from the bottom-center of the LEVEL 1 card container
    points.push({ x: 256, y: currentY });

    pathwayItems.forEach((item) => {
      if (item.type === 'level_header') {
        currentY += 100;
        points.push({ x: 256, y: currentY });
      } else {
        currentY += 135;
        const x = 256 + (item.xOffset || 0);
        points.push({ x, y: currentY });
      }
    });

    if (points.length < 2) return '';

    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const midY = (p0.y + p1.y) / 2;
      d += ` C ${p0.x} ${midY}, ${p1.x} ${midY}, ${p1.x} ${p1.y}`;
    }
    return d;
  }, [pathwayItems]);

  // Recalculate dynamic SVG path connecting Level 1 bottom-center to every node's exact center coordinates
  const updateDynamicPath = () => {
    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const width = containerRect.width || 512;
    const height = containerRect.height || 1200;

    setContainerSize({ width, height });

    const points: { x: number; y: number }[] = [];

    // 1. LINE START POINT: Start directly from the bottom-center of the "LEVEL 1" card container
    const firstHeader = pathwayItems.find((item) => item.type === 'level_header');
    if (firstHeader) {
      const level1El = levelCardRefs.current.get(firstHeader.id);
      if (level1El) {
        const rect = level1El.getBoundingClientRect();
        points.push({
          x: rect.left + rect.width / 2 - containerRect.left,
          y: rect.bottom - containerRect.top,
        });
      }
    }

    // 2. FLUID & CONTINUOUS PATH: Pass directly through the exact center coordinates of every node button down the list
    pathwayItems.forEach((item) => {
      if (item.type === 'level_header') {
        // For any subsequent level header, enter top-center and exit bottom-center
        if (firstHeader && item.id !== firstHeader.id) {
          const levelEl = levelCardRefs.current.get(item.id);
          if (levelEl) {
            const rect = levelEl.getBoundingClientRect();
            points.push({
              x: rect.left + rect.width / 2 - containerRect.left,
              y: rect.top - containerRect.top,
            });
            points.push({
              x: rect.left + rect.width / 2 - containerRect.left,
              y: rect.bottom - containerRect.top,
            });
          }
        }
      } else {
        const btnEl = nodeBtnRefs.current.get(item.id);
        if (btnEl) {
          const rect = btnEl.getBoundingClientRect();
          points.push({
            x: rect.left + rect.width / 2 - containerRect.left,
            y: rect.top + rect.height / 2 - containerRect.top,
          });
        }
      }
    });

    if (points.length >= 2) {
      let d = `M ${points[0].x} ${points[0].y}`;
      for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i];
        const p1 = points[i + 1];
        const midY = (p0.y + p1.y) / 2;
        d += ` C ${p0.x} ${midY}, ${p1.x} ${midY}, ${p1.x} ${p1.y}`;
      }
      setSvgPathD(d);
    }
  };

  useEffect(() => {
    updateDynamicPath();

    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      updateDynamicPath();
    });
    resizeObserver.observe(container);

    window.addEventListener('resize', updateDynamicPath);
    const timer = setTimeout(updateDynamicPath, 150);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateDynamicPath);
      clearTimeout(timer);
    };
  }, [pathwayItems]);

  // Track level header count for left/right alternation & cycling Lottie URLs
  let levelHeaderCounter = 0;

  return (
    <div className="min-h-screen bg-[#0A0908] text-[#E5E0D8] font-sans selection:bg-[#D4AF37]/30 selection:text-white flex flex-col overflow-x-hidden relative">
      
      {/* ── TOP NAVIGATION BAR (LUXURY DARK AESTHETIC) ────────────────────────── */}
      {showTopNav && (
        <header className="sticky top-0 z-40 bg-[#0A0908]/95 backdrop-blur-md border-b border-[#2A241D] px-4 lg:px-8 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 sm:gap-4">
            
            {/* Left Brand & Language Switcher */}
            <div className="flex items-center gap-3 sm:gap-4 shrink-0">
              <button 
                onClick={onOpenTraditions}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#3A3125] bg-[#171411] hover:border-[#D4AF37] hover:shadow-[0_0_12px_rgba(212,175,55,0.2)] transition-all duration-300 text-xs tracking-wider uppercase text-[#D4AF37] cursor-pointer"
                title="Switch Language Tradition"
              >
                <BookOpen className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span className="font-medium">{headerTitle}</span>
              </button>

              <div 
                onClick={() => handleTabClick('HOME')}
                className="flex items-center gap-2 cursor-pointer group"
              >
                <span className="font-serif text-xl lg:text-2xl font-extrabold tracking-widest bg-gradient-to-r from-[#F3E5AB] via-[#D4AF37] to-[#AA7C11] bg-clip-text text-transparent group-hover:brightness-110 transition-all">
                  BOLVANI
                </span>
              </div>
            </div>

            {/* Center Main Nav Tabs */}
            <nav className="hidden xl:flex items-center gap-1 bg-[#161310] p-1 rounded-full border border-[#2A241D]">
              {[
                { id: 'HOME', label: 'HOME', icon: Home },
                { id: 'LEARN', label: 'LEARN', icon: Sparkles },
                { id: 'EXPLORE', label: 'EXPLORE', icon: Compass },
                { id: 'PRACTICE', label: 'PRACTICE', icon: Mic },
                { id: 'BATTLE', label: 'BATTLE', icon: Swords },
                { id: 'LEADERBOARD', label: 'LEADERBOARD', icon: Trophy },
                { id: 'ASK_GURU', label: 'ASK GURU', icon: MessageSquare },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = currentTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id)}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wider transition-all duration-300 cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-[#D4AF37] to-[#996515] text-[#0A0908] shadow-[0_0_15px_rgba(212,175,55,0.35)]'
                        : 'text-[#A09585] hover:text-[#E5E0D8] hover:bg-[#221D18]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>

            {/* Right Controls & User Profile */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Audio Toggle */}
              <button 
                onClick={handleToggleAudio}
                className="p-2 rounded-full bg-[#181410] border border-[#2A241D] text-[#A09585] hover:text-[#D4AF37] hover:border-[#D4AF37]/50 transition-all cursor-pointer"
                title={audioMuted ? "Unmute Sound" : "Mute Sound"}
              >
                {audioMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-[#D4AF37]" />}
              </button>

              {/* Language Banner Button with Pulsing Emerald Dot */}
              <button
                onClick={onOpenTraditions}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1A1612] border border-[#3A3023] hover:border-[#D4AF37]/40 text-xs font-medium text-[#E5E0D8] transition-all cursor-pointer"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="font-serif">{nativeScript}</span>
              </button>

              {/* Streak Badge */}
              <div 
                title={`${streakCount} Day Streak`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#241A0E] border border-[#D4AF37]/40 text-[#FF9E2C] font-bold text-xs shadow-[0_0_10px_rgba(255,158,44,0.15)] cursor-default"
              >
                <Flame className="w-4 h-4 fill-[#FF9E2C] animate-bounce" />
                <span>{streakCount}</span>
              </div>

              {/* Coins / XP Counter */}
              <div 
                title={`${coinsCount} Sacred Coins`}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1C1710] border border-[#D4AF37]/30 text-[#D4AF37] font-semibold text-xs shadow-[0_0_8px_rgba(212,175,55,0.1)]"
              >
                <Zap className="w-3.5 h-3.5 text-[#D4AF37] fill-[#D4AF37]" />
                <span>{coinsCount}</span>
              </div>

              {/* Exit/Profile button */}
              {onSignOut && (
                <button 
                  onClick={onSignOut}
                  title="Sign Out"
                  className="p-2 rounded-full bg-[#181410] border border-[#2A241D] text-[#A09585] hover:text-rose-400 hover:border-rose-500/40 transition-all cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </header>
      )}

      {/* ── MAIN SANCTUARY PATHWAY CONTENT ─────────────────────────────────── */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 flex flex-col items-center relative">
        
        {/* Pathway Banner Header */}
        <div className="text-center mb-10 max-w-xl mx-auto space-y-2">
          <span className="text-[10px] sm:text-xs font-bold tracking-[0.3em] uppercase text-[#D4AF37]/80 inline-block px-3 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20">
            SANCTUARY PATHWAY
          </span>
          <h1 className="text-3xl sm:text-5xl font-serif font-bold tracking-wider text-[#F5E6C8] drop-shadow-[0_2px_15px_rgba(212,175,55,0.25)]">
            {headerTitle}
          </h1>
          <p className="text-xs sm:text-sm text-[#A09585] font-light leading-relaxed max-w-md mx-auto">
            {headerDescription}
          </p>
          <ChevronDown className="w-5 h-5 mx-auto text-[#D4AF37]/60 animate-bounce mt-2" />
        </div>

        {/* ── PATHWAY SPINE AND NODES CONTAINER ────────────────────────────── */}
        <div 
          ref={containerRef}
          className="relative w-full max-w-lg flex flex-col items-center py-4"
        >

          {/* ── GLOWING GOLD SVG CURVED CONNECTING PATH (NO straight background lines) ── */}
          <svg 
            className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 overflow-visible" 
            viewBox={`0 0 ${containerSize.width} ${containerSize.height}`}
            style={{ 
              filter: 'drop-shadow(0px 0px 6px rgba(212, 175, 55, 0.5)) drop-shadow(0px 0px 14px rgba(212, 175, 55, 0.25))' 
            }}
          >
            <defs>
              <linearGradient id="goldPathGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FFF5D6" />
                <stop offset="50%" stopColor="#D4AF37" />
                <stop offset="100%" stopColor="#F59E0B" />
              </linearGradient>
            </defs>

            {/* Subtle outer blur glow aura for rich luminescent depth */}
            <path
              d={svgPathD || fallbackPathD}
              fill="none"
              stroke="#D4AF37"
              strokeWidth="7"
              strokeOpacity="0.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Main fluid continuous SVG curved path passing directly through every node */}
            <path
              d={svgPathD || fallbackPathD}
              fill="none"
              stroke="#D4AF37"
              strokeWidth="3"
              strokeOpacity="0.65"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          {/* Loop through pathway node items */}
          {pathwayItems.map((node) => {
            
            // ── 1. MAIN LEVEL SECTION HEADERS (WITH ALTERNATING LOTTIE COMPANIONS) ──
            if (node.type === "level_header") {
              const currentHeaderIndex = levelHeaderCounter;
              levelHeaderCounter++;

              // Alternating placement:
              // Level 1: RIGHT side (index 0)
              // Level 2: LEFT side (index 1)
              // Level 3: RIGHT side (index 2)
              // ...
              const isRight = currentHeaderIndex % 2 === 0;

              // Cycle through the 4 Lottie animation URLs
              const lottieUrl = LEVEL_LOTTIE_URLS[currentHeaderIndex % LEVEL_LOTTIE_URLS.length];

              return (
                <div key={node.id} className="relative z-20 my-8 flex items-center justify-center w-full">
                  <div className="relative flex items-center justify-center">
                    
                    {/* Level Section Header Card (Line starts directly from bottom-center of LEVEL 1) */}
                    <div 
                      ref={(el) => {
                        if (el) levelCardRefs.current.set(node.id, el);
                        else levelCardRefs.current.delete(node.id);
                      }}
                      className="relative inline-flex flex-col items-center max-w-[210px] sm:max-w-xs bg-[#17130F]/90 border border-[#D4AF37]/60 rounded-2xl px-5 py-2.5 sm:px-6 sm:py-3 shadow-[0_0_25px_rgba(212,175,55,0.15)] backdrop-blur-md"
                    >
                      {/* Top ambient highlight */}
                      <div className="absolute top-0 inset-x-6 sm:inset-x-8 h-px bg-gradient-to-r from-transparent via-[#F5E6C8] to-transparent" />
                      
                      <span className="text-[10px] tracking-widest font-bold text-[#D4AF37] uppercase">
                        {node.title}
                      </span>
                      <span className="text-sm font-serif font-bold text-[#F5E6C8] mt-0.5 text-center">
                        {node.subtitle}
                      </span>
                      {node.tag && (
                        <span className="text-[9px] text-[#8C8070] font-mono mt-1 px-2 py-0.5 rounded bg-[#0A0908]/80 border border-[#2A241D]">
                          {node.tag}
                        </span>
                      )}
                    </div>

                    {/* Lottie Animated Companion positioned beside Level Header */}
                    <div
                      onClick={() => sound.playSuccessChime()}
                      className={`absolute top-1/2 -translate-y-1/2 flex items-center pointer-events-auto cursor-pointer z-30 select-none ${
                        isRight
                          ? 'left-[calc(100%+10px)] sm:left-[calc(100%+18px)]'
                          : 'right-[calc(100%+10px)] sm:right-[calc(100%+18px)]'
                      }`}
                      title={`${node.title} Companion`}
                    >
                      <div className="relative w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 transform hover:scale-110 active:scale-95 transition-transform duration-300 flex items-center justify-center">
                        {/* Subtle ambient glowing base (NO speech bubble) */}
                        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-16 sm:w-24 h-5 sm:h-8 bg-amber-500/15 blur-xl rounded-full pointer-events-none animate-pulse" />

                        {/* Animated Lottie Player */}
                        <dotlottie-player
                          src={lottieUrl}
                          background="transparent"
                          speed="1"
                          style={{ width: '100%', height: '100%' }}
                          loop
                          autoplay
                        ></dotlottie-player>
                      </div>
                    </div>

                  </div>
                </div>
              );
            }

            // ── 2. INDIVIDUAL LESSON NODES (CLEAN, NO COMPANIONS, NO SPEECH BUBBLES) ──
            const isActive = node.status === 'active';
            const isCompleted = node.status === 'completed';
            const isLocked = node.status === 'locked';

            return (
              <div 
                key={node.id}
                ref={isActive ? activeNodeRef : null}
                className="relative my-6 flex flex-col items-center group z-10 transition-all duration-200"
                style={{ transform: `translateX(${node.xOffset || 0}px)` }}
              >
                {/* Node Title Banner */}
                <div className="mb-2 px-3 py-1 rounded-lg bg-[#181410]/95 border border-[#3A3022] text-center shadow-lg transition-transform duration-200 group-hover:scale-105 backdrop-blur-xs">
                  <div className="text-[10px] uppercase tracking-wider text-[#A09585] font-semibold">
                    {node.title}
                  </div>
                  <div className="text-xs font-serif text-[#D4AF37]">
                    {node.subtitle}
                  </div>
                </div>

                {/* Interactive Node Button Container */}
                <div className="relative">
                  
                  {/* Outer Pulsing Glow Effect for Active Node */}
                  {isActive && (
                    <div className="absolute -inset-3 rounded-full bg-gradient-to-r from-[#D4AF37]/40 via-[#FFB703]/30 to-[#D4AF37]/40 blur-md animate-pulse pointer-events-none" />
                  )}

                  <button
                    ref={(el) => {
                      if (el) nodeBtnRefs.current.set(node.id, el);
                      else nodeBtnRefs.current.delete(node.id);
                    }}
                    onClick={() => handleNodeClick(node)}
                    aria-label={`${node.title} - ${node.subtitle}`}
                    className={`relative z-10 w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-all duration-300 transform active:scale-95 cursor-pointer select-none ${
                      isActive
                        ? 'bg-gradient-to-b from-[#FFE599] via-[#D4AF37] to-[#996515] text-[#0A0908] border-4 border-[#FFF5D6] shadow-[0_0_30px_rgba(212,175,55,0.65)] scale-110 hover:scale-115'
                        : isCompleted
                        ? 'bg-gradient-to-b from-[#2A2318] to-[#181410] text-[#D4AF37] border-2 border-[#D4AF37]/60 shadow-[0_0_15px_rgba(0,0,0,0.5)] hover:border-[#D4AF37] hover:scale-105'
                        : 'bg-[#181410] text-[#554A3B] border-2 border-[#2A2319] hover:border-[#3A3022] hover:scale-105 opacity-80'
                    }`}
                  >
                    {/* Node Center Icon Rendering */}
                    {node.type === 'star' && <Star className={`w-7 h-7 ${isActive ? 'fill-[#0A0908]' : isCompleted ? 'fill-[#D4AF37]' : ''}`} />}
                    {node.type === 'play' && <Play className={`w-7 h-7 ml-1 ${isActive ? 'fill-[#0A0908]' : isCompleted ? 'fill-[#D4AF37]' : ''}`} />}
                    {node.type === 'book' && <BookOpen className={`w-7 h-7 ${isActive ? 'fill-[#0A0908]' : isCompleted ? 'fill-[#D4AF37]' : ''}`} />}
                    {node.type === 'audio' && <Volume2 className={`w-7 h-7 ${isActive ? 'fill-[#0A0908]' : isCompleted ? 'fill-[#D4AF37]' : ''}`} />}
                    {node.type === 'check' && <CheckCircle className={`w-7 h-7 ${isActive ? 'fill-[#0A0908]' : isCompleted ? 'fill-[#D4AF37]' : ''}`} />}

                    {/* Lock Badge overlay if locked */}
                    {isLocked && (
                      <div className="absolute inset-0 rounded-full bg-[#0A0908]/65 flex items-center justify-center backdrop-blur-[0.5px]">
                        <Lock className="w-4 h-4 text-[#7A6B58]" />
                      </div>
                    )}
                  </button>

                  {/* Complete status checkmark */}
                  {isCompleted && (
                    <div className="absolute -bottom-1 -right-1 bg-[#0A0908] rounded-full p-0.5 border border-[#D4AF37] shadow-sm">
                      <CheckCircle className="w-4 h-4 text-[#D4AF37] fill-[#D4AF37]/20" />
                    </div>
                  )}

                </div>
              </div>
            );
          })}
        </div>

      </main>

      {/* ── FOOTER BRANDING BAR ────────────────────────────────────────────── */}
      <footer className="mt-auto border-t border-[#2A241D] py-4 px-6 text-center text-xs text-[#7A6B58]">
        <p>© 2026 Bolvani Sanskrit Learning Platform. All rights reserved.</p>
      </footer>

    </div>
  );
};

export default SanctuaryPathway;
