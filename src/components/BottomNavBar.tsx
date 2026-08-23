import React from 'react';
import { Home, GraduationCap, Compass, Dumbbell, User, MessageCircleQuestion } from 'lucide-react';

interface BottomNavBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'learn', label: 'Learn', icon: GraduationCap },
    { id: 'explore', label: 'Explore', icon: Compass },
    { id: 'practice', label: 'Practice', icon: Dumbbell },
    { id: 'askguru', label: 'Guru', icon: MessageCircleQuestion },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full z-40 flex justify-around items-center px-1.5 py-2.5 backdrop-blur-md bg-[#0A0A0A]/95 border-t border-white/10 shadow-[0_-4px_24px_rgba(0,0,0,0.8)]">
      {tabs.map((tab) => {
        const IconComponent = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            id={`tab-btn-${tab.id}`}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center justify-center transition-all duration-200 cursor-pointer ${isActive
                ? 'bg-[#C5A059] text-[#0A0A0A] rounded-full px-3 py-1.5 shadow-md shadow-[#C5A059]/20 scale-100 font-semibold'
                : 'text-white/50 hover:text-[#C5A059] px-2 py-1 scale-95'
              }`}
          >
            <IconComponent className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
            <span className="text-[9px] uppercase tracking-wider font-medium mt-0.5">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};