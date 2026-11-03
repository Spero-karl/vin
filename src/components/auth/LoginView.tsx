/**
 * Écran de connexion (Palette Premium Retail)
 * Ivoire (#F4F1E9), Vert forêt (#294637), Terracotta (#B87555), Blanc cassé (#FAF8F5)
 * Application : GESTION BOISSONS
 */

import React, { useState } from 'react';
import { useAuth, PREDEFINED_ACCOUNTS, PredefinedAccount } from '../../context/AuthContext';
import { 
  Lock, 
  Mail, 
  User, 
  ShieldCheck, 
  KeyRound, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles,
  Wine,
  Users,
  ArrowRight
} from 'lucide-react';
import { PWAInstallButton } from '../pwa/PWAInstallButton';

interface LoginViewProps {
  onOpenSettings: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onOpenSettings }) => {
  const { 
    signIn, 
    signInWithGoogle,
    signInAsPredefined,
    bootstrapFirstAdmin, 
    resetPassword, 
    isConfigured, 
    error, 
    clearError 
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'quick' | 'login' | 'bootstrap'>('quick');
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bootstrap form state
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');

  // Password reset modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmailInput, setResetEmailInput] = useState('');
  const [resetFeedback, setResetFeedback] = useState<{ success: boolean; msg: string } | null>(null);

  // Local form error
  const [formError, setFormError] = useState<string | null>(null);

  const handleQuickLogin = async (acc: PredefinedAccount) => {
    setIsSubmitting(true);
    setFormError(null);
    clearError();
    const res = await signInAsPredefined(acc);
    setIsSubmitting(false);
    if (!res.success && res.error) {
      setFormError(res.error);
    }
  };

  const handleGoogleLogin = async () => {
    setIsSubmitting(true);
    setFormError(null);
    clearError();
    const res = await signInWithGoogle();
    setIsSubmitting(false);
    if (!res.success && res.error) {
      setFormError(res.error);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    clearError();

    if (!isConfigured) {
      setFormError('Firebase n’est pas configuré. Veuillez vérifier la connexion.');
      return;
    }

    if (!loginEmail.trim() || !loginPassword) {
      setFormError('Veuillez renseigner votre email et mot de passe.');
      return;
    }

    setIsSubmitting(true);
    const res = await signIn(loginEmail, loginPassword);
    setIsSubmitting(false);

    if (!res.success && res.error) {
      setFormError(res.error);
    }
  };

  const handleBootstrapSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    clearError();

    if (!isConfigured) {
      setFormError('Veuillez configurer votre projet Firebase Spark avant de créer le premier compte.');
      return;
    }

    if (!adminName.trim() || !adminEmail.trim() || !adminPassword) {
      setFormError('Tous les champs sont obligatoires.');
      return;
    }

    if (adminPassword.length < 6) {
      setFormError('Le mot de passe doit comporter au moins 6 caractères.');
      return;
    }

    if (adminPassword !== adminConfirmPassword) {
      setFormError('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setIsSubmitting(true);
    const res = await bootstrapFirstAdmin(adminEmail, adminPassword, adminName);
    setIsSubmitting(false);

    if (!res.success && res.error) {
      setFormError(res.error);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmailInput.trim()) return;

    setIsSubmitting(true);
    const res = await resetPassword(resetEmailInput);
    setIsSubmitting(false);

    if (res.success) {
      setResetFeedback({
        success: true,
        msg: `Un email de réinitialisation a été envoyé à ${resetEmailInput}.`,
      });
    } else {
      setResetFeedback({
        success: false,
        msg: res.error || 'Erreur lors de l’envoi de l’email de réinitialisation.',
      });
    }
  };

  return (
    <div className="relative min-h-full flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8 bg-[#FAF8F5] text-[#1F2421] overflow-hidden">
      {/* Fond personnalisé boutique / cave avec voile ivoire */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center bg-no-repeat opacity-20"
        style={{ backgroundImage: `url('/background.jpg')` }}
      />
      <div className="fixed inset-0 pointer-events-none z-0 bg-gradient-to-b from-[#FAF8F5]/90 via-[#FAF8F5]/85 to-[#FAF8F5]/95" />

      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo & Titre */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-[#294637] text-[#FAF8F5] flex items-center justify-center shadow-xs mb-3">
            <Wine className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1F2421]">
            GESTION BOISSONS
          </h1>
          <p className="text-xs text-[#5A625D] mt-1 max-w-xs leading-relaxed">
            Boutique spécialisée en vins, bières, champagnes, spiritueux et jus
          </p>
        </div>

        {/* État de connexion Firebase */}
        {isConfigured ? (
          <div className="mb-4 flex items-center justify-between px-3.5 py-2 rounded-2xl bg-[#FAF8F5] border border-emerald-200 text-xs">
            <div className="flex items-center gap-2 text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="font-medium">Firebase Spark connecté</span>
            </div>
            <button
              onClick={onOpenSettings}
              className="text-[11px] text-[#6A726D] hover:text-[#1F2421] underline"
            >
              Diagnostic
            </button>
          </div>
        ) : (
          <div className="mb-4 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Firebase Spark non configuré</span>
            </div>
            <button
              onClick={onOpenSettings}
              className="text-[11px] text-amber-800 underline font-semibold"
            >
              Paramétrer
            </button>
          </div>
        )}
      </div>

      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[#FAF8F5] py-6 px-6 sm:px-8 shadow-xs rounded-3xl border border-[#E2DDD3]">
          {/* Sélecteur d'onglets */}
          <div className="flex rounded-2xl bg-[#F4F1E9] p-1 mb-5 border border-[#E2DDD3] text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => {
                setActiveTab('quick');
                setFormError(null);
                clearError();
              }}
              className={`flex-1 py-2 text-center rounded-xl transition ${
                activeTab === 'quick'
                  ? 'bg-[#294637] text-[#FAF8F5] shadow-xs'
                  : 'text-[#6A726D] hover:text-[#1F2421]'
              }`}
            >
              Comptes Prêts
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setFormError(null);
                clearError();
              }}
              className={`flex-1 py-2 text-center rounded-xl transition ${
                activeTab === 'login'
                  ? 'bg-[#294637] text-[#FAF8F5] shadow-xs'
                  : 'text-[#6A726D] hover:text-[#1F2421]'
              }`}
            >
              Email / Google
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('bootstrap');
                setFormError(null);
                clearError();
              }}
              className={`flex-1 py-2 text-center rounded-xl transition ${
                activeTab === 'bootstrap'
                  ? 'bg-[#294637] text-[#FAF8F5] shadow-xs'
                  : 'text-[#6A726D] hover:text-[#1F2421]'
              }`}
            >
              Nouveau Patron
            </button>
          </div>

          {/* Affichage des erreurs */}
          {(formError || error) && (
            <div className="mb-5 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{formError || error}</span>
            </div>
          )}

          {activeTab === 'quick' ? (
            /* 1. Sélection rapide des comptes */
            <div className="space-y-3.5">
              <div className="p-3 rounded-2xl bg-[#F4F1E9] border border-[#E2DDD3] text-xs text-[#5A625D]">
                <p className="font-semibold text-[#1F2421] flex items-center gap-1.5 mb-0.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#B87555]" />
                  Comptes configurés pour votre boutique :
                </p>
                <p className="text-[11px] leading-relaxed">
                  Sélectionnez un profil pour vous connecter directement :
                </p>
              </div>

              <div className="space-y-2">
                {/* 1. Compte Administrateur / Patron */}
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleGoogleLogin}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-[#294637] text-[#FAF8F5] hover:bg-[#1E3429] transition text-left group shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/10 text-white flex items-center justify-center font-bold text-xs group-hover:scale-105 transition">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>Karl Freaton (Patron)</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-white/20 text-white">
                          Google Auth
                        </span>
                      </div>
                      <div className="text-[11px] text-white/80">
                        karlfreaton@gmail.com • Accès complet Cloud Firestore
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-white/70 group-hover:text-white group-hover:translate-x-1 transition-transform" />
                </button>

                {/* 2. Collaborateur */}
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleQuickLogin(PREDEFINED_ACCOUNTS[1])}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-[#F4F1E9] border border-[#E2DDD3] hover:border-[#B87555] hover:bg-[#EFEAE1] transition text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#B87555] text-[#FAF8F5] flex items-center justify-center font-bold text-xs group-hover:scale-105 transition">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#1F2421] flex items-center gap-1.5">
                        <span>{PREDEFINED_ACCOUNTS[1].displayName}</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-[#B87555]/10 text-[#B87555]">
                          Collaborateur
                        </span>
                      </div>
                      <div className="text-[11px] text-[#6A726D]">
                        {PREDEFINED_ACCOUNTS[1].email}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#7A847E] group-hover:text-[#B87555] group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              {/* Bouton Google Login officiel */}
              <div className="pt-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleGoogleLogin}
                  className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-2xl border border-[#E2DDD3] bg-[#F4F1E9] hover:bg-[#EFEAE1] text-xs font-semibold text-[#1F2421] transition"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Connexion Google (karlfreaton@gmail.com)</span>
                </button>
              </div>
            </div>
          ) : activeTab === 'login' ? (
            /* 2. Formulaire email / mot de passe */
            <form onSubmit={handleLoginSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-[#1F2421] mb-1">
                  Adresse email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#7A847E] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="ex: karlfreaton@gmail.com"
                    className="w-full pl-9 pr-3 py-2 bg-[#F4F1E9] border border-[#E2DDD3] rounded-xl text-[#1F2421] focus:ring-1 focus:ring-[#294637]"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-[#1F2421]">
                    Mot de passe
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setResetEmailInput(loginEmail);
                      setShowForgotModal(true);
                    }}
                    className="text-[11px] text-[#B87555] hover:underline"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#7A847E] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 bg-[#F4F1E9] border border-[#E2DDD3] rounded-xl text-[#1F2421] focus:ring-1 focus:ring-[#294637]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-xl bg-[#294637] hover:bg-[#1E3429] text-[#FAF8F5] font-bold transition disabled:opacity-50"
              >
                {isSubmitting ? 'Connexion...' : 'Se connecter'}
              </button>
            </form>
          ) : (
            /* 3. Nouveau compte patron */
            <form onSubmit={handleBootstrapSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-[#1F2421] mb-1">Nom du patron</label>
                <input
                  type="text"
                  required
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="ex: Karl (Propriétaire)"
                  className="w-full px-3 py-2 bg-[#F4F1E9] border border-[#E2DDD3] rounded-xl text-[#1F2421]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#1F2421] mb-1">Email du patron</label>
                <input
                  type="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="karlfreaton@gmail.com"
                  className="w-full px-3 py-2 bg-[#F4F1E9] border border-[#E2DDD3] rounded-xl text-[#1F2421]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#1F2421] mb-1">Mot de passe (6 car. min)</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-[#F4F1E9] border border-[#E2DDD3] rounded-xl text-[#1F2421]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#1F2421] mb-1">Confirmer mot de passe</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={adminConfirmPassword}
                  onChange={(e) => setAdminConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-[#F4F1E9] border border-[#E2DDD3] rounded-xl text-[#1F2421]"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-xl bg-[#294637] hover:bg-[#1E3429] text-[#FAF8F5] font-bold transition disabled:opacity-50"
              >
                {isSubmitting ? 'Création...' : 'Créer le compte Patron'}
              </button>
            </form>
          )}

          {/* Bouton installation PWA */}
          <div className="mt-6 pt-4 border-t border-[#E8E4DA]">
            <PWAInstallButton variant="banner" />
          </div>
        </div>
      </div>
    </div>
  );
};
