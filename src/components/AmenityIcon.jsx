import {
  Wifi, Zap, Thermometer, Wind, Moon, ChefHat, Waves, Flame,
  Coffee, Snowflake, UtensilsCrossed, Shirt, Tv, Trees, Sun,
  Armchair, DoorOpen, Dumbbell, Mountain, Anchor,
  BedDouble, Droplets, Baby, Gamepad2, BookOpen, AlertTriangle,
  HeartPulse, Camera, Lock, Accessibility, Monitor, Car,
  PawPrint, Building2, Circle,
} from "lucide-react";

const ICON_COMPONENTS = {
  Wifi, Zap, Thermometer, Wind, Moon, ChefHat, Waves, Flame,
  Coffee, Snowflake, UtensilsCrossed, Shirt, Tv, Trees, Sun,
  Armchair, DoorOpen, Dumbbell, Mountain, Anchor,
  BedDouble, Droplets, Baby, Gamepad2, BookOpen, AlertTriangle,
  HeartPulse, Camera, Lock, Accessibility, Monitor, Car,
  PawPrint, Building2, Circle,
};

export default function AmenityIcon({ name, className }) {
  const Icon = ICON_COMPONENTS[name];
  if (!Icon) return null;
  return <Icon className={className} />;
}