/**
 * Journal d'Audit Immuable (Sécurité & Traçabilité)
 * Réservé à l'administrateur
 * Application : GESTION BOISSONS
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { AuditLog } from '../../types/models';
import { db } from '../../config/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { 
  ShieldCheck, 
  Search, 
  FileText, 
  Clock, 
  User, 
  Activity,
  Lock
} from 'lucide-react';

export const AuditView: React.FC = () => {
  const { profile } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (!db || !isAdmin) {
      setLoading(false);
      return;
    }

    const auditRef = collection(db, 'audit_logs');
    const q = query(auditRef, orderBy('timestamp', 'desc'));

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({
        ...(d.data() as AuditLog),
        id: d.id,
      }));
      setLogs(list);
      setLoading(false);
    }, () => {
      setLoading(false);
    });

    return () => unsub();
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="p-8 rounded-3xl bg-[#FAF8F5] border border-[#E2DDD3] text-center max-w-lg mx-auto">
        <Lock className="w-10 h-10 text-[#B87555] mx-auto mb-3" />
        <h3 className="text-base font-bold text-[#1F2421]">Accès Restreint</h3>
        <p className="text-xs text-[#5A625D] mt-1">
          La consultation du journal d'audit de sécurité est strictement réservée à l'administrateur principal.
        </p>
      </div>
    );
  }

  const filteredLogs = logs.filter(l =>
    (l.action || '').toLowerCase().includes(search.toLowerCase()) ||
    (l.performedByName || '').toLowerCase().includes(search.toLowerCase()) ||
    (l.details || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-6">
      {/* 1. En-tête */}
      <div className="bg-[#FAF8F5] rounded-3xl border border-[#E2DDD3] p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#294637]/10 text-[#294637] border border-[#294637]/20 mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Conformité & Registre Immuable</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#1F2421] tracking-tight">
              Journal d'Audit & Sécurité
            </h2>
            <p className="text-xs sm:text-sm text-[#5A625D] mt-1">
              Traçabilité inaltérable de toutes les opérations : ventes validées, réceptions, dépenses, et mouvements de stock.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-[#5A625D] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filtrer les actions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#F4F1E9] border border-[#E2DDD3] rounded-xl text-[#1F2421] placeholder-[#5A625D] focus:outline-none focus:ring-1 focus:ring-[#294637]"
            />
          </div>
        </div>
      </div>

      {/* 2. Liste des journaux d'audit */}
      <div className="bg-[#FAF8F5] rounded-3xl border border-[#E2DDD3] p-6 shadow-xs">
        <h3 className="text-base font-bold text-[#1F2421] mb-1 flex items-center gap-2">
          <FileText className="w-5 h-5 text-[#294637]" />
          Événements Enregistrés ({filteredLogs.length})
        </h3>
        <p className="text-xs text-[#5A625D] mb-5">
          Horodatage serveur certifié par Cloud Firestore
        </p>

        {loading ? (
          <div className="py-8 text-center text-xs text-[#5A625D]">Chargement du journal d'audit...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-6 rounded-2xl bg-[#F4F1E9] text-center text-xs text-[#5A625D]">
            Aucun événement d'audit enregistré.
          </div>
        ) : (
          <div className="space-y-2">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="p-3.5 rounded-2xl bg-[#F4F1E9] border border-[#E2DDD3] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="flex items-start sm:items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#294637]/10 text-[#294637] flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 font-bold text-xs">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-[#1F2421]">{log.action}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#FAF8F5] border border-[#E2DDD3] text-[#5A625D]">
                        {log.entity}
                      </span>
                    </div>
                    <p className="text-xs text-[#5A625D] mt-0.5">{log.details}</p>
                  </div>
                </div>

                <div className="text-left sm:text-right shrink-0 border-t sm:border-t-0 pt-1.5 sm:pt-0 border-[#E2DDD3]">
                  <div className="text-xs font-semibold text-[#1F2421] flex items-center gap-1 sm:justify-end">
                    <User className="w-3 h-3 text-[#5A625D]" />
                    <span>{log.performedByName || 'Utilisateur'}</span>
                  </div>
                  <div className="text-[10px] text-[#6A726D] flex items-center gap-1 sm:justify-end font-mono">
                    <Clock className="w-3 h-3" />
                    <span>{log.timestamp ? new Date(log.timestamp).toLocaleString('fr-FR') : '-'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
