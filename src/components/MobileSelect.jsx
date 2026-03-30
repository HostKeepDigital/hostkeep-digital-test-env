/**
 * MobileSelect — uses Drawer (bottom sheet) on small screens, standard Select on desktop.
 * Drop-in replacement for Radix Select for simple value lists.
 *
 * Props:
 *   value, onValueChange, placeholder, className
 *   options: [{ value: string, label: string }]
 *   triggerClassName?: string
 */
import { useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown, Check } from "lucide-react";

function useIsMobile() {
  if (typeof window === "undefined") return false;
  return window.innerWidth < 768;
}

export default function MobileSelect({
  value,
  onValueChange,
  placeholder = "Select…",
  options = [],
  triggerClassName = "",
  disabled = false,
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isMobile = useIsMobile();

  const selectedLabel = options.find((o) => o.value === value)?.label ?? placeholder;

  if (!isMobile) {
    return (
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className={triggerClassName}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setDrawerOpen(true)}
        className={`flex items-center justify-between gap-2 border rounded-md px-3 h-11 text-sm bg-white disabled:opacity-50 ${triggerClassName}`}
      >
        <span className={value ? "text-gray-900" : "text-gray-400"}>{selectedLabel}</span>
        <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
      </button>

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{placeholder}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-8 space-y-1 max-h-72 overflow-y-auto">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onValueChange(opt.value);
                  setDrawerOpen(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-colors
                  ${opt.value === value ? "bg-teal-50 text-teal-700 font-medium" : "hover:bg-gray-50 text-gray-700"}`}
              >
                {opt.label}
                {opt.value === value && <Check className="w-4 h-4 text-teal-600" />}
              </button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}