/**
 * Module Caisse & Ventes au Comptant (Premium Retail)
 * RÈGLE MÉTIER : 100% Comptant, aucune vente à crédit, transactions atomiques
 * Application : GESTION BOISSONS
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Product, Sale, SaleItem, PackagingType, PaymentMethod, PAYMENT_METHOD_LABELS } from '../../types/models';
import { listenToProducts, executeSaleTransaction } from '../../services/products';
import { 
  ReceiptText, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Wine, 
  CreditCard, 
  Printer, 
  X,
  Coins
} from 'lucide-react';

interface CartLine {
  product: Product;
  packaging: PackagingType;
  quantity: number;
  unitPrice: number;
}

export const SalesView: React.FC = () => {
  const { profile } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Panier en cours
  const [cart, setCart] = useState<CartLine[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('especes');
  const [saleNotes, setSaleNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Reçu validé
  const [completedSale, setCompletedSale] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsub = listenToProducts((list) => {
      setProducts(list);
    });
    return () => unsub();
  }, []);

  const addToCart = (product: Product, packaging: PackagingType) => {
    setErrorMessage(null);
    const unitPrice = packaging === 'carton' || packaging === 'casier' 
      ? product.casePrice 
      : product.retailPrice;

    const existingIndex = cart.findIndex(
      line => line.product.id === product.id && line.packaging === packaging
    );

    if (existingIndex > -1) {
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      setCart(updated);
    } else {
      setCart([...cart, {
        product,
        packaging,
        quantity: 1,
        unitPrice,
      }]);
    }
  };

  const updateQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(index);
      return;
    }
    const updated = [...cart];
    updated[index].quantity = newQty;
    setCart(updated);
  };

  const removeFromCart = (index: number) => {
    const updated = cart.filter((_, i) => i !== index);
    setCart(updated);
  };

  const clearCart = () => {
    setCart([]);
    setSaleNotes('');
    setErrorMessage(null);
  };

  // Calcul du montant total de la vente
  const totalAmount = cart.reduce((sum, line) => sum + (line.unitPrice * line.quantity), 0);

  // Validation définitive de la vente (Transaction atomique)
  const handleValidateSale = async () => {
    if (cart.length === 0) return;
    setErrorMessage(null);
    setIsProcessing(true);

    const saleItems: SaleItem[] = cart.map(line => {
      const isCase = line.packaging === 'carton' || line.packaging === 'casier';
      const bottlesPerUnit = isCase ? line.product.unitsPerCase : 1;
      const bottlesDeducted = line.quantity * bottlesPerUnit;

      return {
        productId: line.product.id,
        productName: line.product.name,
        packaging: line.packaging,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        totalPrice: line.unitPrice * line.quantity,
        bottlesDeducted,
        costPriceAtSale: line.product.costPrice,
      };
    });

    const salePayload: Omit<Sale, 'id' | 'status'> = {
      date: new Date().toISOString().split('T')[0],
      timestamp: Date.now(),
      sellerId: profile?.uid || 'usr_collaborateur',
      sellerName: profile?.displayName || 'Collaborateur',
      items: saleItems,
      totalAmount,
      paymentMethod,
    };

    if (saleNotes.trim()) {
      salePayload.notes = saleNotes.trim();
    }

    const res = await executeSaleTransaction(salePayload);

    setIsProcessing(false);

    if (res.success && res.saleId) {
      setCompletedSale({
        id: res.saleId,
        items: saleItems,
        totalAmount,
        paymentMethod,
        date: new Date().toLocaleString('fr-FR'),
        sellerName: profile?.displayName || 'Collaborateur',
      });
      clearCart();
    } else {
      setErrorMessage(res.error || 'Erreur lors de la validation de la vente.');
    }
  };

  const filteredProducts = products.filter(
    p => p.status === 'actif' && (
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.brand && p.brand.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-6">
      {/* Messages d'erreur */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Disposition principale : Sélection des boissons (gauche) & Panier de caisse (droite) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Section Gauche : Sélection des Boissons (7/12) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[#FAF8F5] p-4 rounded-3xl border border-[#E2DDD3] shadow-xs">
            <div className="relative mb-3">
              <Search className="w-4 h-4 text-[#7A847E] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher une boisson à ajouter au ticket..."
                className="w-full pl-9 pr-4 py-2.5 bg-[#F4F1E9] border border-[#E2DDD3] rounded-2xl text-xs text-[#1F2421] placeholder-[#7A847E] focus:outline-none focus:ring-1 focus:ring-[#294637]"
              />
            </div>

            <p className="text-[11px] text-[#5A625D]">
              Touchez un conditionnement pour l'ajouter directement au ticket de caisse :
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto pr-1">
            {filteredProducts.map((p) => {
              const isAvailable = p.stockBottles > 0;
              const hasCaseStock = p.stockBottles >= p.unitsPerCase;

              return (
                <div
                  key={p.id}
                  className={`p-3.5 rounded-2xl border transition bg-[#FAF8F5] ${
                    isAvailable ? 'border-[#E2DDD3]' : 'border-[#E8E4DA] opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1 mb-2">
                    <div>
                      <h4 className="text-xs font-bold text-[#1F2421] leading-snug">{p.name}</h4>
                      <p className="text-[10px] text-[#6A726D]">
                        Format : {p.formatVolume} • Stock : {p.stockBottles} btl
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-[#E8E4DA]">
                    {/* Bouton vente bouteille */}
                    <button
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => addToCart(p, 'bouteille')}
                      className="flex flex-col items-center justify-center p-2 rounded-xl bg-[#F4F1E9] hover:bg-[#EFEAE1] border border-[#E2DDD3] transition text-center disabled:opacity-50"
                    >
                      <span className="text-[10px] text-[#6A726D] font-medium">1 Bouteille</span>
                      <span className="text-xs font-bold text-[#1F2421] mt-0.5">
                        {p.retailPrice.toLocaleString('fr-FR')} F
                      </span>
                    </button>

                    {/* Bouton vente carton */}
                    <button
                      type="button"
                      disabled={!hasCaseStock}
                      onClick={() => addToCart(p, 'carton')}
                      className="flex flex-col items-center justify-center p-2 rounded-xl bg-[#294637]/10 hover:bg-[#294637]/20 border border-[#294637]/20 transition text-center disabled:opacity-40"
                    >
                      <span className="text-[10px] text-[#294637] font-semibold">1 Ctn ({p.unitsPerCase}b)</span>
                      <span className="text-xs font-bold text-[#294637] mt-0.5">
                        {p.casePrice.toLocaleString('fr-FR')} F
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section Droite : Ticket de Caisse & Validation (5/12) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#FAF8F5] rounded-3xl border border-[#E2DDD3] p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#E8E4DA] mb-3">
                <div className="flex items-center gap-2">
                  <ReceiptText className="w-4 h-4 text-[#294637]" />
                  <h3 className="text-sm font-bold text-[#1F2421]">Ticket en Cours</h3>
                </div>
                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-[11px] text-[#B87555] hover:underline"
                  >
                    Vider le panier
                  </button>
                )}
              </div>

              {/* Lignes du panier */}
              {cart.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#7A847E]">
                  <ReceiptText className="w-8 h-8 mx-auto text-[#D8D2C5] mb-2" />
                  <p>Aucun article sélectionné.</p>
                  <p className="text-[11px] mt-1">Touchez une bouteille ou un carton à gauche.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {cart.map((line, idx) => (
                    <div
                      key={`${line.product.id}-${line.packaging}`}
                      className="p-3 rounded-2xl bg-[#F4F1E9] border border-[#E8E4DA] flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <h5 className="font-bold text-[#1F2421] truncate">{line.product.name}</h5>
                        <p className="text-[10px] text-[#6A726D]">
                          {line.packaging === 'carton' ? `Carton (${line.product.unitsPerCase} btles)` : 'Bouteille unitaire'} • {line.unitPrice.toLocaleString('fr-FR')} FCFA
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center bg-[#FAF8F5] rounded-xl border border-[#E2DDD3]">
                          <button
                            onClick={() => updateQuantity(idx, line.quantity - 1)}
                            className="p-1 text-[#6A726D] hover:text-[#1F2421]"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2 font-bold text-xs text-[#1F2421]">{line.quantity}</span>
                          <button
                            onClick={() => updateQuantity(idx, line.quantity + 1)}
                            className="p-1 text-[#6A726D] hover:text-[#1F2421]"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <span className="font-bold text-xs text-[#1F2421] min-w-[70px] text-right">
                          {(line.unitPrice * line.quantity).toLocaleString('fr-FR')} F
                        </span>

                        <button
                          onClick={() => removeFromCart(idx)}
                          className="p-1 text-[#7A847E] hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pied de Caisse : Moyen de paiement & Bouton Valider */}
            {cart.length > 0 && (
              <div className="mt-4 pt-4 border-t border-[#E8E4DA] space-y-3">
                {/* Choix moyen de paiement */}
                <div>
                  <label className="block text-[11px] font-semibold text-[#1F2421] mb-1.5">
                    Moyen de paiement (intégral au comptant) :
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs font-medium">
                    {(['especes', 'mobile_money', 'virement', 'mixte'] as PaymentMethod[]).map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method)}
                        className={`py-2 px-2.5 rounded-xl border text-center transition ${
                          paymentMethod === method
                            ? 'bg-[#294637] text-[#FAF8F5] font-bold border-[#294637]'
                            : 'bg-[#F4F1E9] text-[#1F2421] border-[#E2DDD3] hover:bg-[#EFEAE1]'
                        }`}
                      >
                        {PAYMENT_METHOD_LABELS[method]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Total & Règle pas de crédit */}
                <div className="p-3.5 rounded-2xl bg-[#294637]/5 border border-[#294637]/20 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-[#6A726D] uppercase font-bold tracking-wider block">
                      Total net à payer
                    </span>
                    <span className="text-xl font-bold text-[#294637]">
                      {totalAmount.toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-[#294637]/10 text-[#294637]">
                    Sans crédit
                  </span>
                </div>

                {/* Bouton de validation atomique */}
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleValidateSale}
                  className="w-full py-3.5 rounded-2xl bg-[#294637] hover:bg-[#1E3429] text-[#FAF8F5] text-sm font-bold shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isProcessing ? 'Validation sur serveur...' : 'Encaisser & Valider la vente'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Reçu de Caisse après vente réussie */}
      {completedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-[#FAF8F5] border border-[#E2DDD3] p-6 shadow-2xl text-[#1F2421]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E4DA] mb-3">
              <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Vente validée avec succès</span>
              </div>
              <button
                onClick={() => setCompletedSale(null)}
                className="p-1 rounded-lg text-[#6A726D] hover:bg-[#E8E4DA]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Aperçu du ticket */}
            <div className="p-4 rounded-2xl bg-[#F4F1E9] border border-[#E2DDD3] space-y-2 text-xs font-mono">
              <div className="text-center font-bold text-sm text-[#294637] font-sans pb-1 border-b border-[#E2DDD3]">
                GESTION BOISSONS
              </div>
              <div className="flex justify-between text-[11px] text-[#6A726D]">
                <span>Ticket #{completedSale.id.slice(-6)}</span>
                <span>{completedSale.date}</span>
              </div>
              <div className="text-[11px] text-[#6A726D]">
                Vendeur : {completedSale.sellerName}
              </div>

              <div className="pt-2 border-t border-[#E2DDD3] space-y-1">
                {completedSale.items.map((it: SaleItem, i: number) => (
                  <div key={i} className="flex justify-between">
                    <span>{it.quantity}x {it.productName} ({it.packaging})</span>
                    <span className="font-bold">{it.totalPrice.toLocaleString('fr-FR')} F</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-[#E2DDD3] flex justify-between font-bold text-sm text-[#1F2421]">
                <span>TOTAL :</span>
                <span>{completedSale.totalAmount.toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div className="text-[10px] text-[#6A726D] text-right">
                Paiement : {PAYMENT_METHOD_LABELS[completedSale.paymentMethod as PaymentMethod]}
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <button
                onClick={() => window.print()}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#F4F1E9] border border-[#E2DDD3] text-xs font-bold text-[#1F2421] hover:bg-[#EFEAE1] transition"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimer ticket</span>
              </button>
              <button
                onClick={() => setCompletedSale(null)}
                className="flex-1 py-2.5 rounded-xl bg-[#294637] text-xs font-bold text-[#FAF8F5] hover:bg-[#1E3429] transition"
              >
                Nouvelle vente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
