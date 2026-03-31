import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, ChevronUp } from "lucide-react";
import { AMENITY_GROUPS, AMENITY_MAP } from "@/data/amenities";

export default function AmenitiesSelector({ amenities = [], onChange }) {
  const [openGroups, setOpenGroups] = useState({});

  const toggleGroup = (group) => {
    setOpenGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  const toggleAmenity = (slug) => {
    const updated = amenities.includes(slug)
      ? amenities.filter((a) => a !== slug)
      : [...amenities, slug];
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      {Object.entries(AMENITY_GROUPS).map(([groupName, slugs]) => {
        const selectedCount = slugs.filter((s) => amenities.includes(s)).length;
        const isOpen = !!openGroups[groupName];

        return (
          <div key={groupName} className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => toggleGroup(groupName)}
              className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-800">{groupName}</span>
                {selectedCount > 0 && (
                  <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-medium">
                    {selectedCount} selected
                  </span>
                )}
              </div>
              {isOpen ? (
                <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
              )}
            </button>

            {isOpen && (
              <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {slugs.map((slug) => {
                    const amenity = AMENITY_MAP[slug];
                    if (!amenity) return null;
                    return (
                      <label
                        key={slug}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-white cursor-pointer transition-colors"
                      >
                        <Checkbox
                          checked={amenities.includes(slug)}
                          onCheckedChange={() => toggleAmenity(slug)}
                        />
                        <span className="text-sm text-gray-700">{amenity.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}