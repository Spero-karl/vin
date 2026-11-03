/**
 * Gestion Détaillée des Stocks & Mouvements (Multi-Conditionnements)
 * Règle métier : Aucune consigne d'emballage, conversion carton <-> bouteille,
 * journalisation horodatée de chaque mouvement.
 * Application : GESTION BOISSONS
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Product, StockMovement, STOCK_MOVEMENT_LABELS, StockMovementType } from '../../types/models';
import { listenToProducts } from '../../services/products';
import { db } from '../../config/firebase';
import { collection, query, orderBy, onSnapshot, runTransaction, doc } from 'firebase/firestore';
import { 
  Boxes, 
  ArrowUpDown, 
  Search, 
  Plus, 
  CheckCircle2, 
  AlertCircle,
  Filter
} from 'lucide-react';

export const StocksView: React.FC = () => {
  const { profile } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Modal d'ajustement de stock (casse, perte, ajustement, inventaire)
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [adjustType, setAdjustType] = useState<StockMovementType>('casse');
  const [adjustConditioning, setAdjustConditioning] = useState<'bouteilles' | 'cartons'>('bouteilles');
  const [adjustQuantity, setAdjustQuantity] = useState<number>(1);
  const [adjustReason, setAdjustReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; msg: string } | null>(null);

  useEffect(() => {
    const unsubProducts = listenToProducts(setProducts);

    if (!db) return () => unsubProducts();

    const movRef = collection(db, 'stock_movements');
    const q = query(movRef, orderBy('timestamp', 'desc'));
    const unsubMovements = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({
        ...(d.data() as StockMovement),
        id: d.id,
      }));
      setMovements(list);
    }, () => {});

    return () => {
      unsubProducts();
      unsubMovements();
    };
  }, []);

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !selectedProductId || adjustQuantity <= 0) return;
    const firestore = db;

    const prod = products.find(p => p.id === selectedProductId);
    if (!prod) return;

    setIsSubmitting(true);
    setFeedback(null);

    const bottlesDelta = adjustConditioning === 'cartons'
      ? adjustQuantity * prod.unitsPerCase
      : adjustQuantity;

    const isNegativeMovement = adjustType === 'casse' || adjustType === 'perte' || adjustType === 'ajustement';
    const finalQuantityDelta = isNegativeMovement ? -bottlesDelta : bottlesDelta;

    try {
      await runTransaction(firestore, async (transaction) => {
        const prodRef = doc(firestore, 'products', prod.id);
        const prodSnap = await transaction.get(prodRef);

        if (!prodSnap.exists()) {
          throw new Error('Le produit n’existe plus.');
        }

        const currentStock = (prodSnap.data() as Product).stockBottles || 0;
        const newStock = currentStock + finalQuantityDelta;

        if (newStock < 0) {
          throw new Error(`Stock insuffisant : stock actuel = ${currentStock} bouteilles.`);
        }

        transaction.update(prodRef, {
          stockBottles: newStock,
          updatedAt: new Date().toISOString(),
        });

        // Enregistrer le mouvement
        const movRef = doc(collection(firestore, 'stock_movements'));
        const movementData: StockMovement = {
          id: movRef.id,
          productId: prod.id,
          productName: prod.name,
          type: adjustType,
          quantityBottles: finalQuantityDelta,
          previousStock: currentStock,
          newStock: newStock,
          reason: adjustReason.trim() || 'Ajustement manuel magasin',
          performedBy: profile?.uid || 'usr_anonymous',
          performedByName: profile?.displayName || 'Collaborateur',
          timestamp: new Date().toISOString(),
        };
        transaction.set(movRef, movementData);

        // Journal d'audit
        const auditRef = doc(collection(firestore, 'audit_logs'));
        transaction.set(auditRef, {
          id: auditRef.id,
          action: 'MOUVEMENT_STOCK_MANUEL',
          entity: 'stock',
          performedBy: profile?.uid,
          performedByName: profile?.displayName,
          timestamp: new Date().toISOString(),
          details: `Ajustement stock (${adjustType}) sur "${prod.name}" : delta ${finalQuantityDelta > 0 ? `+${finalQuantityDelta}` : finalQuantityDelta} btl (nouveau stock : ${newStock}). Motif: ${adjustReason.trim()}`,
        });
      });

      setFeedback({ success: true, msg: 'Stock ajusté avec succès.' });
      setAdjustReason('');
      setAdjustQuantity(1);
      setTimeout(() => {
        setShowAdjustModal(false);
        setFeedback(null);
      }, 1200);
    } catch (err) {
      setFeedback({ success: false, msg: err instanceof Error ? err.message : String(err) });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.brand ? p.brand.toLowerCase().includes(searchQuery.toLowerCase()) : false)
  );

  const filteredMovements = movements.filter(m => {
    if (typeFilter !== 'all' && m.type !== typeFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-6">
      {/* 1. En-tête */}
      <div className="bg-[#FAF8F5] rounded-3xl border border-[#E2DDD3] p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-800 border border-amber-500/20 mb-2">
              <Boxes className="w-3.5 h-3.5" />
              <span>Multi-Conditionnements & Conversions</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#1F2421] tracking-tight">
              Gestion des Stocks & Mouvements
            </h2>
            <p className="text-xs sm:text-sm text-[#5A625D] mt-1">
              Suivi atomique des bouteilles et cartons, enregistrement des casses et inventaires.
            </p>
          </div>

          <button
            onClick={() => {
              if (products.length > 0) setSelectedProductId(products[0].id);
              setShowAdjustModal(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#294637] hover:bg-[#1E3429] text-[#FAF8F5] font-bold text-xs shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Déclarer une casse / ajustement</span>
          </button>
        </div>
      </div>

      {/* 2. État actuel des stocks en rayon & réserve */}
      <div className="bg-[#FAF8F5] rounded-3xl border border-[#E2DDD3] p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="text-base font-bold text-[#1F2421]">
              Niveaux de Stocks Disponibles
            </h3>
            <p className="text-xs text-[#5A625D]">
              Conversion automatique entre cartons et bouteilles de base
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-[#5A625D] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher une boisson..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#F4F1E9] border border-[#E2DDD3] rounded-xl text-[#1F2421] placeholder-[#5A625D] focus:outline-none focus:ring-1 focus:ring-[#294637]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredProducts.map((prod) => {
            const cases = Math.floor(prod.stockBottles / prod.unitsPerCase);
            const extraBottles = prod.stockBottles % prod.unitsPerCase;
            const isLow = prod.stockBottles <= prod.minStockAlert;

            return (
              <div
                key={prod.id}
                className="p-4 rounded-2xl bg-[#F4F1E9] border border-[#E2DDD3] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="text-xs font-bold text-[#1F2421]">{prod.name}</h4>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      isLow 
                        ? 'bg-[#B87555]/15 text-[#B87555] border border-[#B87555]/25' 
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}>
                      {isLow ? 'Alerte' : 'Optimal'}
                    </span>
                  </div>

                  <p className="text-[11px] text-[#5A625D] mb-3">
                    {prod.formatVolume} • Conditionnement: {prod.unitsPerCase} {prod.baseUnit}s / carton
                  </p>
                </div>

                <div className="border-t border-[#E2DDD3] pt-2.5 flex items-end justify-between">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-[#5A625D]">En réserve</div>
                    <div className="text-xs font-bold text-[#1F2421]">
                      {cases} carton{cases > 1 ? 's' : ''} {extraBottles > 0 ? `+ ${extraBottles} btl` : ''}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] uppercase font-bold text-[#5A625D]">Total unité</div>
                    <div className="text-sm font-bold text-[#294637]">
                      {prod.stockBottles} {prod.baseUnit}s
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Journal des mouvements de stocks */}
      <div className="bg-[#FAF8F5] rounded-3xl border border-[#E2DDD3] p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="text-base font-bold text-[#1F2421] flex items-center gap-2">
              <ArrowUpDown className="w-5 h-5 text-[#294637]" />
              Historique des Mouvements de Stock
            </h3>
            <p className="text-xs text-[#5A625D]">
              Traçabilité horodatée avec utilisateur responsable
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <Filter className="w-3.5 h-3.5 text-[#5A625D]" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-[#F4F1E9] border border-[#E2DDD3] rounded-xl text-[#1F2421]"
            >
              <option value="all">Tous les types</option>
              <option value="vente">Ventes</option>
              <option value="entree_achat">Arrivages / Achats</option>
              <option value="casse">Casses / Bris de bouteilles</option>
              <option value="perte">Pertes constatées</option>
              <option value="ajustement">Ajustements manuels</option>
              <option value="inventaire">Inventaires</option>
            </select>
          </div>
        </div>

        {filteredMovements.length === 0 ? (
          <div className="p-6 rounded-2xl bg-[#F4F1E9] text-center text-xs text-[#5A625D]">
            Aucun mouvement de stock enregistré.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#1F2421]">
              <thead>
                <tr className="border-b border-[#E2DDD3] text-[#5A625D] uppercase text-[10px]">
                  <th className="py-2.5 px-3 font-semibold">Date & Heure</th>
                  <th className="py-2.5 px-3 font-semibold">Produit</th>
                  <th className="py-2.5 px-3 font-semibold">Type de mouvement</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Variation</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Stock Final</th>
                  <th className="py-2.5 px-3 font-semibold">Motif / Justification</th>
                  <th className="py-2.5 px-3 font-semibold">Responsable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2DDD3]">
                {filteredMovements.slice(0, 30).map((mov) => {
                  const isPositive = mov.quantityBottles > 0;
                  const label = STOCK_MOVEMENT_LABELS[mov.type] || mov.type;

                  return (
                    <tr key={mov.id} className="hover:bg-[#F4F1E9]/60 transition">
                      <td className="py-2.5 px-3 text-[#5A625D] font-mono whitespace-nowrap">
                        {mov.timestamp ? new Date(mov.timestamp).toLocaleString('fr-FR') : '-'}
                      </td>
                      <td className="py-2.5 px-3 font-bold">{mov.productName}</td>
                      <td className="py-2.5 px-3">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FAF8F5] border border-[#E2DDD3]">
                          {label}
                        </span>
                      </td>
                      <td className={`py-2.5 px-3 text-right font-bold ${isPositive ? 'text-emerald-700' : 'text-[#B87555]'}`}>
                        {isPositive ? `+${mov.quantityBottles}` : mov.quantityBottles} btl
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-[#1F2421]">
                        {mov.newStock} btl
                      </td>
                      <td className="py-2.5 px-3 text-[#5A625D]">{mov.reason || '-'}</td>
                      <td className="py-2.5 px-3 text-[#1F2421] font-medium">{mov.performedByName}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Ajustement Manuel */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-[#FAF8F5] border border-[#E2DDD3] p-6 shadow-2xl text-[#1F2421]">
            <h3 className="text-lg font-bold text-[#1F2421] mb-1">
              Ajuster le stock d'un produit
            </h3>
            <p className="text-xs text-[#5A625D] mb-4">
              Enregistrement d'une casse, d'une perte ou d'un recomptage d'inventaire
            </p>

            {feedback && (
              <div className={`mb-4 p-3 rounded-2xl text-xs flex items-center gap-2 ${
                feedback.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                {feedback.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
                <span>{feedback.msg}</span>
              </div>
            )}

            <form onSubmit={handleAdjustStock} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold mb-1">Boisson concernée *</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-[#F4F1E9] border border-[#E2DDD3] rounded-xl text-[#1F2421]"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Stock actuel: {p.stockBottles} {p.baseUnit}s)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Type d'opération *</label>
                <select
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value as StockMovementType)}
                  className="w-full px-3 py-2 bg-[#F4F1E9] border border-[#E2DDD3] rounded-xl text-[#1F2421]"
                >
                  <option value="casse">Casse / Bouteille brisée (Sortie)</option>
                  <option value="perte">Perte constatée (Sortie)</option>
                  <option value="ajustement">Ajustement inventaire (Correction)</option>
                  <option value="inventaire">Régularisation inventaire</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Conditionnement *</label>
                  <select
                    value={adjustConditioning}
                    onChange={(e) => setAdjustConditioning(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[#F4F1E9] border border-[#E2DDD3] rounded-xl text-[#1F2421]"
                  >
                    <option value="bouteilles">Bouteilles individuelles</option>
                    <option value="cartons">Cartons entiers</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Quantité *</label>
                  <input
                    type="number"
                    min={1}
                    value={adjustQuantity}
                    onChange={(e) => setAdjustQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    required
                    className="w-full px-3 py-2 bg-[#F4F1E9] border border-[#E2DDD3] rounded-xl text-[#1F2421] font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Motif / Justification *</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Bouteille tombée lors de la mise en rayon"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F4F1E9] border border-[#E2DDD3] rounded-xl text-[#1F2421]"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[#E8E4DA] hover:bg-[#DDD8CD] text-[#1F2421] font-semibold transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-[#294637] hover:bg-[#1E3429] text-[#FAF8F5] font-bold transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Enregistrement...' : 'Valider'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
