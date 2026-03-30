import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import LocationAutocomplete from "@/components/LocationAutocomplete";
import { ChevronDown, ChevronUp } from "lucide-react";

import { AMENITY_GROUPS, AMENITY_MAP } from "@/data/amenities";

const PROPERTY_TYPES = [
  { value: "apartment", label: "Apartment" },
  { value: "house", label: "House" },
  { value: "studio", label: "Studio" },
  { value: "villa", label: "Villa" },
  { value: "cottage", label: "Cottage" },
];

export default function PropertyFilters({ onFilterChange }) {
  const [filters, setFilters] = useState({
    location: null,
    radius_km: 50,
    guests: "",
    bedrooms: "",
    min_price: "",
    max_price: "",
    property_type: [],
    amenities: [],
    sort: "newest",
  });

  const [expandedSections, setExpandedSections] = useState({
    location: true,
    property: true,
    capacity: true,
    price: true,
    amenities: true,
  });

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  useEffect(() => {
    onFilterChange(filters);
  }, [filters]);

  const handleLocationSelect = (location) => {
    setFilters((prev) => ({ ...prev, location }));
  };

  const handlePropertyTypeChange = (type) => {
    setFilters((prev) => ({
      ...prev,
      property_type: prev.property_type.includes(type)
        ? prev.property_type.filter((t) => t !== type)
        : [...prev.property_type, type],
    }));
  };

  const handleAmenityChange = (slug) => {
    setFilters((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(slug)
        ? prev.amenities.filter((a) => a !== slug)
        : [...prev.amenities, slug],
    }));
  };

  return (
    <div className="space-y-4 bg-white rounded-lg shadow p-6">
      {/* Location */}
      <div className="border-b pb-4">
        <button
          onClick={() => toggleSection("location")}
          className="w-full flex items-center justify-between font-semibold text-gray-900 mb-4"
        >
          <span>Location</span>
          {expandedSections.location ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        {expandedSections.location && (
          <div className="space-y-3">
            <LocationAutocomplete
              value={filters.location}
              onChange={handleLocationSelect}
              label="Select County"
              placeholder="Search UK counties..."
            />

            <div>
              <Label className="text-sm">Radius</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  type="number"
                  min="1"
                  max="200"
                  value={filters.radius_km}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      radius_km: parseInt(e.target.value),
                    }))
                  }
                  className="w-20"
                />
                <span className="text-sm text-gray-600">km</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Property Type */}
      <div className="border-b pb-4">
        <button
          onClick={() => toggleSection("property")}
          className="w-full flex items-center justify-between font-semibold text-gray-900 mb-4"
        >
          <span>Property Type</span>
          {expandedSections.property ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        {expandedSections.property && (
          <div className="space-y-2">
            {PROPERTY_TYPES.map((type) => (
              <label
                key={type.value}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Checkbox
                  checked={filters.property_type.includes(type.value)}
                  onCheckedChange={() => handlePropertyTypeChange(type.value)}
                />
                <span className="text-sm">{type.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Capacity */}
      <div className="border-b pb-4">
        <button
          onClick={() => toggleSection("capacity")}
          className="w-full flex items-center justify-between font-semibold text-gray-900 mb-4"
        >
          <span>Capacity</span>
          {expandedSections.capacity ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        {expandedSections.capacity && (
          <div className="space-y-3">
            <div>
              <Label className="text-sm">Guests</Label>
              <Input
                type="number"
                min="1"
                value={filters.guests}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, guests: e.target.value }))
                }
                placeholder="Any"
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-sm">Bedrooms</Label>
              <Input
                type="number"
                min="0"
                value={filters.bedrooms}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, bedrooms: e.target.value }))
                }
                placeholder="Any"
                className="mt-1"
              />
            </div>
          </div>
        )}
      </div>

      {/* Price */}
      <div className="border-b pb-4">
        <button
          onClick={() => toggleSection("price")}
          className="w-full flex items-center justify-between font-semibold text-gray-900 mb-4"
        >
          <span>Price</span>
          {expandedSections.price ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        {expandedSections.price && (
          <div className="space-y-3">
            <div>
              <Label className="text-sm">Min Price (£)</Label>
              <Input
                type="number"
                min="0"
                value={filters.min_price}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    min_price: e.target.value,
                  }))
                }
                placeholder="Any"
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-sm">Max Price (£)</Label>
              <Input
                type="number"
                min="0"
                value={filters.max_price}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    max_price: e.target.value,
                  }))
                }
                placeholder="Any"
                className="mt-1"
              />
            </div>
          </div>
        )}
      </div>

      {/* Amenities */}
      <div className="pb-4">
        <button
          onClick={() => toggleSection("amenities")}
          className="w-full flex items-center justify-between font-semibold text-gray-900 mb-4"
        >
          <span>Amenities</span>
          {expandedSections.amenities ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        {expandedSections.amenities && (
          <div className="space-y-4">
            {Object.entries(AMENITY_GROUPS).map(([groupName, slugs]) => (
              <div key={groupName}>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                  {groupName}
                </h4>

                <div className="space-y-1">
                  {slugs.map((slug) => {
                    const amenity = AMENITY_MAP[slug];
                    if (!amenity) return null;

                    return (
                      <label
                        key={slug}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Checkbox
                          checked={filters.amenities.includes(slug)}
                          onCheckedChange={() => handleAmenityChange(slug)}
                        />
                        <span className="text-sm">{amenity.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sort */}
      <div>
        <Label className="text-sm font-semibold">Sort By</Label>
        <Select
          value={filters.sort}
          onValueChange={(v) =>
            setFilters((prev) => ({ ...prev, sort: v }))
          }
        >
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="price_asc">Price: Low to High</SelectItem>
            <SelectItem value="price_desc">Price: High to Low</SelectItem>
            <SelectItem value="score">Best Match</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Clear Filters */}
      <Button
        variant="outline"
        className="w-full"
        onClick={() =>
          setFilters({
            location: null,
            radius_km: 50,
            guests: "",
            bedrooms: "",
            min_price: "",
            max_price: "",
            property_type: [],
            amenities: [],
            sort: "newest",
          })
        }
      >
        Clear All Filters
      </Button>
    </div>
  );
}