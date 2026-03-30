import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const AMENITIES = [
  // --- Core Comfort ---
  { name: "WiFi", slug: "wifi", icon: "Wifi" },
  { name: "Fast WiFi", slug: "fast_wifi", icon: "WifiHigh" },
  { name: "Heating", slug: "heating", icon: "Thermometer" },
  { name: "Fireplace", slug: "fireplace", icon: "Fireplace" },
  { name: "Underfloor Heating", slug: "underfloor_heating", icon: "ThermometerSun" },
  { name: "Air Conditioning", slug: "air_conditioning", icon: "Wind" },
  { name: "Ceiling Fan", slug: "ceiling_fan", icon: "Fan" },
  { name: "Blackout Curtains", slug: "blackout_curtains", icon: "MoonStar" },

  // --- Kitchen ---
  { name: "Kitchen", slug: "kitchen", icon: "UtensilsCrossed" },
  { name: "Dishwasher", slug: "dishwasher", icon: "Washer" },
  { name: "Oven", slug: "oven", icon: "CookingPot" },
  { name: "Microwave", slug: "microwave", icon: "Microwave" },
  { name: "Coffee Machine", slug: "coffee_machine", icon: "Coffee" },
  { name: "Kettle", slug: "kettle", icon: "CupSoda" },
  { name: "Toaster", slug: "toaster", icon: "Sandwich" },
  { name: "Fridge / Freezer", slug: "fridge_freezer", icon: "Fridge" },
  { name: "Cooking Basics", slug: "cooking_basics", icon: "SaltPepper" },
  { name: "Pots & Pans", slug: "pots_pans", icon: "CookingPot" },
  { name: "Dishes & Cutlery", slug: "dishes_cutlery", icon: "Utensils" },

  // --- Laundry ---
  { name: "Washing Machine", slug: "washing_machine", icon: "Washer" },
  { name: "Dryer", slug: "dryer", icon: "Dryer" },
  { name: "Iron", slug: "iron", icon: "Iron" },
  { name: "Ironing Board", slug: "ironing_board", icon: "RectangleHorizontal" },
  { name: "Clothes Drying Rack", slug: "drying_rack", icon: "Hanger" },

  // --- Bathroom ---
  { name: "Hair Dryer", slug: "hair_dryer", icon: "Wind" },
  { name: "Shampoo & Conditioner", slug: "shampoo_conditioner", icon: "Droplets" },
  { name: "Body Wash", slug: "body_wash", icon: "Droplet" },
  { name: "Bath", slug: "bath", icon: "Bath" },
  { name: "Walk‑In Shower", slug: "walk_in_shower", icon: "ShowerHead" },
  { name: "Towels Provided", slug: "towels_provided", icon: "Towel" },

  // --- Property Features ---
  { name: "Balcony", slug: "balcony", icon: "Building" },
  { name: "Patio / Terrace", slug: "patio_terrace", icon: "Trees" },
  { name: "BBQ Grill", slug: "bbq_grill", icon: "Flame" },
  { name: "Outdoor Dining Area", slug: "outdoor_dining", icon: "Table" },
  { name: "Outdoor Furniture", slug: "outdoor_furniture", icon: "Armchair" },
  { name: "Fire Pit", slug: "fire_pit", icon: "Flame" },
  { name: "Private Entrance", slug: "private_entrance", icon: "Door" },
  { name: "Workspace / Desk", slug: "workspace", icon: "Laptop" },
  { name: "Smart TV", slug: "smart_tv", icon: "Monitor" },
  { name: "Streaming Services", slug: "streaming_services", icon: "Play" },
  { name: "Board Games", slug: "board_games", icon: "Puzzle" },
  { name: "Books", slug: "books", icon: "Book" },
  { name: "High Chair", slug: "high_chair", icon: "Baby" },
  { name: "Travel Cot / Crib", slug: "travel_cot", icon: "Baby" },

  // --- Pet Amenities ---
  { name: "Pet Friendly", slug: "pet_friendly", icon: "PawPrint" },
  { name: "Enclosed Garden", slug: "enclosed_garden", icon: "Fence" },
  { name: "Pet Bowls", slug: "pet_bowls", icon: "Bowl" },
  { name: "Pet Bed", slug: "pet_bed", icon: "Bed" },

  // --- Parking & Transport ---
  { name: "Free On‑Site Parking", slug: "free_parking_onsite", icon: "ParkingSquare" },
  { name: "Paid On‑Site Parking", slug: "paid_parking_onsite", icon: "ParkingMeter" },
  { name: "Free Street Parking", slug: "free_street_parking", icon: "Car" },
  { name: "EV Charger", slug: "ev_charger", icon: "Plug" },

  // --- Wellness & Luxury ---
  { name: "Hot Tub", slug: "hot_tub", icon: "Waves" },
  { name: "Pool", slug: "pool", icon: "Waves" },
  { name: "Sauna", slug: "sauna", icon: "Flame" },
  { name: "Gym / Fitness Equipment", slug: "gym", icon: "Dumbbell" },
  { name: "Outdoor Shower", slug: "outdoor_shower", icon: "ShowerHead" },

  // --- Safety ---
  { name: "Smoke Alarm", slug: "smoke_alarm", icon: "AlarmSmoke" },
  { name: "CO Alarm", slug: "co_alarm", icon: "Alarm" },
  { name: "Fire Extinguisher", slug: "fire_extinguisher", icon: "FireExtinguisher" },
  { name: "First Aid Kit", slug: "first_aid_kit", icon: "FirstAid" },
  { name: "Security Cameras (Disclosed)", slug: "security_cameras", icon: "Camera" },
  { name: "Safe / Lockbox", slug: "safe_lockbox", icon: "Lock" },

  // --- Cleaning & Supplies ---
  { name: "Cleaning Products", slug: "cleaning_products", icon: "SprayBottle" },
  { name: "Vacuum Cleaner", slug: "vacuum_cleaner", icon: "Vacuum" },
  { name: "Mop & Bucket", slug: "mop_bucket", icon: "Bucket" },
  { name: "Washing Up Liquid", slug: "washing_up_liquid", icon: "Droplet" },
  { name: "Laundry Detergent", slug: "laundry_detergent", icon: "Soap" },

  // --- Location / Views ---
  { name: "Beach Access", slug: "beach_access", icon: "Waves" },
  { name: "Waterfront", slug: "waterfront", icon: "Waves" },
  { name: "Mountain View", slug: "mountain_view", icon: "Mountain" },
  { name: "Countryside View", slug: "countryside_view", icon: "Trees" },
  { name: "City Skyline View", slug: "city_skyline_view", icon: "Building" },
  { name: "Marina View", slug: "marina_view", icon: "Anchor" }
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