import { useState } from "react";
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

export default function RoleSwitcher({ userRoles, currentMode = "guest" }) {
  const navigate = useNavigate();
  const [activeMode, setActiveMode] = useState(currentMode);

  const switchMode = (mode, page) => {
    setActiveMode(mode);
    navigate(createPageUrl(page));
  };

  const modes = [];
  
  // Always show guest mode
  modes.push({ 
    label: "Guest View", 
    icon: Home, 
    role: "guest",
    page: "Search",
    color: "text-teal-600"
  });

  if (hasRole(userRoles, 'host')) {
    modes.push({ 
      label: "Host View", 
      icon: Building2, 
      role: "host",
      page: "HostDashboard",
      color: "text-blue-600"
    });
  }

  if (hasRole(userRoles, 'cleaner')) {
    modes.push({ 
      label: "Cleaner View", 
      icon: Sparkles, 
      role: "cleaner",
      page: "CleanerDashboard",
      color: "text-purple-600"
    });
  }

  // Only show switcher if user has multiple roles
  if (modes.length <= 1) {
    return null;
  }

  const currentModeData = modes.find(m => m.role === activeMode) || modes[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <currentModeData.icon className={`w-4 h-4 ${currentModeData.color}`} />
          <span className="hidden sm:inline">{currentModeData.label}</span>
          <ChevronDown className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Switch View</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {modes.map((mode) => (
          <DropdownMenuItem 
            key={mode.role}
            onClick={() => switchMode(mode.role, mode.page)}
            className="flex items-center gap-2"
          >
            <mode.icon className={`w-4 h-4 ${mode.color}`} />
            {mode.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}