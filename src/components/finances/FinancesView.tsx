/**
 * Rubrique Financière (Accès STRICTEMENT RÉSERVÉ à l'Administrateur Principal)
 * Calcul du Chiffre d'affaires, Dépenses, Bénéfices estimés et Marges au CMP
 * Application : GESTION BOISSONS
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Sale, Expense, Product } from '../../types/models';
import { db } from '../../config/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { 
  TrendingUp, 
  Coins, 
  DollarSign, 
  ReceiptText, 
  Calendar, 
  PieChart, 
  Lock, 
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

export const FinancesView: React.FC = () => {
  const { profile } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('month');

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (!isAdmin || !db) return;

    const salesRef = collection(db, 'sales');
    const qSales = query(salesRef, orderBy('timestamp', 'desc'));
    const unsubSales = onSnapshot(qSales, (snap) => {
      const list = snap.docs.map(d => ({ ...(d.data() as Sale), id: d.id }));
      setSales(list.filter(s => s.status !== 'annulee'));
    });

    const expensesRef = collection(db, 'expenses');
    const qExp = query(expensesRef, orderBy('createdAt', 'desc'));
    const unsubExp = onSnapshot(qExp, (snap) => {
      const list = snap.docs.map(d => ({ ...(d.data() as Expense), id: d.id }));
      setExpenses(list);
    });

    return () => {
      unsubSales();
      unsubExp();
    };
  }, [isAdmin]);

  // Si l'utilisateur n'est pas admin : barrière stricte
  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 rounded-3xl bg-[#FAF8F5] border border-[#E2DDD3] text-center shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center mx-auto mb-3">
          <Lock className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-[#1F2421]">Accès Financier Protégé</h3>
        <p className="text-xs text-[#5A625D] mt-1 leading-relaxed">
          La rubrique financière (chiffre d'affaires, marges au CMP, dépenses et bénéfices nets) est strictement réservée au propriétaire / administrateur principal.
        </p>
      </div>
    );
  }

  // Filtrage selon la période
  const now = new Date();
  const filteredSales = sales.filter(s => {
    if (period === 'all') return true;
    const saleDate = new Date(s.timestamp || s.date);
    if (period === 'today') {
      return saleDate.toDateString() === now.toDateString();
    }
    if (period === 'week') {
      const diffDays = (now.getTime() - saleDate.getTime()) / (1000 * 3600 * 24);
      return diffDays <= 7;
    }
    if (period === 'month') {
      return saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear();
    }
    return true;
  });

  const filteredExpenses = expenses.filter(e => {
    if (period === 'all') return true;
    const expDate = new Date(e.createdAt || e.date);
    if (period === 'today') {
      return expDate.toDateString() === now.toDateString();
    }
    if (period === 'week') {
      const diffDays = (now.getTime() - expDate.getTime()) / (1000 * 3600 * 24);
      return diffDays <= 7;
    }
    if (period === 'month') {
      return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear();
    }
    return true;
  });

  // Calculs Financiers rigoureux
  const totalRevenue = filteredSales.reduce((acc, s) => acc + s.totalAmount, 0);
  const totalExpenses = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);

  // Coût des marchandises vendues (COGS) basé sur le CMP au moment de la vente
  const totalCostOfGoodsSold = filteredSales.reduce((acc, s) => {
    const saleCost = s.items.reduce((sum, item) => {
      const itemCost = item.costPriceAtSale || 0;
      return sum + (itemCost * item.bottlesDeducted);
    }, 0);
    return acc + saleCost;
  }, 0);

  const grossMargin = totalRevenue - totalCostOfGoodsSold; // Marge brute
  const netEstimatedProfit = grossMargin - totalExpenses; // Bénéfice net estimé
  const marginPercentage = totalRevenue > 0 ? Math.round((grossMargin / totalRevenue) * 100) : 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-6">
      {/* En-tête & Filtre de période */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FAF8F5] p-5 sm:p-6 rounded-3xl border border-[#E2DDD3] shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#294637]/10 text-[#294637]">
              Accès Administrateur
            </span>
          </div>
          <h2 className="text-xl font-bold text-[#1F2421]">
            Finances, Marges & Performance
          </h2>
          <p className="text-xs text-[#5A625D] mt-0.5">
            Calcul des marges réelles basé sur le Coût Moyen Pondéré (PMP) • Monnaie FCFA
          </p>
        </div>

        {/* Sélecteur de période */}
        <div className="flex rounded-2xl bg-[#F4F1E9] p-1 border border-[#E2DDD3] text-xs font-semibold">
          <button
            onClick={() => setPeriod('today')}
            className={`py-1.5 px-3 rounded-xl transition ${period === 'today' ? 'bg-[#294637] text-[#FAF8F5]' : 'text-[#5A625D]'}`}
          >
            Aujourd'hui
          </button>
          <button
            onClick={() => setPeriod('week')}
            className={`py-1.5 px-3 rounded-xl transition ${period === 'week' ? 'bg-[#294637] text-[#FAF8F5]' : 'text-[#5A625D]'}`}
          >
            7 jours
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`py-1.5 px-3 rounded-xl transition ${period === 'month' ? 'bg-[#294637] text-[#FAF8F5]' : 'text-[#5A625D]'}`}
          >
            Ce mois
          </button>
          <button
            onClick={() => setPeriod('all')}
            className={`py-1.5 px-3 rounded-xl transition ${period === 'all' ? 'bg-[#294637] text-[#FAF8F5]' : 'text-[#5A625D]'}`}
          >
            Tout
          </button>
        </div>
      </div>

      {/* Cartes financières principales (4 métriques réelles) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Chiffre d'Affaires */}
        <div className="p-5 rounded-2xl bg-[#FAF8F5] border border-[#E2DDD3] shadow-xs">
          <span className="text-[10px] uppercase font-bold text-[#6A726D] tracking-wider block mb-1">
            Chiffre d'Affaires (CA)
          </span>
          <div className="text-2xl font-bold text-[#1F2421]">
            {totalRevenue.toLocaleString('fr-FR')} <span className="text-sm font-semibold">FCFA</span>
          </div>
          <p className="text-[11px] text-[#5A625D] mt-1">
            {filteredSales.length} vente{filteredSales.length > 1 ? 's' : ''} encaissée{filteredSales.length > 1 ? 's' : ''} au comptant
          </p>
        </div>

        {/* Coût d'achat & Marge Brute */}
        <div className="p-5 rounded-2xl bg-[#FAF8F5] border border-[#E2DDD3] shadow-xs">
          <span className="text-[10px] uppercase font-bold text-[#6A726D] tracking-wider block mb-1">
            Marge Brute (CMP)
          </span>
          <div className="text-2xl font-bold text-emerald-800">
            {grossMargin.toLocaleString('fr-FR')} <span className="text-sm font-semibold">FCFA</span>
          </div>
          <p className="text-[11px] text-emerald-700 font-medium mt-1">
            Taux de marge : ~{marginPercentage}%
          </p>
        </div>

        {/* Dépenses */}
        <div className="p-5 rounded-2xl bg-[#FAF8F5] border border-[#E2DDD3] shadow-xs">
          <span className="text-[10px] uppercase font-bold text-[#6A726D] tracking-wider block mb-1">
            Charges & Dépenses
          </span>
          <div className="text-2xl font-bold text-[#B87555]">
            {totalExpenses.toLocaleString('fr-FR')} <span className="text-sm font-semibold">FCFA</span>
          </div>
          <p className="text-[11px] text-[#5A625D] mt-1">
            {filteredExpenses.length} dépense{filteredExpenses.length > 1 ? 's' : ''} enregistrée{filteredExpenses.length > 1 ? 's' : ''}
          </p>
        </div>

        {/* Bénéfice Net Estimé */}
        <div className="p-5 rounded-2xl bg-[#FAF8F5] border border-[#E2DDD3] shadow-xs">
          <span className="text-[10px] uppercase font-bold text-[#6A726D] tracking-wider block mb-1">
            Bénéfice Net Estimé
          </span>
          <div className={`text-2xl font-bold ${netEstimatedProfit >= 0 ? 'text-[#294637]' : 'text-rose-700'}`}>
            {netEstimatedProfit.toLocaleString('fr-FR')} <span className="text-sm font-semibold">FCFA</span>
          </div>
          <p className="text-[11px] text-[#5A625D] mt-1">
            Marge brute - Dépenses courantes
          </p>
        </div>
      </div>

      {/* Règle financière absolue */}
      <div className="p-4 rounded-2xl bg-[#294637]/5 border border-[#294637]/20 text-xs text-[#294637] flex items-start gap-2.5">
        <TrendingUp className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          <strong>Règle de gestion financière :</strong> Les encaissements ne constituent pas un bénéfice automatique. Le bénéfice net affiché déduit fidèlement le coût d'achat moyen pondéré (PMP) des bouteilles vendues et les dépenses de fonctionnement.
        </span>
      </div>

      {/* Détail des dernières ventes enregistrées */}
      <div className="bg-[#FAF8F5] rounded-3xl border border-[#E2DDD3] p-5 shadow-xs">
        <h3 className="text-sm font-bold text-[#1F2421] mb-3">
          Historique Récent des Ventes ({filteredSales.length})
        </h3>

        {filteredSales.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E8E4DA] text-[10px] uppercase font-bold text-[#6A726D]">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Ticket</th>
                  <th className="py-2.5 px-3">Vendeur</th>
                  <th className="py-2.5 px-3">Articles</th>
                  <th className="py-2.5 px-3">Paiement</th>
                  <th className="py-2.5 px-3 text-right">Montant Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0ECE2]">
                {filteredSales.slice(0, 10).map((s) => (
                  <tr key={s.id} className="hover:bg-[#F4F1E9]/80 transition">
                    <td className="py-2.5 px-3 text-[#5A625D]">{s.date}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-[#1F2421]">#{s.id.slice(-6)}</td>
                    <td className="py-2.5 px-3 text-[#1F2421]">{s.sellerName}</td>
                    <td className="py-2.5 px-3 text-[#5A625D]">{s.items.length} produit(s)</td>
                    <td className="py-2.5 px-3 capitalize text-[#5A625D]">{s.paymentMethod.replace('_', ' ')}</td>
                    <td className="py-2.5 px-3 font-bold text-right text-[#294637]">
                      {s.totalAmount.toLocaleString('fr-FR')} FCFA
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-[#7A847E]">
            Aucune vente enregistrée pour cette période.
          </div>
        )}
      </div>
    </div>
  );
};
