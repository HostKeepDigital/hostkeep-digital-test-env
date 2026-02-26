import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const UK_COUNTIES_WITH_COORDS = {
  England: [
    { name: 'Bedfordshire', lat: 52.0, lng: -0.45 },
    { name: 'Berkshire', lat: 51.4, lng: -1.0 },
    { name: 'Bristol', lat: 51.45, lng: -2.6 },
    { name: 'Buckinghamshire', lat: 51.75, lng: -0.75 },
    { name: 'Cambridgeshire', lat: 52.3, lng: 0.1 },
    { name: 'Cheshire', lat: 53.1, lng: -2.5 },
    { name: 'Cornwall', lat: 50.4, lng: -4.8 },
    { name: 'Cumbria', lat: 54.5, lng: -3.2 },
    { name: 'Derbyshire', lat: 53.0, lng: -1.5 },
    { name: 'Devon', lat: 50.7, lng: -3.5 },
    { name: 'Dorset', lat: 50.75, lng: -2.4 },
    { name: 'Durham', lat: 54.55, lng: -1.9 },
    { name: 'East Sussex', lat: 51.0, lng: 0.15 },
    { name: 'Essex', lat: 51.8, lng: 0.6 },
    { name: 'Gloucestershire', lat: 51.85, lng: -2.2 },
    { name: 'Greater London', lat: 51.5, lng: -0.1 },
    { name: 'Greater Manchester', lat: 53.5, lng: -2.2 },
    { name: 'Hampshire', lat: 51.3, lng: -1.5 },
    { name: 'Herefordshire', lat: 52.05, lng: -2.7 },
    { name: 'Hertfordshire', lat: 51.8, lng: -0.2 },
    { name: 'Isle of Wight', lat: 50.65, lng: -1.3 },
    { name: 'Kent', lat: 51.1, lng: 0.85 },
    { name: 'Lancashire', lat: 53.8, lng: -2.4 },
    { name: 'Leicestershire', lat: 52.6, lng: -1.1 },
    { name: 'Lincolnshire', lat: 53.2, lng: 0.5 },
    { name: 'Merseyside', lat: 53.4, lng: -3.0 },
    { name: 'Norfolk', lat: 52.63, lng: 1.3 },
    { name: 'North Yorkshire', lat: 54.3, lng: -1.8 },
    { name: 'Northamptonshire', lat: 52.3, lng: -0.85 },
    { name: 'Northumberland', lat: 55.2, lng: -2.1 },
    { name: 'Nottinghamshire', lat: 53.2, lng: -1.0 },
    { name: 'Oxfordshire', lat: 51.75, lng: -1.3 },
    { name: 'Rutland', lat: 52.6, lng: -0.7 },
    { name: 'Shropshire', lat: 52.55, lng: -2.7 },
    { name: 'Somerset', lat: 51.15, lng: -2.8 },
    { name: 'South Yorkshire', lat: 53.4, lng: -1.5 },
    { name: 'Staffordshire', lat: 52.8, lng: -2.0 },
    { name: 'Suffolk', lat: 52.2, lng: 1.3 },
    { name: 'Surrey', lat: 51.25, lng: -0.3 },
    { name: 'Tyne and Wear', lat: 54.9, lng: -1.6 },
    { name: 'Warwickshire', lat: 52.3, lng: -1.6 },
    { name: 'West Midlands', lat: 52.5, lng: -2.0 },
    { name: 'West Sussex', lat: 50.85, lng: -0.5 },
    { name: 'West Yorkshire', lat: 53.8, lng: -1.7 },
    { name: 'Wiltshire', lat: 51.35, lng: -2.0 },
    { name: 'Worcestershire', lat: 52.3, lng: -2.2 }
  ],
  Scotland: [
    { name: 'Aberdeen City', lat: 57.15, lng: -2.1 },
    { name: 'Aberdeenshire', lat: 57.3, lng: -2.8 },
    { name: 'Angus', lat: 56.6, lng: -2.65 },
    { name: 'Argyll and Bute', lat: 56.2, lng: -4.9 },
    { name: 'Clackmannanshire', lat: 56.1, lng: -3.8 },
    { name: 'Dumfries and Galloway', lat: 55.1, lng: -3.6 },
    { name: 'Dundee City', lat: 56.46, lng: -2.97 },
    { name: 'East Ayrshire', lat: 55.4, lng: -3.8 },
    { name: 'East Dunbartonshire', lat: 55.95, lng: -4.2 },
    { name: 'East Lothian', lat: 55.95, lng: -2.7 },
    { name: 'East Renfrewshire', lat: 55.7, lng: -4.5 },
    { name: 'Edinburgh', lat: 55.95, lng: -3.2 },
    { name: 'Falkirk', lat: 56.0, lng: -3.75 },
    { name: 'Fife', lat: 56.2, lng: -3.2 },
    { name: 'Glasgow City', lat: 55.87, lng: -4.26 },
    { name: 'Highland', lat: 57.5, lng: -4.2 },
    { name: 'Inverclyde', lat: 55.7, lng: -4.7 },
    { name: 'Midlothian', lat: 55.85, lng: -3.1 },
    { name: 'Moray', lat: 57.55, lng: -3.3 },
    { name: 'Na h-Eileanan Siar', lat: 57.9, lng: -6.9 },
    { name: 'North Ayrshire', lat: 55.65, lng: -4.8 },
    { name: 'North Lanarkshire', lat: 55.8, lng: -3.85 },
    { name: 'Orkney Islands', lat: 59.0, lng: -3.0 },
    { name: 'Perth and Kinross', lat: 56.7, lng: -3.5 },
    { name: 'Renfrewshire', lat: 55.85, lng: -4.5 },
    { name: 'Scottish Borders', lat: 55.6, lng: -2.8 },
    { name: 'Shetland Islands', lat: 60.5, lng: -1.3 },
    { name: 'South Ayrshire', lat: 55.4, lng: -4.6 },
    { name: 'South Lanarkshire', lat: 55.5, lng: -3.8 },
    { name: 'Stirling', lat: 56.1, lng: -3.9 },
    { name: 'West Dunbartonshire', lat: 56.0, lng: -4.6 },
    { name: 'West Lothian', lat: 55.9, lng: -3.5 }
  ],
  Wales: [
    { name: 'Blaenau Gwent', lat: 51.78, lng: -3.22 },
    { name: 'Bridgend', lat: 51.5, lng: -3.6 },
    { name: 'Caerphilly', lat: 51.67, lng: -3.2 },
    { name: 'Cardiff', lat: 51.48, lng: -3.18 },
    { name: 'Carmarthenshire', lat: 51.9, lng: -3.8 },
    { name: 'Ceredigion', lat: 52.3, lng: -3.8 },
    { name: 'Conwy', lat: 53.3, lng: -3.8 },
    { name: 'Denbighshire', lat: 53.1, lng: -3.5 },
    { name: 'Flintshire', lat: 53.2, lng: -3.3 },
    { name: 'Gwynedd', lat: 52.8, lng: -4.2 },
    { name: 'Isle of Anglesey', lat: 53.4, lng: -4.3 },
    { name: 'Merthyr Tydfil', lat: 51.74, lng: -3.38 },
    { name: 'Monmouthshire', lat: 51.8, lng: -2.8 },
    { name: 'Neath Port Talbot', lat: 51.64, lng: -3.8 },
    { name: 'Newport', lat: 51.59, lng: -3.0 },
    { name: 'Pembrokeshire', lat: 51.7, lng: -5.3 },
    { name: 'Powys', lat: 52.4, lng: -3.3 },
    { name: 'Rhondda Cynon Taf', lat: 51.62, lng: -3.45 },
    { name: 'Swansea', lat: 51.62, lng: -3.94 },
    { name: 'Torfaen', lat: 51.75, lng: -3.0 },
    { name: 'Vale of Glamorgan', lat: 51.43, lng: -3.33 },
    { name: 'Wrexham', lat: 53.04, lng: -3.0 }
  ],
  'Northern Ireland': [
    { name: 'Antrim', lat: 54.72, lng: -6.2 },
    { name: 'Armagh', lat: 54.35, lng: -6.65 },
    { name: 'Down', lat: 54.35, lng: -5.7 },
    { name: 'Fermanagh', lat: 54.4, lng: -7.8 },
    { name: 'Londonderry', lat: 55.0, lng: -7.3 },
    { name: 'Tyrone', lat: 54.5, lng: -7.2 }
  ]
};

const slugify = (str) => str.toLowerCase().replace(/\s+/g, '-');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const locationsToCreate = [];

    for (const [country, counties] of Object.entries(UK_COUNTIES_WITH_COORDS)) {
      for (const { name, lat, lng } of counties) {
        locationsToCreate.push({
          name,
          type: 'county',
          country,
          normalized_name: name.toLowerCase(),
          slug: slugify(name),
          lat,
          lng
        });
      }
    }

    const created = await base44.entities.UKLocation.bulkCreate(locationsToCreate);

    return Response.json({
      success: true,
      message: `Seeded ${created.length} UK locations with coordinates`,
      count: created.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});