/**
 * Barre de navigation latérale discrète (Bureau et tablettes)
 * Palette : Ivoire, Vert forêt (#294637), Terracotta (#B87555)
 * Application : GESTION BOISSONS
 */

import React from 'react';
import { NavigationTab, MAIN_NAVIGATION } from '../../types/navigation';
import { UserRole, ROLE_DEFINITIONS } from '../../types/auth';
import { 
  Home, 
  Wine, 
  ReceiptText, 
  TrendingUp, 
  Menu as MenuIcon, 
  LogOut, 
  ShieldCheck, 
  Coins 
} from 'lucide-react';
import { PWAInstallButton } from '../pwa/PWAInstallButton';

interface SidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  userRole: UserRole;
  userDisplayName: string;
  userEmail: string;
  onSignOut: () => void;
}

const ICON_MAP = {
  Home,
  Wine,
  ReceiptText,
  TrendingUp,
  Menu: MenuIcon,
};

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  userRole,
  userDisplayName,
  userEmail,
  onSignOut,
}) => {
  const roleMeta = ROLE_DEFINITIONS[userRole] || ROLE_DEFINITIONS.collaborator;
  const isAdmin = userRole === 'admin';

  return (
    <aside className="hidden lg:flex flex-col w-60 bg-[#FAF8F5] border-r border-[#E2DDD3] p-4 select-none shrink-0 transition-colors">
      {/* Brand & Logo */}
      <div className="flex items-center gap-3 px-2 py-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-[#294637] flex items-center justify-center text-[#FAF8F5] shadow-xs">
          <Wine className="w-5 h-5" />
        </div>
        <div className="overflow-hidden">
          <h2 className="text-sm font-bold tracking-tight text-[#1F2421] leading-tight">
            GESTION BOISSONS
          </h2>
          <p className="text-[10px] text-[#B87555] font-semibold tracking-wide uppercase">
            Boutique & Cave
          </p>
        </div>
      </div>

      {/* Profil connecté discret */}
      <div className="mb-5 p-3 rounded-2xl bg-[#F4F1E9] border border-[#E2DDD3]">
        <div className="flex items-center justify-between mb-1">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${roleMeta.badgeBg} ${roleMeta.badgeText} ${roleMeta.badgeBorder}`}>
            <ShieldCheck className="w-3 h-3" />
            {roleMeta.shortLabel}
          </span>
          <span className="text-[10px] font-bold text-[#294637]">FCFA</span>
        </div>
        <div className="text-xs font-semibold text-[#1F2421] truncate" title={userDisplayName}>
          {userDisplayName}
        </div>
        <div className="text-[10px] text-[#6A726D] truncate" title={userEmail}>
          {userEmail}
        </div>
      </div>

      {/* 5 Rubriques principales */}
      <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
        <div className="px-2 py-1 text-[10px] font-bold text-[#6A726D] uppercase tracking-wider">
          Navigation
        </div>

        {MAIN_NAVIGATION.map((item) => {
          // Si finances et non admin, on masque ou on affiche avec verrou
          if (item.adminOnly && !isAdmin) {
            return null;
          }

          const IconComponent = ICON_MAP[item.iconName] || Home;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                isActive
                  ? 'bg-[#294637] text-[#FAF8F5] font-semibold shadow-xs'
                  : 'text-[#1F2421] hover:bg-[#EFEAE1]'
              }`}
            >
              <div className="flex items-center gap-3 truncate">
                <IconComponent
                  className={`w-4 h-4 shrink-0 transition ${
                    isActive ? 'text-[#FAF8F5]' : 'text-[#6A726D]'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>

              {item.adminOnly && (
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                  isActive ? 'bg-[#FAF8F5]/20 text-[#FAF8F5]' : 'bg-[#B87555]/10 text-[#B87555]'
                }`}>
                  Admin
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Pied de barre latérale */}
      <div className="pt-3 mt-2 border-t border-[#E2DDD3] space-y-2">
        <PWAInstallButton variant="sidebar" />

        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-[#6A726D] hover:text-rose-700 hover:bg-rose-50 transition"
        >
          <LogOut className="w-4 h-4 text-[#7A847E]" />
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>
  );
};
