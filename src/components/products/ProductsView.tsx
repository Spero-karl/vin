/**
 * Module Produits & Catalogue des Boissons (Premium Retail)
 * Support multi-conditionnements (Bouteille, Carton, Casier, Pack)
 * Enregistrement réel et synchronisation Cloud Firestore
 * Application : GESTION BOISSONS
 */

import React, { useEffect, useState } from 'react';
import { Product, ProductCategory, CATEGORY_LABELS } from '../../types/models';
import { listenToProducts } from '../../services/products';
import { db, auth, googleProvider } from '../../config/firebase';
import { collection, doc, setDoc, updateDoc } from 'firebase/firestore';
import { signInWithPopup } from 'firebase/auth';
import { useAuth } from '../../context/AuthContext';
import { 
  Wine, 
  Search, 
  Plus, 
  Filter, 
  AlertTriangle, 
  CheckCircle2, 
  Edit3, 
  Boxes, 
  X,
  Coins,
  Barcode,
  FileText,
  AlertCircle,
  Loader2,
  Lock,
  Sparkles
} from 'lucide-react';

export const ProductsView: React.FC = () => {
  const { profile } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Formulaire Produit
  const [formName, setFormName] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formCategory, setFormCategory] = useState<ProductCategory>('bieres');
  const [formFormat, setFormFormat] = useState('33cl');
  const [formBaseUnit, setFormBaseUnit] = useState('bouteille');
  const [formUnitsPerCase, setFormUnitsPerCase] = useState<number>(24);
  const [formStockBottles, setFormStockBottles] = useState<number>(48);
  const [formRetailPrice, setFormRetailPrice] = useState<number>(800);
  const [formCasePrice, setFormCasePrice] = useState<number>(18000);
  const [formCostPrice, setFormCostPrice] = useState<number>(650);
  const [formMinStockAlert, setFormMinStockAlert] = useState<number>(24);
  const [formBarcode, setFormBarcode] = useState('');
  const [formDescription, setFormDescription] = useState('');

  // États d'envoi et de feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    const unsub = listenToProducts((list) => {
      setProducts(list);
    });
    return () => unsub();
  }, []);

  const openAddModal = () => {
    setEditingProduct(null);
    setFormName('');
    setFormBrand('');
    setFormCategory('bieres');
    setFormFormat('33cl');
    setFormBaseUnit('bouteille');
    setFormUnitsPerCase(24);
    setFormStockBottles(24);
    setFormRetailPrice(800);
    setFormCasePrice(18000);
    setFormCostPrice(650);
    setFormMinStockAlert(24);
    setFormBarcode('');
    setFormDescription('');
    setSubmitError(null);
    setSubmitSuccess(false);
    setShowAddModal(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormName(p.name);
    setFormBrand(p.brand || '');
    setFormCategory(p.category);
    setFormFormat(p.formatVolume);
    setFormBaseUnit(p.baseUnit);
    setFormUnitsPerCase(p.unitsPerCase);
    setFormStockBottles(p.stockBottles);
    setFormRetailPrice(p.retailPrice);
    setFormCasePrice(p.casePrice);
    setFormCostPrice(p.costPrice);
    setFormMinStockAlert(p.minStockAlert);
    setFormBarcode(p.barcode || '');
    setFormDescription(p.description || '');
    setSubmitError(null);
    setSubmitSuccess(false);
    setShowAddModal(true);
  };

  // Connexion Google rapide intégrée si la session Firebase Auth n'est pas encore active
  const handleInlineGoogleLogin = async () => {
    if (!auth) return;
    setIsSigningIn(true);
    setSubmitError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setSubmitError('Échec de la connexion Google : ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(false);

    // 1. Validation des champs obligatoires
    if (!formName.trim()) {
      setSubmitError('Le nom de la boisson est obligatoire.');
      return;
    }
    if (!formCategory) {
      setSubmitError('Veuillez sélectionner une catégorie.');
      return;
    }
    if (!formFormat.trim()) {
      setSubmitError('Le format ou volume (ex: 33cl, 75cl, 1L) est obligatoire.');
      return;
    }
    if (!formBaseUnit.trim()) {
      setSubmitError('L’unité de stock (ex: bouteille, canette, brique) est obligatoire.');
      return;
    }
    if (formUnitsPerCase < 1) {
      setSubmitError('Le nombre d’unités par carton ou casier doit être au minimum de 1.');
      return;
    }
    if (formRetailPrice < 0 || formCasePrice < 0 || formCostPrice < 0) {
      setSubmitError('Les prix de vente et d’achat ne peuvent pas être négatifs.');
      return;
    }
    if (formStockBottles < 0) {
      setSubmitError('Le stock initial ne peut pas être négatif.');
      return;
    }
    if (formMinStockAlert < 0) {
      setSubmitError('Le seuil d’alerte ne peut pas être négatif.');
      return;
    }

    // 2. Vérification de la configuration Firestore
    if (!db) {
      setSubmitError('Base de données Cloud Firestore non initialisée. Vérifiez la configuration Firebase.');
      return;
    }

    // 3. Vérification de l'authentification Firebase Auth
    if (!auth?.currentUser) {
      setSubmitError('Authentification Firebase requise : Pour écrire dans Cloud Firestore, veuillez vous connecter avec votre compte Google.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: Record<string, any> = {
        name: formName.trim(),
        category: formCategory,
        formatVolume: formFormat.trim(),
        baseUnit: formBaseUnit.trim(),
        unitsPerCase: Number(formUnitsPerCase) || 12,
        stockBottles: Number(formStockBottles) || 0,
        retailPrice: Number(formRetailPrice) || 0,
        casePrice: Number(formCasePrice) || 0,
        costPrice: Number(formCostPrice) || 0,
        minStockAlert: Number(formMinStockAlert) || 12,
        status: 'actif',
        createdAt: editingProduct ? editingProduct.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Champs facultatifs : Ne jamais passer 'undefined' car Firestore le rejette avec une erreur bloquante
      if (formBrand.trim()) {
        payload.brand = formBrand.trim();
      }
      if (formBarcode.trim()) {
        payload.barcode = formBarcode.trim();
      }
      if (formDescription.trim()) {
        payload.description = formDescription.trim();
      }

      if (editingProduct) {
        // Mise à jour d'un produit existant
        const prodRef = doc(db, 'products', editingProduct.id);
        await updateDoc(prodRef, payload);
      } else {
        // Création d'un nouveau produit
        const newRef = doc(collection(db, 'products'));
        await setDoc(newRef, { ...payload, id: newRef.id });
      }

      setSubmitSuccess(true);

      // Fermeture après confirmation du serveur
      setTimeout(() => {
        setShowAddModal(false);
        setSubmitSuccess(false);
      }, 1200);
    } catch (err: unknown) {
      console.error('Erreur enregistrement produit:', err);
      let errorExplanation = 'Une erreur est survenue lors de l’écriture dans Cloud Firestore.';

      if (err instanceof Error) {
        if (err.message.includes('permission-denied') || err.message.includes('Missing or insufficient permissions')) {
          errorExplanation = 'Accès refusé par les règles de sécurité Firestore. Vérifiez que vous êtes connecté avec un compte autorisé.';
        } else if (err.message.includes('unavailable') || err.message.includes('network')) {
          errorExplanation = 'Impossible de joindre le serveur Cloud Firestore. Vérifiez votre connexion internet.';
        } else {
          errorExplanation = err.message;
        }
      }

      setSubmitError(errorExplanation);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtrage du catalogue
  const filteredProducts = products.filter((p) => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.brand && p.brand.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.barcode && p.barcode.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-6">
      {/* En-tête & Barre d'actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FAF8F5] p-5 sm:p-6 rounded-3xl border border-[#E2DDD3] shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#B87555]">
              Catalogue & Stocks
            </span>
          </div>
          <h2 className="text-xl font-bold text-[#1F2421]">
            Produits & Conditionnements
          </h2>
          <p className="text-xs text-[#5A625D] mt-0.5">
            {products.length} références de boissons • Synchronisation Cloud Firestore en temps réel
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#294637] hover:bg-[#1E3429] text-[#FAF8F5] text-xs font-bold transition shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Nouvelle Boisson</span>
        </button>
      </div>

      {/* Barre de recherche & Filtre par catégorie */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#7A847E] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher une boisson, bière, vin, marque ou code-barres..."
            className="w-full pl-9 pr-4 py-2.5 bg-[#FAF8F5] border border-[#E2DDD3] rounded-2xl text-xs text-[#1F2421] placeholder-[#7A847E] focus:outline-none focus:ring-1 focus:ring-[#294637]"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2.5 bg-[#FAF8F5] border border-[#E2DDD3] rounded-2xl text-xs text-[#1F2421] font-medium focus:outline-none focus:ring-1 focus:ring-[#294637]"
          >
            <option value="all">Toutes les catégories</option>
            {Object.entries(CATEGORY_LABELS).map(([catKey, catLabel]) => (
              <option key={catKey} value={catKey}>{catLabel}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grille des produits */}
      {filteredProducts.length === 0 ? (
        <div className="p-8 rounded-3xl bg-[#FAF8F5] border border-[#E2DDD3] text-center">
          <Wine className="w-8 h-8 text-[#5A625D] mx-auto mb-2 opacity-50" />
          <p className="text-xs font-bold text-[#1F2421]">Aucune boisson trouvée</p>
          <p className="text-[11px] text-[#5A625D] mt-0.5">
            Cliquez sur "Nouvelle Boisson" pour ajouter une référence au catalogue.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((p) => {
            const isLowStock = p.stockBottles <= p.minStockAlert;
            const casesCount = Math.floor(p.stockBottles / (p.unitsPerCase || 1));
            const looseBottles = p.stockBottles % (p.unitsPerCase || 1);

            return (
              <div
                key={p.id}
                className={`p-4 rounded-2xl border transition bg-[#FAF8F5] ${
                  isLowStock ? 'border-[#B87555]/40' : 'border-[#E2DDD3]'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#294637]/10 text-[#294637]">
                        {CATEGORY_LABELS[p.category] || p.category}
                      </span>
                      <span className="text-[11px] text-[#6A726D] font-mono">
                        {p.formatVolume}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-[#1F2421] mt-1">
                      {p.name}
                    </h3>
                    {p.brand && (
                      <p className="text-[11px] text-[#6A726D]">{p.brand}</p>
                    )}
                    {p.barcode && (
                      <p className="text-[10px] font-mono text-[#7A847E] mt-0.5 flex items-center gap-1">
                        <Barcode className="w-3 h-3" />
                        <span>{p.barcode}</span>
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => openEditModal(p)}
                    className="p-1.5 rounded-lg text-[#6A726D] hover:text-[#294637] hover:bg-[#EFEAE1] transition"
                    title="Modifier le produit"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Tarifs de vente (FCFA) */}
                <div className="my-3 p-2.5 rounded-xl bg-[#F4F1E9] border border-[#E8E4DA] grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-[#6A726D] block">Détail (bouteille)</span>
                    <span className="font-bold text-[#1F2421]">{p.retailPrice.toLocaleString('fr-FR')} FCFA</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#6A726D] block">Carton ({p.unitsPerCase} btles)</span>
                    <span className="font-bold text-[#294637]">{p.casePrice.toLocaleString('fr-FR')} FCFA</span>
                  </div>
                </div>

                {/* État du stock & Conditionnement */}
                <div className="flex items-center justify-between text-xs pt-2 border-t border-[#E8E4DA]">
                  <div>
                    <span className="text-[10px] text-[#6A726D] block">Stock disponible</span>
                    <span className={`font-bold ${isLowStock ? 'text-[#B87555]' : 'text-emerald-700'}`}>
                      {p.stockBottles} {p.baseUnit}s
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-[#6A726D] block">Équivalence</span>
                    <span className="text-[11px] font-medium text-[#1F2421]">
                      {casesCount} ctn {looseBottles > 0 ? `+ ${looseBottles} btl` : ''}
                    </span>
                  </div>
                </div>

                {isLowStock && (
                  <div className="mt-2.5 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#B87555]/10 text-[#B87555] text-[10px] font-medium">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    <span>Alerte stock faible (seuil : {p.minStockAlert})</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Ajout / Modification Produit */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-[#FAF8F5] border border-[#E2DDD3] p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 border-b border-[#E8E4DA] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#1F2421]">
                  {editingProduct ? 'Modifier la boisson' : 'Enregistrer une nouvelle boisson'}
                </h3>
                <p className="text-[11px] text-[#5A625D]">
                  Enregistrement direct dans la base de données Cloud Firestore
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-[#6A726D] hover:bg-[#E8E4DA]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Avertissement d'authentification si auth.currentUser est absent */}
            {!auth?.currentUser && (
              <div className="mb-4 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold">
                  <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Connexion Google requise</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Pour sécuriser la boutique et autoriser l'écriture dans Cloud Firestore, vous devez être authentifié avec votre compte Google.
                </p>
                <button
                  type="button"
                  onClick={handleInlineGoogleLogin}
                  disabled={isSigningIn}
                  className="w-full py-2 px-3 rounded-xl bg-[#294637] text-white font-bold text-xs hover:bg-[#1E3429] transition flex items-center justify-center gap-2"
                >
                  {isSigningIn ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Connexion en cours...</span>
                    </>
                  ) : (
                    <span>Se connecter avec Google maintenant</span>
                  )}
                </button>
              </div>
            )}

            {/* Message de succès */}
            {submitSuccess && (
              <div className="mb-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold">
                  Produit enregistré avec succès dans Cloud Firestore !
                </span>
              </div>
            )}

            {/* Message d'erreur */}
            {submitError && (
              <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Échec de l'enregistrement</span>
                  <span>{submitError}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              {/* Nom & Marque */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#1F2421] mb-1">
                    Nom du produit *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="ex: Bière Heineken 33cl"
                    className="w-full px-3 py-2 bg-[#F4F1E9] border border-[#E2DDD3] rounded-xl text-[#1F2421] focus:ring-1 focus:ring-[#294637]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#1F2421] mb-1">
                    Marque *
                  </label>
                  <input
                    type="text"
                    required
                    value={formBrand}
                    onChange={(e) => setFormBrand(e.target.value)}
                    placeholder="ex: Heineken / Solibra"
                    className="w-full px-3 py-2 bg-[#F4F1E9] border border-[#E2DDD3] rounded-xl text-[#1F2421] focus:ring-1 focus:ring-[#294637]"
                  />
                </div>
              </div>

              {/* Catégorie & Format */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#1F2421] mb-1">
                    Catégorie *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as ProductCategory)}
                    className="w-full px-3 py-2 bg-[#F4F1E9] border border-[#E2DDD3] rounded-xl text-[#1F2421]"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#1F2421] mb-1">
                    Volume ou Format *
                  </label>
                  <input
                    type="text"
                    required
                    value={formFormat}
                    onChange={(e) => setFormFormat(e.target.value)}
                    placeholder="ex: 33cl, 65cl, 75cl, 1L"
                    className="w-full px-3 py-2 bg-[#F4F1E9] border border-[#E2DDD3] rounded-xl text-[#1F2421]"
                  />
                </div>
              </div>

              {/* Unité de stock & Conditionnements */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#1F2421] mb-1">
                    Unité de stock (détail) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formBaseUnit}
                    onChange={(e) => setFormBaseUnit(e.target.value)}
                    placeholder="bouteille, canette, brique"
                    className="w-full px-3 py-2 bg-[#F4F1E9] border border-[#E2DDD3] rounded-xl text-[#1F2421]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#1F2421] mb-1">
                    Unités par carton / casier *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={formUnitsPerCase}
                    onChange={(e) => setFormUnitsPerCase(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 bg-[#F4F1E9] border border-[#E2DDD3] rounded-xl text-[#1F2421] font-bold"
                  />
                </div>
              </div>

              {/* Tarifs (FCFA) : Achat & Vente */}
              <div className="p-3 bg-[#F4F1E9] rounded-2xl border border-[#E2DDD3] space-y-3">
                <span className="text-[11px] font-bold text-[#294637] block">
                  Tarification & Coûts d'Achat (FCFA sans décimales)
                </span>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-medium text-[#6A726D] mb-1">
                      Prix d'Achat (PMP) *
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={50}
                      required
                      value={formCostPrice}
                      onChange={(e) => setFormCostPrice(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-3 py-1.5 bg-[#FAF8F5] border border-[#E2DDD3] rounded-xl text-[#1F2421] font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-[#6A726D] mb-1">
                      Prix Détail *
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={50}
                      required
                      value={formRetailPrice}
                      onChange={(e) => setFormRetailPrice(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-3 py-1.5 bg-[#FAF8F5] border border-[#E2DDD3] rounded-xl text-[#1F2421] font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-[#6A726D] mb-1">
                      Prix Carton *
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={100}
                      required
                      value={formCasePrice}
                      onChange={(e) => setFormCasePrice(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-3 py-1.5 bg-[#FAF8F5] border border-[#E2DDD3] rounded-xl text-[#294637] font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Stock initial & Seuil d'alerte */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#1F2421] mb-1">
                    Stock initial (en bouteilles) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={formStockBottles}
                    onChange={(e) => setFormStockBottles(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-2 bg-[#F4F1E9] border border-[#E2DDD3] rounded-xl text-[#1F2421]"
                  />
                  <span className="text-[10px] text-[#6A726D] mt-0.5 block">
                    = {Math.floor(formStockBottles / (formUnitsPerCase || 1))} ctn(s) + {formStockBottles % (formUnitsPerCase || 1)} btl
                  </span>
                </div>
                <div>
                  <label className="block font-semibold text-[#1F2421] mb-1">
                    Seuil d'alerte (bouteilles) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={formMinStockAlert}
                    onChange={(e) => setFormMinStockAlert(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 bg-[#F4F1E9] border border-[#E2DDD3] rounded-xl text-[#1F2421]"
                  />
                </div>
              </div>

              {/* Code-barres facultatif */}
              <div>
                <label className="block font-semibold text-[#1F2421] mb-1 flex items-center gap-1.5">
                  <Barcode className="w-3.5 h-3.5 text-[#5A625D]" />
                  <span>Code-barres (facultatif)</span>
                </label>
                <input
                  type="text"
                  value={formBarcode}
                  onChange={(e) => setFormBarcode(e.target.value)}
                  placeholder="ex: 5449000000996"
                  className="w-full px-3 py-2 bg-[#F4F1E9] border border-[#E2DDD3] rounded-xl text-[#1F2421] font-mono text-xs"
                />
              </div>

              {/* Description facultative */}
              <div>
                <label className="block font-semibold text-[#1F2421] mb-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#5A625D]" />
                  <span>Description ou notes (facultatif)</span>
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Notes sur la dégustation, millésime ou fournisseur habituel..."
                  className="w-full px-3 py-2 bg-[#F4F1E9] border border-[#E2DDD3] rounded-xl text-[#1F2421] text-xs resize-none"
                />
              </div>

              <div className="flex gap-2 pt-3 border-t border-[#E8E4DA]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-[#EFEAE1] text-[#1F2421] font-semibold hover:bg-[#E8E4DA] transition disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-[#294637] hover:bg-[#1E3429] text-[#FAF8F5] font-bold transition shadow-xs disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Enregistrement...</span>
                    </>
                  ) : (
                    <span>{editingProduct ? 'Mettre à jour' : 'Enregistrer le produit'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
