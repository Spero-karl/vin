/**
 * Gestion des Approvisionnements & Achats Fournisseurs
 * Calcul automatique du Coût Moyen Pondéré (PMP) pour le calcul des marges réelles
 * Application : GESTION BOISSONS
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Product, Purchase, PackagingType } from '../../types/models';
import { listenToProducts, executePurchaseTransaction } from '../../services/products';
import { db } from '../../config/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { 
  Truck, 
  Plus, 
  CheckCircle2, 
  AlertCircle
} from 'lucide-react';

export const PurchasesView: React.FC = () => {
  const { profile } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  // Formulaire d'arrivage
  const [supplier, setSupplier] = useState('Distributeur Officiel');
  const [invoiceRef, setInvoiceRef] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [packaging, setPackaging] = useState<PackagingType>('carton');
  const [quantity, setQuantity] = useState<number>(5);
  const [totalCost, setTotalCost] = useState<number>(50000);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; msg: string } | null>(null);

  useEffect(() => {
    const unsubProducts = listenToProducts(setProducts);

    if (!db) return () => unsubProducts();

    const purchasesRef = collection(db, 'purchases');
    const q = query(purchasesRef, orderBy('createdAt', 'desc'));
    const unsubPurchases = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({
        ...(d.data() as Purchase),
        id: d.id,
      }));
      setPurchases(list);
    }, () => {});

    return () => {
      unsubProducts();
      unsubPurchases();
    };
  }, []);

  const handleCreatePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || quantity <= 0 || totalCost <= 0) return;

    const prod = products.find(p => p.id === selectedProductId);
    if (!prod) return;

    setIsSubmitting(true);
    setFeedback(null);

    const bottlesAdded = packaging === 'carton'
      ? quantity * prod.unitsPerCase
      : quantity;

    const unitCostPerBottle = Math.round(totalCost / bottlesAdded);

    const purchasePayload: any = {
      supplier: supplier.trim() || 'Fournisseur Comptoir',
      date,
      fees: 0,
      items: [
        {
          productId: prod.id,
          productName: prod.name,
          packaging,
          quantity,
          unitsPerPack: prod.unitsPerCase,
          bottlesAdded,
          unitCostPerBottle,
          totalCost: Number(totalCost),
        },
      ],
      totalAmount: Number(totalCost),
      receivedBy: profile?.uid || 'usr_anonymous',
      receivedByName: profile?.displayName || 'Collaborateur',
      createdAt: new Date().toISOString(),
    };

    if (invoiceRef.trim()) {
      purchasePayload.invoiceRef = invoiceRef.trim();
    }

    const res = await executePurchaseTransaction(purchasePayload);
    setIsSubmitting(false);

    if (res.success) {
      setFeedback({
        success: true,
        msg: `Arrivage validé ! Stock augmenté de +${bottlesAdded} bouteilles et PMP actualisé à ${unitCostPerBottle} FCFA/btl.`,
      });
      setInvoiceRef('');
      setTimeout(() => {
        setShowAddModal(false);
        setFeedback(null);
      }, 1500);
    } else {
      setFeedback({ success: false, msg: res.error || 'Erreur lors de l’enregistrement de l’arrivage.' });
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-6">
      {/* 1. En-tête */}
      <div className="bg-[#FAF8F5] rounded-3xl border border-[#E2DDD3] p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-500/10 text-sky-800 border border-sky-500/20 mb-2">
              <Truck className="w-3.5 h-3.5" />
              <span>Approvisionnements Fournisseurs & Calcul PMP</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#1F2421] tracking-tight">
              Réceptions & Arrivages Fournisseurs
            </h2>
            <p className="text-xs sm:text-sm text-[#5A625D] mt-1">
              Enregistrez les livraisons pour incrémenter les stocks et actualiser automatiquement le coût moyen d'achat.
            </p>
          </div>

          <button
            onClick={() => {
              if (products.length > 0) setSelectedProductId(products[0].id);
              setShowAddModal(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#294637] hover:bg-[#1E3429] text-[#FAF8F5] font-bold text-xs shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Enregistrer un arrivage</span>
          </button>
        </div>
      </div>

      {/* 2. Historique des arrivages */}
      <div className="bg-[#FAF8F5] rounded-3xl border border-[#E2DDD3] p-6 shadow-xs">
        <h3 className="text-base font-bold text-[#1F2421] mb-1 flex items-center gap-2">
          <Truck className="w-5 h-5 text-[#294637]" />
          Historique des Réceptions ({purchases.length})
        </h3>
        <p className="text-xs text-[#5A625D] mb-5">
          Toutes les livraisons reçues en boutique avec détail des coûts
        </p>

        {purchases.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[#F4F1E9] text-center border border-dashed border-[#E2DDD3]">
            <Truck className="w-8 h-8 text-[#5A625D] mx-auto mb-2 opacity-60" />
            <p className="text-xs font-semibold text-[#1F2421]">
              Aucun arrivage enregistré pour le moment
            </p>
            <p className="text-[11px] text-[#5A625D] mt-0.5">
              Cliquez sur "Enregistrer un arrivage" pour réceptionner votre première commande fournisseur.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {purchases.map((pur) => (
              <div
                key={pur.id}
                className="p-4 rounded-2xl bg-[#F4F1E9] border border-[#E2DDD3] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-[#1F2421]">{pur.supplier}</span>
                    {pur.invoiceRef && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#FAF8F5] border border-[#E2DDD3] font-mono text-[#5A625D]">
                        Facture: {pur.invoiceRef}
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-[#5A625D]">
                    {pur.items.map((item, idx) => (
                      <span key={idx} className="font-medium text-[#1F2421]">
                        {item.quantity} {item.packaging === 'carton' ? 'carton(s)' : 'bouteille(s)'} de {item.productName} (+{item.bottlesAdded} btl)
                      </span>
                    ))}
                  </div>

                  <div className="text-[10px] text-[#6A726D] mt-1">
                    Date : {new Date(pur.date).toLocaleDateString('fr-FR')} • Réceptionné par {pur.receivedByName}
                  </div>
                </div>

                <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-[#E2DDD3]">
                  <div className="text-[10px] uppercase font-bold text-[#5A625D]">Coût Total Arrivage</div>
                  <div className="text-sm font-bold text-[#294637]">
                    {pur.totalAmount.toLocaleString('fr-FR')} FCFA
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Nouvel Arrivage */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-[#FAF8F5] border border-[#E2DDD3] p-6 shadow-2xl text-[#1F2421]">
            <h3 className="text-lg font-bold text-[#1F2421] mb-1">
              Réceptionner une commande fournisseur
            </h3>
            <p className="text-xs text-[#5A625D] mb-4">
              Augmente le stock et recalcule le Coût Moyen Pondéré (PMP)
            </p>

            {feedback && (
              <div className={`mb-4 p-3 rounded-2xl text-xs flex items-center gap-2 ${
                feedback.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                {feedback.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                <span>{feedback.msg}</span>
              </div>
            )}

            <form onSubmit={handleCreatePurchase} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Fournisseur *</label>
                  <input
                    type="text"
                    required
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    placeholder="ex: Solibra / Brassivoire"
                    className="w-full px-3 py-2 bg-[#F4F1E9] border border-[#E2DDD3] rounded-xl text-[#1F2421]"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">N° Facture / BL</label>
                  <input
                    type="text"
                    value={invoiceRef}
                    onChange={(e) => setInvoiceRef(e.target.value)}
                    placeholder="ex: FACT-2026-089"
                    className="w-full px-3 py-2 bg-[#F4F1E9] border border-[#E2DDD3] rounded-xl text-[#1F2421]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Boisson livrée *</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-[#F4F1E9] border border-[#E2DDD3] rounded-xl text-[#1F2421]"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.unitsPerCase} btles/ctn - Stock actuel: {p.stockBottles})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Conditionnement *</label>
                  <select
                    value={packaging}
                    onChange={(e) => setPackaging(e.target.value as PackagingType)}
                    className="w-full px-3 py-2 bg-[#F4F1E9] border border-[#E2DDD3] rounded-xl text-[#1F2421]"
                  >
                    <option value="carton">Cartons / Casiers</option>
                    <option value="bouteille">Bouteilles individuelles</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Quantité reçue *</label>
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    required
                    className="w-full px-3 py-2 bg-[#F4F1E9] border border-[#E2DDD3] rounded-xl text-[#1F2421] font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Coût d'achat total facturé (FCFA) *</label>
                <input
                  type="number"
                  min={100}
                  step={100}
                  value={totalCost}
                  onChange={(e) => setTotalCost(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 bg-[#F4F1E9] border border-[#E2DDD3] rounded-xl text-[#1F2421] font-bold text-sm"
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
                  {isSubmitting ? 'Validation...' : 'Valider la réception'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
