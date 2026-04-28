import { X } from "lucide-react";
import { AMENITY_MAP } from "@/data/amenities";

const PROPERTY_TYPE_LABELS = {
  lodges: "Lodges", house: "House", chalet: "Chalet",
  caravan: "Caravan", cabin: "Cabin", bungalow: "Bungalow", apartment: "Apartment",
};

export default function ActiveFilterPills({ filters, onClear, onClearAll }) {
  const pills = [];

  if (filters.type && filters.type !== "all") {
    pills.push({
      key: "type",
      label: PROPERTY_TYPE_LABELS[filters.type] || filters.type,
      onRemove: () => onClear("type", "all"),
    });
  }

  if (filters.bedrooms && filters.bedrooms !== "any") {
    pills.push({
      key: "bedrooms",
      label: `${filters.bedrooms}+ beds`,
      onRemove: () => onClear("bedrooms", "any"),
    });
  }

  if (filters.minPrice > 0 || filters.maxPrice < 1000) {
    pills.push({
      key: "price",
      label: `£${filters.minPrice}–£${filters.maxPrice}/night`,
      onRemove: () => onClear("price", null),
    });
  }

  if (filters.petsAllowed) {
    pills.push({ key: "pets", label: "Pet Friendly", onRemove: () => onClear("petsAllowed", false) });
  }
  if (filters.smokingAllowed) {
    pills.push({ key: "smoking", label: "Smoking OK", onRemove: () => onClear("smokingAllowed", false) });
  }
  if (filters.childrenAllowed) {
    pills.push({ key: "children", label: "Children OK", onRemove: () => onClear("childrenAllowed", false) });
  }

  (filters.amenities || []).forEach((slug) => {
    const amenity = AMENITY_MAP[slug];
    if (!amenity) return;
    pills.push({
      key: `amenity-${slug}`,
      label: amenity.name,
      onRemove: () => onClear("amenity", slug),
    });
  });

  if (pills.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap mt-2 md:mt-0">
      {pills.map((pill) => (
        <button
          key={pill.key}
          onClick={pill.onRemove}
          className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-medium hover:bg-teal-100 transition-colors"
        >
          {pill.label}
          <X className="w-3 h-3 ml-0.5 opacity-60" />
        </button>
      ))}
      {pills.length > 1 && (
        <button
          onClick={onClearAll}
          className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2 ml-1"
        >
          Clear all
        </button>
      )}
    </div>
  );
}