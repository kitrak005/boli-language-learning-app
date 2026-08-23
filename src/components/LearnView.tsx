import React, { useState, useEffect } from 'react';
import { Check, Star, Play, Lock, Sparkles, Flame } from 'lucide-react';
import { LanguageTradition, SkillNode } from '../types';
import { sound } from '../utils/audio';

interface LearnViewProps {
  currentTradition: LanguageTradition;
  nodes: SkillNode[];
  onSelectNode: (node: SkillNode) => void;
}

export const LearnView: React.FC<LearnViewProps> = ({
  currentTradition,
  nodes,
  onSelectNode,
}) => {
  // All distinct level numbers present in this tradition's tree, in order.
  const availableLevels = Array.from(new Set(nodes.map((n) => n.levelNumber))).sort(
    (a, b) => a - b
  );

  // Default to the level containing the learner's current "active" node,
  // falling back to the first level with any incomplete node, then the
  // last level if everything is completed.
  const getDefaultLevel = () => {
    const activeNode = nodes.find((n) => n.status === 'active');
    if (activeNode) return activeNode.levelNumber;

    const firstIncomplete = nodes.find((n) => n.status !== 'completed');
    if (firstIncomplete) return firstIncomplete.levelNumber;

    return availableLevels[availableLevels.length - 1] ?? 1;
  };

  const [selectedLevel, setSelectedLevel] = useState<number>(getDefaultLevel());

  // Re-sync the selected level whenever the tradition (and therefore the
  // nodes array) changes, so switching from e.g. Sanskrit to Pali doesn't
  // leave you stranded on "Level 3" with no Pali content there yet.
  useEffect(() => {
    setSelectedLevel(getDefaultLevel());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTradition.id]);

  const levelNodes = nodes.filter((n) => n.levelNumber === selectedLevel);

  // A level is locked from being *browsed into* if none of its nodes have
  // been unlocked yet (i.e. every node in it is still 'locked' and the
  // previous level isn't fully completed). We still allow tapping the
  // tab to preview it, but the nodes inside stay visually locked via
  // their own `status`.
  const isLevelReachable = (level: number) => {
    if (level === availableLevels[0]) return true;
    const levelIdx = availableLevels.indexOf(level);
    const previousLevel = availableLevels[levelIdx - 1];
    const previousLevelNodes = nodes.filter((n) => n.levelNumber === previousLevel);
    return previousLevelNodes.length > 0 && previousLevelNodes.every((n) => n.status === 'completed');
  };

  const handleNodeClick = (node: SkillNode) => {
    if (node.status === 'locked') {
      sound.playErrorChime();
      return;
    }
    sound.playTileClick();
    onSelectNode(node);
  };

  const getSubtitle = () => {
    switch (currentTradition.id) {
      case 'pali':
        return 'Foundations of the Tipitaka and meditative canon.';
      case 'tamil':
        return 'Sangam poetics and ancient grammatical structures.';
      default:
        return 'Foundations of the sacred language.';
    }
  };

  return (
    <div className="flex flex-col items-center max-w-xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* Header Section */}
      <div className="text-center mb-6 w-full">
        <span className="text-[10px] uppercase tracking-[0.25em] font-semibold text-[#C5A059] block mb-1">
          SANCTUARY PATHWAY
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-normal text-white mb-2 tracking-tight">
          {currentTradition.name}: Level {selectedLevel}
        </h1>
        <p className="text-sm sm:text-base text-white/60 font-light">{getSubtitle()}</p>
      </div>

      {/* Level Selector Tabs */}
      {availableLevels.length > 1 && (
        <div className="flex items-center gap-2 mb-8 sm:mb-10">
          {availableLevels.map((level) => {
            const reachable = isLevelReachable(level);
            const isSelected = level === selectedLevel;
            return (
              <button
                key={level}
                id={`level-tab-${level}`}
                onClick={() => setSelectedLevel(level)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${isSelected
                    ? 'bg-[#C5A059] text-black shadow-md'
                    : reachable
                      ? 'bg-white/5 text-white/70 hover:text-white hover:bg-white/10 border border-white/10'
                      : 'bg-white/[0.02] text-white/25 border border-white/5'
                  }`}
              >
                {!reachable && <Lock className="w-3 h-3" />}
                <span>Level {level}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Skill Tree Container */}
      <div className="relative w-full max-w-sm flex flex-col items-center py-6">
        {/* Continuous Background Line */}
        <div className="absolute w-0.5 bg-white/10 top-12 bottom-12 left-1/2 -translate-x-1/2 z-0 rounded-full" />
        {/* Active gold line portion */}
        <div className="absolute w-0.5 bg-gradient-to-b from-[#C5A059] via-[#C5A059] to-white/10 top-12 h-64 left-1/2 -translate-x-1/2 z-0 rounded-full" />

        {/* Render Skill Tree Nodes for the selected level */}
        <div className="w-full space-y-10 sm:space-y-12 relative z-10">
          {levelNodes.map((node) => {
            const isCompleted = node.status === 'completed';
            const isActive = node.status === 'active';
            const isLocked = node.status === 'locked';

            const offsetClass =
              node.alignment === 'left'
                ? 'ml-10 sm:ml-12'
                : node.alignment === 'right'
                  ? 'mr-10 sm:mr-12'
                  : '';

            return (
              <div
                key={node.id}
                id={`skill-node-${node.id}`}
                onClick={() => handleNodeClick(node)}
                className={`flex flex-col items-center w-full transition-all duration-200 ${isLocked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer group'
                  }`}
              >
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

                <div
                  className={`mt-3 text-center transition-all duration-200 ${isActive
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
                    className={`text-[10px] uppercase tracking-[0.2em] font-semibold mb-0.5 ${isActive
                        ? 'text-[#C5A059]'
                        : isCompleted
                          ? 'text-white'
                          : 'text-white/40'
                      }`}
                  >
                    {node.title}
                  </h3>

                  <p
                    className={`text-xs ${isActive
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
          })}
        </div>
      </div>
    </div>
  );
};