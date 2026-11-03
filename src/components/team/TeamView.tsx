/**
 * Gestion de l'équipe, des rôles et des accès (Max 6 comptes actifs)
 * Architecture Premium Retail : Administrateur Principal & Collaborateurs
 * Application : GESTION BOISSONS
 */

import React, { useEffect, useState } from 'react';
import { useAuth, PREDEFINED_ACCOUNTS } from '../../context/AuthContext';
import { 
  UserProfile, 
  UserRole, 
  ROLE_DEFINITIONS, 
  MAX_ACTIVE_ACCOUNTS 
} from '../../types/auth';
import { db } from '../../config/firebase';
import { collection, onSnapshot, query, orderBy, setDoc, doc, serverTimestamp } from 'firebase/firestore';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Check, 
  X, 
  Clock, 
  Sparkles,
  Phone,
  Mail,
  UserCheck
} from 'lucide-react';

export const TeamView: React.FC = () => {
  const { profile, activeAccountsCount, createEmployeeAccount, toggleAccountStatus } = useAuth();
  
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Formulaire d'ajout de collaborateur
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('collaborator');
  const [newPhone, setNewPhone] = useState('');
  const [formFeedback, setFormFeedback] = useState<{ success: boolean; msg: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdmin = profile?.role === 'admin';

  // Écoute des utilisateurs dans Firestore
  useEffect(() => {
    if (!db) {
      setLoadingUsers(false);
      return;
    }

    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, orderBy('createdAt', 'desc'));

      const unsubscribe = onSnapshot(q, async (snapshot) => {
        if (snapshot.empty && db) {
          const firestore = db;
          // Initialisation automatique des comptes préconfigurés
          try {
            for (const acc of PREDEFINED_ACCOUNTS) {
              await setDoc(doc(firestore, 'users', acc.id), {
                uid: acc.id,
                email: acc.email,
                displayName: acc.displayName,
                role: acc.role,
                isActive: true,
                createdAt: new Date().toISOString(),
                phone: acc.phone,
              });
              if (acc.role === 'admin') {
                await setDoc(doc(firestore, 'admins', acc.id), {
                  uid: acc.id,
                  email: acc.email,
                  createdAt: serverTimestamp(),
                }).catch(() => {});
              }
            }
          } catch (seedErr) {
            console.warn('Auto-seed comptes:', seedErr);
          }
        }

        const loaded: UserProfile[] = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            uid: docSnap.id,
            email: d.email || '',
            displayName: d.displayName || 'Utilisateur',
            role: (d.role as UserRole) || 'collaborator',
            isActive: d.isActive !== false,
            createdAt: d.createdAt || new Date().toISOString(),
            lastLoginAt: d.lastLoginAt,
            phone: d.phone,
          };
        });
        setUsersList(loaded);
        setLoadingUsers(false);
      }, (err) => {
        console.warn('Erreur écoute des utilisateurs:', err);
        setLoadingUsers(false);
      });

      return () => unsubscribe();
    } catch {
      setLoadingUsers(false);
    }
  }, []);

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormFeedback(null);

    if (!newEmail.trim() || !newName.trim() || !newPassword) {
      setFormFeedback({ success: false, msg: 'Veuillez renseigner tous les champs obligatoires.' });
      return;
    }

    if (newPassword.length < 6) {
      setFormFeedback({ success: false, msg: 'Le mot de passe doit comporter au moins 6 caractères.' });
      return;
    }

    setIsSubmitting(true);
    const res = await createEmployeeAccount(newEmail, newPassword, newName, newRole, newPhone);
    setIsSubmitting(false);

    if (res.success) {
      setFormFeedback({
        success: true,
        msg: `Compte créé avec succès pour ${newName} (${ROLE_DEFINITIONS[newRole].label}).`,
      });
      setNewEmail('');
      setNewName('');
      setNewPassword('');
      setNewPhone('');
      setTimeout(() => {
        setShowAddModal(false);
        setFormFeedback(null);
      }, 1500);
    } else {
      setFormFeedback({
        success: false,
        msg: res.error || 'Erreur lors de la création du compte.',
      });
    }
  };

  const handleToggleStatus = async (userItem: UserProfile) => {
    if (!isAdmin) return;
    if (userItem.uid === profile?.uid) {
      alert('Vous ne pouvez pas désactiver votre propre compte administrateur.');
      return;
    }
    await toggleAccountStatus(userItem.uid, userItem.isActive);
  };

  const totalActive = usersList.filter(u => u.isActive).length;
  const isLimitReached = totalActive >= MAX_ACTIVE_ACCOUNTS;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-6">
      {/* 1. En-tête & Jauge de capacité (Max 6 comptes) */}
      <div className="bg-[#FAF8F5] rounded-3xl border border-[#E2DDD3] p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#294637]/10 text-[#294637] border border-[#294637]/20 mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Contrôle d'accès & Équipe (Max 6 personnes)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#1F2421] tracking-tight">
              Gestion de l'Équipe & des Rôles
            </h2>
            <p className="text-xs sm:text-sm text-[#5A625D] mt-1">
              Tous les collaborateurs ont les mêmes droits opérationnels. Seul l'administrateur a accès aux finances et aux comptes.
            </p>
          </div>

          {isAdmin && (
            <button
              onClick={() => {
                setFormFeedback(null);
                setShowAddModal(true);
              }}
              disabled={isLimitReached}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#294637] hover:bg-[#1E3429] text-[#FAF8F5] font-bold text-xs shadow-xs transition disabled:opacity-50 disabled:pointer-events-none"
            >
              <UserPlus className="w-4 h-4" />
              <span>Ajouter un collaborateur</span>
            </button>
          )}
        </div>

        {/* Barre de capacité des 6 comptes */}
        <div className="bg-[#F4F1E9] rounded-2xl p-4 border border-[#E2DDD3]">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-[#1F2421] font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-[#294637]" />
              Capacité du personnel de la boutique
            </span>
            <span className="font-bold text-[#1F2421]">
              <span className={isLimitReached ? 'text-[#B87555]' : 'text-[#294637]'}>
                {totalActive}
              </span>{' '}
              / {MAX_ACTIVE_ACCOUNTS} comptes actifs
            </span>
          </div>

          <div className="w-full h-2.5 rounded-full bg-[#E2DDD3] overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                isLimitReached ? 'bg-[#B87555]' : 'bg-[#294637]'
              }`}
              style={{ width: `${Math.min((totalActive / MAX_ACTIVE_ACCOUNTS) * 100, 100)}%` }}
            />
          </div>

          <div className="mt-2.5 flex flex-wrap items-center justify-between text-[11px] text-[#5A625D] gap-2">
            <span>
              {isLimitReached
                ? '⚠️ Limite de 6 comptes atteinte. Désactivez un compte avant d’en créer un nouveau.'
                : `Il reste ${MAX_ACTIVE_ACCOUNTS - totalActive} place(s) disponible(s).`}
            </span>
            <span className="text-[#6A726D]">
              Règle : 1 compte = 1 personne physique (Aucun partage d'identifiants).
            </span>
          </div>
        </div>
      </div>

      {/* 2. Liste des comptes collaborateurs */}
      <div className="bg-[#FAF8F5] rounded-3xl border border-[#E2DDD3] p-6 shadow-xs">
        <h3 className="text-base font-bold text-[#1F2421] mb-1 flex items-center gap-2">
          <Users className="w-5 h-5 text-[#294637]" />
          Comptes de la Boutique ({usersList.length})
        </h3>
        <p className="text-xs text-[#5A625D] mb-5">
          Comptes enregistrés pour l'utilisation sur smartphone (Android/iPhone) et ordinateur.
        </p>

        {loadingUsers ? (
          <div className="py-8 text-center text-xs text-[#5A625D]">
            Chargement de l'équipe...
          </div>
        ) : usersList.length === 0 ? (
          <div className="p-6 rounded-2xl bg-[#F4F1E9] border border-[#E2DDD3] text-center">
            <p className="text-xs text-[#1F2421]">
              Aucun compte supplémentaire enregistré.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {usersList.map((userItem) => {
              const uRoleMeta = ROLE_DEFINITIONS[userItem.role] || ROLE_DEFINITIONS.collaborator;
              const isSelf = userItem.uid === profile?.uid;

              return (
                <div
                  key={userItem.uid}
                  className={`p-4 rounded-2xl border transition ${
                    userItem.isActive
                      ? 'bg-[#F4F1E9] border-[#E2DDD3]'
                      : 'bg-[#F4F1E9]/50 border-[#E2DDD3]/50 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-[#294637] text-[#FAF8F5] flex items-center justify-center font-bold text-sm uppercase">
                        {userItem.displayName.charAt(0)}
                      </div>
                      <div className="overflow-hidden">
                        <div className="text-xs font-bold text-[#1F2421] truncate flex items-center gap-1.5">
                          <span>{userItem.displayName}</span>
                          {isSelf && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#294637]/15 text-[#294637] font-semibold">
                              Vous
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#5A625D] truncate">
                          {userItem.email}
                        </div>
                      </div>
                    </div>

                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${uRoleMeta.badgeBg} ${uRoleMeta.badgeText} ${uRoleMeta.badgeBorder}`}>
                      {uRoleMeta.shortLabel}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-[11px] text-[#5A625D] border-t border-[#E2DDD3] pt-3">
                    <div className="flex items-center justify-between">
                      <span>Statut du compte :</span>
                      <span className={`font-semibold ${userItem.isActive ? 'text-emerald-700' : 'text-[#B87555]'}`}>
                        {userItem.isActive ? 'Actif' : 'Désactivé'}
                      </span>
                    </div>
                    {userItem.phone && (
                      <div className="flex items-center justify-between">
                        <span>Téléphone :</span>
                        <span className="text-[#1F2421] font-mono">{userItem.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span>Dernière connexion :</span>
                      <span className="text-[#6A726D]">
                        {userItem.lastLoginAt 
                          ? new Date(userItem.lastLoginAt).toLocaleDateString('fr-FR')
                          : 'Non renseigné'}
                      </span>
                    </div>
                  </div>

                  {/* Actions d'administration */}
                  {isAdmin && !isSelf && (
                    <div className="mt-3 pt-3 border-t border-[#E2DDD3] flex items-center justify-end">
                      <button
                        onClick={() => handleToggleStatus(userItem)}
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition ${
                          userItem.isActive
                            ? 'text-[#B87555] hover:bg-[#B87555]/10'
                            : 'text-emerald-700 hover:bg-emerald-50'
                        }`}
                      >
                        {userItem.isActive ? 'Désactiver le compte' : 'Réactiver le compte'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Matrice des Droits & Rôles (2 rôles : Admin & Collaborateur) */}
      <div className="bg-[#FAF8F5] rounded-3xl border border-[#E2DDD3] p-6 shadow-xs">
        <h3 className="text-base font-bold text-[#1F2421] mb-1 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[#294637]" />
          Matrice des Rôles & Sécurité
        </h3>
        <p className="text-xs text-[#5A625D] mb-5">
          Tous les collaborateurs disposent des pleins pouvoirs opérationnels de boutique. Les finances et la gestion des comptes sont réservées à l'administrateur.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#1F2421]">
            <thead>
              <tr className="border-b border-[#E2DDD3] text-[#5A625D] uppercase text-[10px]">
                <th className="py-3 px-4 font-semibold">Opération / Fonctionnalité</th>
                <th className="py-3 px-4 font-semibold text-center text-[#294637]">Administrateur (Patron)</th>
                <th className="py-3 px-4 font-semibold text-center text-[#B87555]">Collaborateur (Équipe)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2DDD3]">
              <tr>
                <td className="py-3 px-4 font-medium">Ventes au comptant & encaissement rapide</td>
                <td className="py-3 px-4 text-center"><Check className="w-4 h-4 mx-auto text-emerald-600" /></td>
                <td className="py-3 px-4 text-center"><Check className="w-4 h-4 mx-auto text-emerald-600" /></td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium">Gestion du catalogue de boissons (bouteilles & cartons)</td>
                <td className="py-3 px-4 text-center"><Check className="w-4 h-4 mx-auto text-emerald-600" /></td>
                <td className="py-3 px-4 text-center"><Check className="w-4 h-4 mx-auto text-emerald-600" /></td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium">Réceptions d'achats fournisseurs & mise à jour du stock</td>
                <td className="py-3 px-4 text-center"><Check className="w-4 h-4 mx-auto text-emerald-600" /></td>
                <td className="py-3 px-4 text-center"><Check className="w-4 h-4 mx-auto text-emerald-600" /></td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium">Mouvements de stock, pertes, casse & inventaires</td>
                <td className="py-3 px-4 text-center"><Check className="w-4 h-4 mx-auto text-emerald-600" /></td>
                <td className="py-3 px-4 text-center"><Check className="w-4 h-4 mx-auto text-emerald-600" /></td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium">Enregistrement des dépenses courantes de boutique</td>
                <td className="py-3 px-4 text-center"><Check className="w-4 h-4 mx-auto text-emerald-600" /></td>
                <td className="py-3 px-4 text-center"><Check className="w-4 h-4 mx-auto text-emerald-600" /></td>
              </tr>
              <tr className="bg-[#B87555]/5">
                <td className="py-3 px-4 font-bold text-[#1F2421]">Accès aux Finances (CA, Marges au CMP, Bénéfices)</td>
                <td className="py-3 px-4 text-center"><Check className="w-4 h-4 mx-auto text-emerald-600" /></td>
                <td className="py-3 px-4 text-center"><X className="w-4 h-4 mx-auto text-[#B87555]" /></td>
              </tr>
              <tr className="bg-[#B87555]/5">
                <td className="py-3 px-4 font-bold text-[#1F2421]">Gestion des comptes, rôles & activations (Max 6)</td>
                <td className="py-3 px-4 text-center"><Check className="w-4 h-4 mx-auto text-emerald-600" /></td>
                <td className="py-3 px-4 text-center"><X className="w-4 h-4 mx-auto text-[#B87555]" /></td>
              </tr>
              <tr className="bg-[#B87555]/5">
                <td className="py-3 px-4 font-bold text-[#1F2421]">Consultation du Journal d'Audit immuable</td>
                <td className="py-3 px-4 text-center"><Check className="w-4 h-4 mx-auto text-emerald-600" /></td>
                <td className="py-3 px-4 text-center"><X className="w-4 h-4 mx-auto text-[#B87555]" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Ajout d'un collaborateur */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-[#FAF8F5] border border-[#E2DDD3] p-6 sm:p-7 shadow-2xl text-[#1F2421]">
            <h3 className="text-lg font-bold text-[#1F2421] mb-1 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-[#294637]" />
              Créer un compte personnel
            </h3>
            <p className="text-xs text-[#5A625D] mb-4 leading-relaxed">
              Ajoutez l'un des 6 membres de l'équipe de la boutique.
            </p>

            {formFeedback && (
              <div
                className={`mb-4 p-3 rounded-2xl text-xs flex items-start gap-2 ${
                  formFeedback.success
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border border-rose-200 text-rose-800'
                }`}
              >
                {formFeedback.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                )}
                <span>{formFeedback.msg}</span>
              </div>
            )}

            <form onSubmit={handleAddEmployee} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-[#1F2421] mb-1">
                  Nom & Prénom *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="ex: Moussa Traoré"
                  className="block w-full px-3 py-2 bg-[#F4F1E9] border border-[#E2DDD3] rounded-xl text-[#1F2421] focus:outline-none focus:ring-2 focus:ring-[#294637]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#1F2421] mb-1">
                  Adresse email *
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="collaborateur@boissons.com"
                  className="block w-full px-3 py-2 bg-[#F4F1E9] border border-[#E2DDD3] rounded-xl text-[#1F2421] focus:outline-none focus:ring-2 focus:ring-[#294637]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#1F2421] mb-1">
                  Mot de passe provisoire (6 car. min) *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full px-3 py-2 bg-[#F4F1E9] border border-[#E2DDD3] rounded-xl text-[#1F2421] focus:outline-none focus:ring-2 focus:ring-[#294637]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#1F2421] mb-1">
                  Rôle attribué *
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="block w-full px-3 py-2 bg-[#F4F1E9] border border-[#E2DDD3] rounded-xl text-[#1F2421] focus:outline-none focus:ring-2 focus:ring-[#294637]"
                >
                  <option value="collaborator">Collaborateur (Gestion opérationnelle complète)</option>
                  <option value="admin">Administrateur / Patron (Accès intégral & Finances)</option>
                </select>
                <p className="text-[10px] text-[#5A625D] mt-1">
                  {ROLE_DEFINITIONS[newRole].description}
                </p>
              </div>

              <div>
                <label className="block font-semibold text-[#1F2421] mb-1">
                  Numéro de téléphone (optionnel)
                </label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+225 07 00 00 00"
                  className="block w-full px-3 py-2 bg-[#F4F1E9] border border-[#E2DDD3] rounded-xl text-[#1F2421] focus:outline-none focus:ring-2 focus:ring-[#294637]"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[#E8E4DA] hover:bg-[#DDD8CD] text-[#1F2421] font-semibold transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-[#294637] hover:bg-[#1E3429] text-[#FAF8F5] font-bold transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Enregistrement...' : 'Créer le compte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
