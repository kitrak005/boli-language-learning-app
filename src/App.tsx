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
import { TraditionSelectModal } from './components/TraditionSelectModal';
import { LessonModal } from './components/LessonModal';
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
    setProfile((prev) => ({
      ...prev,
      totalXp: prev.totalXp + xpEarned,
      dailyXp: Math.min(prev.maxDailyXp, prev.dailyXp + 8),
      languageMastery: {
        ...prev.languageMastery,
        [currentTraditionId]: Math.min(100, (prev.languageMastery[currentTraditionId] || 0) + 5),
      },
    }));

    // Unlock next node in tree
    if (currentTraditionId === 'sanskrit') {
      setSanskritTree((prev) => {
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
    setProfile((prev) => ({
      ...prev,
      totalXp: prev.totalXp + amount,
      dailyXp: Math.min(prev.maxDailyXp, prev.dailyXp + 5),
    }));
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
    </div>
  );
}
