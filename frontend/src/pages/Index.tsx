import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { KPIBar } from "@/components/dashboard/KPIBar";
import { ComplaintTable } from "@/components/dashboard/ComplaintTable";
import { ChartsRow } from "@/components/dashboard/ChartsRow";
import { BranchHeatmap } from "@/components/dashboard/BranchHeatmap";
import { DuplicatesPanel } from "@/components/dashboard/DuplicatesPanel";
import { AnalyzePanel } from "@/components/dashboard/AnalyzePanel";
import { SLAPanel } from "@/components/dashboard/SLAPanel";
import { ChannelIngestion } from "@/components/dashboard/ChannelIngestion";
import { RegulatoryPanel } from "@/components/dashboard/RegulatoryPanel";
import { Bell, User, Wifi } from "lucide-react";

const Index = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">

          {/* Header */}
          <header className="h-16 flex items-center justify-between border-b border-border/50 px-6 bg-card card-shadow sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <div>
                <h1 className="text-lg font-bold text-primary">iDEA PS5 — Complaint Dashboard</h1>
                <p className="text-xs text-muted-foreground">Union Bank of India · Intelligent Analytics</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Live indicator */}
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/10 border border-success/20">
                <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                <span className="text-[11px] text-success font-medium">Live</span>
              </div>
              <button className="p-2 rounded-lg hover:bg-muted transition-colors relative">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
              </button>
              <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center">
                <User className="h-4 w-4 text-primary-foreground" />
              </div>
            </div>
          </header>

          <main className="flex-1 p-6 space-y-8 overflow-y-auto">

            {/* Section: Live Pipeline */}
            <section id="ingestion" className="animate-fade-in">
              <ChannelIngestion />
            </section>

            {/* Section: KPI Overview */}
            <section id="overview" className="animate-fade-in" style={{ animationDelay: "0.05s" }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-foreground">Dashboard Overview</h2>
                  <p className="text-xs text-muted-foreground">Real-time complaint intelligence metrics</p>
                </div>
              </div>
              <KPIBar />
            </section>

            {/* Section: Complaint Register */}
            <section id="complaints" className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-foreground">Complaint Register</h2>
                  <p className="text-xs text-muted-foreground">
                    Unified view of all complaints across all channels — click any row for details, communication thread, and AI response
                  </p>
                </div>
              </div>
              <ComplaintTable />
            </section>

            {/* Section: SLA Tracking */}
            <section id="sla" className="animate-fade-in" style={{ animationDelay: "0.15s" }}>
              <div className="mb-4">
                <h2 className="text-base font-bold text-foreground">SLA Tracking</h2>
                <p className="text-xs text-muted-foreground">
                  Service Level Agreement monitoring — compliance rates, at-risk complaints, and breach alerts
                </p>
              </div>
              <SLAPanel />
            </section>

            {/* Section: Analytics */}
            <section id="charts" className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
              <div className="mb-4">
                <h2 className="text-base font-bold text-foreground">Analytics Overview</h2>
                <p className="text-xs text-muted-foreground">Visual breakdown of complaint patterns across categories, sentiment, severity and time</p>
              </div>
              <ChartsRow />
            </section>

            {/* Section: Branch Heatmap */}
            <section id="branches" className="animate-fade-in" style={{ animationDelay: "0.25s" }}>
              <BranchHeatmap />
            </section>

            {/* Section: Duplicates */}
            <section id="duplicates" className="animate-fade-in" style={{ animationDelay: "0.3s" }}>
              <DuplicatesPanel />
            </section>

            {/* Section: Regulatory Reporting */}
            <section id="regulatory" className="animate-fade-in" style={{ animationDelay: "0.35s" }}>
              <div className="mb-4">
                <h2 className="text-base font-bold text-foreground">Regulatory Reporting</h2>
                <p className="text-xs text-muted-foreground">
                  RBI Banking Ombudsman Scheme compliance — category-wise resolution rates, flagged complaints, and regulatory export
                </p>
              </div>
              <RegulatoryPanel />
            </section>

            {/* Section: Analyze */}
            <section id="analyze" className="animate-fade-in" style={{ animationDelay: "0.4s" }}>
              <div className="mb-4">
                <h2 className="text-base font-bold text-foreground">Analyze New Complaint</h2>
                <p className="text-xs text-muted-foreground">
                  Real-time AI classification — paste any complaint text for instant category, sentiment, severity analysis and duplicate detection
                </p>
              </div>
              <AnalyzePanel />
            </section>

          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Index;