/**
 * Service de gestion des Produits, Stocks et Mouvements
 * Transactions atomiques Firestore (prévention des stocks négatifs)
 * Application : GESTION BOISSONS
 */

import { db } from '../config/firebase';
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  updateDoc, 
  runTransaction, 
  query, 
  orderBy, 
  serverTimestamp, 
  addDoc 
} from 'firebase/firestore';
import { Product, StockMovement, Sale, Purchase, Expense } from '../types/models';

export const INITIAL_PRODUCTS_SEED: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Bière Heineken 33cl',
    brand: 'Heineken',
    category: 'bieres',
    formatVolume: '33cl',
    baseUnit: 'bouteille',
    unitsPerCase: 24,
    stockBottles: 96, // 4 casiers
    retailPrice: 800,
    casePrice: 18000,
    costPrice: 650,
    minStockAlert: 24, // Alerte à 1 casier
    status: 'actif',
  },
  {
    name: 'Bière Castel Beer 65cl',
    brand: 'Castel',
    category: 'bieres',
    formatVolume: '65cl',
    baseUnit: 'bouteille',
    unitsPerCase: 12,
    stockBottles: 18, // Moins de 2 casiers -> alerte
    retailPrice: 900,
    casePrice: 10000,
    costPrice: 750,
    minStockAlert: 24,
    status: 'actif',
  },
  {
    name: 'Vin Rouge Bordeaux Supérieur',
    brand: 'Château Bel Air',
    category: 'vins',
    formatVolume: '75cl',
    baseUnit: 'bouteille',
    unitsPerCase: 12,
    stockBottles: 8, // Stock faible !
    retailPrice: 6500,
    casePrice: 72000,
    costPrice: 4800,
    minStockAlert: 12,
    status: 'actif',
  },
  {
    name: 'Champagne Laurent-Perrier Brut',
    brand: 'Laurent-Perrier',
    category: 'champagnes',
    formatVolume: '75cl',
    baseUnit: 'bouteille',
    unitsPerCase: 6,
    stockBottles: 14,
    retailPrice: 45000,
    casePrice: 250000,
    costPrice: 35000,
    minStockAlert: 6,
    status: 'actif',
  },
  {
    name: 'Whisky Johnnie Walker Black Label',
    brand: 'Johnnie Walker',
    category: 'whiskies',
    formatVolume: '1L',
    baseUnit: 'bouteille',
    unitsPerCase: 12,
    stockBottles: 5, // Stock faible !
    retailPrice: 22000,
    casePrice: 250000,
    costPrice: 17500,
    minStockAlert: 8,
    status: 'actif',
  },
  {
    name: 'Jus d’Orange 100% Pur Jus',
    brand: 'Pressea',
    category: 'jus',
    formatVolume: '1L',
    baseUnit: 'brique',
    unitsPerCase: 12,
    stockBottles: 36,
    retailPrice: 1200,
    casePrice: 13000,
    costPrice: 950,
    minStockAlert: 12,
    status: 'actif',
  },
  {
    name: 'Eau Minérale Naturelle 1.5L',
    brand: 'Céleste',
    category: 'eaux',
    formatVolume: '1.5L',
    baseUnit: 'bouteille',
    unitsPerCase: 6,
    stockBottles: 48,
    retailPrice: 500,
    casePrice: 2500,
    costPrice: 350,
    minStockAlert: 18,
    status: 'actif',
  },
];

/**
 * Écoute la liste des produits en temps réel et initialise si vide
 */
