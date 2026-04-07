import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Users, Plus, Minus } from "lucide-react";

export default function GuestSelector({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [adults, setAdults] = useState(value?.adults || 1);
  const [children, setChildren] = useState(value?.children || 0);
  const [childAges, setChildAges] = useState(value?.childAges || []);
  const [ageErrors, setAgeErrors] = useState([]);

  useEffect(() => {
    // Sync childAges array length with children count
    if (children > childAges.length) {
      setChildAges(prev => [...prev, ...Array(children - prev.length).fill("")]);
    } else if (children < childAges.length) {
      setChildAges(prev => prev.slice(0, children));
    }
  }, [children]);

  useEffect(() => {
    // Validate ages and update parent
    const errors = childAges.map((age, idx) => {
      if (age === "" || age === null) return "Required";
      const numAge = parseInt(age);
      if (isNaN(numAge) || numAge < 0 || numAge > 17) return "0-17";
      return null;
    });
    setAgeErrors(errors);

    // Only update parent if all ages are valid
    const validAges = childAges.every((age, idx) => {
      if (age === "" || age === null) return false;
      const numAge = parseInt(age);
      return !isNaN(numAge) && numAge >= 0 && numAge <= 17;
    });

    onChange({
      adults,
      children,
      childAges: children === 0 ? [] : (validAges ? childAges.map(a => parseInt(a)) : []),
      isValid: children === 0 || validAges
    });
  }, [adults, children, childAges]);

  const handleChildAgeChange = (index, value) => {
    const newAges = [...childAges];
    newAges[index] = value;
    setChildAges(newAges);
  };

  const increment = (setter, current, max = 20) => {
    if (current < max) setter(current + 1);
  };

  const decrement = (setter, current, min = 0) => {
    if (current > min) setter(current - 1);
  };

  const totalGuests = adults + children;
  const displayText = children > 0 
    ? `${adults} adult${adults !== 1 ? 's' : ''}, ${children} child${children !== 1 ? 'ren' : ''}`
    : `${adults} guest${adults !== 1 ? 's' : ''}`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start text-left font-normal h-12">
          <Users className="mr-2 h-5 w-5 text-gray-400" />
          <span className="truncate">{displayText}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4" align="end" side="top" sideOffset={8} avoidCollisions={true} collisionPadding={12}>
        <div className="space-y-4">
          {/* Adults */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Adults</p>
              <p className="text-sm text-gray-500">Ages 18+</p>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => decrement(setAdults, adults, 1)}
                disabled={adults <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center font-medium">{adults}</span>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => increment(setAdults, adults)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Children */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Children</p>
              <p className="text-sm text-gray-500">Ages 0-17</p>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => decrement(setChildren, children, 0)}
                disabled={children <= 0}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center font-medium">{children}</span>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => increment(setChildren, children, 10)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Child Ages */}
          {children > 0 && (
            <div className="border-t pt-4 space-y-3">
              <p className="text-sm font-medium text-gray-700">Child ages at time of travel</p>
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: children }).map((_, idx) => (
                  <div key={idx}>
                    <Label className="text-xs text-gray-500">Child {idx + 1} Age</Label>
                    <Input
                      type="number"
                      min="0"
                      max="17"
                      value={childAges[idx] || ""}
                      onChange={(e) => handleChildAgeChange(idx, e.target.value)}
                      placeholder="0-17"
                      className={`mt-1 h-9 ${ageErrors[idx] ? 'border-red-500' : ''}`}
                    />
                    {ageErrors[idx] && (
                      <p className="text-xs text-red-500 mt-0.5">{ageErrors[idx]}</p>
                    )}
                  </div>
                ))}
              </div>
              {childAges.some((_, idx) => ageErrors[idx]) && (
                <p className="text-xs text-red-500">Please enter ages for all children (0-17)</p>
              )}
            </div>
          )}

          <Button 
            className="w-full bg-teal-600 hover:bg-teal-700 mt-2"
            onClick={() => setOpen(false)}
          >
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}