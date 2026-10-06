import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Star, Play, Lock, BookOpen, ChevronDown } from 'lucide-react';
import { LanguageTradition, SkillNode } from '../types';
import { LEVEL_LADDER } from '../data/constants';
import { sound } from '../utils/audio';

interface LearnViewProps {
  currentTradition: LanguageTradition;
  nodes: SkillNode[];
  onSelectNode: (node: SkillNode) => void;
}

/** One entry per level — built from LEVEL_LADDER + the available node levels. */
interface LevelSection {
  level: number;
  name: string;
  cefr: string;
  nodes: SkillNode[];
  isReachable: boolean;
}

export const LearnView: React.FC<LearnViewProps> = ({
  currentTradition,
  nodes,
  onSelectNode,
}) => {
  // ─── Derived level sections ────────────────────────────────────────────────
  const availableLevels = Array.from(new Set(nodes.map((n) => n.levelNumber))).sort(
    (a, b) => a - b
  );

  const isLevelReachable = (level: number): boolean => {
    if (level === availableLevels[0]) return true;
    const idx = availableLevels.indexOf(level);
    const prev = availableLevels[idx - 1];
    const prevNodes = nodes.filter((n) => n.levelNumber === prev);
    return prevNodes.length > 0 && prevNodes.every((n) => n.status === 'completed');
  };

  const sections: LevelSection[] = availableLevels.map((level) => {
    const ladder = LEVEL_LADDER.find((l) => l.level === level);
    return {
      level,
      name: ladder?.name ?? `Level ${level}`,
      cefr: ladder?.cefr ?? '',
      nodes: nodes.filter((n) => n.levelNumber === level),
      isReachable: isLevelReachable(level),
    };
  });

  // ─── Scrollspy state ───────────────────────────────────────────────────────
  // Determine which level the active node belongs to, default to that.
  const getInitialVisibleLevel = (): number => {
    const activeNode = nodes.find((n) => n.status === 'active');
    if (activeNode) return activeNode.levelNumber;
    const firstIncomplete = nodes.find((n) => n.status !== 'completed');
    if (firstIncomplete) return firstIncomplete.levelNumber;
    return availableLevels[availableLevels.length - 1] ?? 1;
  };

  const [visibleLevel, setVisibleLevel] = useState<number>(getInitialVisibleLevel);
  const [headerVisible, setHeaderVisible] = useState(false);
  const [headerAnimKey, setHeaderAnimKey] = useState(0); // bumped to retrigger fade

  // Re-sync when tradition changes
  useEffect(() => {
    setVisibleLevel(getInitialVisibleLevel());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTradition.id]);

  // Refs map: sectionId → DOM element for IntersectionObserver
  const sectionRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const setSectionRef = useCallback((level: number) => (el: HTMLDivElement | null) => {
    if (el) sectionRefs.current.set(level, el);
    else sectionRefs.current.delete(level);
  }, []);

  // IntersectionObserver: pick the topmost section that's ≥40% visible
  useEffect(() => {
    const sectionElements = Array.from(sectionRefs.current.entries());
    if (sectionElements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Collect all currently intersecting sections
        const visible: { level: number; ratio: number; top: number }[] = [];
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const level = Number(entry.target.getAttribute('data-level'));
            visible.push({
              level,
              ratio: entry.intersectionRatio,
              top: entry.boundingClientRect.top,
            });
          }
        });

        if (visible.length === 0) return;

        // Pick the section closest to the top of the viewport
        visible.sort((a, b) => Math.abs(a.top) - Math.abs(b.top));
        const next = visible[0].level;

        if (next !== visibleLevel) {
          setVisibleLevel(next);
          setHeaderAnimKey((k) => k + 1); // trigger re-fade
        }
      },
      {
        // Use a generous rootMargin so the header updates before the divider
        // reaches the very top of the screen — ≈ the sticky header height.
        rootMargin: '-80px 0px -30% 0px',
        threshold: [0, 0.1, 0.3, 0.5],
      }
    );

    sectionElements.forEach(([, el]) => observer.observe(el));

    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections.length, currentTradition.id]);

  // Show sticky header only once the user has scrolled past the static intro text
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Observe the scroll parent to detect first scroll
    const handleScroll = () => {
      setHeaderVisible(window.scrollY > 120 || container.scrollTop > 40);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    container.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      container.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // ─── Node interaction ──────────────────────────────────────────────────────
  const handleNodeClick = (node: SkillNode) => {
    if (node.status === 'locked') {
      sound.playErrorChime();
      return;
    }
    sound.playTileClick();
    onSelectNode(node);
  };

  // ─── Scroll to active node on first render ─────────────────────────────────
  useEffect(() => {
    const activeNode = nodes.find((n) => n.status === 'active');
    if (!activeNode) return;
    // Small delay so the DOM has painted
    const timer = setTimeout(() => {
      const el = document.getElementById(`skill-node-${activeNode.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 320);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTradition.id]);

  // ─── Active section metadata for the sticky header ─────────────────────────
  const activeSection = sections.find((s) => s.level === visibleLevel) ?? sections[0];

  // ─── Render helpers ────────────────────────────────────────────────────────
  const renderNode = (node: SkillNode) => {
    const isCompleted = node.status === 'completed';
    const isActive = node.status === 'active';
    const isLocked = node.status === 'locked';

    const offsetClass =
      node.alignment === 'left'
        ? 'ml-10 sm:ml-14'
        : node.alignment === 'right'
          ? 'mr-10 sm:mr-14'
          : '';

    return (
      <div
        key={node.id}
        id={`skill-node-${node.id}`}
        onClick={() => handleNodeClick(node)}
        className={`flex flex-col items-center w-full transition-all duration-200 ${
          isLocked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer group'
        }`}
      >
        {/* Node circle */}
        {isCompleted && (
          <div
            className={`w-16 h-16 rounded-full bg-[#C5A059] flex items-center justify-center glow-gold border-2 border-white/20 shadow-xl transition-transform duration-300 group-hover:scale-105 group-active:scale-95 ${offsetClass}`}
          >
            {node.iconType === 'check' ? (
              <Check className="w-7 h-7 text-[#0A0A0A] stroke-[3]" />
            ) : (
              <Star className="w-7 h-7 text-[#0A0A0A] fill-[#0A0A0A]" />
            )}
          </div>
        )}

        {isActive && (
          <div
            className={`w-20 h-20 rounded-full bg-[#0A0A0A] border-2 border-[#C5A059] flex items-center justify-center node-active-gold shadow-2xl transition-transform duration-300 group-hover:scale-105 group-active:scale-95 relative overflow-hidden ${offsetClass}`}
          >
            <div className="absolute inset-0 rounded-full shadow-[inset_0_1px_4px_rgba(197,160,89,0.5)]" />
            <Play className="w-8 h-8 text-[#C5A059] fill-[#C5A059] ml-1 relative z-10" />
          </div>
        )}

        {isLocked && (
          <div
            className={`w-16 h-16 rounded-full bg-[#181818] border border-white/10 flex items-center justify-center shadow-xs ${offsetClass}`}
          >
            <Lock className="w-5 h-5 text-white/30" />
          </div>
        )}

        {/* Label card */}
        <div
          className={`mt-3 text-center transition-all duration-200 ${
            isActive
              ? 'bg-[#161616] px-6 py-3.5 rounded-xl border border-[#C5A059] shadow-xl w-4/5 relative'
              : isCompleted
                ? 'bg-[#121212] px-4 py-2.5 rounded-lg border border-white/15 shadow-sm w-3/4 group-hover:border-[#C5A059]/40'
                : 'bg-[#121212]/60 px-4 py-2.5 rounded-lg border border-white/5 w-3/4'
          } ${offsetClass}`}
        >
          {isActive && (
            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#161616] border-t border-l border-[#C5A059] rotate-45" />
          )}
          <h3
            className={`text-[10px] uppercase tracking-[0.2em] font-semibold mb-0.5 ${
              isActive ? 'text-[#C5A059]' : isCompleted ? 'text-white' : 'text-white/40'
            }`}
          >
            {node.title}
          </h3>
          <p
            className={`text-xs ${
              isActive
                ? 'text-white/90 font-medium'
                : isCompleted
                  ? 'text-white/60'
                  : 'text-white/30'
            }`}
          >
            {node.subtitle}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="relative flex flex-col items-center animate-in fade-in duration-300" ref={scrollContainerRef}>

      {/* ── Sticky Header Banner ─────────────────────────────────────────────
           Positioned sticky within the scroll flow. Sits just below TopAppBar
           (top-16 = 64px). Uses Tailwind's `sticky` so it doesn't escape the
           max-w-4xl column. z-30 keeps it below modals & TopAppBar (z-40).   */}
      <div
        className={`sticky top-0 z-30 w-full transition-all duration-300 ${
          headerVisible
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 -translate-y-2 pointer-events-none'
        }`}
        aria-hidden={!headerVisible}
      >
        <div className="bg-[#0D0D0D]/95 backdrop-blur-md border-b border-[#C5A059]/20 shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
          <div className="max-w-xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
            {/* Left: level pill + section name */}
            <div
              key={headerAnimKey}
              className="flex items-center gap-2.5 min-w-0 animate-in fade-in slide-in-from-left-1 duration-300"
            >
              {/* Level pill */}
              <span className="shrink-0 px-2.5 py-1 rounded-full bg-[#C5A059]/10 border border-[#C5A059]/40 text-[#C5A059] text-[10px] font-bold uppercase tracking-widest">
                LVL {activeSection?.level}
              </span>

              {/* Section name */}
              <div className="min-w-0">
                <p className="text-white text-xs font-semibold truncate leading-tight">
                  {activeSection?.name}
                </p>
                {activeSection?.cefr && (
                  <p className="text-white/40 text-[9px] font-mono tracking-wider leading-tight">
                    {activeSection.cefr}
                    {!activeSection.isReachable && ' · Locked'}
                  </p>
                )}
              </div>
            </div>

            {/* Right: Guidebook button */}
            <button
              id="btn-guidebook"
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-white/60 hover:text-[#C5A059] hover:border-[#C5A059]/30 hover:bg-[#C5A059]/5 transition-all text-[10px] font-semibold uppercase tracking-wider cursor-pointer"
              title="Level Info"
            >
              <BookOpen className="w-3 h-3" />
              <span className="hidden sm:inline">Guidebook</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Static page intro (visible before any scroll) ──────────────────── */}
      <div className="text-center pt-4 pb-2 w-full max-w-xl mx-auto px-4">
        <span className="text-[10px] uppercase tracking-[0.28em] font-semibold text-[#C5A059] block mb-1">
          SANCTUARY PATHWAY
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-normal text-white tracking-tight">
          {currentTradition.name}
        </h1>
        <p className="text-sm text-white/50 font-light mt-1">
          {currentTradition.description}
        </p>

        {/* Scroll hint arrow — fades out once the user has scrolled */}
        <div
          className={`mt-3 flex justify-center transition-opacity duration-500 ${
            headerVisible ? 'opacity-0' : 'opacity-60'
          }`}
        >
          <ChevronDown className="w-4 h-4 text-[#C5A059] animate-bounce" />
        </div>
      </div>

      {/* ── Continuous Skill Path ──────────────────────────────────────────── */}
      <div className="relative w-full max-w-sm mx-auto">
        {/* Continuous centre spine line */}
        <div className="absolute left-1/2 -translate-x-1/2 w-px bg-white/8 inset-y-0 z-0" />

        {sections.map((section, sIdx) => (
          <div
            key={section.level}
            data-level={section.level}
            ref={setSectionRef(section.level)}
            id={`level-section-${section.level}`}
            className="relative z-10"
          >
            {/* ── Section Divider Banner ──────────────────────────────────── */}
            <div className={`flex items-center gap-3 px-2 ${sIdx === 0 ? 'mt-4 mb-8' : 'my-10'}`}>
              {/* Left rule */}
              <div className="flex-1 h-px bg-gradient-to-r from-transparent to-[#C5A059]/40" />

              {/* Centre chip */}
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-full border shadow-lg ${
                  section.isReachable
                    ? 'bg-[#161208] border-[#C5A059]/50 shadow-[#C5A059]/10'
                    : 'bg-[#111111] border-white/10'
                }`}
              >
                {!section.isReachable && (
                  <Lock className="w-3 h-3 text-white/30 shrink-0" />
                )}
                <div className="text-center">
                  <span
                    className={`block text-[9px] font-bold uppercase tracking-[0.25em] ${
                      section.isReachable ? 'text-[#C5A059]' : 'text-white/30'
                    }`}
                  >
                    LEVEL {section.level}
                  </span>
                  <span
                    className={`block text-xs font-medium leading-tight ${
                      section.isReachable ? 'text-white/90' : 'text-white/30'
                    }`}
                  >
                    {section.name}
                  </span>
                  {section.cefr && (
                    <span
                      className={`block text-[9px] font-mono ${
                        section.isReachable ? 'text-white/40' : 'text-white/15'
                      }`}
                    >
                      {section.cefr}
                    </span>
                  )}
                </div>
              </div>

              {/* Right rule */}
              <div className="flex-1 h-px bg-gradient-to-l from-transparent to-[#C5A059]/40" />
            </div>

            {/* ── Node list for this level ────────────────────────────────── */}
            <div className="space-y-10 sm:space-y-12 pb-4">
              {section.nodes.map((node) => renderNode(node))}
            </div>

            {/* Bottom connector line between levels — gold if this level is complete */}
            {sIdx < sections.length - 1 && (
              <div className="flex justify-center my-6">
                <div
                  className={`w-px h-10 rounded-full ${
                    section.nodes.every((n) => n.status === 'completed')
                      ? 'bg-gradient-to-b from-[#C5A059] to-[#C5A059]/20'
                      : 'bg-white/8'
                  }`}
                />
              </div>
            )}
          </div>
        ))}

        {/* Bottom padding for nav bar clearance */}
        <div className="h-16" />
      </div>
    </div>
  );
};