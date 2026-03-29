import {
  BarChart3, Table2, GitCompare, Search, MapPin, LayoutDashboard,
  ShieldAlert, ShieldCheck, Radio,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import { useState } from "react";

const items = [
  { title: "Live Pipeline",  icon: Radio,        id: "ingestion"   },
  { title: "Overview",       icon: LayoutDashboard, id: "overview"  },
  { title: "Complaints",     icon: Table2,        id: "complaints"  },
  { title: "SLA Tracking",   icon: ShieldAlert,   id: "sla"         },
  { title: "Analytics",      icon: BarChart3,     id: "charts"      },
  { title: "Branch Map",     icon: MapPin,        id: "branches"    },
  { title: "Duplicates",     icon: GitCompare,    id: "duplicates"  },
  { title: "Regulatory",     icon: ShieldCheck,   id: "regulatory"  },
  { title: "Analyze",        icon: Search,        id: "analyze"     },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const [activeId, setActiveId] = useState("ingestion");

  const scrollTo = (id: string) => {
    setActiveId(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {/* Logo */}
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground font-extrabold text-sm shrink-0 shadow-lg">
              UBI
            </div>
            {!collapsed && (
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-sidebar-primary truncate">Union Bank of India</p>
                <p className="text-[10px] text-sidebar-muted truncate">iDEA PS5 · Complaint Hub</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="px-2 py-4">
          {!collapsed && (
            <p className="text-[10px] uppercase tracking-widest text-sidebar-muted px-3 mb-3 font-semibold">
              Navigation
            </p>
          )}
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => {
                  const isActive = activeId === item.id;
                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        onClick={() => scrollTo(item.id)}
                        tooltip={item.title}
                        className={`transition-all duration-200 ${
                          isActive
                            ? "bg-sidebar-accent text-sidebar-primary font-semibold"
                            : "hover:bg-sidebar-accent/50"
                        }`}
                      >
                        <item.icon className={`h-4 w-4 ${isActive ? "text-sidebar-primary" : ""}`} />
                        {!collapsed && <span>{item.title}</span>}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </div>

        {/* Footer */}
        {!collapsed && (
          <div className="mt-auto p-4 border-t border-sidebar-border">
            <p className="text-[10px] text-sidebar-muted text-center">
              iDEA Hackathon 2.0 · Union Bank of India
            </p>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}