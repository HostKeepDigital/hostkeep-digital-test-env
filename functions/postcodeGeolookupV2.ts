import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Comprehensive UK postcode lookup service
 * 
 * Flow:
 * 1. Normalize and validate postcode
 * 2. Lookup in structured uk_postcodes table (primary source)
 * 3. Extract town, county, coordinates from table
 * 4. Only fallback to external geocoding if NOT found
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { postcode } = await req.json();

    if (!postcode || typeof postcode !== 'string') {
      return Response.json({ error: 'Invalid postcode' }, { status: 400 });
    }

    // Step 1: Normalize
    const normalized = normalizePostcode(postcode);
    if (!normalized) {
      return Response.json({
        error: 'Invalid UK postcode format',
        postcode,
        example: 'SW1A 1AA or PL13 2JE'
      }, { status: 400 });
    }

    const district = extractPostcodeDistrict(normalized);
    const area = extractPostcodeArea(normalized);

    // Step 2: Lookup in structured postcode table
    const existing = await base44.entities.UKPostcode.filter({
      postcode: normalized
    }, '-created_date', 1);

    if (existing && existing.length > 0) {
      const data = existing[0];
      return Response.json({
        success: true,
        source: 'structured_database',
        postcode: normalized,
        postcode_district: district,
        postcode_area: area,
        geolocation: {
          lat: data.latitude,
          lng: data.longitude,
          post_town: data.post_town,
          county: data.county,
          country: data.country,
          accuracy: 'postcode'
        },
        metadata: {
          found_in_database: true,
          accuracy_level: 'postcode'
        }
      });
    }

    // Step 3: Fallback to external geocoding (only if not in database)
    // Using approximate area centroid for now (future: integrate real geocoding API)
    const approximateCoords = getAreaCentroid(area);
    
    if (!approximateCoords) {
      return Response.json({
        error: 'Postcode area not found',
        postcode: normalized,
        postcode_area: area,
        hint: 'Please verify postcode and try again'
      }, { status: 404 });
    }

    // Optionally store in database for future reference
    try {
      await base44.entities.UKPostcode.create({
        postcode: normalized,
        postcode_district: district,
        postcode_area: area,
        post_town: approximateCoords.area,
        county: approximateCoords.area,
        country: 'England',
        latitude: approximateCoords.lat,
        longitude: approximateCoords.lng,
        accuracy: 'area',
        source: 'external_geocoder'
      });
    } catch (e) {
      // Log but don't fail - postcode might already exist
      console.log(`Info: Could not store postcode ${normalized}:`, e.message);
    }

    return Response.json({
      success: true,
      source: 'area_centroid',
      postcode: normalized,
      postcode_district: district,
      postcode_area: area,
      geolocation: {
        lat: approximateCoords.lat,
        lng: approximateCoords.lng,
        post_town: approximateCoords.area,
        county: approximateCoords.area,
        country: 'England',
        accuracy: 'area'
      },
      metadata: {
        found_in_database: false,
        accuracy_level: 'area',
        warning: 'Using area centroid - exact coordinates not in database'
      }
    });

  } catch (error) {
    return Response.json({
      error: 'Service error',
      details: error.message
    }, { status: 500 });
  }
});

// Utility functions

function normalizePostcode(postcode) {
  if (!postcode || typeof postcode !== 'string') return null;
  
  let normalized = postcode.trim().toUpperCase();
  normalized = normalized.replace(/\s/g, '');
  
  if (normalized.length === 6 || normalized.length === 7) {
    normalized = normalized.slice(0, -3) + ' ' + normalized.slice(-3);
  }
  
  const pattern = /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/;
  return pattern.test(normalized) ? normalized : null;
}

function extractPostcodeArea(postcode) {
  const match = postcode.match(/^[A-Z]+/);
  return match ? match[0] : null;
}

function extractPostcodeDistrict(postcode) {
  return postcode.split(' ')[0];
}

