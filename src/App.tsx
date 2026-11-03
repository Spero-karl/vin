/**
 * Application principale : GESTION BOISSONS (Architecture Premium Retail)
 * 5 Rubriques : Accueil, Produits, Ventes, Finances, Menu
 * Présence discrète façon Messenger en haut à droite
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NavigationTab, MenuSubView } from './types/navigation';
import { Sidebar } from './components/navigation/Sidebar';
import { BottomNav } from './components/navigation/BottomNav';
import { TopHeader } from './components/navigation/TopHeader';
import { DashboardView } from './components/dashboard/DashboardView';
import { ProductsView } from './components/products/ProductsView';
import { SalesView } from './components/sales/SalesView';
import { FinancesView } from './components/finances/FinancesView';
import { MenuView } from './components/menu/MenuView';
import { LoginView } from './components/auth/LoginView';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import { Wine, Loader2, ArrowLeft } from 'lucide-react';
import { SettingsView } from './components/settings/SettingsView';

function AppContent() {
  const { user, profile, loading, signOut, isConfigured } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavigationTab>('dashboard');
  const [menuSubView, setMenuSubView] = useState<MenuSubView>('main');
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const handleNavigate = (tab: NavigationTab, subView?: MenuSubView) => {
    setCurrentTab(tab);
    if (subView) {
      setMenuSubView(subView);
    }
  };

  // État de chargement initial de session
  if (loading) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center bg-[#F4F1E9] text-[#1F2421] p-4">
        <div className="w-14 h-14 rounded-2xl bg-[#294637] text-[#FAF8F5] flex items-center justify-center mb-4 shadow-sm animate-pulse">
          <Wine className="w-7 h-7" />
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-[#5A625D]">
          <Loader2 className="w-4 h-4 animate-spin text-[#294637]" />
          <span>Ouverture de la boutique...</span>
        </div>
      </div>
    );
  }

  // Si l'utilisateur n'est pas connecté
  if (!user && !profile) {
    return (
      <>
        <OfflineIndicator />
        {showSettingsModal ? (
          <div className="min-h-full bg-[#F4F1E9] text-[#1F2421] p-4 sm:p-8">
            <div className="max-w-4xl mx-auto mb-6">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#FAF8F5] border border-[#E2DDD3] hover:bg-[#EFEAE1] text-xs font-semibold text-[#1F2421] transition shadow-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Retour à l'écran de connexion</span>
              </button>
            </div>
            <SettingsView />
          </div>
        ) : (
          <LoginView onOpenSettings={() => setShowSettingsModal(true)} />
        )}
      </>
    );
  }

  const activeRole = profile?.role || 'collaborator';
  const activeDisplayName = profile?.displayName || user?.email || 'Collaborateur';
  const activeUid = profile?.uid || user?.uid || 'usr_anonymous';
  const activeEmail = profile?.email || user?.email || '';

  return (
    <div className="relative flex h-full bg-[#FAF8F5] text-[#1F2421] overflow-hidden font-sans">
      {/* Fond personnalisé boutique / cave de prestige avec voile ivoire protecteur */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center bg-no-repeat transition-opacity duration-700 opacity-25"
        style={{ backgroundImage: `url('/background.jpg')` }}
      />
      <div className="fixed inset-0 pointer-events-none z-0 bg-gradient-to-b from-[#FAF8F5]/90 via-[#FAF8F5]/80 to-[#FAF8F5]/95" />

      <OfflineIndicator />

      {/* Barre latérale discrète pour bureau / tablette */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        userRole={activeRole}
        userDisplayName={activeDisplayName}
        userEmail={activeEmail}
        onSignOut={signOut}
      />

      {/* Espace central de contenu */}
      <div className="relative z-10 flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* En-tête avec système Messenger discret en haut à droite */}
        <TopHeader
          currentTab={currentTab}
          userRole={activeRole}
          userDisplayName={activeDisplayName}
          userId={activeUid}
          onOpenProfile={() => setCurrentTab('menu')}
        />

        {/* Corps principal scrollable */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8">
          {currentTab === 'dashboard' && (
            <DashboardView onNavigate={handleNavigate} />
          )}

          {currentTab === 'products' && (
            <ProductsView />
          )}

          {currentTab === 'sales' && (
            <SalesView />
          )}

          {currentTab === 'finances' && (
            <FinancesView />
          )}

          {currentTab === 'menu' && (
            <MenuView initialSubView={menuSubView} onSignOut={signOut} />
          )}
        </main>

        {/* Barre inférieure mobile élégante */}
        <BottomNav
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          userRole={activeRole}
        />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