export function listenToProducts(callback: (products: Product[]) => void): () => void {
  if (!db) {
    callback([]);
    return () => {};
  }

  const productsRef = collection(db, 'products');
  const q = query(productsRef, orderBy('category', 'asc'));

  const unsub = onSnapshot(q, async (snapshot) => {
    if (snapshot.empty && db) {
      // Auto-amorçage des boissons initiales
      try {
        for (const p of INITIAL_PRODUCTS_SEED) {
          const newDocRef = doc(collection(db, 'products'));
          await setDoc(newDocRef, {
            ...p,
            id: newDocRef.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.warn('Erreur seed produits:', err);
      }
    }

    const list: Product[] = snapshot.docs.map(d => ({
      ...(d.data() as Product),
      id: d.id,
    }));
    callback(list);
  }, (err) => {
    console.warn('Erreur listener produits:', err);
    callback([]);
  });

  return unsub;
}

/**
 * Supprime récursivement les propriétés undefined d'un objet ou tableau.
 * Firestore interdit formellement la valeur undefined dans setDoc, updateDoc et transaction.set.
 */
export function removeUndefinedFields<T>(val: T): T {
  if (val === undefined || val === null) {
    return val;
  }
  if (Array.isArray(val)) {
    return val.map((item) => removeUndefinedFields(item)) as unknown as T;
  }
  if (typeof val === 'object' && !(val instanceof Date)) {
    const res: Record<string, any> = {};
    for (const [key, v] of Object.entries(val)) {
      if (v !== undefined) {
        res[key] = removeUndefinedFields(v);
      }
    }
    return res as T;
  }
  return val;
}

/**
 * Enregistre une vente atomique avec transaction Firestore
 * Empêche tout double clic, tout stock négatif et toute valeur undefined
 */
export async function executeSaleTransaction(
  saleData: Omit<Sale, 'id' | 'status'>
): Promise<{ success: boolean; saleId?: string; error?: string }> {
  if (!db) {
    return { success: false, error: 'Base de données non disponible.' };
  }

  if (!saleData || !saleData.items || saleData.items.length === 0) {
    return { success: false, error: 'Aucun article dans la vente.' };
  }

  const firestore = db;

  try {
    const saleId = await runTransaction(firestore, async (transaction) => {
      // 1. Lire et vérifier tous les produits concernés (TOUTES LES LECTURES EN PREMIER)
      const productDocsToUpdate: { ref: any; currentStock: number; newStock: number; name: string }[] = [];

      for (const item of saleData.items) {
        const prodRef = doc(firestore, 'products', item.productId);
        const prodSnap = await transaction.get(prodRef);

        if (!prodSnap.exists()) {
          throw new Error(`Le produit "${item.productName}" n'existe plus dans le catalogue.`);
        }

        const prod = prodSnap.data() as Product;
        const requiredBottles = Number(item.bottlesDeducted) || 1;

        if (prod.stockBottles < requiredBottles) {
          throw new Error(
            `Stock insuffisant pour "${prod.name}". Stock disponible: ${prod.stockBottles} bouteilles, demandé: ${requiredBottles}.`
          );
        }

        productDocsToUpdate.push({
          ref: prodRef,
          currentStock: prod.stockBottles,
          newStock: prod.stockBottles - requiredBottles,
          name: prod.name,
        });
      }

      // 2. Créer le document de vente (SANS AUCUNE VALEUR UNDEFINED)
      const newSaleRef = doc(collection(firestore, 'sales'));
      
      const cleanItems = saleData.items.map((item) => {
        const cleanItem: Record<string, any> = {
          productId: item.productId,
          productName: item.productName,
          packaging: item.packaging || (item as any).packagingType || 'bouteille',
          quantity: Number(item.quantity) || 1,
          unitPrice: Number(item.unitPrice) || 0,
          totalPrice: Number(item.totalPrice) || 0,
          bottlesDeducted: Number(item.bottlesDeducted) || 1,
          costPriceAtSale: typeof item.costPriceAtSale === 'number' ? item.costPriceAtSale : 0,
        };
        return removeUndefinedFields(cleanItem);
      });

      const cleanSalePayload: Record<string, any> = {
        id: newSaleRef.id,
        date: saleData.date || new Date().toISOString().split('T')[0],
        timestamp: Number(saleData.timestamp) || Date.now(),
        sellerId: saleData.sellerId || 'usr_collaborateur',
        sellerName: saleData.sellerName || 'Collaborateur',
        items: cleanItems,
        totalAmount: Number(saleData.totalAmount) || 0,
        paymentMethod: saleData.paymentMethod || 'especes',
        status: 'validee',
      };

      if (saleData.notes && saleData.notes.trim()) {
        cleanSalePayload.notes = saleData.notes.trim();
      }

      if (saleData.paymentBreakdown) {
        cleanSalePayload.paymentBreakdown = removeUndefinedFields(saleData.paymentBreakdown);
      }

      const finalSale = removeUndefinedFields(cleanSalePayload);
      transaction.set(newSaleRef, finalSale);

      // 3. Décrémenter les stocks et enregistrer les mouvements atomiquement
      for (const update of productDocsToUpdate) {
        transaction.update(update.ref, {
          stockBottles: update.newStock,
          updatedAt: new Date().toISOString(),
        });

        const movRef = doc(collection(firestore, 'stock_movements'));
        const movement = removeUndefinedFields({
          id: movRef.id,
          productId: update.ref.id,
          productName: update.name,
          type: 'vente',
          quantityBottles: -(update.currentStock - update.newStock),
          previousStock: update.currentStock,
          newStock: update.newStock,
          reason: `Vente #${newSaleRef.id.slice(-6)}`,
          performedBy: saleData.sellerId || 'usr_collaborateur',
          performedByName: saleData.sellerName || 'Collaborateur',
          timestamp: new Date().toISOString(),
        });
        transaction.set(movRef, movement);
      }

      // 4. Enregistrer dans le journal d'audit
      const auditRef = doc(collection(firestore, 'audit_logs'));
      const auditRecord = removeUndefinedFields({
        id: auditRef.id,
        action: 'VENTE_EFFECTUEE',
        entity: 'sale',
        performedBy: saleData.sellerId || 'usr_collaborateur',
        performedByName: saleData.sellerName || 'Collaborateur',
        timestamp: new Date().toISOString(),
        details: `Vente validée #${newSaleRef.id.slice(-6)} (${saleData.items.length} lignes, paiement: ${saleData.paymentMethod}).`,
      });
      transaction.set(auditRef, auditRecord);

      return newSaleRef.id;
    });

    return { success: true, saleId };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Enregistre un arrivage d'achat avec mise à jour du stock et calcul du CMP
 */
export async function executePurchaseTransaction(
  purchaseData: Omit<Purchase, 'id'>
): Promise<{ success: boolean; purchaseId?: string; error?: string }> {
  if (!db) return { success: false, error: 'Base de données non disponible.' };

  const firestore = db;

  try {
    const purchaseId = await runTransaction(firestore, async (transaction) => {
      const newPurchaseRef = doc(collection(firestore, 'purchases'));
      const cleanPurchase = removeUndefinedFields({
        ...purchaseData,
        id: newPurchaseRef.id,
      });
      transaction.set(newPurchaseRef, cleanPurchase);

      for (const item of purchaseData.items) {
        const prodRef = doc(firestore, 'products', item.productId);
        const prodSnap = await transaction.get(prodRef);

        if (prodSnap.exists()) {
          const prod = prodSnap.data() as Product;
          const currentStock = prod.stockBottles || 0;
          const currentCost = prod.costPrice || 0;
          const addedBottles = item.bottlesAdded;
          const newUnitCost = item.unitCostPerBottle;

          // Calcul du Prix Moyen Pondéré (PMP)
          const totalValuation = (currentStock * currentCost) + (addedBottles * newUnitCost);
          const newTotalStock = currentStock + addedBottles;
          const newCmp = newTotalStock > 0 ? Math.round(totalValuation / newTotalStock) : newUnitCost;

          transaction.update(prodRef, {
            stockBottles: newTotalStock,
            costPrice: newCmp,
            updatedAt: new Date().toISOString(),
          });

          // Mouvement de stock
          const movRef = doc(collection(firestore, 'stock_movements'));
          const cleanMov = removeUndefinedFields({
            id: movRef.id,
            productId: prod.id,
            productName: prod.name,
            type: 'entree_achat',
            quantityBottles: addedBottles,
            previousStock: currentStock,
            newStock: newTotalStock,
            reason: `Réception Achat #${newPurchaseRef.id.slice(-6)} (${purchaseData.supplier})`,
            performedBy: purchaseData.receivedBy || 'usr_collaborateur',
            performedByName: purchaseData.receivedByName || 'Collaborateur',
            timestamp: new Date().toISOString(),
          });
          transaction.set(movRef, cleanMov);
        }
      }

      return newPurchaseRef.id;
    });

    return { success: true, purchaseId };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Écoute des mouvements de stock récents pour l'activité opérationnelle
 */
export function listenToRecentMovements(callback: (movements: StockMovement[]) => void): () => void {
  if (!db) {
    callback([]);
    return () => {};
  }

  const movRef = collection(db, 'stock_movements');
  const q = query(movRef, orderBy('timestamp', 'desc'));

  const unsub = onSnapshot(q, (snapshot) => {
    const list = snapshot.docs.slice(0, 10).map(d => ({
      ...(d.data() as StockMovement),
      id: d.id,
    }));
    callback(list);
  }, () => {
    callback([]);
  });

  return unsub;
}
