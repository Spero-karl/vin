/**
 * En-tête supérieur élégant et minimaliste (Premium Retail)
 * Intègre l'indicateur de présence discret façon Messenger à droite
 * Application : GESTION BOISSONS
 */

import React from 'react';
import { NavigationTab, MAIN_NAVIGATION } from '../../types/navigation';
import { UserRole } from '../../types/auth';
import { PresenceIndicator } from './PresenceIndicator';
import { PWAInstallButton } from '../pwa/PWAInstallButton';
import { Wine, Coins } from 'lucide-react';

interface TopHeaderProps {
  currentTab: NavigationTab;
  userRole: UserRole;
  userDisplayName: string;
  userId: string;
  onOpenProfile?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  currentTab,
  userRole,
  userDisplayName,
  userId,
  onOpenProfile,
}) => {
  const currentItem = MAIN_NAVIGATION.find(item => item.id === currentTab) || MAIN_NAVIGATION[0];

  return (
    <header className="sticky top-0 z-30 bg-[#FAF8F5]/90 backdrop-blur-md border-b border-[#E2DDD3] px-4 sm:px-6 py-2.5 flex items-center justify-between transition-colors">
      {/* Côté gauche : Marque et Titre de la rubrique active */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-[#294637] text-[#FAF8F5] flex items-center justify-center shadow-xs">
          <Wine className="w-4 h-4" />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm sm:text-base font-bold text-[#1F2421] tracking-tight">
              {currentItem.label}
            </h1>
            <span className="text-[10px] text-[#6A726D] font-medium tracking-wide uppercase hidden sm:inline">
              • Boutique
            </span>
          </div>
          <p className="hidden md:block text-[11px] text-[#6A726D]">
            {currentItem.description}
          </p>
        </div>
      </div>

      {/* Côté droit : Monnaie FCFA + PWA + Indicateur Messenger Présence [vert] 3 [avatar] */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Badge Monnaie FCFA */}
        <div 
          className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#F4F1E9] border border-[#E2DDD3] text-[11px] font-semibold text-[#294637]"
          title="Monnaie légale de vente : Franc CFA"
        >
          <Coins className="w-3 h-3 text-[#B87555]" />
          <span>FCFA</span>
        </div>

        {/* Bouton installation PWA */}
        <PWAInstallButton variant="header" />

        {/* Système de Présence Discret de type Messenger */}
        <PresenceIndicator
          currentUserId={userId}
          currentUserDisplayName={userDisplayName}
          currentUserRole={userRole}
          onOpenProfile={onOpenProfile}
        />
      </div>
    </header>
  );
};
