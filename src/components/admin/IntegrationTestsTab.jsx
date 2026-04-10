import { useState } from "react";
import ReviewSystemTester from "@/components/devtools/ReviewSystemTester";
import PricingSnapshotTester from "@/components/devtools/PricingSnapshotTester";
import SmartPricingRulesTester from "@/components/devtools/SmartPricingRulesTester";

const TABS = [
  {
    id: "reviews",
    label: "Review System",
    color: "bg-purple-500",
    description: "Tests all four review directions, sub-ratings, blind reveal logic, and poor review flagging.",
    Component: ReviewSystemTester,
  },
  {
    id: "snapshots",
    label: "Pricing Snapshots",
    color: "bg-teal-600",
    description: "Verifies PricingSnapshot is created on booking confirmation with all metadata fields. Tests deduplication.",
    Component: PricingSnapshotTester,
  },
  {
    id: "smartpricing",
    label: "Smart Pricing Rules",
    color: "bg-[#1E3A5F]",
    description: "Creates, verifies, and updates SmartPricingRules for all three dimensions. Simulates a composed rate calculation.",
    Component: SmartPricingRulesTester,
  },
];

export default function IntegrationTestsTab() {
  const [activeTab, setActiveTab] = useState("reviews");

  const active = TABS.find(t => t.id === activeTab);
  const ActiveComponent = active?.Component;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
        <p className="text-sm text-amber-700 font-semibold mb-1">⚠️ Integration Tests — Admin only</p>
        <p className="text-xs text-amber-600">These tests write to the live database. Always run Clean Up after each test suite. Tests marked with ⏱ depend on background automations — allow a few seconds between steps.</p>
      </div>

      {/* Sub-tab selector */}
      <div className="flex gap-3 flex-wrap">
        {TABS.map((tab, i) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
              activeTab === tab.id
                ? "bg-white border-gray-200 text-gray-900 shadow-sm"
                : "bg-transparent border-transparent text-gray-400 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            <span className={`w-5 h-5 rounded-full ${tab.color} text-white text-xs font-bold flex items-center justify-center flex-shrink-0`}>
              {i + 1}
            </span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active test panel */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <p className="text-xs text-gray-400 mb-5">{active?.description}</p>
        {ActiveComponent && <ActiveComponent />}
      </div>
    </div>
  );
}