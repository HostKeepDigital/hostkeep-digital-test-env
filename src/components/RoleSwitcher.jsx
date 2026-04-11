import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Home, Building2, Sparkles, ChevronDown } from "lucide-react";
import { hasRole } from "@/components/utils/roleHelpers";

const HOST_PAGES = new Set([
  "HostDashboard", "HostBookings", "HostProperties", "HostMessages",
  "HostCancellationPolicies", "CreateProperty", "EditProperty",
]);

const CLEANER_PAGES = new Set([
  "CleanerDashboard", "CleanerMessages", "CleanerPricing", "CleanerProfile",
  "CleanerMarketplace", "CleanerSignup", "CleanerVerification",
  "CleanerSubscriptionPay", "CleanKeep",
]);

function detectCurrentMode(currentPageName) {
  if (HOST_PAGES.has(currentPageName)) return "host";
  if (CLEANER_PAGES.has(currentPageName)) return "cleaner";
  return "guest";
}

export default function RoleSwitcher({ userRoles, currentPageName }) {
  const navigate = useNavigate();
  const activeMode = detectCurrentMode(currentPageName);

  const isHost = hasRole(userRoles, "host");
  const isCleaner = hasRole(userRoles, "cleaner");

  const modes = [];

  // Guest view — always available
  modes.push({
    label: "Guest View",
    icon: Home,
    role: "guest",
    page: "Home",
    color: "text-teal-600",
  });

  if (isHost) {
    modes.push({
      label: "Host View",
      icon: Building2,
      role: "host",
      page: "HostDashboard",
      color: "text-blue-600",
    });
  }

  if (isCleaner) {
    modes.push({
      label: "Cleaner View",
      icon: Sparkles,
      role: "cleaner",
      page: "CleanerDashboard",
      color: "text-purple-600",
    });
  }

  // Only show if there's something to switch to (more than just guest)
  if (!isHost && !isCleaner) return null;

  const currentModeData = modes.find((m) => m.role === activeMode) || modes[0];
  const otherModes = modes.filter((m) => m.role !== activeMode);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="h-9 w-9 p-0 lg:h-9 lg:w-auto lg:px-4 lg:gap-2 flex items-center justify-center mr-1">
          <currentModeData.icon className={`w-4 h-4 ${currentModeData.color}`} />
          <span className="hidden lg:inline">{currentModeData.label}</span>
          <ChevronDown className="hidden lg:block w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Switch View</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {modes.map((mode) => (
          <DropdownMenuItem
            key={mode.role}
            onClick={() => navigate(createPageUrl(mode.page))}
            className={`flex items-center gap-2 ${mode.role === activeMode ? "font-semibold bg-gray-50" : ""}`}
          >
            <mode.icon className={`w-4 h-4 ${mode.color}`} />
            {mode.label}
            {mode.role === activeMode && <span className="ml-auto text-xs text-gray-400">Current</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}