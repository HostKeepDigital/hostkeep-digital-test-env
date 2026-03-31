import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, ChevronUp } from "lucide-react";
import { AMENITY_GROUPS, AMENITY_MAP } from "@/data/amenities";

export default function AmenitiesSelector({ amenities = [], onChange }) {
  const [openGroups, setOpenGroups] = useState({});

  // Auto-open groups that already have selected amenities
  useEffect(() => {
    const initial = {};
    Object.entries(AMENITY_GROUPS).forEach(([group, slugs]) => {
      if (slugs.some((s) => amenities.includes(s))) {
        initial[group] = true;
      }
    });
    setOpenGroups(initial);
  }, []);

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
          <div
            key={groupName}
            className="border border-gray-200 rounded-lg overflow-hidden"
          >
            {/* Group Header */}
            <button
              type="button"
              onClick={() => toggleGroup(groupName)}
              className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-800">
                  {groupName}
                </span>

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

            {/* Animated Expand/Collapse */}
            <div
              className={`border-t border-gray-100 bg-gray-50 overflow-hidden transition-all duration-300 ${
                isOpen ? "max-h-[500px] px-4 py-3" : "max-h-0 px-4 py-0"
              }`}
            >
              {isOpen && (
                <>
                  {/* Select All / Clear All */}
                  <div className="flex justify-end mb-2">
                    {selectedCount === slugs.length ? (
                      <button
                        type="button"
                        onClick={() =>
                          slugs.forEach(
                            (s) => amenities.includes(s) && toggleAmenity(s)
                          )
                        }
                        className="text-xs text-red-600 hover:underline"
                      >
                        Clear all
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          slugs.forEach(
                            (s) => !amenities.includes(s) && toggleAmenity(s)
                          )
                        }
                        className="text-xs text-teal-600 hover:underline"
                      >
                        Select all
                      </button>
                    )}
                  </div>

                  {/* Amenity Grid */}
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
                          <span className="text-sm text-gray-700">
                            {amenity.name}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}