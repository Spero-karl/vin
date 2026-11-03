/**
 * Contexte d'authentification et de gestion des rôles
 * Application : GESTION BOISSONS
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  serverTimestamp, 
  collection, 
  getDocs,
  onSnapshot 
} from 'firebase/firestore';
import { auth, db, isFirebaseConfigured, googleProvider } from '../config/firebase';
import { 
  UserProfile, 
  UserRole, 
  ROLE_PERMISSIONS, 
  PermissionMatrix,
  MAX_ACTIVE_ACCOUNTS 
} from '../types/auth';
import { setupUserPresence } from '../services/presence';

export interface PredefinedAccount {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  phone?: string;
}

export const PREDEFINED_ACCOUNTS: PredefinedAccount[] = [
  {
    id: 'admin_karl',
    email: 'karlfreaton@gmail.com',
    displayName: 'Karl Freaton (Patron)',
    role: 'admin',
    phone: '+225 07 10 20 30',
  },
  {
    id: 'collab_moussa',
    email: 'moussa@boissons.com',
    displayName: 'Moussa Diarra (Collaborateur)',
    role: 'collaborator',
    phone: '+225 05 40 50 60',
  },
  {
    id: 'collab_awa',
    email: 'awa@boissons.com',
    displayName: 'Awa Koné (Collaboratrice)',
    role: 'collaborator',
    phone: '+225 01 70 80 90',
  },
];

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  role: UserRole | null;
  loading: boolean;
  isConfigured: boolean;
  error: string | null;
  activeAccountsCount: number;
  signIn: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  signInAsPredefined: (account: PredefinedAccount) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  bootstrapFirstAdmin: (email: string, pass: string, name: string) => Promise<{ success: boolean; error?: string }>;
  createEmployeeAccount: (
    email: string, 
    pass: string, 
    name: string, 
    role: UserRole, 
    phone?: string
  ) => Promise<{ success: boolean; error?: string }>;
  toggleAccountStatus: (uid: string, currentStatus: boolean) => Promise<{ success: boolean; error?: string }>;
  hasPermission: (perm: keyof PermissionMatrix) => boolean;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_SESSION_KEY = 'gestion_boissons_active_session';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeAccountsCount, setActiveAccountsCount] = useState(0);

  const isConfigured = isFirebaseConfigured();

  // Initialisation et vérification des comptes initiaux
  useEffect(() => {
    // 1. Vérifier si une session rapide locale a été enregistrée
    const storedSession = localStorage.getItem(LOCAL_SESSION_KEY);
    if (storedSession) {
      try {
        const parsed = JSON.parse(storedSession) as UserProfile;
        setProfile(parsed);
      } catch {
        // Ignorer
      }
    }

    if (!isConfigured || !auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser && db) {
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const data = userDoc.data() as UserProfile;
            setProfile(data);
            localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(data));

            updateDoc(userDocRef, {
              lastLoginAt: new Date().toISOString(),
            }).catch(() => {});
          } else {
            // Déterminer si c'est l'admin karlfreaton@gmail.com
            const isTargetAdmin = firebaseUser.email === 'karlfreaton@gmail.com';
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || (isTargetAdmin ? 'Karl (Patron)' : 'Collaborateur'),
              role: isTargetAdmin ? 'admin' : 'collaborator',
              isActive: true,
              createdAt: new Date().toISOString(),
            };
            
            await setDoc(userDocRef, newProfile);
            if (isTargetAdmin) {
              await setDoc(doc(db, 'admins', firebaseUser.uid), {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                createdAt: serverTimestamp(),
              }).catch(() => {});
            }

            setProfile(newProfile);
            localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(newProfile));
          }
        } catch (err) {
          console.error('Erreur chargement profil utilisateur:', err);
        }
      } else if (!storedSession) {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isConfigured]);

  // Écoute de la présence en temps réel
  useEffect(() => {
    if (profile) {
      const activeUid = user?.uid || profile.uid;
      const cleanupPresence = setupUserPresence(
        activeUid,
        profile.displayName,
        profile.role,
        profile.email
      );
      return () => cleanupPresence();
    }
  }, [user, profile]);

  // Écoute du nombre de comptes actifs dans Firestore
  useEffect(() => {
    if (!isConfigured || !db) return;

    try {
      const usersCol = collection(db, 'users');
      const unsub = onSnapshot(usersCol, (snap) => {
        const activeUsers = snap.docs.filter(d => d.data().isActive !== false);
        setActiveAccountsCount(activeUsers.length);
      }, () => {
        // En cas d'erreur de permission
      });
      return () => unsub();
    } catch {
      // Ignorer
    }
  }, [isConfigured]);

  const clearError = () => setError(null);

  const formatFirebaseError = (err: unknown): string => {
    if (typeof err !== 'object' || err === null) return String(err);
    const code = (err as any).code;

    switch (code) {
      case 'auth/operation-not-allowed':
        return 'Le fournisseur Email/Mot de passe n’est pas activé dans la console Firebase. Utilisez la Connexion Google (Patron) ou la Connexion Rapide ci-dessus.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Identifiants invalides. Vérifiez votre adresse email et votre mot de passe.';
      case 'auth/invalid-email':
        return 'Adresse email invalide. Veuillez vérifier le format.';
      case 'auth/email-already-in-use':
        return 'Cette adresse email est déjà enregistrée.';
      case 'auth/weak-password':
        return 'Le mot de passe doit comporter au moins 6 caractères.';
      case 'auth/too-many-requests':
        return 'Trop de tentatives infructueuses. Veuillez patienter quelques instants.';
      case 'auth/popup-closed-by-user':
        return 'La fenêtre de connexion a été fermée.';
      default:
        return (err as any).message || 'Une erreur est survenue lors de l’authentification.';
    }
  };

  /**
   * Connexion 1-clic avec Google (authentification Firebase native)
   */
  const signInWithGoogle = async () => {
    if (!isConfigured || !auth) {
      return { success: false, error: 'Firebase n’est pas configuré.' };
    }
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const isTargetAdmin = result.user.email === 'karlfreaton@gmail.com';

      if (db) {
        const userDocRef = doc(db, 'users', result.user.uid);
        const userSnap = await getDoc(userDocRef);

        let userProf: UserProfile;
        if (!userSnap.exists()) {
            userProf = {
            uid: result.user.uid,
            email: result.user.email || '',
            displayName: result.user.displayName || (isTargetAdmin ? 'Karl (Patron)' : 'Collaborateur'),
            role: isTargetAdmin ? 'admin' : 'collaborator',
            isActive: true,
            createdAt: new Date().toISOString(),
          };
          await setDoc(userDocRef, userProf);
          if (isTargetAdmin) {
            await setDoc(doc(db, 'admins', result.user.uid), {
              uid: result.user.uid,
              email: result.user.email,
              createdAt: serverTimestamp(),
            }).catch(() => {});
          }
        } else {
          userProf = userSnap.data() as UserProfile;
        }

        setProfile(userProf);
        localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(userProf));
      }

      return { success: true };
    } catch (err) {
      const msg = formatFirebaseError(err);
      setError(msg);
      return { success: false, error: msg };
    }
  };

  /**
   * Connexion directe préconfigurée (Patron Admin / Collab Magasinier / Collab Vendeur)
   */
  const signInAsPredefined = async (account: PredefinedAccount) => {
    setError(null);
    const newProfile: UserProfile = {
      uid: account.id,
      email: account.email,
      displayName: account.displayName,
      role: account.role,
      isActive: true,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      phone: account.phone,
    };

    // Synchronisation dans Firestore si connecté
    if (db) {
      try {
        await setDoc(doc(db, 'users', account.id), newProfile, { merge: true });
        if (account.role === 'admin') {
          await setDoc(doc(db, 'admins', account.id), {
            uid: account.id,
            email: account.email,
            createdAt: serverTimestamp(),
          }, { merge: true }).catch(() => {});
        }
      } catch (err) {
        console.warn('Sync Firestore compte prédéfini:', err);
      }
    }

    setProfile(newProfile);
    localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(newProfile));
    return { success: true };
  };

  const signIn = async (email: string, pass: string) => {
    if (!isConfigured || !auth) {
      return { success: false, error: 'Firebase n’est pas encore configuré.' };
    }
    setError(null);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
      
      if (db) {
        const userDoc = await getDoc(doc(db, 'users', cred.user.uid));
        if (userDoc.exists()) {
          const profileData = userDoc.data() as UserProfile;
          if (profileData.isActive === false) {
            await firebaseSignOut(auth);
            const msg = 'Ce compte utilisateur a été désactivé par l’administrateur.';
            setError(msg);
            return { success: false, error: msg };
          }
          setProfile(profileData);
          localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(profileData));
        }
      }
      return { success: true };
    } catch (err) {
      const msg = formatFirebaseError(err);
      setError(msg);
      return { success: false, error: msg };
    }
  };

  const signOut = async () => {
    localStorage.removeItem(LOCAL_SESSION_KEY);
    if (auth) {
      try {
        await firebaseSignOut(auth);
      } catch (err) {
        console.error('Erreur déconnexion:', err);
      }
    }
    setUser(null);
    setProfile(null);
  };

  const resetPassword = async (email: string) => {
    if (!isConfigured || !auth) {
      return { success: false, error: 'Firebase n’est pas encore configuré.' };
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      return { success: true };
    } catch (err) {
      const msg = formatFirebaseError(err);
      return { success: false, error: msg };
    }
  };

  const bootstrapFirstAdmin = async (email: string, pass: string, name: string) => {
    if (!isConfigured || !auth || !db) {
      return { success: false, error: 'Firebase n’est pas configuré.' };
    }

    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      await updateProfile(cred.user, { displayName: name.trim() });

      const newProfile: UserProfile = {
        uid: cred.user.uid,
        email: email.trim(),
        displayName: name.trim(),
        role: 'admin',
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'users', cred.user.uid), newProfile);
      await setDoc(doc(db, 'admins', cred.user.uid), {
        uid: cred.user.uid,
        email: email.trim(),
        createdAt: serverTimestamp(),
      });

      setProfile(newProfile);
      localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(newProfile));
      return { success: true };
    } catch (err) {
      const msg = formatFirebaseError(err);
      return { success: false, error: msg };
    }
  };

  const createEmployeeAccount = async (
    email: string, 
    pass: string, 
    name: string, 
    newRole: UserRole, 
    phone?: string
  ) => {
    if (!profile || profile.role !== 'admin') {
      return { success: false, error: 'Seul l’administrateur peut créer des comptes employés.' };
    }

    if (!isConfigured || !db) {
      return { success: false, error: 'Firebase non connecté.' };
    }

    if (activeAccountsCount >= MAX_ACTIVE_ACCOUNTS) {
      return { 
        success: false, 
        error: `Limite atteinte : Le système est configuré pour 6 comptes actifs maximum (${activeAccountsCount}/${MAX_ACTIVE_ACCOUNTS}). Désactivez un compte avant d'en créer un nouveau.` 
      };
    }

    try {
      const placeholderUid = 'usr_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
      const employeeDoc: UserProfile = {
        uid: placeholderUid,
        email: email.trim().toLowerCase(),
        displayName: name.trim(),
        role: newRole,
        isActive: true,
        createdAt: new Date().toISOString(),
        phone: phone?.trim(),
      };

      await setDoc(doc(db, 'users', placeholderUid), employeeDoc);

      return { 
        success: true, 
        error: undefined 
      };
    } catch (err) {
      return { 
        success: false, 
        error: 'Erreur lors de l’enregistrement de l’employé : ' + (err instanceof Error ? err.message : String(err)) 
      };
    }
  };

  const toggleAccountStatus = async (targetUid: string, currentStatus: boolean) => {
    if (!profile || profile.role !== 'admin') {
      return { success: false, error: 'Action réservée à l’administrateur.' };
    }
    if (!db) return { success: false, error: 'Base de données non disponible.' };

    try {
      await updateDoc(doc(db, 'users', targetUid), {
        isActive: !currentStatus,
      });
      return { success: true };
    } catch (err) {
      return { success: false, error: 'Erreur : ' + (err instanceof Error ? err.message : String(err)) };
    }
  };

  const hasPermission = (perm: keyof PermissionMatrix): boolean => {
    if (!profile || !profile.role) return false;
    const permissions = ROLE_PERMISSIONS[profile.role];
    return permissions ? permissions[perm] : false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role: profile?.role || null,
        loading,
        isConfigured,
        error,
        activeAccountsCount,
        signIn,
        signInWithGoogle,
        signInAsPredefined,
        signOut,
        resetPassword,
        bootstrapFirstAdmin,
        createEmployeeAccount,
        toggleAccountStatus,
        hasPermission,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé à l’intérieur de AuthProvider');
  }
  return context;
}
