/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { TopAppBar } from './components/TopAppBar';
import { BottomNavBar } from './components/BottomNavBar';
import { HomeView } from './components/HomeView';
import { LearnView } from './components/LearnView';
import { ExploreView } from './components/ExploreView';
import { PracticeView } from './components/PracticeView';
import { ProfileView } from './components/ProfileView';
import { AskGuruChat } from './components/AskGuruChat';
import { TraditionSelectModal } from './components/TraditionSelectModal';
import { LessonModal } from './components/LessonModal';
import { LevelUpCelebrationModal } from './components/LevelUpCelebrationModal';
import {
  TRADITIONS,
  INITIAL_PROFILE,
  SANSKRIT_SKILL_TREE,
  PALI_SKILL_TREE,
  TAMIL_SKILL_TREE,
} from './data/mockData';
import { LanguageTradition, SkillNode, TraditionId, UserProfile } from './types';
import { sound } from './utils/audio';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('home');
  const [currentTraditionId, setCurrentTraditionId] = useState<TraditionId>('sanskrit');
  const [isTraditionModalOpen, setIsTraditionModalOpen] = useState(false);
  const [activeLessonNode, setActiveLessonNode] = useState<SkillNode | null>(null);
  const [showLevelUpModal, setShowLevelUpModal] = useState<boolean>(false);

  const [profile, setProfile] = useState<UserProfile>(INITIAL_PROFILE);
  const [sanskritTree, setSanskritTree] = useState<SkillNode[]>(SANSKRIT_SKILL_TREE);
  const [paliTree, setPaliTree] = useState<SkillNode[]>(PALI_SKILL_TREE);
  const [tamilTree, setTamilTree] = useState<SkillNode[]>(TAMIL_SKILL_TREE);

  const currentTradition: LanguageTradition =
    TRADITIONS.find((t) => t.id === currentTraditionId) || TRADITIONS[0];

  const getActiveTree = () => {
    switch (currentTraditionId) {
      case 'pali':
        return paliTree;
      case 'tamil':
        return tamilTree;
      default:
        return sanskritTree;
    }
  };

  // Central map from tradition id -> its setState function. Used so that
  // any logic which needs to update "whichever tree is currently active"
  // (e.g. unlocking the next node on lesson completion) automatically
  // works for all three traditions instead of only Sanskrit.
  const treeSetters: Record<TraditionId, React.Dispatch<React.SetStateAction<SkillNode[]>>> = {
    sanskrit: setSanskritTree,
    pali: setPaliTree,
    tamil: setTamilTree,
  };

  const handleSelectTradition = (id: TraditionId) => {
    setCurrentTraditionId(id);
  };

  const handleStartActiveLesson = () => {
    const tree = getActiveTree();
    const activeNode = tree.find((n) => n.status === 'active') || tree[0];
    if (activeNode) {
      setActiveLessonNode(activeNode);
    }
  };

  const handleCompleteLesson = (xpEarned: number) => {
    setProfile((prev) => {
      const nextDaily = Math.min(prev.maxDailyXp, prev.dailyXp + 8);
      const justAchievedGoal = nextDaily >= prev.maxDailyXp && prev.dailyXp < prev.maxDailyXp;

      if (justAchievedGoal) {
        setTimeout(() => {
          setShowLevelUpModal(true);
        }, 600);
      }

      return {
        ...prev,
        totalXp: prev.totalXp + xpEarned,
        dailyXp: nextDaily,
        languageMastery: {
          ...prev.languageMastery,
          [currentTraditionId]: Math.min(100, (prev.languageMastery[currentTraditionId] || 0) + 5),
        },
      };
    });

    // Unlock next node in whichever tradition's tree is currently active.
    // Previously this only ran for 'sanskrit', so completing a lesson in
    // Pali or Tamil updated XP but silently left the next node locked.
    const setActiveTree = treeSetters[currentTraditionId];
    if (setActiveTree) {
      setActiveTree((prev) => {
        const next = [...prev];
        const activeIdx = next.findIndex((n) => n.status === 'active');
        if (activeIdx >= 0) {
          next[activeIdx] = { ...next[activeIdx], status: 'completed' };
          if (activeIdx + 1 < next.length) {
            next[activeIdx + 1] = { ...next[activeIdx + 1], status: 'active', iconType: 'play' };
          }
        }
        return next;
      });
    }
  };

  const handleEarnXp = (amount: number) => {
    setProfile((prev) => {
      const nextDaily = Math.min(prev.maxDailyXp, prev.dailyXp + 5);
      const justAchievedGoal = nextDaily >= prev.maxDailyXp && prev.dailyXp < prev.maxDailyXp;

      if (justAchievedGoal) {
        setTimeout(() => {
          setShowLevelUpModal(true);
        }, 500);
      }

      return {
        ...prev,
        totalXp: prev.totalXp + amount,
        dailyXp: nextDaily,
      };
    });
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white dark-noise-bg sans selection:bg-[#C5A059] selection:text-black flex flex-col justify-between">
      {/* Top Application Bar */}
      <TopAppBar
        currentTradition={currentTradition}
        streakDays={profile.streakDays}
        activeTab={activeTab}
        onTabChange={(tab) => {
          sound.playTileClick();
          setActiveTab(tab);
        }}
        onOpenTraditions={() => setIsTraditionModalOpen(true)}
      />

      {/* Main Content Area with fluid max-width */}
      <main className="pt-24 pb-28 md:pb-12 px-4 sm:px-8 max-w-4xl mx-auto w-full flex-grow">
        {activeTab === 'home' && (
          <HomeView
            currentTradition={currentTradition}
            profile={profile}
            onContinueLesson={handleStartActiveLesson}
            onStartReview={() => setActiveTab('practice')}
            onOpenTraditions={() => setIsTraditionModalOpen(true)}
            onUpdateDailyGoal={(newGoal) => {
              setProfile((prev) => {
                const nextProfile = {
                  ...prev,
                  maxDailyXp: newGoal,
                };
                if (prev.dailyXp >= newGoal && prev.dailyXp < prev.maxDailyXp) {
                  setTimeout(() => setShowLevelUpModal(true), 300);
                }
                return nextProfile;
              });
            }}
            onCelebrateGoal={() => setShowLevelUpModal(true)}
          />
        )}

        {activeTab === 'learn' && (
          <LearnView
            currentTradition={currentTradition}
            nodes={getActiveTree()}
            onSelectNode={(node) => setActiveLessonNode(node)}
          />
        )}

        {activeTab === 'explore' && <ExploreView currentTraditionId={currentTraditionId} />}

        {activeTab === 'practice' && (
          <PracticeView currentTraditionId={currentTraditionId} onEarnXp={handleEarnXp} />
        )}

        {activeTab === 'askguru' && (
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="text-center">
              <span className="text-[10px] uppercase tracking-[0.25em] font-semibold text-[#C5A059] block mb-1">
                CLASSICAL LEXICON & WISDOM
              </span>
              <h1 className="font-serif text-3xl sm:text-4xl font-normal text-white mb-2 tracking-tight">
                Ask The Guru
              </h1>
              <p className="text-sm sm:text-base text-white/60 font-light max-w-lg mx-auto">
                Inquire about the meaning, pronunciation, and usage of any classical word or phrase.
              </p>
            </div>
            <AskGuruChat
              avatarUrl="https://lh3.googleusercontent.com/aida-public/AB6AXuBLrH8Elz2mqY6dXtArekdpYXztbyNOblniZhIMx2X_EsanRotXyGWKndqom2k3S32qegVH_51PaLZt2KqhJMEszqSLhiutVPoFbzRLmLWgET7lhZWcZmkpfFRohO4ELb_zK94-NhYdc5mtzkhxdOuy04XA9Pgvf8GiGU39O1EKkR3FP6imNDJSLQ-n16Y89RolR5R3BB1kp85c_-1KaLonHRr9_vFdP-yJeNprpPh5lMzifCjFHCxbJA"
              scholarName="Guru Vidyadhar"
              currentLanguage={currentTraditionId}
            />
          </div>
        )}

        {activeTab === 'profile' && <ProfileView profile={profile} />}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNavBar
        activeTab={activeTab}
        onTabChange={(tab) => {
          sound.playTileClick();
          setActiveTab(tab);
        }}
      />

      {/* Tradition Selector Modal (Screen 1) */}
      <TraditionSelectModal
        currentTraditionId={currentTraditionId}
        onSelectTradition={handleSelectTradition}
        isOpen={isTraditionModalOpen}
        onClose={() => setIsTraditionModalOpen(false)}
      />

      {/* Interactive Lesson Modal (Screen 4) */}
      {activeLessonNode && (
        <LessonModal
          node={activeLessonNode}
          onClose={() => setActiveLessonNode(null)}
          onCompleteLesson={handleCompleteLesson}
        />
      )}

      {/* Level Up & Daily Goal Celebration Confetti Modal */}
      <LevelUpCelebrationModal
        isOpen={showLevelUpModal}
        onClose={() => setShowLevelUpModal(false)}
        profile={profile}
        traditionName={currentTradition.name}
      />
    </div>
  );
}