import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const AMENITIES = [
  { name: 'WiFi', slug: 'wifi', icon: 'Wifi' },
  { name: 'Parking', slug: 'parking', icon: 'ParkingSquare' },
  { name: 'Pet Friendly', slug: 'pet_friendly', icon: 'PawPrint' },
  { name: 'Hot Tub', slug: 'hot_tub', icon: 'Waves' },
  { name: 'Pool', slug: 'pool', icon: 'Waves' },
  { name: 'Garden', slug: 'garden', icon: 'Trees' },
  { name: 'Sea View', slug: 'sea_view', icon: 'Waves' },
  { name: 'Air Conditioning', slug: 'air_conditioning', icon: 'Wind' },
  { name: 'Kitchen', slug: 'kitchen', icon: 'UtensilsCrossed' },
  { name: 'Washing Machine', slug: 'washing_machine', icon: 'Washer' }
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const created = await base44.entities.PropertyAmenity.bulkCreate(AMENITIES);

    return Response.json({
      success: true,
      message: `Seeded ${created.length} amenities`,
      count: created.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});