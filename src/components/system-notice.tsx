"use client";

import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  X,
  Info
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type NoticeType = 'success' | 'error' | 'warning' | 'confirm' | 'info';

interface SystemNoticeProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  type?: NoticeType;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

export function SystemNotice({
  isOpen,
  onClose,
  onConfirm,
  type = 'info',
  title,
  message,
  confirmLabel = "PROCEED",
  cancelLabel = "CANCEL"
}: SystemNoticeProps) {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success': return <CheckCircle2 className="w-6 h-6 text-emerald-500" />;
      case 'error': return <XCircle className="w-6 h-6 text-rose-500" />;
      case 'warning': 
      case 'confirm': return <AlertTriangle className="w-6 h-6 text-amber-500" />;
      default: return <Info className="w-6 h-6 text-[#C50337]" />;
    }
  };

  const isConfirm = type === 'confirm';

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-3xl animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-white/10 w-full max-w-sm p-8 shadow-4xl rounded-xl relative overflow-hidden animate-in zoom-in-95 duration-500">
        {/* Glow Effect */}
        <div className={cn(
          "absolute -top-10 -right-10 w-32 h-32 blur-[60px] opacity-20 pointer-events-none rounded-full",
          type === 'success' ? "bg-emerald-500" : type === 'error' ? "bg-rose-500" : "bg-amber-500"
        )} />

        <button onClick={onClose} className="absolute top-6 right-6 text-slate-700 hover:text-white transition-colors"><X className="w-4 h-4"/></button>
        
        <div className="flex flex-col items-center text-center">
            <div className={cn(
              "w-12 h-12 flex items-center justify-center rounded-lg border mb-6 transition-all shadow-xl",
              type === 'success' ? "bg-emerald-500/10 border-emerald-500/20" : type === 'error' ? "bg-rose-500/10 border-rose-500/20" : "bg-amber-500/10 border-amber-500/20"
            )}>
              {getIcon()}
            </div>

            <h3 className="text-[12px] font-black text-white uppercase tracking-widest mb-2 leading-none">{title}</h3>
            <p className="text-[10px] font-bold text-slate-500 leading-relaxed max-w-[240px]">{message}</p>
        </div>

        <div className="mt-10 flex gap-2.5">
           {isConfirm && (
              <button 
                onClick={onClose}
                className="flex-1 py-3 px-4 bg-slate-950 border border-white/5 text-slate-600 font-black text-[9px] uppercase tracking-widest hover:text-slate-200 transition-all rounded-lg active:scale-95"
              >
                {cancelLabel}
              </button>
           )}
           <button 
             onClick={() => {
                if(onConfirm) onConfirm();
                else onClose();
             }}
             className={cn(
               "flex-1 py-3 px-4 font-black text-[9px] uppercase tracking-widest transition-all rounded-lg active:scale-95 shadow-2xl",
               type === 'success' ? "bg-emerald-600 text-white hover:bg-emerald-500" : 
               type === 'error' ? "bg-rose-600 text-white hover:bg-rose-500" : 
               "bg-[#C50337] text-white hover:bg-[#A0022C]"
             )}
           >
             {confirmLabel}
           </button>
        </div>
        
        <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-center gap-2 opacity-20">
           <div className="w-1 h-1 bg-white rounded-full animate-pulse" />
           <span className="text-[6px] font-black text-white uppercase tracking-widest font-mono">System Secure Protocol</span>
        </div>
      </div>
    </div>
  );
}
