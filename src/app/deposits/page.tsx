"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { 
  Plus, 
  History, 
  DollarSign, 
  ArrowUpRight, 
  Trash2,
  AlertCircle,
  Pencil
} from "lucide-react";
import { TopBar } from "@/components/top-bar";
import { DepositModal } from "../../components/deposit-modal";
import { SystemNotice, type NoticeType } from "@/components/system-notice";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { ProtectedRoute } from "@/components/protected-route";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function DepositsPage() {
  const { user, loading: authLoading } = useAuth();
  const [deposits, setDeposits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [totalFunds, setTotalFunds] = useState(0);
  const [editingDeposit, setEditingDeposit] = useState<{ id: string; amount: number; date: string } | null>(null);

  // Notification System State
  const [notice, setNotice] = useState<{
    isOpen: boolean;
    type: NoticeType;
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    type: 'success',
    title: '',
    message: ''
  });

  const fetchDeposits = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("deposits")
        .select("*")
        .eq("user_id", user?.id)
        .order("date", { ascending: false });

      if (error) throw error;
      setDeposits(data || []);
      setTotalFunds((data || []).reduce((sum, d) => sum + Number(d.amount), 0));
    } catch (err) {
      console.error("Error fetching deposits:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchDeposits();
    }
  }, [user, authLoading]);

  const showSystemNotice = (type: NoticeType, title: string, message: string, onConfirm?: () => void) => {
    setNotice({ isOpen: true, type, title, message, onConfirm });
  };

  const closeNotice = () => setNotice(prev => ({ ...prev, isOpen: false }));

  const deleteDeposit = async (id: string) => {
    showSystemNotice(
      'confirm',
      'Delete Deposit Record',
      'Are you sure you want to permanently delete this deposit record from your history?',
      async () => {
        try {
          const { error } = await supabase
            .from("deposits")
            .delete()
            .eq("id", id)
            .eq("user_id", user?.id);
          if (error) throw error;
          closeNotice();
          fetchDeposits();
          showSystemNotice('success', 'Record Deleted', 'The deposit entry has been removed successfully.');
        } catch (err) {
          showSystemNotice('error', 'Delete Failed', (err as any).message);
        }
      }
    );
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

  return (
    <ProtectedRoute>
      <div className="flex flex-col min-h-screen animate-in fade-in duration-500 relative overflow-x-hidden">
        {/* EXECUTIVE SYSTEM NOTICE MODAL */}
        <SystemNotice 
           isOpen={notice.isOpen}
           onClose={closeNotice}
           onConfirm={notice.onConfirm}
           type={notice.type}
           title={notice.title}
           message={notice.message}
           confirmLabel={notice.type === 'confirm' ? 'YES, DELETE' : 'OK'}
           cancelLabel="CANCEL"
        />

        <TopBar 
          title="Ad Balance Management"
          description="Track your deposit history and maintain a healthy advertising budget."
          action={
            <button 
              onClick={() => {
                setEditingDeposit(null);
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#C50337] hover:bg-[#A0022C] text-white rounded-lg font-black text-xs transition-all shadow-lg shadow-[#C50337]/20 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Add Deposit
            </button>
          }
        />

        <div className="p-8 space-y-8 max-w-7xl mx-auto w-full flex-1">
          {/* TOTAL FUNDS SUMMARY */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 p-6 border border-white/5 bg-slate-900/40 backdrop-blur-md rounded-xl shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl -mr-8 -mt-8" />
              <div className="relative z-10 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-[8px] font-black text-slate-500 tracking-[0.2em] uppercase">Lifetime Total</span>
                </div>
                <div className="flex flex-col space-y-1.5">
                  <span className="text-[9px] font-black text-emerald-500/60 uppercase tracking-widest leading-none">Lifetime Deposits</span>
                  <div className="text-2xl font-black text-white tracking-tighter leading-none whitespace-nowrap">
                     {formatCurrency(totalFunds)}
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 p-6 border border-white/5 bg-[#C50337]/5 backdrop-blur-md rounded-xl relative overflow-hidden flex flex-col justify-center">
              <div className="flex items-start gap-4">
                  <div className="p-3 bg-[#C50337]/10 border border-[#C50337]/20 rounded-xl flex-shrink-0">
                    <AlertCircle className="w-5 h-5 text-[#C50337]" />
                  </div>
                  <div className="space-y-1">
                     <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em] mb-1">Top-up Policy & Security</h4>
                     <p className="text-xs text-slate-400 leading-relaxed max-w-xl font-medium">
                       Maintain your balance above <span className="text-white font-black">Rp 300.000</span> to ensure uninterrupted ad delivery across all Meta accounts. 
                       All injections are calculated globally.
                     </p>
                  </div>
              </div>
            </div>
          </div>

          {/* RECENT DEPOSITS TABLE */}
          <div className="border border-white/5 bg-slate-900/20 rounded-xl overflow-hidden relative z-30">
            <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2">
              <History className="w-4 h-4 text-slate-500" />
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recent Injections</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse table-fixed">
                <thead>
                  <tr className="bg-white/[0.02] text-[9px] font-black text-slate-500 uppercase tracking-widest">
                    <th className="px-6 py-4 w-[40%]">Date</th>
                    <th className="px-6 py-4 w-[40%]">Amount</th>
                    <th className="px-6 py-4 w-[20%] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {deposits.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-slate-600 text-xs font-bold uppercase tracking-tighter italic">
                        No deposit records identified in database
                      </td>
                    </tr>
                  ) : (
                    deposits.map((d) => (
                      <tr key={d.id} className="hover:bg-white/[0.01] transition-colors group">
                        <td className="px-6 py-4">
                          <span className="text-xs font-bold text-slate-300">{format(new Date(d.date), "dd MMM yyyy")}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                            <span className="text-sm font-black text-white">{formatCurrency(d.amount)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button 
                              onClick={() => {
                                setEditingDeposit({ id: d.id, amount: d.amount, date: d.date });
                                setIsModalOpen(true);
                              }}
                              className="p-2.5 text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 transition-all opacity-40 group-hover:opacity-100 rounded-lg"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => deleteDeposit(d.id)}
                              className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all opacity-40 group-hover:opacity-100 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <DepositModal 
          isOpen={isModalOpen} 
          onClose={() => {
            setIsModalOpen(false);
            setEditingDeposit(null);
          }} 
          onSuccess={fetchDeposits}
          editData={editingDeposit}
        />
      </div>
    </ProtectedRoute>
  );
}
