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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsCheckingAuth(false);
    });

    // Keep session state in sync with login/logout/token refresh events.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const [activeTab, setActiveTab] = useState<string>('home');

  // Storage is now scoped per logged-in user (via their Supabase user ID),
  // not shared globally across every account on the same browser. Previously
  // all keys were flat strings like 'vakya_profile', so switching accounts
  // on the same device would show one user's progress to another. userId is
  // null until the session resolves, so storageKey() safely no-ops (returns
  // null) until then — callers check for that.
  const userId = session?.user?.id ?? null;
  const storageKey = (base: string): string | null => (userId ? `vakya_${userId}_${base}` : null);

  const loadSaved = <T,>(key: string | null, fallback: T): T => {
    if (!key) return fallback;
    try {
      const saved = localStorage.getItem(key);
      return saved ? (JSON.parse(saved) as T) : fallback;
    } catch {
      return fallback;
    }
  };

  const [currentTraditionId, setCurrentTraditionId] = useState<TraditionId>('sanskrit');
  const [isTraditionModalOpen, setIsTraditionModalOpen] = useState(false);
  const [activeLessonNode, setActiveLessonNode] = useState<SkillNode | null>(null);
  const [showLevelUpModal, setShowLevelUpModal] = useState<boolean>(false);

  const [profile, setProfile] = useState<UserProfile>(INITIAL_PROFILE);
  const [sanskritTree, setSanskritTree] = useState<SkillNode[]>(SANSKRIT_SKILL_TREE);
  const [paliTree, setPaliTree] = useState<SkillNode[]>(PALI_SKILL_TREE);
  const [tamilTree, setTamilTree] = useState<SkillNode[]>(TAMIL_SKILL_TREE);
  const [hasLoadedForUser, setHasLoadedForUser] = useState<string | null>(null);

  // Real streak tracking — previously profile.streakDays was just a static
  // number from the initial mock data (always "1"), with no logic anywhere
  // that actually checked calendar dates. This computes the real streak by
  // comparing today's date against the last day the user was recorded active:
  // - Same day as last visit → no change (already counted today)
  // - Exactly one day after last visit → streak continues, +1
  // - A gap of more than one day → streak resets to 1
  // - No prior record at all (first-ever visit) → streak starts at 1
  // Waits for hasLoadedForUser to match, so it never runs against the
  // transient default profile before this user's real saved data has loaded.
  useEffect(() => {
    if (!session || hasLoadedForUser !== userId) return;

    const lastActiveKey = storageKey('lastActiveDate');
    const streakKey = storageKey('streakDays');
    if (!lastActiveKey || !streakKey) return;

    const todayStr = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
    const lastActiveStr = localStorage.getItem(lastActiveKey);

    if (lastActiveStr === todayStr) {
      return; // already counted today, nothing to do
    }

    let newStreak = 1;

    if (lastActiveStr) {
      const lastActive = new Date(lastActiveStr + 'T00:00:00');
      const today = new Date(todayStr + 'T00:00:00');
      const dayDiff = Math.round((today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));

      if (dayDiff === 1) {
        const savedStreak = parseInt(localStorage.getItem(streakKey) || '1', 10);
        newStreak = savedStreak + 1;
      }
    }

    localStorage.setItem(lastActiveKey, todayStr);
    localStorage.setItem(streakKey, String(newStreak));

    setProfile((prev) => ({ ...prev, streakDays: newStreak }));
  }, [session, userId, hasLoadedForUser]);

  // Once the real user ID is known, load THIS user's saved progress (if any)
  // — or, for a genuinely brand-new account, start completely fresh and sync
  // their real name/email into the profile instead of showing the hardcoded
  // "Ananda M." placeholder from the mock data.
  useEffect(() => {
    if (!userId || hasLoadedForUser === userId) return;

    const savedProfile = loadSaved<UserProfile | null>(storageKey('profile'), null);

    if (savedProfile) {
      setProfile(savedProfile);
    } else {
      // Brand-new account — build a real starting profile from their actual
      // Supabase user data instead of the generic mock default.
      const user = session?.user;
      const displayName =
        user?.user_metadata?.name ||
        user?.user_metadata?.full_name ||
        user?.email?.split('@')[0] ||
        'Scholar';
      const avatarUrl = user?.user_metadata?.avatar_url || INITIAL_PROFILE.avatarUrl;

      setProfile({
        ...INITIAL_PROFILE,
        name: displayName,
        avatarUrl,
        totalXp: 0,
        streakDays: 0,
        dailyXp: 0,
        languageMastery: { sanskrit: 0, pali: 0, tamil: 0 },
      });
    }

    setCurrentTraditionId(loadSaved(storageKey('currentTraditionId'), 'sanskrit' as TraditionId));
    setSanskritTree(loadSaved(storageKey('sanskritTree'), SANSKRIT_SKILL_TREE));
    setPaliTree(loadSaved(storageKey('paliTree'), PALI_SKILL_TREE));
    setTamilTree(loadSaved(storageKey('tamilTree'), TAMIL_SKILL_TREE));
    setHasLoadedForUser(userId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Persist to localStorage whenever any of this progress changes — only
  // once we've actually loaded this user's data (avoids overwriting saved
  // progress with the transient default state during the brief window
  // before the load effect above runs).
  useEffect(() => {
    const key = storageKey('currentTraditionId');
    if (key && hasLoadedForUser === userId) localStorage.setItem(key, JSON.stringify(currentTraditionId));
  }, [currentTraditionId, userId, hasLoadedForUser]);

  useEffect(() => {
    const key = storageKey('profile');
    if (key && hasLoadedForUser === userId) localStorage.setItem(key, JSON.stringify(profile));
  }, [profile, userId, hasLoadedForUser]);

  useEffect(() => {
    const key = storageKey('sanskritTree');
    if (key && hasLoadedForUser === userId) localStorage.setItem(key, JSON.stringify(sanskritTree));
  }, [sanskritTree, userId, hasLoadedForUser]);

  useEffect(() => {
    const key = storageKey('paliTree');
    if (key && hasLoadedForUser === userId) localStorage.setItem(key, JSON.stringify(paliTree));
  }, [paliTree, userId, hasLoadedForUser]);

  useEffect(() => {
    const key = storageKey('tamilTree');
    if (key && hasLoadedForUser === userId) localStorage.setItem(key, JSON.stringify(tamilTree));
  }, [tamilTree, userId, hasLoadedForUser]);

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