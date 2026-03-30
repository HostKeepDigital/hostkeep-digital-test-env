import { AMENITIES_FULL } from "./amenitiesFull";

// Slug = lowercased, spaces→hyphens version of the name
function toSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// Icon name mapping (lucide-react icon names)
const ICON_MAP = {
  // Essentials
  "wifi": "Wifi",
  "fast-wifi-100mbps": "Zap",
  "heating": "Thermometer",
  "underfloor-heating": "Thermometer",
  "air-conditioning": "Wind",
  "ceiling-fan": "Wind",
  "blackout-curtains": "Moon",
  "kitchen": "ChefHat",
  "dishwasher": "Waves",
  "oven": "Flame",
  "microwave": "Zap",
  "coffee-machine": "Coffee",
  "kettle": "Coffee",
  "toaster": "Flame",
  "fridge-freezer": "Snowflake",
  "cooking-basics": "ChefHat",
  "pots-pans": "ChefHat",
  "dishes-cutlery": "UtensilsCrossed",
  "washing-machine": "WashingMachine",
  "tumble-dryer": "Wind",
  "drying-rack": "Wind",
  "iron-ironing-board": "Shirt",
  "tv": "Tv",
  "smart-tv": "Tv",
  "streaming-services": "Tv",
  "netflix": "Tv",

  // Outdoor
  "garden": "Trees",
  "enclosed-garden": "Trees",
  "patio": "Sun",
  "balcony": "Sun",
  "outdoor-furniture": "Armchair",
  "outdoor-dining-area": "UtensilsCrossed",
  "bbq": "Flame",
  "fire-pit": "Flame",
  "private-entrance": "DoorOpen",
  "hot-tub": "Waves",
  "pool": "Waves",
  "sauna": "Flame",
  "gym": "Dumbbell",
  "outdoor-shower": "Shower",
  "sea-view": "Waves",
  "lake-view": "Waves",
  "mountain-view": "Mountain",
  "countryside-view": "Trees",
  "city-skyline-view": "Building2",
  "marina-view": "Anchor",

  // Bedroom / Bathroom
  "linen-provided": "BedDouble",
  "towels-provided": "Shirt",
  "hair-dryer": "Wind",
  "shampoo-conditioner": "Droplets",
  "body-wash": "Droplets",
  "bath": "Bath",
  "walk-in-shower": "Shower",
  "ground-floor-bedroom": "BedDouble",
  "cot-available": "Baby",
  "travel-cot-crib": "Baby",
  "high-chair": "Baby",

  // Entertainment
  "games-room": "Gamepad2",
  "pool-table": "Circle",
  "board-games": "Gamepad2",
  "books": "BookOpen",

  // Safety
  "smoke-alarm": "AlertTriangle",
  "carbon-monoxide-alarm": "AlertTriangle",
  "fire-extinguisher": "AlertTriangle",
  "first-aid-kit": "HeartPulse",
  "security-camera-exterior": "Camera",
  "safe-lockbox": "Lock",

  // Accessibility
  "wheelchair-accessible": "Accessibility",
  "step-free-access": "Accessibility",

  // Work
  "dedicated-workspace": "Monitor",

  // Parking
  "parking": "Car",
  "free-on-site-parking": "Car",
  "paid-on-site-parking": "Car",
  "free-street-parking": "Car",
  "electric-car-charger": "Zap",

  // Other
  "fireplace": "Flame",
  "log-burner": "Flame",
  "cleaning-products": "Spray",
  "vacuum-cleaner": "Wind",
  "mop-bucket": "Droplets",
  "washing-up-liquid": "Droplets",
  "laundry-detergent": "WashingMachine",

  // Pets
  "pet-friendly": "PawPrint",
  "pet-bowls": "PawPrint",
  "pet-bed": "PawPrint",
};

// Build AMENITY_MAP: slug → { slug, name, icon, group }
export const AMENITY_MAP = {};
export const AMENITY_GROUPS = {};

Object.entries(AMENITIES_FULL).forEach(([group, names]) => {
  AMENITY_GROUPS[group] = [];

  names.forEach((name) => {
    const slug = toSlug(name);
    AMENITY_MAP[slug] = {
      slug,
      name,
      icon: ICON_MAP[slug] || null,
      group,
    };
    AMENITY_GROUPS[group].push(slug);
  });
});

// Helper to get all slugs as a flat array
export const ALL_AMENITY_SLUGS = Object.keys(AMENITY_MAP);