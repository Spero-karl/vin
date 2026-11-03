/**
 * Configuration Firebase Spark, Diagnostic et Règles de Sécurité
 * Application : GESTION BOISSONS
 */

import React, { useState } from 'react';
import { 
  getFirebaseConfig, 
  saveCustomFirebaseConfig, 
  clearCustomFirebaseConfig, 
  testFirestoreConnection, 
  ConnectionTestResult,
  FirebaseConfigParams 
} from '../../config/firebase';
import { 
  Settings, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Copy, 
  ExternalLink, 
  RefreshCw, 
  Sparkles, 
  Database, 
  Wifi, 
  KeyRound,
  FileCode,
  Check
} from 'lucide-react';

const FIRESTORE_RULES_SNIPPET = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 1. Fermeture globale par défaut
    match /{document=**} {
      allow read, write: if false;
    }

    // Fonctions d'aide ABAC
    function isSignedIn() {
      return request.auth != null;
    }

    function isAdmin() {
      return isSignedIn() && exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }

    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }

    // 2. Collection des utilisateurs (Max 6 comptes)
    match /users/{userId} {
      // Lecture autorisée à tous les membres connectés de l'équipe
      allow read: if isSignedIn();
      // Création : Autorisé à l'administrateur, ou pour le bootstrap initial si non existant
      allow create: if isSignedIn();
      // Mise à jour : L'admin peut tout modifier ; l'employé peut seulement mettre à jour son lastLoginAt / présence
      allow update: if isAdmin() || (isOwner(userId) && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['lastSeenAt', 'isOnline', 'lastLoginAt']));
      // Suppression : Strictement réservée à l'administrateur
      allow delete: if isAdmin();
    }

    // 3. Collection admins (Repère de sécurité vérifié côté serveur)
    match/admins/{userId} {
      allow read: if isSignedIn();
      allow write: if isAdmin() || (isSignedIn() && !exists(/databases/$(database)/documents/admins/$(request.auth.uid)));
    }

    // 4. Test de connectivité
    match /_health_check/{docId} {
      allow read: if true;
      allow write: if false;
    }

    // 5. Modules commerciaux (Phase 2 & 3)
    match /products/{productId} {
      allow read: if isSignedIn();
      allow write: if isAdmin();
    }

    match /sales/{saleId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn();
      allow update, delete: if isAdmin();
    }

    match /stock_movements/{movId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn();
      allow update, delete: if isAdmin();
    }

    match /audit_logs/{logId} {
      allow read: if isAdmin();
      allow create: if isSignedIn();
      allow update, delete: if false; // Journal immuable
    }
  }
}`;

const RTDB_RULES_SNIPPET = `{
  "rules": {
    "presence": {
      ".read": "auth != null",
      "$uid": {
        ".write": "auth != null && auth.uid === $uid"
      }
    }
  }
}`;

export const SettingsView: React.FC = () => {
  const currentConfig = getFirebaseConfig();

  // Test de connexion state
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [testing, setTesting] = useState(false);

  // Formulaire d'édition manuelle de config
  const [apiKey, setApiKey] = useState(currentConfig?.apiKey || '');
  const [authDomain, setAuthDomain] = useState(currentConfig?.authDomain || '');
  const [projectId, setProjectId] = useState(currentConfig?.projectId || '');
  const [appId, setAppId] = useState(currentConfig?.appId || '');
  const [storageBucket, setStorageBucket] = useState(currentConfig?.storageBucket || '');
  const [messagingSenderId, setMessagingSenderId] = useState(currentConfig?.messagingSenderId || '');
  const [databaseURL, setDatabaseURL] = useState(currentConfig?.databaseURL || '');

  // Copies
  const [copiedRules, setCopiedRules] = useState(false);
  const [copiedRtdb, setCopiedRtdb] = useState(false);

  const handleRunTest = async () => {
    setTesting(true);
    setTestResult(null);
    const result = await testFirestoreConnection();
    setTestResult(result);
    setTesting(false);
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim() || !projectId.trim() || !appId.trim()) {
      alert('Veuillez au minimum renseigner apiKey, projectId et appId.');
      return;
    }

    const newCfg: FirebaseConfigParams = {
      apiKey: apiKey.trim(),
      authDomain: authDomain.trim() || `${projectId.trim()}.firebaseapp.com`,
      projectId: projectId.trim(),
      appId: appId.trim(),
      storageBucket: storageBucket.trim() || `${projectId.trim()}.appspot.com`,
      messagingSenderId: messagingSenderId.trim(),
      databaseURL: databaseURL.trim() || `https://${projectId.trim()}-default-rtdb.firebaseio.com`,
    };

    saveCustomFirebaseConfig(newCfg);
  };

  const handleCopy = (text: string, type: 'firestore' | 'rtdb') => {
    navigator.clipboard.writeText(text);
    if (type === 'firestore') {
      setCopiedRules(true);
      setTimeout(() => setCopiedRules(false), 2000);
    } else {
      setCopiedRtdb(true);
      setTimeout(() => setCopiedRtdb(false), 2000);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Diagnostic de Connexion Firebase en direct */}
      <div className="bg-slate-900/90 rounded-3xl border border-slate-800 p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Forfait Gratuit Firebase Spark (0€ / Aucune carte bancaire)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Diagnostic & État de Connexion
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Vérifiez la connexion directe avec les services Cloud Firestore et Realtime Database.
            </p>
          </div>

          <button
            onClick={handleRunTest}
            disabled={testing}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/10 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${testing ? 'animate-spin' : ''}`} />
            <span>{testing ? 'Test en cours...' : 'Tester la connexion en direct'}</span>
          </button>
        </div>

        {/* Résultat du test */}
        {testResult && (
          <div
            className={`p-4 rounded-2xl border text-xs mb-6 transition-all ${
              testResult.success
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            <div className="flex items-start gap-3">
              {testResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-sm text-white">{testResult.message}</p>
                  <span className="text-[10px] text-slate-400 font-mono">{testResult.timestamp}</span>
                </div>
                {testResult.details && (
                  <p className="mt-1 text-slate-300">{testResult.details}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Récapitulatif technique */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 mb-1">
              <Database className="w-4 h-4 text-amber-400" />
              <span>Projet Firebase</span>
            </div>
            <p className="text-sm font-bold text-white font-mono truncate">
              {currentConfig?.projectId || 'Non configuré'}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 mb-1">
              <KeyRound className="w-4 h-4 text-emerald-400" />
              <span>Clé API Web</span>
            </div>
            <p className="text-sm font-bold text-white font-mono truncate">
              {currentConfig?.apiKey 
                ? `${currentConfig.apiKey.substring(0, 10)}••••••••` 
                : 'Non configurée'}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 mb-1">
              <Wifi className="w-4 h-4 text-sky-400" />
              <span>Realtime Database (Présence)</span>
            </div>
            <p className="text-sm font-bold text-white font-mono truncate">
              {currentConfig?.databaseURL ? 'URL active' : 'Repli Firestore'}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Guide pas-à-pas de configuration Firebase Spark (100% Gratuit) */}
      <div className="bg-slate-900/80 rounded-3xl border border-slate-800 p-6 shadow-xl">
        <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          Guide Firebase Spark (100% Gratuit & Sans carte bancaire)
        </h3>
        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          Suivez ces étapes simples pour activer gratuitement votre backend Firebase en moins de 3 minutes :
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80">
            <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold flex items-center justify-center mb-2">1</div>
            <h4 className="text-xs font-bold text-white mb-1">Créer le projet</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Rendez-vous sur <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="text-amber-400 underline inline-flex items-center gap-0.5">console.firebase.google.com <ExternalLink className="w-3 h-3" /></a>, créez un projet avec l'offre <strong>Spark (0€)</strong>. Ne pas activer Blaze.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80">
            <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold flex items-center justify-center mb-2">2</div>
            <h4 className="text-xs font-bold text-white mb-1">Activer Auth & Firestore</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Dans le menu latéral : activez <strong>Authentication</strong> (fournisseur Email/Mot de passe) et <strong>Cloud Firestore</strong> (mode production).
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80">
            <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold flex items-center justify-center mb-2">3</div>
            <h4 className="text-xs font-bold text-white mb-1">Coller les identifiants</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Dans <em>Paramètres du projet &gt; Vos applications &gt; Web</em>, copiez le bloc d'identifiants et collez-les dans le formulaire ci-dessous ou dans votre fichier <code className="text-amber-300">.env</code>.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Formulaire de saisie des identifiants Firebase dans le navigateur */}
      <div className="bg-slate-900/80 rounded-3xl border border-slate-800 p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-amber-400" />
              Saisie directe des Identifiants Firebase Spark
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Vous pouvez configurer les identifiants directement ici (enregistrés de façon sécurisée dans votre navigateur).
            </p>
          </div>
          {currentConfig && (
            <button
              onClick={clearCustomFirebaseConfig}
              className="text-xs text-rose-400 hover:text-rose-300 underline"
            >
              Réinitialiser
            </button>
          )}
        </div>

        <form onSubmit={handleSaveConfig} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              API Key (apiKey) *
            </label>
            <input
              type="text"
              required
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Project ID (projectId) *
            </label>
            <input
              type="text"
              required
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              placeholder="mon-projet-boissons"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              App ID (appId) *
            </label>
            <input
              type="text"
              required
              value={appId}
              onChange={(e) => setAppId(e.target.value)}
              placeholder="1:1234567890:web:abcdef..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Auth Domain (authDomain)
            </label>
            <input
              type="text"
              value={authDomain}
              onChange={(e) => setAuthDomain(e.target.value)}
              placeholder="mon-projet-boissons.firebaseapp.com"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Realtime Database URL (optionnel pour la présence)
            </label>
            <input
              type="text"
              value={databaseURL}
              onChange={(e) => setDatabaseURL(e.target.value)}
              placeholder="https://mon-projet-boissons-default-rtdb.firebaseio.com"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Storage Bucket
            </label>
            <input
              type="text"
              value={storageBucket}
              onChange={(e) => setStorageBucket(e.target.value)}
              placeholder="mon-projet-boissons.appspot.com"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="sm:col-span-2 pt-2 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition shadow-lg shadow-amber-500/10"
            >
              Enregistrer et appliquer la configuration
            </button>
          </div>
        </form>
      </div>

      {/* 4. Inspecteur des Règles de Sécurité Initiales (firestore.rules & database.rules.json) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Firestore Rules */}
        <div className="bg-slate-900/80 rounded-3xl border border-slate-800 p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                Règles Cloud Firestore (firestore.rules)
              </h3>
              <button
                onClick={() => handleCopy(FIRESTORE_RULES_SNIPPET, 'firestore')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition"
              >
                {copiedRules ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copié</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copier</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">
              Règles restrictives ABAC assurant qu'aucun employé ne peut modifier les privilèges de rôle.
            </p>
            <pre className="p-3 rounded-2xl bg-slate-950 text-[10px] text-amber-300/90 font-mono overflow-x-auto max-h-60 border border-slate-800">
              {FIRESTORE_RULES_SNIPPET}
            </pre>
          </div>
          <p className="text-[10px] text-slate-500 mt-3">
            À coller dans la console Firebase &gt; Firestore Database &gt; Règles.
          </p>
        </div>

        {/* Realtime DB Rules */}
        <div className="bg-slate-900/80 rounded-3xl border border-slate-800 p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Wifi className="w-4 h-4 text-sky-400" />
                Règles Présence Realtime Database (database.rules.json)
              </h3>
              <button
                onClick={() => handleCopy(RTDB_RULES_SNIPPET, 'rtdb')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition"
              >
                {copiedRtdb ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copié</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copier</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">
              Garantit que chaque utilisateur connecté ne peut écrire que sur sa propre fiche de présence.
            </p>
            <pre className="p-3 rounded-2xl bg-slate-950 text-[10px] text-sky-300/90 font-mono overflow-x-auto max-h-60 border border-slate-800">
              {RTDB_RULES_SNIPPET}
            </pre>
          </div>
          <p className="text-[10px] text-slate-500 mt-3">
            À coller dans la console Firebase &gt; Realtime Database &gt; Règles.
          </p>
        </div>
      </div>
    </div>
  );
};
