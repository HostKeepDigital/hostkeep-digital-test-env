// Example: Using LocationAutocomplete in Property Search

import React, { useState } from 'react';
import LocationAutocomplete from '@/components/LocationAutocomplete';
import { validateLocationSelection, extractLocationData, buildLocationFilter } from '@/components/LocationValidator';

export default function PropertySearchExample() {
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [validationError, setValidationError] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();

    // Validate location selection
    const validation = validateLocationSelection(selectedLocation);
    if (!validation.valid) {
      setValidationError(validation.error);
      return;
    }

    // Extract location data for storage
    const locationData = extractLocationData(selectedLocation);
    console.log('Location Data:', locationData);

    // Build filter for property query
    const filter = buildLocationFilter(selectedLocation);
    
    // Example: Query properties by location
    try {
      const properties = await base44.entities.Property.filter(filter);
      console.log('Found properties:', properties);
      
      // Future expansion: 
      // - Filter by county: buildCountyFilter(location.country)
      // - Filter by multiple locations
      // - Postcode prefix matching
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  return (
    <form onSubmit={handleSearch} className="space-y-4">
      <LocationAutocomplete
        value={selectedLocation}
        onChange={(location) => {
          setSelectedLocation(location);
          setValidationError(null);
        }}
        label="Select Location"
        placeholder="Search counties..."
        required={true}
        error={validationError}
      />

      <button
        type="submit"
        className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700"
      >
        Search Properties
      </button>
    </form>
  );
}