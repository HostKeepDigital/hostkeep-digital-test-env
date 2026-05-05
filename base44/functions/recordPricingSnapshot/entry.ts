/**
 * recordPricingSnapshot
 * Called automatically when a booking is confirmed.
 * Captures pricing + property metadata into PricingSnapshot for
 * future smart pricing / market rate analysis.
 *
 * Payload (from entity automation):
 *   event.type = "update"
 *   data = booking record
 *   old_data = previous booking record
 *   changed_fields = array of changed field names
 */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const LOCK = Deno.env.get("LOCK_ACCESS_TOKEN");
    if (LOCK && body?.lock_token !== LOCK) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const payload = body;

    const { event, data: booking, old_data, changed_fields } = payload;

    // Only fire when booking_status moves to "confirmed" or "completed"
    const newStatus = booking?.booking_status;
    const oldStatus = old_data?.booking_status;

    const isConfirmation = changed_fields?.includes("booking_status") &&
      (newStatus === "confirmed" || newStatus === "completed") &&
      oldStatus !== newStatus;

    if (!isConfirmation || !booking?.property_id) {
      return Response.json({ ok: true, skipped: true });
    }

    // Check snapshot doesn't already exist for this booking
    const existing = await sr.entities.PricingSnapshot.filter({ booking_id: booking.id });
    if (existing.length > 0) return Response.json({ ok: true, skipped: "already_exists" });

    // Fetch property for enrichment
    let property = null;
    try {
      property = await sr.entities.Property.get(booking.property_id);
    } catch (_) {}

    const checkInDate = booking.check_in ? new Date(booking.check_in) : null;
    const bookingCreated = booking.created_date ? new Date(booking.created_date) : null;
    const leadDays = checkInDate && bookingCreated
      ? Math.round((checkInDate - bookingCreated) / (1000 * 60 * 60 * 24))
      : null;

    const dayOfWeek = checkInDate ? checkInDate.getDay() : null;
    const month = checkInDate ? checkInDate.getMonth() + 1 : null;
    const isWeekendCheckin = dayOfWeek !== null ? (dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0) : null;

    const amenitiesCount = Array.isArray(property?.amenities) ? property.amenities.length : null;
    const hasPool = property?.amenities?.some(a => a.toLowerCase().includes("pool")) ?? false;

    await sr.entities.PricingSnapshot.create({
      booking_id: booking.id,
      property_id: booking.property_id,
      postcode: property?.postcode || null,
      postcode_area: property?.postcode_area || null,
      postcode_district: property?.postcode_district || (property?.postcode ? property.postcode.split(" ")[0] : null),
      town: property?.town || null,
      county: property?.county || null,
      country: property?.country || null,
      property_type: property?.property_type || null,
      bedrooms: property?.bedrooms || null,
      bathrooms: property?.bathrooms || null,
      guest_capacity: property?.guest_capacity || null,
      nightly_rate: booking.nightly_rate,
      cleaning_fee: booking.cleaning_fee || 0,
      total_amount: booking.total_amount,
      nights: booking.nights,
      check_in: booking.check_in,
      check_out: booking.check_out,
      check_in_month: month,
      check_in_day_of_week: dayOfWeek,
      is_weekend_checkin: isWeekendCheckin,
      booking_lead_days: leadDays,
      guests_count: booking.guests_count || null,
      amenities_count: amenitiesCount,
      pets_allowed: property?.pets_allowed || false,
      has_pool: hasPool,
      average_rating: property?.average_rating || null,
    });

    return Response.json({ ok: true });
  } catch (err) {
    console.error("recordPricingSnapshot error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});