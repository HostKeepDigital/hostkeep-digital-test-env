// Validation utilities for location selection

export const validateLocationSelection = (selectedLocation) => {
  if (!selectedLocation || !selectedLocation.id) {
    return {
      valid: false,
      error: 'Please select a valid location from the autocomplete'
    };
  }
  return { valid: true };
};

export const extractLocationData = (location) => {
  return {
    location_id: location.id,
    county_name: location.name,
    country: location.country,
    location_type: location.type,
    slug: location.slug
  };
};

// For property filters (scalable for future city/postcode expansion)
export const buildLocationFilter = (selectedLocation) => {
  return {
    location_id: selectedLocation.id
  };
};

// Future-ready for multi-location or county-wide filters
export const buildCountyFilter = (countryName) => {
  return {
    country: countryName
  };
};