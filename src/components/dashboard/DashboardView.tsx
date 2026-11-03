/**
 * Accueil : Espace de travail opérationnel (Premium Retail)
 * RÈGLE ABSOLUE : AUCUNE INFORMATION NI STATISTIQUE FINANCIÈRE AFFICHÉE ICI
 * Application : GESTION BOISSONS
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { NavigationTab, MenuSubView } from '../../types/navigation';
import { Product, StockMovement, STOCK_MOVEMENT_LABELS } from '../../types/models';
import { listenToProducts, listenToRecentMovements } from '../../services/products';
import { 
  Wine, 
  ReceiptText, 
  Boxes, 
  Truck, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  Clock, 
  Sparkles,
  Layers,
  Activity
} from 'lucide-react';

interface DashboardViewProps {
  onNavigate: (tab: NavigationTab, subView?: MenuSubView) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { profile } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [recentMovements, setRecentMovements] = useState<StockMovement[]>([]);

  // Écoute en temps réel des produits et mouvements opérationnels
  useEffect(() => {
    const unsubProducts = listenToProducts((list) => {
      setProducts(list);
    });

    const unsubMovements = listenToRecentMovements((movs) => {
      setRecentMovements(movs);
    });

    return () => {
      unsubProducts();
      unsubMovements();
    };
  }, []);

  // Calculs purement opérationnels (AUCUN CHIFFRE FINANCIER)
  const lowStockProducts = products.filter(
    p => p.status === 'actif' && p.stockBottles <= p.minStockAlert
  );
  const totalActiveProducts = products.filter(p => p.status === 'actif').length;
  const optimalStockCount = totalActiveProducts - lowStockProducts.length;

  const todayStr = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-6">
      {/* 1. Message de bienvenue personnalisé */}
      <div className="bg-[#FAF8F5] rounded-3xl border border-[#E2DDD3] p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#294637]/10 text-[#294637] border border-[#294637]/20 mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span className="capitalize">{todayStr}</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-[#1F2421] tracking-tight">
              Bonjour !
            </h2>

            <p className="text-xs sm:text-sm text-[#5A625D] mt-1 max-w-xl leading-relaxed">
              Bienvenue dans votre espace de gestion.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-3 bg-[#F4F1E9] px-4 py-3 rounded-2xl border border-[#E2DDD3]">
            <div className="w-10 h-10 rounded-xl bg-[#294637] text-[#FAF8F5] flex items-center justify-center font-bold text-xs">
              <Wine className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-[#6A726D] tracking-wider">
                Boutique Active
              </div>
              <div className="text-xs font-bold text-[#1F2421]">
                {totalActiveProducts} boissons référencées
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Les 4 Accès Rapides Opérationnels */}
      <div>
        <h3 className="text-xs font-bold text-[#5A625D] uppercase tracking-wider mb-3 px-1">
          Accès Rapides Opérationnels
        </h3>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Ventes */}
          <button
            onClick={() => onNavigate('sales')}
            className="group flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-[#FAF8F5] border border-[#E2DDD3] hover:border-[#294637] hover:bg-[#F9F7F2] transition text-left shadow-xs"
          >
            <div className="w-10 h-10 rounded-xl bg-[#294637]/10 text-[#294637] flex items-center justify-center mb-3 group-hover:scale-105 transition">
              <ReceiptText className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#1F2421]">Caisse & Ventes</h4>
              <p className="text-[11px] text-[#5A625D] mt-0.5">Enregistrer une vente au comptant</p>
            </div>
            <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-[#294637]">
              <span>Ouvrir caisse</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* Produits */}
          <button
            onClick={() => onNavigate('products')}
            className="group flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-[#FAF8F5] border border-[#E2DDD3] hover:border-[#294637] hover:bg-[#F9F7F2] transition text-left shadow-xs"
          >
            <div className="w-10 h-10 rounded-xl bg-[#B87555]/10 text-[#B87555] flex items-center justify-center mb-3 group-hover:scale-105 transition">
              <Wine className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#1F2421]">Produits</h4>
              <p className="text-[11px] text-[#5A625D] mt-0.5">Catalogue & conditionnements</p>
            </div>
            <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-[#B87555]">
              <span>Voir catalogue</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* Stocks */}
          <button
            onClick={() => onNavigate('menu', 'stocks')}
            className="group flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-[#FAF8F5] border border-[#E2DDD3] hover:border-[#294637] hover:bg-[#F9F7F2] transition text-left shadow-xs"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center mb-3 group-hover:scale-105 transition">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#1F2421]">Stocks</h4>
              <p className="text-[11px] text-[#5A625D] mt-0.5">Mouvements & inventaires</p>
            </div>
            <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-amber-700">
              <span>Gérer les stocks</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* Achats */}
          <button
            onClick={() => onNavigate('menu', 'purchases')}
            className="group flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-[#FAF8F5] border border-[#E2DDD3] hover:border-[#294637] hover:bg-[#F9F7F2] transition text-left shadow-xs"
          >
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-700 flex items-center justify-center mb-3 group-hover:scale-105 transition">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#1F2421]">Achats</h4>
              <p className="text-[11px] text-[#5A625D] mt-0.5">Réceptions & arrivages</p>
            </div>
            <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-sky-700">
              <span>Nouvel arrivage</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        </div>
      </div>

      {/* 3. Alertes de stock faible & État général */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne gauche : Alertes de stock faible (2/3) */}
        <div className="lg:col-span-2 bg-[#FAF8F5] rounded-3xl border border-[#E2DDD3] p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#B87555]/15 text-[#B87555] flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1F2421]">
                  Alertes Stock Faible
                </h3>
                <p className="text-[11px] text-[#5A625D]">
                  Références ayant atteint ou franchi leur seuil d'alerte
                </p>
              </div>
            </div>

            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
              lowStockProducts.length > 0 
                ? 'bg-[#B87555]/15 text-[#B87555] border border-[#B87555]/30'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}>
              {lowStockProducts.length} alerte{lowStockProducts.length > 1 ? 's' : ''}
            </span>
          </div>

          {lowStockProducts.length > 0 ? (
            <div className="space-y-2.5">
              {lowStockProducts.map((prod) => {
                const casesRemaining = Math.floor(prod.stockBottles / prod.unitsPerCase);
                const extraBottles = prod.stockBottles % prod.unitsPerCase;

                return (
                  <div
                    key={prod.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-[#F4F1E9] border border-[#E2DDD3]"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-[#1F2421]">{prod.name}</h4>
                      <p className="text-[11px] text-[#5A625D]">
                        Conditionnement : {prod.unitsPerCase} btles / carton • Format : {prod.formatVolume}
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-bold text-[#B87555]">
                        {prod.stockBottles} {prod.baseUnit}s
                      </div>
                      <div className="text-[10px] text-[#6A726D]">
                        (soit {casesRemaining} ctn {extraBottles > 0 ? `+ ${extraBottles} btl` : ''} • seuil: {prod.minStockAlert})
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-[#F4F1E9] text-center border border-dashed border-[#E2DDD3]">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
              <p className="text-xs font-semibold text-[#1F2421]">
                Tous les stocks sont à niveau optimal
              </p>
              <p className="text-[11px] text-[#6A726D] mt-0.5">
                Aucune rupture imminente constatée dans le catalogue.
              </p>
            </div>
          )}
        </div>

        {/* Colonne droite : État général de la boutique (1/3) */}
        <div className="bg-[#FAF8F5] rounded-3xl border border-[#E2DDD3] p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-[#294637]/10 text-[#294637] flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1F2421]">
                  État de la Boutique
                </h3>
                <p className="text-[11px] text-[#5A625D]">
                  Indicateurs de fonctionnement
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F4F1E9]">
                <span className="text-[#5A625D]">Références actives :</span>
                <span className="font-bold text-[#1F2421]">{totalActiveProducts}</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F4F1E9]">
                <span className="text-[#5A625D]">Stocks normaux :</span>
                <span className="font-bold text-emerald-700">{optimalStockCount}</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F4F1E9]">
                <span className="text-[#5A625D]">Stocks en alerte :</span>
                <span className={`font-bold ${lowStockProducts.length > 0 ? 'text-[#B87555]' : 'text-emerald-700'}`}>
                  {lowStockProducts.length}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F4F1E9]">
                <span className="text-[#5A625D]">Règle de caisse :</span>
                <span className="font-bold text-[#294637]">100% Comptant</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#E8E4DA] text-[10px] text-[#6A726D] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Synchronisation Cloud Firestore active</span>
          </div>
        </div>
      </div>

      {/* 4. Dernières activités opérationnelles (SANS MONTANTS FINANCIERS) */}
      <div className="bg-[#FAF8F5] rounded-3xl border border-[#E2DDD3] p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#294637]/10 text-[#294637] flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1F2421]">
                Dernières Activités Opérationnelles
              </h3>
              <p className="text-[11px] text-[#5A625D]">
                Flux des mouvements récents (ventes, arrivages, ajustements)
              </p>
            </div>
          </div>
        </div>

        {recentMovements.length > 0 ? (
          <div className="space-y-2">
            {recentMovements.map((mov) => {
              const label = STOCK_MOVEMENT_LABELS[mov.type] || mov.type;
              const isPositive = mov.quantityBottles > 0;
              const timeFormatted = mov.timestamp
                ? new Date(mov.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                : '';

              return (
                <div
                  key={mov.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-[#F4F1E9] border border-[#E2DDD3]"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${isPositive ? 'bg-emerald-500' : 'bg-[#B87555]'}`} />
                    <div>
                      <div className="text-xs font-bold text-[#1F2421]">
                        {mov.productName} — <span className="font-medium text-[#5A625D]">{label}</span>
                      </div>
                      <div className="text-[10px] text-[#6A726D]">
                        {mov.reason || 'Mouvement de stock en boutique'}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`text-xs font-bold ${isPositive ? 'text-emerald-700' : 'text-[#B87555]'}`}>
                      {isPositive ? `+${mov.quantityBottles}` : mov.quantityBottles} btl
                    </div>
                    <div className="text-[10px] text-[#6A726D] flex items-center gap-1 justify-end">
                      <Clock className="w-3 h-3" />
                      <span>{timeFormatted}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-5 rounded-2xl bg-[#F4F1E9] text-center border border-dashed border-[#E2DDD3]">
            <p className="text-xs text-[#5A625D]">
              Aucun mouvement opérationnel récent enregistré pour le moment.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
