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
  Award, 
  Compass, 
  Home, 
  Swords, 
  Sparkles, 
  User, 
  MessageSquare,
  ChevronDown,
  LogOut,
  Trophy,
  Mic,
  Zap,
  RotateCcw
} from 'lucide-react';
import { LanguageTradition, SkillNode } from '../types';
import { sound } from '../utils/audio';

// Rotating array of Lottie URLs across pathway nodes
const LOTTIE_URLS = [
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
  const lottieLoaded = useLottiePlayer();
  const [internalActiveTab, setInternalActiveTab] = useState('LEARN');
  const currentTab = controlledActiveTab ? controlledActiveTab.toUpperCase() : internalActiveTab;

  // Track hovered node & companion for localized speech bubble reveals
  const [hoveredNodeId, setHoveredNodeId] = useState<string | number | null>(null);
  const [hoveredCompanionId, setHoveredCompanionId] = useState<string | number | null>(null);

  const [streakCount] = useState(initialStreak);
  const [coinsCount] = useState(initialCoins);
  const [audioMuted, setAudioMuted] = useState(sound.getIsMuted());
  const [selectedNode, setSelectedNode] = useState<PathwayNodeItem | null>(null);

  // Motivational Sanskrit and classical encouraging phrases per companion
  const motivationalPhrases = [
    "Ready for today's Sanskrit lesson? 🚀",
    "शुभमस्तु! Let's practice! 🪷",
    "अस्तु! Let's conquer this path! 🔥",
    "Keep up the streak, Acharya! ✨",
    "Sanskrit is the music of wisdom 🕉️",
    "विद्या ददाति विनयं — Knowledge brings humility! 📖",
    "अभ्यासः परमं बलम् — Practice is true strength! ⚡"
  ];

  // Store click dialogue rotation offsets for each companion
  const [companionDialogueOffsets, setCompanionDialogueOffsets] = useState<Record<string | number, number>>({});

  const handleCompanionClick = (nodeId: string | number) => {
    sound.playSuccessChime();
    setCompanionDialogueOffsets((prev) => ({
      ...prev,
      [nodeId]: ((prev[nodeId] || 0) + 1) % motivationalPhrases.length,
    }));
  };

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
    } else {
      sound.playTileClick();
    }
    setSelectedNode(node);
  };

  const handleStartSelectedLesson = () => {
    if (!selectedNode) return;
    sound.playSuccessChime();
    const original = selectedNode.originalNode;
    const nodeToSelect = original || {
      id: String(selectedNode.id),
      levelNumber: 1,
      title: selectedNode.title,
      subtitle: selectedNode.subtitle,
      status: selectedNode.status || 'active',
      iconType: 'play',
      alignment: 'center',
      exercises: [],
    } as SkillNode;

    setSelectedNode(null);
    if (onSelectNode) {
      onSelectNode(nodeToSelect);
    } else {
      alert(`Starting lesson: ${selectedNode.title} (${selectedNode.subtitle})`);
    }
  };

  // Generate smooth curved organic SVG spline coordinates connecting all node items
  // Note: NO static vertical line is drawn; only the organic winding S-curve connector
  const { fullPathD, completedPathD } = useMemo(() => {
    const points: { x: number; y: number; status?: string }[] = [];
    let currentY = 80;

    pathwayItems.forEach((item) => {
      if (item.type === 'level_header') {
        currentY += 90;
      } else {
        const x = 256 + (item.xOffset || 0);
        points.push({ x, y: currentY, status: item.status });
        currentY += 135;
      }
    });

    if (points.length < 2) {
      return { fullPathD: '', completedPathD: '' };
    }

    // Build smooth cubic bezier curve
    let fullD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const midY = (p0.y + p1.y) / 2;
      fullD += ` C ${p0.x} ${midY}, ${p1.x} ${midY}, ${p1.x} ${p1.y}`;
    }

    // Find active node index for illuminated gold path
    const activeIdx = points.findIndex((p) => p.status === 'active');
    let compD = '';
    const endIndex = activeIdx >= 0 ? activeIdx : 0;

    if (endIndex > 0) {
      compD = `M ${points[0].x} ${points[0].y}`;
      for (let i = 0; i < endIndex; i++) {
        const p0 = points[i];
        const p1 = points[i + 1];
        const midY = (p0.y + p1.y) / 2;
        compD += ` C ${p0.x} ${midY}, ${p1.x} ${midY}, ${p1.x} ${p1.y}`;
      }
    }

    return { fullPathD: fullD, completedPathD: compD };
  }, [pathwayItems]);

  // Keep track of lesson index for alternating companion positioning
  let lessonCounter = 0;

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
        <div className="relative w-full max-w-lg flex flex-col items-center py-4">

          {/* Background Connecting Organic SVG Spline (NO straight central lines) */}
          <svg 
            className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 overflow-visible" 
            viewBox="0 0 512 1200"
            preserveAspectRatio="none"
            style={{ filter: 'drop-shadow(0px 0px 8px rgba(212, 175, 55, 0.35))' }}
          >
            <defs>
              <linearGradient id="goldPathGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FFF5D6" />
                <stop offset="50%" stopColor="#D4AF37" />
                <stop offset="100%" stopColor="#AA7C11" />
              </linearGradient>
            </defs>

            {/* Subtle dashed curved background guide */}
            <path
              d={fullPathD || "M 256 70 Q 220 160 226 210 T 276 350 T 300 490 T 266 630 T 216 770 T 240 910"}
              fill="none"
              stroke="#3D3222"
              strokeWidth="4"
              strokeDasharray="8 8"
            />

            {/* Illuminated gold section up to the active node */}
            {completedPathD && (
              <path
                d={completedPathD}
                fill="none"
                stroke="url(#goldPathGradient)"
                strokeWidth="5"
                strokeLinecap="round"
              />
            )}
          </svg>

          {/* Loop through pathway node items */}
          {pathwayItems.map((node) => {
            
            // Level Header Banner
            if (node.type === "level_header") {
              return (
                <div key={node.id} className="relative z-10 my-8 text-center w-full max-w-xs">
                  <div className="relative inline-flex flex-col items-center w-full bg-[#17130F]/90 border border-[#D4AF37]/60 rounded-2xl px-6 py-3 shadow-[0_0_25px_rgba(212,175,55,0.15)] backdrop-blur-md">
                    {/* Top ambient highlight */}
                    <div className="absolute top-0 inset-x-8 h-px bg-gradient-to-r from-transparent via-[#F5E6C8] to-transparent" />
                    
                    <span className="text-[10px] tracking-widest font-bold text-[#D4AF37] uppercase">
                      {node.title}
                    </span>
                    <span className="text-sm font-serif font-bold text-[#F5E6C8] mt-0.5">
                      {node.subtitle}
                    </span>
                    {node.tag && (
                      <span className="text-[9px] text-[#8C8070] font-mono mt-1 px-2 py-0.5 rounded bg-[#0A0908]/80 border border-[#2A241D]">
                        {node.tag}
                      </span>
                    )}
                  </div>
                </div>
              );
            }

            // Lesson Node Calculations
            const currentLessonIndex = lessonCounter;
            lessonCounter++;

            // Zig-zag alternating side pattern:
            // Node 1 (index 0): LEFT
            // Node 2 (index 1): RIGHT
            // Node 3 (index 2): LEFT
            // Node 4 (index 3): RIGHT
            const isLeft = currentLessonIndex % 2 === 0;

            // Cycle through the 3 Lottie URLs
            const lottieUrl = LOTTIE_URLS[currentLessonIndex % LOTTIE_URLS.length];

            const isActive = node.status === 'active';
            const isCompleted = node.status === 'completed';
            const isLocked = node.status === 'locked';

            const isNodeHovered = hoveredNodeId === node.id;
            const isCompanionHovered = hoveredCompanionId === node.id;
            const isThisHovered = isNodeHovered || isCompanionHovered;

            // Speech bubble is visible on active node OR when hovered
            const showSpeechBubble = isActive || isThisHovered;

            // Contextual dialogue message for this node
            const offset = companionDialogueOffsets[node.id] || 0;
            const phraseIdx = (currentLessonIndex + offset) % motivationalPhrases.length;
            const companionPhrase = motivationalPhrases[phraseIdx];

            return (
              <div 
                key={node.id}
                ref={isActive ? activeNodeRef : null}
                className={`relative my-6 flex flex-col items-center group transition-all duration-200 ${
                  showSpeechBubble ? 'z-50' : 'z-20'
                }`}
                style={{ transform: `translateX(${node.xOffset || 0}px)` }}
              >
                {/* Node Title Tooltip Banner */}
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
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
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

                  {/* ── ALTERNATING LOTTIE COMPANION & DYNAMIC SPEECH BUBBLE ──────── */}
                  <div 
                    className={`absolute top-1/2 -translate-y-1/2 flex items-center pointer-events-auto z-50 ${
                      isLeft
                        ? 'right-[calc(100%+12px)] sm:right-[calc(100%+20px)] flex-row'
                        : 'left-[calc(100%+12px)] sm:left-[calc(100%+20px)] flex-row'
                    }`}
                  >
                    
                    {/* DYNAMIC SPEECH BUBBLE (Elevated above SVG and sibling nodes) */}
                    <div
                      className={`absolute bottom-full left-1/2 -translate-x-1/2 sm:translate-x-0 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 mb-2 sm:mb-0 bg-[#1A1815] border-2 border-[#D4AF37] text-[#F5E6C8] px-3.5 py-2 rounded-2xl shadow-[0_12px_32px_rgba(0,0,0,0.9),0_0_20px_rgba(212,175,55,0.25)] text-xs sm:text-sm font-medium transition-all duration-300 transform z-50 max-w-[190px] sm:max-w-[240px] whitespace-normal text-center sm:text-left leading-snug ${
                        isLeft 
                          ? 'sm:left-[100%] sm:ml-3 origin-center sm:origin-left' 
                          : 'sm:right-[100%] sm:mr-3 origin-center sm:origin-right'
                      } ${
                        showSpeechBubble
                          ? 'opacity-100 scale-100 pointer-events-auto'
                          : 'opacity-0 scale-90 pointer-events-none'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{companionPhrase}</span>
                      </div>

                      {/* Desktop Pointer Arrow */}
                      {isLeft ? (
                        /* Pointer arrow for LEFT character: points LEFT towards character */
                        <>
                          <div className="hidden sm:block absolute left-[-8px] top-1/2 -translate-y-1/2 w-0 h-0 border-t-[7px] border-t-transparent border-b-[7px] border-b-transparent border-r-[8px] border-r-[#D4AF37]" />
                          <div className="hidden sm:block absolute left-[-6px] top-1/2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[7px] border-r-[#1A1815]" />
                        </>
                      ) : (
                        /* Pointer arrow for RIGHT character: points RIGHT towards character */
                        <>
                          <div className="hidden sm:block absolute right-[-8px] top-1/2 -translate-y-1/2 w-0 h-0 border-t-[7px] border-t-transparent border-b-[7px] border-b-transparent border-l-[8px] border-l-[#D4AF37]" />
                          <div className="hidden sm:block absolute right-[-6px] top-1/2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-[7px] border-l-[#1A1815]" />
                        </>
                      )}

                      {/* Mobile Pointer Arrow: points DOWN towards character */}
                      <div className="sm:hidden absolute bottom-[-8px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-t-[8px] border-t-[#D4AF37]" />
                      <div className="sm:hidden absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[7px] border-t-[#1A1815]" />
                    </div>

                    {/* LOTTIE ANIMATED COMPANION CONTAINER */}
                    <div 
                      onMouseEnter={() => setHoveredCompanionId(node.id)}
                      onMouseLeave={() => setHoveredCompanionId(null)}
                      onClick={() => handleCompanionClick(node.id)}
                      className="relative w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 cursor-pointer transform hover:scale-110 active:scale-95 transition-transform duration-300 flex items-center justify-center group/mascot z-40"
                      title="Click companion to hear classical wisdom!"
                    >
                      {/* Warm Ambient Campfire Glow Effect */}
                      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-20 sm:w-28 h-6 sm:h-9 bg-amber-500/15 blur-xl rounded-full pointer-events-none animate-pulse" />

                      {/* Lottie Animation Web Component Player */}
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
          })}
        </div>

        {/* ── INTERACTIVE LESSON MODAL / DIALOG ───────────────────────────── */}
        {selectedNode && (
          <div 
            onClick={() => setSelectedNode(null)}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="bg-[#17130F] border border-[#D4AF37] rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-[0_0_50px_rgba(212,175,55,0.25)] relative"
            >
              <div className="w-16 h-16 rounded-full bg-[#2A2218] border border-[#D4AF37] flex items-center justify-center mx-auto text-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.2)]">
                {selectedNode.type === 'play' && <Play className="w-8 h-8 ml-1 fill-[#D4AF37]" />}
                {selectedNode.type === 'star' && <Star className="w-8 h-8 fill-[#D4AF37]" />}
                {selectedNode.type === 'book' && <BookOpen className="w-8 h-8" />}
                {selectedNode.type === 'audio' && <Volume2 className="w-8 h-8" />}
                {selectedNode.type === 'check' && <CheckCircle className="w-8 h-8 text-[#D4AF37]" />}
              </div>

              <div>
                <span className="text-[10px] font-bold tracking-widest text-[#D4AF37] uppercase">
                  {selectedNode.status === 'completed' ? 'MASTERED LESSON' : selectedNode.status === 'active' ? 'CURRENT FOCUS' : 'LOCKED MILESTONE'}
                </span>
                <h3 className="text-xl font-serif font-bold text-[#F5E6C8] mt-1">
                  {selectedNode.title}
                </h3>
                <p className="text-xs text-[#D4AF37] mt-0.5">
                  {selectedNode.subtitle}
                </p>
              </div>

              <p className="text-xs text-[#A09585] leading-relaxed">
                {selectedNode.status === 'locked' 
                  ? "Master preceding foundational lessons to unlock this classical path!" 
                  : `Earn +${selectedNode.xp || 20} XP and deepen your classical fluency.`}
              </p>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setSelectedNode(null)}
                  className="flex-1 py-2.5 rounded-full border border-[#3A3022] text-xs font-semibold text-[#A09585] hover:text-[#E5E0D8] hover:bg-[#251F19] transition-all cursor-pointer"
                >
                  Close
                </button>
                {selectedNode.status !== 'locked' && (
                  <button 
                    onClick={handleStartSelectedLesson}
                    className="flex-1 py-2.5 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#996515] text-[#0A0908] font-bold text-xs shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                  >
                    Start Lesson
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ── FOOTER BRANDING BAR ────────────────────────────────────────────── */}
      <footer className="mt-auto border-t border-[#2A241D] py-4 px-6 text-center text-xs text-[#7A6B58]">
        <p>© 2026 Bolvani Sanskrit Learning Platform. All rights reserved.</p>
      </footer>

    </div>
  );
};

export default SanctuaryPathway;
