/**
 * Structure de navigation principale de l'application
 * 5 Rubriques principales : Accueil, Produits, Ventes, Finances, Menu
 * Application : GESTION BOISSONS
 */

export type NavigationTab = 
  | 'dashboard' 
  | 'products' 
  | 'sales' 
  | 'finances' 
  | 'menu';

export type MenuSubView = 
  | 'main'
  | 'stocks'
  | 'purchases'
  | 'cash'
  | 'expenses'
  | 'team'
  | 'audit'
  | 'settings';

export interface NavItem {
  id: NavigationTab;
  label: string;
  iconName: 'Home' | 'Wine' | 'ReceiptText' | 'TrendingUp' | 'Menu';
  adminOnly?: boolean;
  description: string;
}

export const MAIN_NAVIGATION: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Accueil',
    iconName: 'Home',
    description: 'Espace de travail opérationnel sans indicateurs financiers',
  },
  {
    id: 'products',
    label: 'Produits',
    iconName: 'Wine',
    description: 'Catalogue des boissons, conditionnements et alertes stock',
  },
  {
    id: 'sales',
    label: 'Ventes',
    iconName: 'ReceiptText',
    description: 'Caisse rapide, sélection conditionnements et validation comptant',
  },
  {
    id: 'finances',
    label: 'Finances',
    iconName: 'TrendingUp',
    adminOnly: true, // Visible et accessible uniquement pour l'administrateur
    description: 'Chiffre d’affaires, marges au CMP, dépenses et trésorerie',
  },
  {
    id: 'menu',
    label: 'Menu',
    iconName: 'Menu',
    description: 'Stocks, achats, caisse, équipe et paramètres de l’application',
  },
];
