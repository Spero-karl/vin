/**
 * Bouton d'installation de l'application PWA (Android / iPhone / Ordinateur)
 * Application : GESTION BOISSONS
 */

import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Download, Share2, Smartphone, X } from 'lucide-react';

interface PWAInstallButtonProps {
  variant?: 'header' | 'sidebar' | 'banner';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'header' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);

  // Si l'application s'exécute déjà en mode PWA installé, ne pas afficher
  if (isInstalled) {
    return null;
  }

  // Si le navigateur n'est ni iOS ni n'a déclenché beforeinstallprompt, masquer sauf si variant banner
  if (!isInstallable && !isIOS && variant !== 'banner') {
    return null;
  }

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
    } else if (isInstallable) {
      await install();
    } else {
      setShowIOSModal(true);
    }
  };

  return (
    <>
      {variant === 'sidebar' ? (
        <button
          onClick={handleInstallClick}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-600/10 hover:from-amber-500/30 hover:to-amber-600/20 text-amber-300 border border-amber-500/30 text-xs font-medium transition group"
        >
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-105 transition">
            <Download className="w-4 h-4" />
          </div>
          <div className="text-left">
            <div className="font-semibold text-slate-100">Installer l'application</div>
            <div className="text-[10px] text-amber-300/80">PWA Android & iPhone</div>
          </div>
        </button>
      ) : variant === 'banner' ? (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-100">Utilisation sur mobile (Android & iPhone)</p>
              <p className="text-xs text-slate-400">Installez l'app sur votre écran d'accueil sans passer par un store payant.</p>
            </div>
          </div>
          <button
            onClick={handleInstallClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold shadow transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Installer</span>
          </button>
        </div>
      ) : (
        <button
          onClick={handleInstallClick}
          title="Installer l'application sur cet appareil"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-medium transition"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Installer l'application</span>
        </button>
      )}

      {/* Guide modal pour iPhone / iPad Safari */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-sm rounded-2xl bg-slate-800 border border-slate-700 p-6 shadow-2xl text-slate-100">
            <button
              onClick={() => setShowIOSModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
              <Smartphone className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-white mb-2">
              Installer sur iPhone / iPad
            </h3>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Pour ajouter l'application <span className="font-semibold text-amber-400">Gestion Boissons</span> sur votre écran d'accueil :
            </p>

            <ol className="space-y-3 text-xs text-slate-300 mb-6 bg-slate-900/60 p-3.5 rounded-xl border border-slate-700/60">
              <li className="flex items-start gap-2.5">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-[10px]">1</span>
                <span>
                  Ouvrez cette page dans <strong>Safari</strong> et touchez l'icône <strong>Partager</strong> <Share2 className="w-3.5 h-3.5 inline mx-0.5 text-sky-400" /> en bas de l'écran.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-[10px]">2</span>
                <span>
                  Faites défiler vers le bas et sélectionnez <strong>« Sur l'écran d'accueil »</strong>.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-[10px]">3</span>
                <span>
                  Touchez <strong>« Ajouter »</strong> en haut à droite. L'icône apparaîtra comme une vraie application.
                </span>
              </li>
            </ol>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold transition"
            >
              J'ai compris
            </button>
          </div>
        </div>
      )}
    </>
  );
};
