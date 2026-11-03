/**
 * Configuration et Initialisation du SDK Firebase
 * Application : GESTION BOISSONS
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, GoogleAuthProvider, signInWithPopup, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, Firestore, doc, getDocFromServer } from 'firebase/firestore';
import { getDatabase, Database } from 'firebase/database';
import appletConfig from '../../firebase-applet-config.json';

export interface FirebaseConfigParams {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
  databaseURL?: string;
  firestoreDatabaseId?: string;
}

const LOCAL_STORAGE_KEY = 'gestion_boissons_firebase_config';

/**
 * Récupère la configuration Firebase depuis firebase-applet-config.json,
 * les variables d'environnement Vite ou le localStorage.
 */
export function getFirebaseConfig(): FirebaseConfigParams | null {
  // 1. Essai prioritaire depuis firebase-applet-config.json (provisionné par AI Studio)
  if (appletConfig && appletConfig.apiKey && appletConfig.projectId && appletConfig.appId) {
    return {
      apiKey: appletConfig.apiKey,
      authDomain: appletConfig.authDomain || `${appletConfig.projectId}.firebaseapp.com`,
      projectId: appletConfig.projectId,
      storageBucket: appletConfig.storageBucket,
      messagingSenderId: appletConfig.messagingSenderId,
      appId: appletConfig.appId,
      firestoreDatabaseId: (appletConfig as any).firestoreDatabaseId,
      databaseURL: (appletConfig as any).databaseURL || `https://${appletConfig.projectId}-default-rtdb.firebaseio.com`,
    };
  }

  // 2. Essai depuis les variables d'environnement Vite
  const envConfig: FirebaseConfigParams = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || '',
    firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || '',
  };

  if (envConfig.apiKey && envConfig.projectId && envConfig.appId) {
    return envConfig;
  }

  // 3. Essai depuis le stockage local (configuration assistée dans l'UI)
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as FirebaseConfigParams;
      if (parsed.apiKey && parsed.projectId && parsed.appId) {
        return parsed;
      }
    }
  } catch {
    // Erreur de lecture localStorage ignorée
  }

  return null;
}

/**
 * Sauvegarde une configuration personnalisée dans le navigateur
 */
export function saveCustomFirebaseConfig(config: FirebaseConfigParams): void {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(config));
  window.location.reload();
}

/**
 * Réinitialise la configuration personnalisée stockée
 */
export function clearCustomFirebaseConfig(): void {
  localStorage.removeItem(LOCAL_STORAGE_KEY);
  window.location.reload();
}

/**
 * Vérifie si une configuration Firebase valide est présente
 */
export function isFirebaseConfigured(): boolean {
  const config = getFirebaseConfig();
  return Boolean(config && config.apiKey && config.projectId && config.appId);
}

// Initialisation des instances
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let rtdb: Database | null = null;
const googleProvider = new GoogleAuthProvider();

const activeConfig = getFirebaseConfig();

if (activeConfig) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(activeConfig);
    auth = getAuth(app);
    // CRITICAL: Utiliser firestoreDatabaseId si fourni
    db = activeConfig.firestoreDatabaseId 
      ? getFirestore(app, activeConfig.firestoreDatabaseId)
      : getFirestore(app);
    
    // Realtime Database (optionnel pour la présence)
    if (activeConfig.databaseURL) {
      try {
        rtdb = getDatabase(app, activeConfig.databaseURL);
      } catch (rtdbErr) {
        console.warn('Realtime Database non initialisé:', rtdbErr);
      }
    }
  } catch (err) {
    console.error('Erreur lors de l’initialisation de Firebase:', err);
  }
}

export { app, auth, db, rtdb, googleProvider };

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  details?: string;
  timestamp: string;
}

/**
 * Test réel de connectivité vers Cloud Firestore
 */
export async function testFirestoreConnection(): Promise<ConnectionTestResult> {
  if (!isFirebaseConfigured() || !db) {
    return {
      success: false,
      message: 'Firebase n’est pas configuré.',
      details: 'Veuillez vérifier les identifiants Firebase dans firebase-applet-config.json.',
      timestamp: new Date().toLocaleTimeString('fr-FR'),
    };
  }

  try {
    const testDocRef = doc(db, '_health_check', 'ping');
    await getDocFromServer(testDocRef);

    return {
      success: true,
      message: 'Connexion à Cloud Firestore établie avec succès !',
      details: `Projet : ${activeConfig?.projectId} (Base: ${activeConfig?.firestoreDatabaseId || 'default'})`,
      timestamp: new Date().toLocaleTimeString('fr-FR'),
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);

    if (errorMsg.includes('permission-denied') || errorMsg.includes('Missing or insufficient permissions')) {
      return {
        success: true,
        message: 'Serveur Cloud Firestore joint avec succès (Règles ABAC actives).',
        details: 'Le serveur a répondu et les règles de sécurité protègent la base de données.',
        timestamp: new Date().toLocaleTimeString('fr-FR'),
      };
    }

    if (errorMsg.includes('the client is offline') || errorMsg.includes('unavailable')) {
      return {
        success: false,
        message: 'Impossible de joindre le serveur Firebase.',
        details: 'Vérifiez votre connexion internet ou les autorisations réseau.',
        timestamp: new Date().toLocaleTimeString('fr-FR'),
      };
    }

    return {
      success: false,
      message: 'Résultat du test de connexion :',
      details: errorMsg,
      timestamp: new Date().toLocaleTimeString('fr-FR'),
    };
  }
}
