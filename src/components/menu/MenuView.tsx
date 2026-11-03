/**
 * Rubrique Menu : Modules complémentaires et administration
 * (Stocks, Achats, Caisse, Dépenses, Audit, Équipe, Configuration)
 * Application : GESTION BOISSONS
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { MenuSubView } from '../../types/navigation';
import { TeamView } from '../team/TeamView';
import { SettingsView } from '../settings/SettingsView';
import { StocksView } from '../stocks/StocksView';
import { PurchasesView } from '../purchases/PurchasesView';
import { CashRegisterView } from '../cash/CashRegisterView';
import { AuditView } from '../audit/AuditView';
import { 
  Boxes, 
  Truck, 
  Coins, 
  Receipt, 
  FileText, 
  Users, 
  Settings, 
  LogOut, 
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  Plus,
  AlertCircle
} from 'lucide-react';
import { db } from '../../config/firebase';
import { collection, addDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { Expense } from '../../types/models';

interface MenuViewProps {
  initialSubView?: MenuSubView;
  onSignOut: () => void;
}

export const MenuView: React.FC<MenuViewProps> = ({ initialSubView = 'main', onSignOut }) => {
  const { profile } = useAuth();
  const [subView, setSubView] = useState<MenuSubView>(initialSubView);
  const isAdmin = profile?.role === 'admin';

  // Synchronisation si initialSubView change depuis l'accueil
  useEffect(() => {
    if (initialSubView) {
      setSubView(initialSubView);
    }
  }, [initialSubView]);

  // Formulaire d'ajout de dépense
  const [expenseCategory, setExpenseCategory] = useState<'transport' | 'loyer' | 'electricite' | 'salaires' | 'achats_divers' | 'autre'>('transport');
  const [expenseAmount, setExpenseAmount] = useState<number>(5000);
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseSuccess, setExpenseSuccess] = useState(false);
  const [expensesList, setExpensesList] = useState<Expense[]>([]);

  useEffect(() => {
    if (!db) return;
    const expRef = collection(db, 'expenses');
    const q = query(expRef, orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ ...(d.data() as Expense), id: d.id }));
      setExpensesList(list);
    }, () => {});

    return () => unsub();
  }, []);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || expenseAmount <= 0) return;

    try {
      await addDoc(collection(db, 'expenses'), {
        category: expenseCategory,
        amount: Number(expenseAmount),
        description: expenseDesc.trim(),
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        authorId: profile?.uid || 'usr_anonymous',
        authorName: profile?.displayName || 'Collaborateur',
      });

      // Journal d'audit
      await addDoc(collection(db, 'audit_logs'), {
        action: 'DEPENSE_ENREGISTREE',
        entity: 'expense',
        performedBy: profile?.uid,
        performedByName: profile?.displayName,
        timestamp: new Date().toISOString(),
        details: `Dépense de ${expenseAmount} FCFA (${expenseCategory}): ${expenseDesc}`,
      });

      setExpenseSuccess(true);
      setExpenseDesc('');
      setTimeout(() => setExpenseSuccess(false), 3000);
    } catch (err) {
      alert('Erreur enregistrement dépense: ' + String(err));
    }
  };

  const renderBackBtn = () => (
    <button
      onClick={() => setSubView('main')}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF8F5] border border-[#E2DDD3] text-xs font-semibold text-[#1F2421] hover:bg-[#EFEAE1] transition shadow-xs"
    >
      <ArrowLeft className="w-3.5 h-3.5" />
      <span>Retour au Menu</span>
    </button>
  );

  if (subView === 'stocks') {
    return (
      <div className="space-y-4">
        {renderBackBtn()}
        <StocksView />
      </div>
    );
  }

  if (subView === 'purchases') {
    return (
      <div className="space-y-4">
        {renderBackBtn()}
        <PurchasesView />
      </div>
    );
  }

  if (subView === 'cash') {
    return (
      <div className="space-y-4">
        {renderBackBtn()}
        <CashRegisterView />
      </div>
    );
  }

  if (subView === 'audit') {
    return (
      <div className="space-y-4">
        {renderBackBtn()}
        <AuditView />
      </div>
    );
  }

  if (subView === 'team') {
    return (
      <div className="space-y-4">
        {renderBackBtn()}
        <TeamView />
      </div>
    );
  }

  if (subView === 'settings') {
    return (
      <div className="space-y-4">
        {renderBackBtn()}
        <SettingsView />
      </div>
    );
  }

  if (subView === 'expenses') {
    return (
      <div className="space-y-6 max-w-4xl mx-auto pb-6">
        {renderBackBtn()}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Formulaire de saisie */}
          <div className="bg-[#FAF8F5] rounded-3xl border border-[#E2DDD3] p-6 shadow-xs">
            <h3 className="text-base font-bold text-[#1F2421] mb-1 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-[#B87555]" />
              Enregistrer une Dépense Commerciale
            </h3>
            <p className="text-xs text-[#5A625D] mb-5">
              Transport, électricité, loyer, salaires et charges courantes de la boutique
            </p>

            {expenseSuccess && (
              <div className="mb-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Dépense enregistrée et déduite des bénéfices nets.</span>
              </div>
            )}

            <form onSubmit={handleAddExpense} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#1F2421] mb-1">Catégorie de charge</label>
                <select
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value as any)}
                  className="w-full px-3 py-2 bg-[#F4F1E9] border border-[#E2DDD3] rounded-xl text-[#1F2421]"
                >
                  <option value="transport">Transport & Livraison</option>
                  <option value="electricite">Électricité & Eau</option>
                  <option value="loyer">Loyer commercial</option>
                  <option value="salaires">Salaires & Acomptes</option>
                  <option value="achats_divers">Achats divers & petits matériels</option>
                  <option value="autre">Autre charge</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#1F2421] mb-1">Montant décaissé (FCFA) *</label>
                <input
                  type="number"
                  min={100}
                  step={100}
                  required
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#F4F1E9] border border-[#E2DDD3] rounded-xl text-[#1F2421] font-bold text-sm"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#1F2421] mb-1">Description / Motif *</label>
                <input
                  type="text"
                  required
                  value={expenseDesc}
                  onChange={(e) => setExpenseDesc(e.target.value)}
                  placeholder="ex: Facture CIE électricité boutique"
                  className="w-full px-3 py-2 bg-[#F4F1E9] border border-[#E2DDD3] rounded-xl text-[#1F2421]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#294637] hover:bg-[#1E3429] text-[#FAF8F5] font-bold transition shadow-xs"
              >
                Valider la dépense
              </button>
            </form>
          </div>

          {/* Dernières dépenses */}
          <div className="bg-[#FAF8F5] rounded-3xl border border-[#E2DDD3] p-6 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-[#1F2421] mb-1 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#294637]" />
                Dernières Dépenses Enregistrées
              </h3>
              <p className="text-xs text-[#5A625D] mb-4">
                Historique des sorties déduites de la trésorerie
              </p>

              {expensesList.length === 0 ? (
                <div className="p-6 rounded-2xl bg-[#F4F1E9] text-center text-xs text-[#5A625D]">
                  Aucune dépense enregistrée.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                  {expensesList.slice(0, 10).map((exp) => (
                    <div
                      key={exp.id}
                      className="p-3 rounded-2xl bg-[#F4F1E9] border border-[#E2DDD3] flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-bold text-[#1F2421]">{exp.description}</div>
                        <div className="text-[10px] text-[#5A625D]">
                          {exp.category} • Par {exp.authorName} • {exp.date}
                        </div>
                      </div>
                      <div className="text-xs font-bold text-[#B87555]">
                        -{exp.amount.toLocaleString('fr-FR')} FCFA
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Vue principale du Menu
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-6">
      <div className="bg-[#FAF8F5] p-5 sm:p-6 rounded-3xl border border-[#E2DDD3] shadow-xs">
        <h2 className="text-xl font-bold text-[#1F2421]">
          Menu & Modules Opérationnels
        </h2>
        <p className="text-xs text-[#5A625D] mt-0.5">
          Stocks multi-conditionnements, approvisionnements fournisseurs, caisse permanente et gestion d'équipe
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {/* Stocks & Inventaires */}
        <button
          onClick={() => setSubView('stocks')}
          className="flex items-center gap-3.5 p-4 rounded-2xl bg-[#FAF8F5] border border-[#E2DDD3] hover:border-[#294637] transition text-left shadow-xs"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-800 flex items-center justify-center shrink-0">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#1F2421]">Stocks & Inventaires</h4>
            <p className="text-[11px] text-[#5A625D]">Mouvements, casses et recomptages</p>
          </div>
        </button>

        {/* Approvisionnements (Achats) */}
        <button
          onClick={() => setSubView('purchases')}
          className="flex items-center gap-3.5 p-4 rounded-2xl bg-[#FAF8F5] border border-[#E2DDD3] hover:border-[#294637] transition text-left shadow-xs"
        >
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-800 flex items-center justify-center shrink-0">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#1F2421]">Approvisionnements</h4>
            <p className="text-[11px] text-[#5A625D]">Réceptions fournisseurs & calcul PMP</p>
          </div>
        </button>

        {/* Caisse Permanente */}
        <button
          onClick={() => setSubView('cash')}
          className="flex items-center gap-3.5 p-4 rounded-2xl bg-[#FAF8F5] border border-[#E2DDD3] hover:border-[#294637] transition text-left shadow-xs"
        >
          <div className="w-10 h-10 rounded-xl bg-[#294637]/10 text-[#294637] flex items-center justify-center shrink-0">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#1F2421]">Caisse Permanente</h4>
            <p className="text-[11px] text-[#5A625D]">Tiroir d'espèces, Mobile Money, apports</p>
          </div>
        </button>

        {/* Dépenses */}
        <button
          onClick={() => setSubView('expenses')}
          className="flex items-center gap-3.5 p-4 rounded-2xl bg-[#FAF8F5] border border-[#E2DDD3] hover:border-[#294637] transition text-left shadow-xs"
        >
          <div className="w-10 h-10 rounded-xl bg-[#B87555]/10 text-[#B87555] flex items-center justify-center shrink-0">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#1F2421]">Dépenses Commerciales</h4>
            <p className="text-[11px] text-[#5A625D]">Transport, salaires, loyer, électricité</p>
          </div>
        </button>

        {/* Équipe & Accès */}
        <button
          onClick={() => setSubView('team')}
          className="flex items-center gap-3.5 p-4 rounded-2xl bg-[#FAF8F5] border border-[#E2DDD3] hover:border-[#294637] transition text-left shadow-xs"
        >
          <div className="w-10 h-10 rounded-xl bg-[#294637]/10 text-[#294637] flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-bold text-[#1F2421]">Équipe (Max 6)</h4>
              <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-[#294637]/10 text-[#294637]">
                Comptes
              </span>
            </div>
            <p className="text-[11px] text-[#5A625D]">Gestion des accès et présences</p>
          </div>
        </button>

        {/* Journal d'Audit (Admin) */}
        {isAdmin && (
          <button
            onClick={() => setSubView('audit')}
            className="flex items-center gap-3.5 p-4 rounded-2xl bg-[#FAF8F5] border border-[#E2DDD3] hover:border-[#294637] transition text-left shadow-xs"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-800 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-bold text-[#1F2421]">Journal d'Audit</h4>
                <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-[#B87555]/15 text-[#B87555]">
                  Admin
                </span>
              </div>
              <p className="text-[11px] text-[#5A625D]">Traçabilité inaltérable des opérations</p>
            </div>
          </button>
        )}

        {/* Paramètres & PWA */}
        <button
          onClick={() => setSubView('settings')}
          className="flex items-center gap-3.5 p-4 rounded-2xl bg-[#FAF8F5] border border-[#E2DDD3] hover:border-[#294637] transition text-left shadow-xs"
        >
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-[#1F2421] flex items-center justify-center shrink-0">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#1F2421]">Configuration & PWA</h4>
            <p className="text-[11px] text-[#5A625D]">Mode hors-ligne, Spark et diagnostic</p>
          </div>
        </button>

        {/* Déconnexion */}
        <button
          onClick={onSignOut}
          className="flex items-center gap-3.5 p-4 rounded-2xl bg-rose-50/60 border border-rose-200/60 hover:bg-rose-50 transition text-left text-rose-800 shadow-xs"
        >
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
            <LogOut className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold">Déconnexion</h4>
            <p className="text-[11px] text-rose-600/80">Quitter la session active</p>
          </div>
        </button>
      </div>
    </div>
  );
};
