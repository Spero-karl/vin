/**
 * Modèles de données métier complets
 * Boutique de boissons, vins, bières, champagnes et spiritueux
 * Monnaie : FCFA (sans décimales)
 * Application : GESTION BOISSONS
 */

export type ProductCategory = 
  | 'vins' 
  | 'bieres' 
  | 'champagnes' 
  | 'whiskies' 
  | 'rhums' 
  | 'liqueurs' 
  | 'spiritueux' 
  | 'sodas' 
  | 'jus' 
  | 'eaux' 
  | 'autres';

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  vins: 'Vins',
  bieres: 'Bières',
  champagnes: 'Champagnes',
  whiskies: 'Whiskies',
  rhums: 'Rhums',
  liqueurs: 'Liqueurs',
  spiritueux: 'Spiritueux',
  sodas: 'Sodas',
  jus: 'Jus de fruits',
  eaux: 'Eaux minérales',
  autres: 'Autres boissons',
};

export type PackagingType = 'bouteille' | 'carton' | 'casier' | 'pack';

export interface Product {
  id: string;
  name: string;
  brand?: string;
  category: ProductCategory;
  description?: string;
  barcode?: string;
  formatVolume: string; // ex: '75cl', '33cl', '1L', '1.5L', '25cl'
  baseUnit: string; // ex: 'bouteille', 'canette'
  unitsPerCase: number; // ex: 12 ou 24
  stockBottles: number; // Stock total en unité de base (ex: 120 bouteilles)
  retailPrice: number; // Prix unitaire au détail en FCFA (ex: 1500)
  casePrice: number; // Prix au carton/casier en FCFA (ex: 16000)
  costPrice: number; // Prix d'achat réel unitaire moyen (PMP) en FCFA (ex: 1100)
  minStockAlert: number; // Seuil d'alerte en unités (ex: 24)
  status: 'actif' | 'inactif';
  createdAt: string;
  updatedAt: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  packaging: PackagingType;
  quantity: number; // ex: 2 cartons ou 3 bouteilles
  unitPrice: number; // Prix du conditionnement vendu
  totalPrice: number; // Montant total de la ligne
  bottlesDeducted: number; // Nombre réel d'unités de stock décrémentées (ex: 2 * 12 = 24)
  costPriceAtSale: number; // Pour le calcul de la marge réelle au CMP
}

export type PaymentMethod = 'especes' | 'mobile_money' | 'virement' | 'mixte';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  especes: 'Espèces',
  mobile_money: 'Mobile Money',
  virement: 'Virement',
  mixte: 'Paiement mixte',
};

export interface Sale {
  id: string;
  date: string;
  timestamp: number;
  sellerId: string;
  sellerName: string;
  items: SaleItem[];
  totalAmount: number; // En FCFA
  paymentMethod: PaymentMethod;
  paymentBreakdown?: { especes?: number; mobileMoney?: number };
  notes?: string;
  status: 'validee' | 'annulee';
  cancelledAt?: string;
  cancelledBy?: string;
  cancelReason?: string;
}

export type StockMovementType = 
  | 'entree_achat' 
  | 'vente' 
  | 'inventaire' 
  | 'casse' 
  | 'perte' 
  | 'ajustement' 
  | 'retour';

export const STOCK_MOVEMENT_LABELS: Record<StockMovementType, string> = {
  entree_achat: 'Réception achat',
  vente: 'Vente comptant',
  inventaire: 'Ajustement inventaire',
  casse: 'Casse / Bouteille brisée',
  perte: 'Perte constatée',
  ajustement: 'Correction manuelle',
  retour: 'Retour fournisseur',
};

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: StockMovementType;
  quantityBottles: number; // Positif (entrée) ou négatif (sortie)
  previousStock: number;
  newStock: number;
  reason?: string;
  performedBy: string;
  performedByName: string;
  timestamp: string;
}

export interface PurchaseItem {
  productId: string;
  productName: string;
  packaging: PackagingType;
  quantity: number; // ex: 10 cartons
  unitsPerPack: number; // ex: 12
  bottlesAdded: number; // ex: 120
  unitCostPerBottle: number; // Prix d'achat unitaire réel
  totalCost: number; // Coût de la ligne
}

export interface Purchase {
  id: string;
  date: string;
  supplier: string;
  invoiceRef?: string;
  items: PurchaseItem[];
  fees: number;
  totalAmount: number;
  receivedBy: string;
  receivedByName: string;
  createdAt: string;
}

export type ExpenseCategory = 
  | 'transport' 
  | 'loyer' 
  | 'electricite' 
  | 'salaires' 
  | 'reparations' 
  | 'achats_divers' 
  | 'autre';

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  transport: 'Transport & Livraison',
  loyer: 'Loyer commercial',
  electricite: 'Électricité & Eau',
  salaires: 'Salaires & Rémunérations',
  reparations: 'Entretien & Réparations',
  achats_divers: 'Achats divers',
  autre: 'Autre dépense',
};

export interface Expense {
  id: string;
  category: ExpenseCategory;
  amount: number; // En FCFA
  date: string;
  description: string;
  authorId: string;
  authorName: string;
  createdAt: string;
}

export interface CashRegisterState {
  isOpen: boolean;
  openedAt?: string;
  openedBy?: string;
  initialAmount: number;
  currentTheoreticalBalance: number;
  lastMovementAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entity: 'product' | 'sale' | 'stock' | 'purchase' | 'expense' | 'user' | 'cash';
  performedBy: string;
  performedByName: string;
  timestamp: string;
  details: string;
}
