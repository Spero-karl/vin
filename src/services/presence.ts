/**
 * Service de gestion de la présence en temps réel façon Messenger
 * Utilise Firebase Realtime Database avec onDisconnect et déduplication multi-appareils
 * Application : GESTION BOISSONS
 */

import { rtdb, db } from '../config/firebase';
import { 
  ref, 
  onValue, 
  onDisconnect, 
  set, 
  push,
  remove,
  serverTimestamp as rtdbTimestamp,
  DatabaseReference,
  DataSnapshot
} from 'firebase/database';
import { 
  doc, 
  updateDoc, 
  serverTimestamp as firestoreTimestamp,
  collection,
  onSnapshot
} from 'firebase/firestore';
import { UserPresence, UserRole } from '../types/auth';

let mySessionRef: DatabaseReference | null = null;
let connectedListenerUnsub: (() => void) | null = null;
let presenceMetaRef: DatabaseReference | null = null;

/**
 * Configure la présence en direct pour l'utilisateur connecté avec gestion multi-appareils
 */
export function setupUserPresence(
  uid: string, 
  displayName: string, 
  role: UserRole, 
  email: string
): () => void {
  if (rtdb) {
    try {
      const connectedRef = ref(rtdb, '.info/connected');
      const userSessionsRef = ref(rtdb, `presence_sessions/${uid}`);
      presenceMetaRef = ref(rtdb, `presence_users/${uid}`);

      connectedListenerUnsub = onValue(connectedRef, (snap: DataSnapshot) => {
        if (snap.val() === true) {
          // Crée un nœud unique pour CET appareil précis
          mySessionRef = push(userSessionsRef);

          // Quand cet appareil se déconnecte, supprimer sa session
          onDisconnect(mySessionRef).remove().then(() => {
            if (mySessionRef) {
              set(mySessionRef, {
                connectedAt: rtdbTimestamp(),
                userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 50) : '',
              });
            }
          }).catch((err) => {
            console.warn('onDisconnect setup error:', err);
          });

          // Met à jour les métadonnées de l'utilisateur
          if (presenceMetaRef) {
            set(presenceMetaRef, {
              uid,
              displayName,
              email,
              role,
              lastActive: rtdbTimestamp(),
            }).catch(() => {});
          }
        }
      });
    } catch (err) {
      console.warn('Impossible d’initialiser la présence RTDB:', err);
    }
  }

  // Mise à jour de l'horodatage Firestore
  if (db) {
    try {
      const userDocRef = doc(db, 'users', uid);
      updateDoc(userDocRef, {
        lastSeenAt: firestoreTimestamp(),
        isOnline: true,
      }).catch(() => {});
    } catch {
      // Ignorer
    }
  }

  return () => {
    if (connectedListenerUnsub) {
      connectedListenerUnsub();
      connectedListenerUnsub = null;
    }
    if (mySessionRef) {
      remove(mySessionRef).catch(() => {});
      mySessionRef = null;
    }
    if (db) {
      try {
        const userDocRef = doc(db, 'users', uid);
        updateDoc(userDocRef, {
          isOnline: false,
          lastSeenAt: firestoreTimestamp(),
        }).catch(() => {});
      } catch {
        // Ignorer
      }
    }
  };
}

/**
 * Écoute la liste des utilisateurs réellement connectés (dédupliqués par compte)
 */
export function listenToOnlineUsers(callback: (onlineUsers: UserPresence[]) => void): () => void {
  if (rtdb) {
    try {
      const sessionsRoot = ref(rtdb, 'presence_sessions');
      const usersMetaRoot = ref(rtdb, 'presence_users');

      let currentUsersMeta: Record<string, any> = {};

      // Écoute les métadonnées (noms, rôles, emails)
      const unsubMeta = onValue(usersMetaRoot, (metaSnap) => {
        currentUsersMeta = metaSnap.val() || {};
      });

      // Écoute les sessions actives
      const unsubSessions = onValue(sessionsRoot, (snapshot) => {
        const val = snapshot.val();
        if (!val) {
          callback([]);
          return;
        }

        // Pour chaque uid, vérifier s'il a au moins 1 session active (déduplication multi-appareils)
        const onlineList: UserPresence[] = [];

        Object.keys(val).forEach((uid) => {
          const sessionsForUser = val[uid];
          const hasActiveSessions = sessionsForUser && typeof sessionsForUser === 'object' && Object.keys(sessionsForUser).length > 0;

          if (hasActiveSessions) {
            const meta = currentUsersMeta[uid] || {};
            onlineList.push({
              uid,
              displayName: meta.displayName || 'Utilisateur',
              email: meta.email || '',
              role: (meta.role as UserRole) || 'collaborator',
              isOnline: true,
              lastSeen: Date.now(),
            });
          }
        });

        callback(onlineList);
      }, (err) => {
        console.warn('Erreur écoute présence RTDB, repli Firestore:', err);
        fallbackFirestorePresence(callback);
      });

      return () => {
        unsubMeta();
        unsubSessions();
      };
    } catch {
      return fallbackFirestorePresence(callback);
    }
  }

  return fallbackFirestorePresence(callback);
}

function fallbackFirestorePresence(callback: (onlineUsers: UserPresence[]) => void): () => void {
  if (!db) {
    callback([]);
    return () => {};
  }

  try {
    const usersCol = collection(db, 'users');
    const unsub = onSnapshot(usersCol, (snap) => {
      const now = Date.now();
      const list: UserPresence[] = [];

      snap.docs.forEach((docSnap) => {
        const d = docSnap.data();
        const lastSeenMillis = d.lastSeenAt?.toMillis ? d.lastSeenAt.toMillis() : 0;
        // Connecté si actif dans les 2 dernières minutes
        const isRecent = now - lastSeenMillis < 2 * 60 * 1000;

        if (d.isOnline && isRecent) {
          list.push({
            uid: docSnap.id,
            email: d.email || '',
            displayName: d.displayName || 'Utilisateur',
            role: (d.role as UserRole) || 'collaborator',
            isOnline: true,
            lastSeen: lastSeenMillis,
          });
        }
      });

      callback(list);
    }, () => {
      callback([]);
    });

    return unsub;
  } catch {
    callback([]);
    return () => {};
  }
}
