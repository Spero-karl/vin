/**
 * Barre de navigation mobile inférieure élégante (5 rubriques)
 * Palette : Fond Ivoire/Blanc cassé, Vert forêt actif (#294637)
 * Application : GESTION BOISSONS
 */

import React from 'react';
import { NavigationTab, MAIN_NAVIGATION } from '../../types/navigation';
import { UserRole } from '../../types/auth';
import { Home, Wine, ReceiptText, TrendingUp, Menu as MenuIcon } from 'lucide-react';

interface BottomNavProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  userRole: UserRole;
}

const ICON_MAP = {
  Home,
  Wine,
  ReceiptText,
  TrendingUp,
  Menu: MenuIcon,
};

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onSelectTab, userRole }) => {
  const isAdmin = userRole === 'admin';

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FAF8F5]/95 backdrop-blur-md border-t border-[#E2DDD3] px-2 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] shadow-xs">
      <div className="flex items-center justify-around">
        {MAIN_NAVIGATION.map((item) => {
          // Si finances et collaborateur non-admin, masquer
          if (item.adminOnly && !isAdmin) {
            return null;
          }

          const Icon = ICON_MAP[item.iconName] || Home;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-xl transition ${
                isActive
                  ? 'text-[#294637] font-bold'
                  : 'text-[#6A726D] hover:text-[#1F2421]'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 text-[#294637]' : 'text-[#6A726D]'}`} strokeWidth={isActive ? 2 : 1.75} />
              </div>
              <span className={`text-[10px] mt-0.5 tracking-tight ${isActive ? 'font-bold text-[#294637]' : 'font-medium'}`}>
                {item.label}
              </span>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#294637] mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
