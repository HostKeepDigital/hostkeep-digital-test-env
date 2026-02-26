import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LocationAutocomplete({ 
  value, 
  onChange, 
  onSelect,
  label = "County",
  placeholder = "Start typing a county...",
  required = false,
  error = null
}) {
  const [inputValue, setInputValue] = useState(value?.name || '');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const debounceTimer = useRef(null);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Debounced search
  const handleSearch = (query) => {
    setInputValue(query);
    
    // Clear previous timer
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    // Don't search if less than 3 characters
    if (query.length < 3) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setLoading(true);
    debounceTimer.current = setTimeout(async () => {
      try {
        const response = await base44.functions.invoke('searchLocations', { q: query });
        setSuggestions(response.data || []);
        setIsOpen(true);
        setSelectedIndex(-1);
      } catch (error) {
        console.error('Search failed:', error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  // Handle selection
  const handleSelect = (location) => {
    setInputValue(location.name);
    setSuggestions([]);
    setIsOpen(false);
    setSelectedIndex(-1);
    
    onChange?.(location);
    onSelect?.(location);
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSelect(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) && 
          inputRef.current && !inputRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && dropdownRef.current) {
      const items = dropdownRef.current.querySelectorAll('[data-suggestion-item]');
      if (items[selectedIndex]) {
        items[selectedIndex].scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  return (
    <div className="w-full">
      {label && (
        <Label className={required ? 'after:content-["*"] after:ml-1 after:text-red-500' : ''}>
          {label}
        </Label>
      )}
      
      <div className="relative mt-1">
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => handleSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => inputValue.length >= 3 && suggestions.length > 0 && setIsOpen(true)}
            placeholder={placeholder}
            className={cn(
              "pl-10",
              error && "border-red-500"
            )}
            autoComplete="off"
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-teal-600 animate-spin" />
          )}
        </div>

        {error && (
          <p className="text-sm text-red-500 mt-1">{error}</p>
        )}

        {/* Dropdown */}
        {isOpen && suggestions.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto"
          >
            {suggestions.map((location, idx) => (
              <button
                key={location.id}
                data-suggestion-item
                onClick={() => handleSelect(location)}
                className={cn(
                  "w-full px-4 py-3 text-left border-b border-gray-100 last:border-0 transition-colors",
                  idx === selectedIndex ? 'bg-teal-50' : 'hover:bg-gray-50'
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{location.name}</p>
                    <p className="text-xs text-gray-500">
                      {location.type.charAt(0).toUpperCase() + location.type.slice(1)} • {location.country}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {isOpen && inputValue.length >= 3 && suggestions.length === 0 && !loading && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4 text-center text-gray-500 text-sm">
            No locations found
          </div>
        )}
      </div>
    </div>
  );
}