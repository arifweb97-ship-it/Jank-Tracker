"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/auth-context";
import { 
  X, 
  DollarSign, 
  Calendar, 
  Loader2, 
  Zap,
  ChevronRight,
  ShieldCheck
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editData?: { id: string; amount: number; date: string } | null;
}

export function DepositModal({ isOpen, onClose, onSuccess, editData }: DepositModalProps) {
  const { user } = useAuth();
  const [amount, setAmount] = useState<string>("");
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editData) {
      setAmount(editData.amount.toString());
      setDate(new Date(editData.date).toISOString().split('T')[0]);
    } else {
      setAmount("");
      setDate(new Date().toISOString().split('T')[0]);
    }
  }, [editData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      if (editData) {
        const { error } = await supabase
          .from("deposits")
          .update({
            amount: Number(amount),
            date: date,
          })
          .eq("id", editData.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("deposits")
          .insert([{
            user_id: user.id,
            amount: Number(amount),
            date: date,
          }]);

        if (error) throw error;
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error("Error saving deposit:", err);
      alert("Failed to save deposit record");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-2xl animate-in fade-in duration-300">
      <div className="bg-[#0B121F] border border-white/10 w-full max-w-sm p-8 shadow-4xl rounded-2xl relative overflow-hidden animate-in zoom-in-95 duration-500">
        {/* Subtle Background Glow */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#C50337]/10 blur-[100px] pointer-events-none rounded-full" />
        
        <button 
          onClick={onClose} 
          className="absolute top-6 right-6 text-slate-700 hover:text-white transition-colors p-1 hover:bg-white/5 rounded-md"
        >
          <X className="w-5 h-5"/>
        </button>

        <div className="flex items-center gap-3 mb-10">
           <div className="w-10 h-10 bg-[#C50337]/10 border border-[#C50337]/20 rounded-xl flex items-center justify-center shadow-lg">
              <Zap className="w-5 h-5 text-[#C50337]" />
           </div>
           <div>
              <h3 className="text-[14px] font-black text-white uppercase tracking-widest leading-none">
                {editData ? "Update Injection" : "Capital Injection"}
              </h3>
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1 opacity-60">System Registry Node</p>
           </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
           <div className="space-y-5">
              {/* AMOUNT INPUT */}
              <div className="space-y-2">
                 <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-2">
                   <DollarSign className="w-3 h-3" /> Amount (IDR)
                 </label>
                 <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-700 font-black text-[11px] group-focus-within:text-[#C50337] transition-colors">Rp</div>
                    <input 
                      type="number"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full bg-slate-950 border border-white/5 pl-12 pr-4 py-3.5 text-white text-[12px] font-black focus:border-[#C50337]/40 outline-none rounded-xl transition-all shadow-inner"
                      placeholder="Enter amount..."
                    />
                 </div>
              </div>

              {/* DATE INPUT */}
              <div className="space-y-2 text-left">
                 <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-2">
                   <Calendar className="w-3 h-3" /> Injection Date
                 </label>
                 <input 
                   type="date"
                   required
                   value={date}
                   onChange={(e) => setDate(e.target.value)}
                   className="w-full bg-slate-950 border border-white/5 px-4 py-3.5 text-white text-[11px] font-bold focus:border-[#C50337]/40 outline-none rounded-xl transition-all shadow-inner [color-scheme:dark]"
                 />
              </div>
           </div>

           <div className="flex gap-3 pt-4">
              <button 
                type="button"
                onClick={onClose}
                className="flex-1 py-4 px-4 bg-slate-950 border border-white/5 text-slate-600 font-black text-[9px] uppercase tracking-widest hover:text-white transition-all rounded-xl active:scale-95"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={loading}
                className="flex-1 py-4 px-3 bg-[#C50337] text-white font-black text-[9px] uppercase tracking-tighter sm:tracking-widest hover:bg-[#A0022C] transition-all rounded-xl shadow-2xl flex items-center justify-center gap-2 disabled:opacity-30 active:scale-95"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4 shrink-0" />}
                <span className="truncate">{editData ? "Confirm Node" : "Execute Injection"}</span>
              </button>
           </div>
        </form>

        <div className="mt-10 pt-4 border-t border-white/5 flex items-center justify-between opacity-20">
           <div className="flex items-center gap-2">
              <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[6px] font-black text-white uppercase tracking-widest">Protocol Secured</span>
           </div>
           <span className="text-[6px] font-black text-white uppercase tracking-widest">v8.2 Executive</span>
        </div>
      </div>
    </div>
  );
}
