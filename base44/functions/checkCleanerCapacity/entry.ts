import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const PROPERTIES_PER_CLEANER_SLOT = 25;
const CLEANERS_PER_SLOT = 8;

// Haversine distance in miles between two lat/lng points
function distanceMiles(lat1, lng1, lat2, lng2) {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const { lat, lng, radius_miles = 15, is_team = false, team_size = 1 } = await req.json();

    if (!lat || !lng) {
      return Response.json({ success: false, error: "lat and lng required" }, { status: 400 });
    }

    // Count active published properties within radius
    const allProperties = await sr.entities.Property.filter({ status: "published" });
    const nearbyProperties = allProperties.filter(p => {
      if (!p.latitude || !p.longitude) return false;
      return distanceMiles(lat, lng, p.latitude, p.longitude) <= radius_miles;
    });
    const propertyCount = nearbyProperties.length;

    // Calculate how many cleaner slots this demand supports
    const totalSlots = Math.floor((propertyCount / PROPERTIES_PER_CLEANER_SLOT) * CLEANERS_PER_SLOT);

    if (totalSlots === 0) {
      return Response.json({
        success: true,
        has_capacity: false,
        reason: "no_demand",
        property_count: propertyCount,
        total_slots: 0,
        message: "There are no active host properties in your area yet. We've added you to the priority waitlist and will notify you as soon as opportunities become available.",
      });
    }

    // Count active cleaners already in this area
    const allCleaners = await sr.entities.Cleaner.filter({ subscription_status: "active" });
    const nearbyCleaners = allCleaners.filter(c => {
      const cLat = c.service_area?.lat;
      const cLng = c.service_area?.lng;
      if (!cLat || !cLng) return false;
      return distanceMiles(lat, lng, cLat, cLng) <= radius_miles;
    });

    // Team cleaners count as their team_size against capacity
    const usedSlots = nearbyCleaners.reduce((sum, c) => {
      return sum + (c.is_team ? Math.min(c.team_size || 2, 3) : 1);
    }, 0);

    // How many slots would this new cleaner use
    const slotsNeeded = is_team ? Math.min(team_size, 3) : 1;

    const hasCapacity = (usedSlots + slotsNeeded) <= totalSlots;

    return Response.json({
      success: true,
      has_capacity: hasCapacity,
      reason: hasCapacity ? "capacity_available" : "area_full",
      property_count: propertyCount,
      total_slots: totalSlots,
      used_slots: usedSlots,
      slots_needed: slotsNeeded,
      message: hasCapacity
        ? "Great news — your area has capacity for new cleaners."
        : "Your area currently has more cleaners than active host demand. We've added you to the priority waitlist and will notify you when a slot opens.",
    });

  } catch (e) {
    console.error("checkCleanerCapacity error:", e);
    return Response.json({ success: false, error: e.message }, { status: 500 });
  }
});