function getAreaCentroid(area) {
  const AREA_CENTROIDS = {
    'AB': { lat: 57.1497, lng: -2.0943, area: 'Aberdeen' },
    'AL': { lat: 51.7644, lng: -0.3433, area: 'Hatfield' },
    'B': { lat: 52.5086, lng: -1.8853, area: 'Birmingham' },
    'BA': { lat: 51.3809, lng: -2.3637, area: 'Bath' },
    'BB': { lat: 53.7494, lng: -2.2297, area: 'Blackburn' },
    'BD': { lat: 53.7938, lng: -1.7633, area: 'Bradford' },
    'BL': { lat: 53.5828, lng: -2.4147, area: 'Bolton' },
    'BN': { lat: 50.8626, lng: -0.0833, area: 'Brighton' },
    'BR': { lat: 51.4099, lng: 0.0186, area: 'Bromley' },
    'BS': { lat: 51.4545, lng: -2.5879, area: 'Bristol' },
    'BT': { lat: 54.5973, lng: -5.9301, area: 'Belfast' },
    'CA': { lat: 54.8973, lng: -3.2003, area: 'Carlisle' },
    'CB': { lat: 52.2053, lng: 0.1218, area: 'Cambridge' },
    'CF': { lat: 51.4817, lng: -3.1719, area: 'Cardiff' },
    'CH': { lat: 53.1939, lng: -2.9328, area: 'Chester' },
    'CM': { lat: 51.7325, lng: 0.4097, area: 'Chelmsford' },
    'CO': { lat: 51.8906, lng: 0.9378, area: 'Colchester' },
    'CR': { lat: 51.3767, lng: -0.1131, area: 'Croydon' },
    'CT': { lat: 51.3525, lng: 1.3946, area: 'Canterbury' },
    'CW': { lat: 53.0837, lng: -2.5197, area: 'Crewe' },
    'DA': { lat: 51.4500, lng: 0.2188, area: 'Dartford' },
    'DD': { lat: 56.4617, lng: -2.9699, area: 'Dundee' },
    'DE': { lat: 52.9229, lng: -1.4766, area: 'Derby' },
    'DG': { lat: 55.1906, lng: -3.6133, area: 'Dumfries' },
    'DH': { lat: 54.7469, lng: -1.5469, area: 'Sunderland' },
    'DL': { lat: 54.4786, lng: -1.9503, area: 'Darlington' },
    'DN': { lat: 53.6050, lng: -0.8062, area: 'Doncaster' },
    'DY': { lat: 52.5181, lng: -2.1299, area: 'Dudley' },
    'E': { lat: 51.5248, lng: -0.0332, area: 'East London' },
    'E1': { lat: 51.5176, lng: -0.0747, area: 'Tower Hamlets' },
    'EC': { lat: 51.5176, lng: -0.0995, area: 'East Central London' },
    'EH': { lat: 55.9533, lng: -3.1883, area: 'Edinburgh' },
    'EN': { lat: 51.6531, lng: -0.0181, area: 'Enfield' },
    'EX': { lat: 50.7184, lng: -3.5339, area: 'Exeter' },
    'FK': { lat: 56.1165, lng: -3.7191, area: 'Falkirk' },
    'FY': { lat: 53.8143, lng: -3.0372, area: 'Fylde' },
    'G': { lat: 55.8642, lng: -4.2518, area: 'Glasgow' },
    'GL': { lat: 51.8642, lng: -2.2426, area: 'Gloucester' },
    'GU': { lat: 51.2359, lng: -0.5733, area: 'Guildford' },
    'HA': { lat: 51.5936, lng: -0.3550, area: 'Harrow' },
    'HD': { lat: 53.6434, lng: -1.7855, area: 'Huddersfield' },
    'HE': { lat: 52.0629, lng: -2.7164, area: 'Hereford' },
    'HG': { lat: 54.0272, lng: -1.5428, area: 'Harrogate' },
    'HP': { lat: 51.7614, lng: -0.4683, area: 'High Wycombe' },
    'HR': { lat: 52.0629, lng: -2.7164, area: 'Hereford' },
    'HU': { lat: 53.7436, lng: -0.3373, area: 'Hull' },
    'HX': { lat: 53.7109, lng: -1.9877, area: 'Halifax' },
    'IG': { lat: 51.6131, lng: 0.0895, area: 'Ilford' },
    'IP': { lat: 52.0574, lng: 1.1447, area: 'Ipswich' },
    'IV': { lat: 57.5045, lng: -4.2229, area: 'Inverness' },
    'JE': { lat: 49.1900, lng: -2.1192, area: 'Jersey' },
    'KA': { lat: 55.4501, lng: -4.6309, area: 'Kilmarnock' },
    'KT': { lat: 51.3767, lng: -0.3017, area: 'Kingston' },
    'KW': { lat: 58.4595, lng: -3.1871, area: 'Kirkwall' },
    'KY': { lat: 56.0723, lng: -2.8044, area: 'Kirkcaldy' },
    'L': { lat: 53.4084, lng: -2.9916, area: 'Liverpool' },
    'LA': { lat: 54.7235, lng: -2.9338, area: 'Lancaster' },
    'LE': { lat: 52.6369, lng: -1.1398, area: 'Leicester' },
    'LN': { lat: 53.2281, lng: -0.5375, area: 'Lincoln' },
    'LS': { lat: 53.8008, lng: -1.5491, area: 'Leeds' },
    'LU': { lat: 51.8784, lng: -0.4224, area: 'Luton' },
    'M': { lat: 53.4839, lng: -2.2426, area: 'Manchester' },
    'ME': { lat: 51.3998, lng: 0.6183, area: 'Medway' },
    'MK': { lat: 52.0312, lng: -0.7588, area: 'Milton Keynes' },
    'ML': { lat: 55.6839, lng: -3.7959, area: 'Motherwell' },
    'N': { lat: 51.5614, lng: -0.1446, area: 'North London' },
    'NE': { lat: 54.9783, lng: -1.6178, area: 'Newcastle' },
    'NG': { lat: 52.9548, lng: -1.1581, area: 'Nottingham' },
    'NN': { lat: 52.2324, lng: -0.8783, area: 'Northampton' },
    'NP': { lat: 51.7443, lng: -2.9899, area: 'Newport' },
    'NR': { lat: 52.6281, lng: 1.2974, area: 'Norwich' },
    'NW': { lat: 51.5428, lng: -0.1933, area: 'North West London' },
    'OL': { lat: 53.1040, lng: -2.1128, area: 'Oldham' },
    'OX': { lat: 51.7520, lng: -1.2577, area: 'Oxford' },
    'PA': { lat: 55.9257, lng: -4.7289, area: 'Paisley' },
    'PE': { lat: 52.5747, lng: -0.2391, area: 'Peterborough' },
    'PH': { lat: 56.7961, lng: -3.3964, area: 'Perth' },
    'PL': { lat: 50.3735, lng: -4.1427, area: 'Plymouth' },
    'PR': { lat: 53.7397, lng: -2.6945, area: 'Preston' },
    'RG': { lat: 51.4542, lng: -0.9738, area: 'Basingstoke' },
    'RH': { lat: 51.2394, lng: -0.2998, area: 'Redhill' },
    'RM': { lat: 51.5722, lng: 0.1889, area: 'Romford' },
    'S': { lat: 53.3811, lng: -1.4701, area: 'Sheffield' },
    'SA': { lat: 51.6417, lng: -3.9437, area: 'Swansea' },
    'SE': { lat: 51.4892, lng: -0.0801, area: 'South East London' },
    'SG': { lat: 51.8959, lng: -0.1819, area: 'Stevenage' },
    'SK': { lat: 53.3927, lng: -1.9385, area: 'Stockport' },
    'SM': { lat: 51.3900, lng: -0.2881, area: 'Sutton' },
    'SN': { lat: 51.5641, lng: -1.7717, area: 'Swindon' },
    'SO': { lat: 50.9060, lng: -1.4045, area: 'Southampton' },
    'SP': { lat: 51.0637, lng: -1.9745, area: 'Salisbury' },
    'SR': { lat: 54.9049, lng: -1.3836, area: 'Sunderland' },
    'SS': { lat: 51.6429, lng: 0.7181, area: 'Southend' },
    'ST': { lat: 52.8050, lng: -2.1144, area: 'Stoke' },
    'SW': { lat: 51.4769, lng: -0.1965, area: 'South West London' },
    'SY': { lat: 52.3092, lng: -3.0834, area: 'Shrewsbury' },
    'TA': { lat: 51.1242, lng: -3.0967, area: 'Taunton' },
    'TD': { lat: 55.4763, lng: -2.4309, area: 'Galashiels' },
    'TF': { lat: 52.6073, lng: -2.4464, area: 'Telford' },
    'TN': { lat: 51.1758, lng: 0.2793, area: 'Tunbridge' },
    'TQ': { lat: 50.5363, lng: -3.5897, area: 'Torquay' },
    'TR': { lat: 50.0993, lng: -5.0735, area: 'Truro' },
    'TS': { lat: 54.5160, lng: -1.4359, area: 'Stockton' },
    'TW': { lat: 51.4545, lng: -0.3361, area: 'Twickenham' },
    'UB': { lat: 51.5020, lng: -0.3681, area: 'Uxbridge' },
    'W': { lat: 51.5148, lng: -0.2017, area: 'West London' },
    'WA': { lat: 53.3823, lng: -2.6171, area: 'Warrington' },
    'WC': { lat: 51.5145, lng: -0.1203, area: 'West Central London' },
    'WD': { lat: 51.6531, lng: -0.2056, area: 'Watford' },
    'WF': { lat: 53.6434, lng: -1.6053, area: 'Wakefield' },
    'WN': { lat: 53.5470, lng: -2.6456, area: 'Wigan' },
    'WR': { lat: 52.1908, lng: -2.2171, area: 'Worcester' },
    'WS': { lat: 52.5848, lng: -1.9811, area: 'Walsall' },
    'WV': { lat: 52.5900, lng: -2.1298, area: 'Wolverhampton' },
    'YO': { lat: 54.0048, lng: -0.9822, area: 'York' },
    'ZE': { lat: 60.5044, lng: -1.1429, area: 'Shetland' },
  };

  return AREA_CENTROIDS[area] || null;
}