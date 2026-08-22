import React from 'react';
import { ArrowRight, BookOpen, Brain, Waves, X, CheckCircle2 } from 'lucide-react';
import { LanguageTradition, TraditionId } from '../types';
import { TRADITIONS } from '../data/mockData';
import { sound } from '../utils/audio';

interface TraditionSelectModalProps {
  currentTraditionId: TraditionId;
  onSelectTradition: (id: TraditionId) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const TraditionSelectModal: React.FC<TraditionSelectModalProps> = ({
  currentTraditionId,
  onSelectTradition,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const getTraditionIcon = (id: TraditionId) => {
    switch (id) {
      case 'sanskrit':
        return <BookOpen className="w-5 h-5 text-[#020027]" />;
      case 'pali':
        return <Brain className="w-5 h-5 text-[#8e4e14]" />;
      case 'tamil':
        return <Waves className="w-5 h-5 text-[#d86346]" />;
    }
  };

  const handleSelect = (tradition: LanguageTradition) => {
    sound.playTileClick();
    onSelectTradition(tradition.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#121212] rounded-2xl border border-white/15 shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto text-white">
        {/* Close Button */}
        <button
          id="btn-close-traditions-modal"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-white/60 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Title */}
        <div className="mb-6 text-center">
          <span className="text-[10px] uppercase tracking-[0.25em] font-semibold text-[#C5A059] block mb-1">
            SACRED LINEAGES
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl font-light text-white mb-1">
            Choose Your Pathway
          </h2>
          <p className="text-sm text-white/60 font-light">Select a classical tradition to immerse in today.</p>
        </div>

        {/* List of Tradition Cards */}
        <div className="space-y-4">
          {TRADITIONS.map((tradition) => {
            const isSelected = tradition.id === currentTraditionId;

            return (
              <article
                key={tradition.id}
                id={`tradition-card-${tradition.id}`}
                className={`rounded-xl p-5 flex flex-col relative overflow-hidden transition-all duration-200 cursor-pointer bg-[#171717] border ${
                  isSelected
                    ? 'border-[#C5A059] ring-1 ring-[#C5A059] shadow-lg shadow-[#C5A059]/10'
                    : 'border-white/10 hover:border-[#C5A059]/40'
                }`}
                onClick={() => handleSelect(tradition)}
              >
                {/* Subtle decorative background quarter circle */}
                <div className="absolute top-0 right-0 w-28 h-28 bg-[#C5A059]/5 rounded-bl-full -mr-6 -mt-6 pointer-events-none" />

                {/* Card Header */}
                <div className="flex justify-between items-start mb-2 relative z-10">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-serif text-xl font-normal text-white tracking-wide">
                        {tradition.name}
                      </h3>
                      {isSelected && (
                        <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold text-[#0A0A0A] bg-[#C5A059] px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3 text-[#0A0A0A]" /> Active
                        </span>
                      )}
                    </div>
                    <p className="font-serif text-2xl text-[#C5A059]/70 mt-0.5 mb-1 select-none">
                      {tradition.nativeScript}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 border border-white/10 text-[#C5A059]">
                    {getTraditionIcon(tradition.id)}
                  </div>
                </div>

                <p className="text-sm text-white/60 mb-4 flex-grow font-light leading-relaxed">{tradition.description}</p>

                {/* Progress bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-1.5 text-white/60 font-medium">
                    <span className="uppercase tracking-wider text-[10px]">{tradition.levelName}</span>
                    <span className="text-[#C5A059] font-bold">{tradition.progressPercentage}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        tradition.progressPercentage > 0 ? 'bg-[#C5A059]' : 'bg-white/20'
                      }`}
                      style={{ width: `${tradition.progressPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Action button */}
                {isSelected ? (
                  <button
                    id={`btn-select-${tradition.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(tradition);
                    }}
                    className="btn-gold w-full h-11 rounded-lg text-xs font-bold uppercase tracking-[0.15em] flex items-center justify-center gap-2 cursor-pointer text-[#0A0A0A]"
                  >
                    {tradition.buttonLabel}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    id={`btn-select-${tradition.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(tradition);
                    }}
                    className="w-full h-11 bg-white/5 text-white/90 border border-white/15 rounded-lg text-xs font-semibold uppercase tracking-[0.15em] flex items-center justify-center gap-2 hover:border-[#C5A059]/40 hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    {tradition.buttonLabel}
                  </button>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
};
