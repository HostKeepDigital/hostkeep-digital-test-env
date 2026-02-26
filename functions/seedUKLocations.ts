import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const UK_COUNTIES = {
  England: [
    'Bedfordshire', 'Berkshire', 'Bristol', 'Buckinghamshire', 'Cambridgeshire',
    'Cheshire', 'Cornwall', 'Cumbria', 'Derbyshire', 'Devon', 'Dorset', 'Durham',
    'East Sussex', 'Essex', 'Gloucestershire', 'Greater London', 'Greater Manchester',
    'Hampshire', 'Herefordshire', 'Hertfordshire', 'Isle of Wight', 'Kent', 'Lancashire',
    'Leicestershire', 'Lincolnshire', 'Merseyside', 'Norfolk', 'North Yorkshire',
    'Northamptonshire', 'Northumberland', 'Nottinghamshire', 'Oxfordshire', 'Rutland',
    'Shropshire', 'Somerset', 'South Yorkshire', 'Staffordshire', 'Suffolk', 'Surrey',
    'Tyne and Wear', 'Warwickshire', 'West Midlands', 'West Sussex', 'West Yorkshire',
    'Wiltshire', 'Worcestershire'
  ],
  Scotland: [
    'Aberdeen City', 'Aberdeenshire', 'Angus', 'Argyll and Bute', 'Clackmannanshire',
    'Dumfries and Galloway', 'Dundee City', 'East Ayrshire', 'East Dunbartonshire',
    'East Lothian', 'East Renfrewshire', 'Edinburgh', 'Falkirk', 'Fife', 'Glasgow City',
    'Highland', 'Inverclyde', 'Midlothian', 'Moray', 'Na h-Eileanan Siar', 'North Ayrshire',
    'North Lanarkshire', 'Orkney Islands', 'Perth and Kinross', 'Renfrewshire',
    'Scottish Borders', 'Shetland Islands', 'South Ayrshire', 'South Lanarkshire',
    'Stirling', 'West Dunbartonshire', 'West Lothian'
  ],
  Wales: [
    'Blaenau Gwent', 'Bridgend', 'Caerphilly', 'Cardiff', 'Carmarthenshire', 'Ceredigion',
    'Conwy', 'Denbighshire', 'Flintshire', 'Gwynedd', 'Isle of Anglesey', 'Merthyr Tydfil',
    'Monmouthshire', 'Neath Port Talbot', 'Newport', 'Pembrokeshire', 'Powys',
    'Rhondda Cynon Taf', 'Swansea', 'Torfaen', 'Vale of Glamorgan', 'Wrexham'
  ],
  'Northern Ireland': [
    'Antrim', 'Armagh', 'Down', 'Fermanagh', 'Londonderry', 'Tyrone'
  ]
};

const slugify = (str) => str.toLowerCase().replace(/\s+/g, '-');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Check if user is admin
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const locationsToCreate = [];

    for (const [country, counties] of Object.entries(UK_COUNTIES)) {
      for (const county of counties) {
        locationsToCreate.push({
          name: county,
          type: 'county',
          country,
          normalized_name: county.toLowerCase(),
          slug: slugify(county)
        });
      }
    }

    // Bulk create locations
    const created = await base44.entities.UKLocation.bulkCreate(locationsToCreate);

    return Response.json({
      success: true,
      message: `Seeded ${created.length} UK locations`,
      count: created.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});