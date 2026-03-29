import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";

const CHANNEL_CONFIG = [
  { name: "Email",        icon: "📧", color: "#3B82F6", bg: "#EFF6FF" },
  { name: "Branch Visit", icon: "🏦", color: "#8B5CF6", bg: "#F5F3FF" },
  { name: "Phone Call",   icon: "📞", color: "#10B981", bg: "#ECFDF5" },
  { name: "Mobile App",   icon: "📱", color: "#F59E0B", bg: "#FFFBEB" },
  { name: "Web Portal",   icon: "🌐", color: "#6366F1", bg: "#EEF2FF" },
  { name: "Social Media", icon: "📣", color: "#EF4444", bg: "#FEF2F2" },
];

const PROCESSING_STEPS = [
  { label: "NLP Classification",   color: "#3B82F6" },
  { label: "Duplicate Detection",  color: "#8B5CF6" },
  { label: "Sentiment Analysis",   color: "#10B981" },
  { label: "Gen-AI Draft",         color: "#F59E0B" },
];

const OUTPUT_NODES = [
  { label: "Agent Dashboard",        color: "#1a3a6b", icon: "👨‍💼" },
  { label: "Management Analytics",   color: "#7C3AED", icon: "📊" },
  { label: "Escalation Team",        color: "#DC2626", icon: "🚨" },
  { label: "RBI Regulatory Reports", color: "#059669", icon: "📋" },
];

export function ChannelIngestion() {
  const [activeStep, setActiveStep] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [dotPositions, setDotPositions] = useState<number[]>([0, 25, 50, 75]);

  const { data: channelData } = useQuery({
    queryKey: ["by-channel"],
    queryFn: api.getByChannel,
    refetchInterval: 30000,
  });

  // Cycle through processing steps
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % PROCESSING_STEPS.length);
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  // Animate dots along arrows
  useEffect(() => {
    const interval = setInterval(() => {
      setDotPositions((prev) => prev.map((p) => (p + 2) % 100));
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Refresh timestamp
  useEffect(() => {
    const interval = setInterval(() => setLastUpdated(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  const getCount = (channelName: string) => {
    const found = channelData?.find((c: any) =>
      c.channel.toLowerCase() === channelName.toLowerCase()
    );
    return found?.count ?? "—";
  };

  return (
    <div
      className="rounded-xl border card-shadow p-5 overflow-hidden"
      style={{ background: "linear-gradient(135deg, #f8faff 0%, #f0f4ff 100%)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-base font-bold text-foreground">
            Unified Complaint Ingestion Pipeline
          </h2>
          <p className="text-xs text-muted-foreground">
            Live data flow from all 6 channels into AI-CSPARC platform
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
          <span className="text-[11px] text-muted-foreground">
            Live · Updated {lastUpdated.toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Pipeline Layout */}
      <div className="space-y-6">

        {/* Row 1: Source Channels */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3 text-center">
            Complaint Sources
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {CHANNEL_CONFIG.map((ch, i) => (
              <div
                key={ch.name}
                className="rounded-xl border p-3 text-center transition-all hover:shadow-md"
                style={{
                  backgroundColor: ch.bg,
                  borderColor: ch.color + "40",
                  animationDelay: `${i * 0.1}s`,
                }}
              >
                <div className="text-xl mb-1">{ch.icon}</div>
                <p className="text-[10px] font-bold leading-tight" style={{ color: ch.color }}>
                  {ch.name}
                </p>
                <p className="text-xs font-extrabold mt-0.5" style={{ color: ch.color }}>
                  {getCount(ch.name)}
                </p>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <div
                    className="h-1.5 w-1.5 rounded-full animate-pulse"
                    style={{ backgroundColor: ch.color }}
                  />
                  <span className="text-[9px]" style={{ color: ch.color }}>Live</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Arrows pointing down */}
        <div className="flex justify-center">
          <div className="flex flex-col items-center gap-0.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-primary transition-opacity"
                style={{
                  opacity: (dotPositions[0] + i * 20) % 100 < 50 ? 1 : 0.2,
                }}
              />
            ))}
            <div className="text-primary text-sm">▼</div>
          </div>
        </div>

        {/* Row 2: Unified Platform */}
        <div
          className="rounded-2xl border-2 p-5 relative overflow-hidden"
          style={{ borderColor: "#1a3a6b", backgroundColor: "#f0f4ff" }}
        >
          {/* Animated background pulse */}
          <div
            className="absolute inset-0 opacity-5 animate-pulse"
            style={{ backgroundColor: "#1a3a6b" }}
          />

          <div className="relative">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div
                className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-extrabold text-sm shadow"
                style={{ backgroundColor: "#1a3a6b" }}
              >
                UBI
              </div>
              <div className="text-center">
                <p className="font-extrabold text-sm" style={{ color: "#1a3a6b" }}>
                  AI-CSPARC Unified Platform
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Union Bank of India · Intelligent Complaint Hub
                </p>
              </div>
            </div>

            {/* Processing Steps */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PROCESSING_STEPS.map((step, i) => (
                <div
                  key={step.label}
                  className="rounded-lg px-2 py-2 text-center border transition-all duration-500"
                  style={{
                    backgroundColor: i === activeStep ? step.color + "20" : "#ffffff",
                    borderColor: i === activeStep ? step.color : "#e2e8f0",
                    transform: i === activeStep ? "scale(1.03)" : "scale(1)",
                    boxShadow: i === activeStep ? `0 0 12px ${step.color}40` : "none",
                  }}
                >
                  <div
                    className="h-1.5 w-1.5 rounded-full mx-auto mb-1.5 transition-all"
                    style={{
                      backgroundColor: step.color,
                      boxShadow: i === activeStep ? `0 0 6px ${step.color}` : "none",
                    }}
                  />
                  <p
                    className="text-[10px] font-semibold leading-tight"
                    style={{ color: i === activeStep ? step.color : "#64748b" }}
                  >
                    {step.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Arrows pointing down */}
        <div className="flex justify-center">
          <div className="flex flex-col items-center gap-0.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-primary transition-opacity"
                style={{
                  opacity: (dotPositions[2] + i * 20) % 100 < 50 ? 1 : 0.2,
                }}
              />
            ))}
            <div className="text-primary text-sm">▼</div>
          </div>
        </div>

        {/* Row 3: Outputs */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3 text-center">
            Output Destinations
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {OUTPUT_NODES.map((node) => (
              <div
                key={node.label}
                className="rounded-xl border p-3 text-center hover:shadow-md transition-all"
                style={{
                  backgroundColor: node.color + "10",
                  borderColor: node.color + "40",
                }}
              >
                <div className="text-lg mb-1">{node.icon}</div>
                <p
                  className="text-[10px] font-bold leading-tight"
                  style={{ color: node.color }}
                >
                  {node.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}