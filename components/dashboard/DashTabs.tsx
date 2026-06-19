"use client";

import { useState } from "react";
import Overview from "./Overview";
import Analytical from "./Analytical";
import Reports from "./Reports";
import type { DashboardStats } from "@/server/actions/dashboard";

const tabs = [
  { key: "overview", label: "Vue d'ensemble" },
  { key: "analytics", label: "Analytique" },
  { key: "reports", label: "Rapports" },
];

export function DashTabs({ stats }: { stats: DashboardStats }) {
  const [active, setActive] = useState("overview");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-0 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={`px-4 py-2.5 text-sm border-b-2 transition-colors cursor-pointer ${
              active === t.key
                ? "border-foreground text-foreground font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-4">
        {active === "overview" && <Overview stats={stats} />}
        {active === "analytics" && <Analytical />}
        {active === "reports" && <Reports />}
      </div>
    </div>
  );
}
