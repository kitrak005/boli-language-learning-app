/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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
import { AuthScreen } from './components/AuthScreen';
import { supabase } from './utils/supabaseClient';
import type { Session } from '@supabase/supabase-js';
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
  const [session, setSession] = useState<Session | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    // Check for an existing session on load (e.g. returning user, or just
    // completed an OAuth redirect back from Google/GitHub).
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log('[VAKYA DEBUG] getSession() result:', session, 'error:', error);
      setSession(session);
      setIsCheckingAuth(false);
    });

    // Keep session state in sync with login/logout/token refresh events.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[VAKYA DEBUG] onAuthStateChange fired:', event, session);
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const [activeTab, setActiveTab] = useState<string>('home');
  // Persistence: previously all progress lived only in React state, which
  // reset to the hardcoded starting point (Level 1 nodes pre-completed,
  // everything else locked) on every page refresh — meaning a learner could
  // never actually reach Level 2/3 content unless they finished every
  // remaining node in one uninterrupted session. These lazy initializers
  // restore saved progress from localStorage if it exists.
  const loadSaved = <T,>(key: string, fallback: T): T => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? (JSON.parse(saved) as T) : fallback;
    } catch {
      return fallback;
    }
  };

  const [currentTraditionId, setCurrentTraditionId] = useState<TraditionId>(() =>
    loadSaved('vakya_currentTraditionId', 'sanskrit' as TraditionId)
  );
  const [isTraditionModalOpen, setIsTraditionModalOpen] = useState(false);
  const [activeLessonNode, setActiveLessonNode] = useState<SkillNode | null>(null);
  const [showLevelUpModal, setShowLevelUpModal] = useState<boolean>(false);

  const [profile, setProfile] = useState<UserProfile>(() => loadSaved('vakya_profile', INITIAL_PROFILE));
  const [sanskritTree, setSanskritTree] = useState<SkillNode[]>(() => loadSaved('vakya_sanskritTree', SANSKRIT_SKILL_TREE));
  const [paliTree, setPaliTree] = useState<SkillNode[]>(() => loadSaved('vakya_paliTree', PALI_SKILL_TREE));
  const [tamilTree, setTamilTree] = useState<SkillNode[]>(() => loadSaved('vakya_tamilTree', TAMIL_SKILL_TREE));

  // Persist to localStorage whenever any of this progress changes.
  useEffect(() => {
    localStorage.setItem('vakya_currentTraditionId', JSON.stringify(currentTraditionId));
  }, [currentTraditionId]);

  useEffect(() => {
    localStorage.setItem('vakya_profile', JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem('vakya_sanskritTree', JSON.stringify(sanskritTree));
  }, [sanskritTree]);

  useEffect(() => {
    localStorage.setItem('vakya_paliTree', JSON.stringify(paliTree));
  }, [paliTree]);

  useEffect(() => {
    localStorage.setItem('vakya_tamilTree', JSON.stringify(tamilTree));
  }, [tamilTree]);

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
    let justAchievedGoal = false;

    setProfile((prev) => {
      const nextDaily = Math.min(prev.maxDailyXp, prev.dailyXp + xpEarned);
      justAchievedGoal = nextDaily >= prev.maxDailyXp && prev.dailyXp < prev.maxDailyXp;

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

    if (justAchievedGoal) {
      setTimeout(() => {
        setShowLevelUpModal(true);
      }, 600);
    }

    // Unlock next node in tree — previously this ONLY ran for Sanskrit
    // (`if (currentTraditionId === 'sanskrit')`), so completing a lesson in
    // Pali or Tamil updated XP correctly but never unlocked the next node,
    // leaving those trees permanently stuck after the first lesson. This now
    // applies the same unlock logic to whichever tree is currently active.
    const advanceTree = (prev: SkillNode[]): SkillNode[] => {
      const next = [...prev];
      const activeIdx = next.findIndex((n) => n.status === 'active');
      if (activeIdx >= 0) {
        next[activeIdx] = { ...next[activeIdx], status: 'completed' };
        if (activeIdx + 1 < next.length) {
          next[activeIdx + 1] = { ...next[activeIdx + 1], status: 'active', iconType: 'play' };
        }
      }
      return next;
    };

    if (currentTraditionId === 'sanskrit') {
      setSanskritTree(advanceTree);
    } else if (currentTraditionId === 'pali') {
      setPaliTree(advanceTree);
    } else if (currentTraditionId === 'tamil') {
      setTamilTree(advanceTree);
    }
  };

  const handleEarnXp = (amount: number) => {
    // IMPORTANT: side effects (setTimeout) must never live inside a setState
    // updater function — React may invoke updaters more than once (e.g. in
    // Strict Mode during development) as a safety check, which can cause the
    // side effect to fire inconsistently or appear "delayed until the next
    // interaction," exactly like the modal timing bug this fixes.
    let justAchievedGoal = false;

    setProfile((prev) => {
      // Previously this always added a hardcoded +5 regardless of the actual
      // amount earned (e.g. Picture Quiz awards +10 XP per correct answer),
      // so daily-goal progress didn't match the XP actually being earned.
      const nextDaily = Math.min(prev.maxDailyXp, prev.dailyXp + amount);
      justAchievedGoal = nextDaily >= prev.maxDailyXp && prev.dailyXp < prev.maxDailyXp;

      return {
        ...prev,
        totalXp: prev.totalXp + amount,
        dailyXp: nextDaily,
      };
    });

    if (justAchievedGoal) {
      setTimeout(() => {
        setShowLevelUpModal(true);
      }, 500);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#C5A059]/30 border-t-[#C5A059] rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

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
        onSignOut={handleSignOut}
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
              avatarUrl="/assets/guru-avatar.png"
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
          currentTraditionId={currentTraditionId}
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