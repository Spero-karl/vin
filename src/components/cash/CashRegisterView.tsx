/**
 * Gestion de la Caisse Permanente
 * Règle métier : Caisse permanente sans clôture quotidienne bloquante,
 * 100% paiement comptant, suivi des espèces, mobile money et retraits.
 * Application : GESTION BOISSONS
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Sale, Expense } from '../../types/models';
import { db } from '../../config/firebase';
import { collection, query, orderBy, onSnapshot, addDoc } from 'firebase/firestore';
import { 
  Coins, 
  Wallet, 
  ArrowDownRight, 
  ArrowUpRight, 
  CheckCircle2, 
  Smartphone, 
  Building2, 
  Plus, 
  Minus,
  Clock,
  Receipt
} from 'lucide-react';

interface CashMovement {
  id: string;
  type: 'apport' | 'retrait';
  amount: number;
  reason: string;
  performedBy: string;
  performedByName: string;
  timestamp: string;
}

export const CashRegisterView: React.FC = () => {
  const { profile } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [cashMovements, setCashMovements] = useState<CashMovement[]>([]);

  // Modal d'apport / retrait
  const [showModal, setShowModal] = useState(false);
  const [movementType, setMovementType] = useState<'apport' | 'retrait'>('apport');
  const [amount, setAmount] = useState<number>(10000);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!db) return;

    const salesRef = collection(db, 'sales');
    const qSales = query(salesRef, orderBy('createdAt', 'desc'));
    const unsubSales = onSnapshot(qSales, (snap) => {
      const list = snap.docs.map(d => ({ ...(d.data() as Sale), id: d.id }));
      setSales(list);
    }, () => {});

    const expRef = collection(db, 'expenses');
    const qExp = query(expRef, orderBy('createdAt', 'desc'));
    const unsubExp = onSnapshot(qExp, (snap) => {
      const list = snap.docs.map(d => ({ ...(d.data() as Expense), id: d.id }));
      setExpenses(list);
    }, () => {});

    const movRef = collection(db, 'cash_movements');
    const qMov = query(movRef, orderBy('timestamp', 'desc'));
    const unsubMov = onSnapshot(qMov, (snap) => {
      const list = snap.docs.map(d => ({ ...(d.data() as CashMovement), id: d.id }));
      setCashMovements(list);
    }, () => {});

    return () => {
      unsubSales();
      unsubExp();
      unsubMov();
    };
  }, []);

  // Calculs de caisse permanente
  const totalCashSales = sales
    .filter(s => s.status === 'validee' && (s.paymentMethod === 'especes' || s.paymentMethod === 'mixte'))
    .reduce((sum, s) => {
      if (s.paymentMethod === 'especes') return sum + s.totalAmount;
      if (s.paymentMethod === 'mixte' && s.paymentBreakdown?.especes) return sum + s.paymentBreakdown.especes;
      return sum;
    }, 0);

  const totalMobileMoneySales = sales
    .filter(s => s.status === 'validee' && (s.paymentMethod === 'mobile_money' || s.paymentMethod === 'mixte'))
    .reduce((sum, s) => {
      if (s.paymentMethod === 'mobile_money') return sum + s.totalAmount;
      if (s.paymentMethod === 'mixte' && s.paymentBreakdown?.mobileMoney) return sum + s.paymentBreakdown.mobileMoney;
      return sum;
    }, 0);

  const totalBankSales = sales
    .filter(s => s.status === 'validee' && s.paymentMethod === 'virement')
    .reduce((sum, s) => sum + s.totalAmount, 0);

  const totalExpensesPaid = expenses.reduce((sum, e) => sum + e.amount, 0);

  const totalApports = cashMovements
    .filter(m => m.type === 'apport')
    .reduce((sum, m) => sum + m.amount, 0);

  const totalRetraits = cashMovements
    .filter(m => m.type === 'retrait')
    .reduce((sum, m) => sum + m.amount, 0);

  // Espèces théoriques en tiroir
  const theoreticalCashInDrawer = totalCashSales + totalApports - totalExpensesPaid - totalRetraits;

  const handleCashMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || amount <= 0) return;

    setIsSubmitting(true);
    setFeedback(null);

    try {
      await addDoc(collection(db, 'cash_movements'), {
        type: movementType,
        amount: Number(amount),
        reason: reason.trim() || (movementType === 'apport' ? 'Fond de caisse initial' : 'Remise patron'),
        performedBy: profile?.uid || 'usr_anonymous',
        performedByName: profile?.displayName || 'Collaborateur',
        timestamp: new Date().toISOString(),
      });

      // Journal d'audit
      await addDoc(collection(db, 'audit_logs'), {
        action: movementType === 'apport' ? 'CAISSE_APPORT' : 'CAISSE_RETRAIT',
        entity: 'cash',
        performedBy: profile?.uid,
        performedByName: profile?.displayName,
        timestamp: new Date().toISOString(),
        details: `${movementType === 'apport' ? 'Apport' : 'Retrait'} de caisse de ${amount} FCFA : ${reason.trim()}`,
      });

      setFeedback('Mouvement de caisse enregistré avec succès.');
      setReason('');
      setTimeout(() => {
        setShowModal(false);
        setFeedback(null);
      }, 1200);
    } catch (err) {
      alert('Erreur: ' + String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-6">
      {/* 1. En-tête */}
      <div className="bg-[#FAF8F5] rounded-3xl border border-[#E2DDD3] p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#294637]/10 text-[#294637] border border-[#294637]/20 mb-2">
              <Coins className="w-3.5 h-3.5" />
              <span>Caisse Permanente (Sans clôture journalière obligatoire)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#1F2421] tracking-tight">
              État du Tiroir & Flux de Trésorerie
            </h2>
            <p className="text-xs sm:text-sm text-[#5A625D] mt-1">
              Enregistrement continu des encaissements comptant, dépenses payées et retraits de caisse.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setMovementType('apport');
                setShowModal(true);
              }}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FAF8F5] border border-[#E2DDD3] hover:border-[#294637] text-xs font-bold text-[#1F2421] transition shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 text-[#294637]" />
              <span>Apport de fond</span>
            </button>
            <button
              onClick={() => {
                setMovementType('retrait');
                setShowModal(true);
              }}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FAF8F5] border border-[#E2DDD3] hover:border-[#B87555] text-xs font-bold text-[#1F2421] transition shadow-xs"
            >
              <Minus className="w-3.5 h-3.5 text-[#B87555]" />
              <span>Retrait de caisse</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Cartes de solde */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Espèces en tiroir */}
        <div className="p-5 rounded-3xl bg-[#FAF8F5] border border-[#E2DDD3] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold text-[#5A625D] uppercase tracking-wider">
                Espèces en Tiroir
              </span>
              <div className="w-8 h-8 rounded-xl bg-[#294637]/10 text-[#294637] flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-bold text-[#294637]">
              {theoreticalCashInDrawer.toLocaleString('fr-FR')} FCFA
            </div>
          </div>
          <p className="text-[11px] text-[#5A625D] mt-3 border-t border-[#E8E4DA] pt-2">
            Solde théorique disponible physiquement
          </p>
        </div>

        {/* Mobile Money */}
        <div className="p-5 rounded-3xl bg-[#FAF8F5] border border-[#E2DDD3] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold text-[#5A625D] uppercase tracking-wider">
                Mobile Money
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-800 flex items-center justify-center">
                <Smartphone className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-bold text-[#1F2421]">
              {totalMobileMoneySales.toLocaleString('fr-FR')} FCFA
            </div>
          </div>
          <p className="text-[11px] text-[#5A625D] mt-3 border-t border-[#E8E4DA] pt-2">
            Orange Money, Wave, MTN
          </p>
        </div>

        {/* Total Dépenses Décaissées */}
        <div className="p-5 rounded-3xl bg-[#FAF8F5] border border-[#E2DDD3] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold text-[#5A625D] uppercase tracking-wider">
                Charges Payées
              </span>
              <div className="w-8 h-8 rounded-xl bg-[#B87555]/10 text-[#B87555] flex items-center justify-center">
                <ArrowDownRight className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-bold text-[#B87555]">
              {totalExpensesPaid.toLocaleString('fr-FR')} FCFA
            </div>
          </div>
          <p className="text-[11px] text-[#5A625D] mt-3 border-t border-[#E8E4DA] pt-2">
            {expenses.length} dépenses sorties de caisse
          </p>
        </div>

        {/* Virements Bancaires */}
        <div className="p-5 rounded-3xl bg-[#FAF8F5] border border-[#E2DDD3] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold text-[#5A625D] uppercase tracking-wider">
                Virements & Chèques
              </span>
              <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-800 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-bold text-[#1F2421]">
              {totalBankSales.toLocaleString('fr-FR')} FCFA
            </div>
          </div>
          <p className="text-[11px] text-[#5A625D] mt-3 border-t border-[#E8E4DA] pt-2">
            Encaissements directs en compte
          </p>
        </div>
      </div>

      {/* 3. Historique des mouvements de caisse (apports et retraits) */}
      <div className="bg-[#FAF8F5] rounded-3xl border border-[#E2DDD3] p-6 shadow-xs">
        <h3 className="text-base font-bold text-[#1F2421] mb-1 flex items-center gap-2">
          <Clock className="w-5 h-5 text-[#294637]" />
          Historique des Mouvements de Fond de Caisse
        </h3>
        <p className="text-xs text-[#5A625D] mb-5">
          Apports de monnaie et prélèvements de fonds enregistrés
        </p>

        {cashMovements.length === 0 ? (
          <div className="p-6 rounded-2xl bg-[#F4F1E9] text-center text-xs text-[#5A625D]">
            Aucun apport ou retrait enregistré. La caisse fonctionne de façon permanente.
          </div>
        ) : (
          <div className="space-y-2.5">
            {cashMovements.map((m) => {
              const isApport = m.type === 'apport';
              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F4F1E9] border border-[#E2DDD3]"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                      isApport ? 'bg-emerald-100 text-emerald-800' : 'bg-[#B87555]/15 text-[#B87555]'
                    }`}>
                      {isApport ? <Plus className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#1F2421]">
                        {isApport ? 'Apport de fond de caisse' : 'Retrait de caisse / Versement'}
                      </div>
                      <div className="text-[11px] text-[#5A625D]">
                        Motif : {m.reason} • Par {m.performedByName}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`text-xs font-bold ${isApport ? 'text-emerald-700' : 'text-[#B87555]'}`}>
                      {isApport ? `+${m.amount.toLocaleString('fr-FR')}` : `-${m.amount.toLocaleString('fr-FR')}`} FCFA
                    </div>
                    <div className="text-[10px] text-[#6A726D]">
                      {new Date(m.timestamp).toLocaleDateString('fr-FR')} {new Date(m.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Apport / Retrait */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-[#FAF8F5] border border-[#E2DDD3] p-6 shadow-2xl text-[#1F2421]">
            <h3 className="text-lg font-bold text-[#1F2421] mb-1">
              {movementType === 'apport' ? 'Apport de fond de caisse' : 'Retrait d’espèces'}
            </h3>
            <p className="text-xs text-[#5A625D] mb-4">
              {movementType === 'apport' 
                ? 'Injection de monnaie ou fond de roulement dans le tiroir' 
                : 'Prélèvement d’espèces pour versement ou remise patron'}
            </p>

            {feedback && (
              <div className="mb-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{feedback}</span>
              </div>
            )}

            <form onSubmit={handleCashMovement} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold mb-1">Montant (FCFA) *</label>
                <input
                  type="number"
                  min={500}
                  step={500}
                  required
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#F4F1E9] border border-[#E2DDD3] rounded-xl text-[#1F2421] font-bold text-sm"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Motif / Justification *</label>
                <input
                  type="text"
                  required
                  placeholder={movementType === 'apport' ? 'ex: Monnaie pour début de semaine' : 'ex: Dépôt sur compte bancaire'}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F4F1E9] border border-[#E2DDD3] rounded-xl text-[#1F2421]"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[#E8E4DA] hover:bg-[#DDD8CD] text-[#1F2421] font-semibold transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-[#294637] hover:bg-[#1E3429] text-[#FAF8F5] font-bold transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Validation...' : 'Valider'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
