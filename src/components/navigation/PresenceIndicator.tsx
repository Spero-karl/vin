/**
 * Indicateur de présence discret façon Messenger (En-tête haut-droite)
 * Affiche : [point vert] [compteur] [icône profil] + Popover flottant ancré
 * Application : GESTION BOISSONS
 */

import React, { useEffect, useRef, useState } from 'react';
import { listenToOnlineUsers } from '../../services/presence';
import { UserPresence, UserRole, ROLE_DEFINITIONS } from '../../types/auth';
import { Users, X, Circle, ShieldCheck, User } from 'lucide-react';

interface PresenceIndicatorProps {
  currentUserId: string;
  currentUserDisplayName: string;
  currentUserRole: UserRole;
  onOpenProfile?: () => void;
}

export const PresenceIndicator: React.FC<PresenceIndicatorProps> = ({
  currentUserId,
  currentUserDisplayName,
  currentUserRole,
  onOpenProfile,
}) => {
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Écoute en temps réel des utilisateurs connectés
  useEffect(() => {
    const unsub = listenToOnlineUsers((list) => {
      // S'assurer que l'utilisateur courant est compté s'il n'est pas encore dans la liste
      const exists = list.some(u => u.uid === currentUserId);
      if (!exists && currentUserId) {
        setOnlineUsers([
          ...list,
          {
            uid: currentUserId,
            displayName: currentUserDisplayName,
            email: '',
            role: currentUserRole,
            isOnline: true,
            lastSeen: Date.now(),
          },
        ]);
      } else {
        setOnlineUsers(list);
      }
    });

    return () => unsub();
  }, [currentUserId, currentUserDisplayName, currentUserRole]);

  // Fermeture automatique lors d'un clic à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const onlineCount = onlineUsers.length > 0 ? onlineUsers.length : 1;
  const userInitials = currentUserDisplayName
    ? currentUserDisplayName
        .split(' ')
        .map(n => n.charAt(0))
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'U';

  return (
    <div className="relative" ref={containerRef}>
      {/* Bouton déclencheur discret façon Messenger : [point vert] [nombre] [avatar/profil] */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        title="Voir les utilisateurs actuellement en ligne"
        className="flex items-center gap-2 pl-2.5 pr-1.5 py-1 rounded-full bg-[#FAF8F5] hover:bg-[#EFEAE1] border border-[#E2DDD3] text-[#1F2421] transition shadow-xs focus:outline-none focus:ring-1 focus:ring-[#294637]"
      >
        {/* Point vert pulsating */}
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>

        {/* Compteur discret de connectés */}
        <span className="text-xs font-semibold tracking-tight text-[#294637]">
          {onlineCount}
        </span>

        {/* Avatar avec initiales */}
        <div className="w-6 h-6 rounded-full bg-[#294637] text-[#FAF8F5] flex items-center justify-center text-[10px] font-bold tracking-wider">
          {userInitials}
        </div>
      </button>

      {/* Popover flottant ancré */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50 w-72 sm:w-80 rounded-2xl bg-[#FAF8F5] border border-[#E2DDD3] shadow-lg text-[#1F2421] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* En-tête de la fenêtre flottante */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#E8E4DA] bg-[#F4F1E9]/60">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <h4 className="text-xs font-bold text-[#1F2421] tracking-tight">
                Utilisateurs en ligne
              </h4>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[#294637]/10 text-[#294637]">
                {onlineCount}
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-[#6A726D] hover:text-[#1F2421] hover:bg-[#E8E4DA] transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Liste des utilisateurs réels connectés */}
          <div className="p-2 max-h-72 overflow-y-auto divide-y divide-[#F0ECE2]">
            {onlineUsers.map((usr) => {
              const isSelf = usr.uid === currentUserId;
              const initials = usr.displayName
                ? usr.displayName.split(' ').map(n => n.charAt(0)).join('').slice(0, 2).toUpperCase()
                : 'U';
              const roleMeta = ROLE_DEFINITIONS[usr.role] || ROLE_DEFINITIONS.collaborator;

              return (
                <div
                  key={usr.uid}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[#F4F1E9]/80 transition"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Avatar avec badge point vert */}
                    <div className="relative shrink-0">
                      <div className="w-8 h-8 rounded-full bg-[#294637]/15 text-[#294637] flex items-center justify-center font-bold text-xs">
                        {initials}
                      </div>
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#FAF8F5]" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-[#1F2421] truncate">
                          {usr.displayName}
                        </span>
                        {isSelf && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-[#B87555]/15 text-[#B87555] font-bold">
                            Vous
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-[#6A726D] truncate">
                        {usr.email || (usr.role === 'admin' ? 'Administrateur' : 'Collaborateur')}
                      </div>
                    </div>
                  </div>

                  <span className={`shrink-0 text-[9px] px-2 py-0.5 rounded-full font-semibold border ${roleMeta.badgeBg} ${roleMeta.badgeText} ${roleMeta.badgeBorder}`}>
                    {roleMeta.shortLabel}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Pied de popover */}
          <div className="px-4 py-2.5 bg-[#F4F1E9] border-t border-[#E8E4DA] text-[10px] text-[#6A726D] flex items-center justify-between">
            <span>Synchronisation temps réel</span>
            <span className="text-emerald-700 font-medium flex items-center gap-1">
              <Circle className="w-1.5 h-1.5 fill-emerald-600" />
              onDisconnect actif
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
