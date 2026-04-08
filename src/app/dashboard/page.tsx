"use client";

import { useState } from "react";
import { DashboardHero } from "@/components/dashboard-hero";
import { ImportModal } from "@/components/import-modal";
import { Upload } from "lucide-react";
import { TopBar } from "@/components/top-bar";
import { ProtectedRoute } from "@/components/protected-route";

export default function DashboardPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUploadSuccess = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <ProtectedRoute>
      <div className="flex flex-col min-h-screen animate-in fade-in duration-500">
        <TopBar 
          title="Executive dashboard"
          description="Real-time performance analytics for your affiliate network."
          action={
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#C50337] hover:bg-[#A0022C] text-white rounded-lg font-black text-xs transition-all shadow-lg shadow-[#C50337]/20 active:scale-95"
            >
              <Upload className="w-4 h-4" />
              Upload Data
            </button>
          }
        />
        
        <div className="p-8 space-y-12 max-w-7xl mx-auto w-full">
          <DashboardHero refreshKey={refreshKey} />
        </div>
        
        <ImportModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={handleUploadSuccess}
        />
      </div>
    </ProtectedRoute>
  );
}
