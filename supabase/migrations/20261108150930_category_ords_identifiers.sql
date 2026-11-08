-- APPLIED to production on 2026-11-08 as version 20261108150930
-- ORDS product category identifiers (#323).
-- Source: Open Repair Data Standard v0.3, sections 3.3.2.1.1 and 3.4.2:
-- https://standard.openrepair.org/standard.html#product-category-values
--
-- Classify all 140 categories, regardless of visibility or part count:
-- 101 receive an ORDS ID and 39 explicitly stay NULL with reasons below.
-- Use specific product classes where possible, aggregate classes for electrical
-- products without a dedicated match, and Misc (18) for broad electrical-only
-- groups spanning incompatible ORDS classes (e.g. generic cameras: 5 or 6).
-- Mixed electrical/non-electrical groups and unspecified products stay NULL;
-- children are classified individually, never by inheriting a parent's ID.
-- Kettles map to the closest class (14), including local stovetop variants.
-- Lawnmowers and fitness machines use Large home electrical (17), as in ORDS.
-- Lighting under Furniture remains in scope. Powered model/RC/slot vehicles
-- are toys (32); bikes and road vehicles remain outside the issue's scope.
-- Every mapping, including each NULL, is documented inline.
--
-- Existing category SELECT policies and grants cover the new column.
-- Future data exports include the nullable ID alongside the local name/slug.
-- The guard aborts if the mapping no longer covers the complete taxonomy.

alter table public.categories add column ords_category_id integer;

comment on column public.categories.ords_category_id is
  'ORDS v0.3 product_category_id for data interoperability; NULL when out of scope or not mapped. Include alongside the local category in future data exports.';

do $mapping$
declare
  expected_category_count constant integer := 140;
  updated_category_count integer;
begin
  with mapping(slug, ords_category_id) as (values
    ('appliances', 18), -- Misc: broad electrical-appliance group spans several ORDS categories
    ('carpet-upholstery-cleaner', 34), -- Vacuum: suction/extraction cleaners
    ('dishwasher', 17), -- Large home electrical
    ('dryer', 17), -- Large home electrical
    ('fan-air-treatment', 18), -- Misc: combines Fan (7) and Aircon/dehumidifier (1)
    ('floor-scrubber-sweeper', 28), -- Small home electrical: powered floor cleaning
    ('hard-floor-cleaner', 28), -- Small home electrical: powered floor cleaning
    ('iron-garment-care', 40), -- Iron: garment-care appliances
    ('oven', 17), -- Large home electrical
    ('refrigerator', 17), -- Large home electrical
    ('sewing-machine', 27), -- Sewing machine
    ('small-kitchen-appliance', 29), -- Small kitchen item
    ('air-fryer', 29), -- Small kitchen item
    ('blender', 37), -- Food processor
    ('coffee-maker', 36), -- Coffee maker
    ('cooker', 29), -- Small kitchen item: countertop cooker
    ('rice-cooker', 29), -- Small kitchen item
    ('food-processor', 37), -- Food processor
    ('juicer', 37), -- Food processor
    ('kettle', 14), -- Kettle: closest product class, including the local stovetop variants
    ('microwave-oven', 29), -- Small kitchen item: countertop oven
    ('stand-mixer', 37), -- Food processor
    ('toaster', 31), -- Toaster
    ('steam-cleaner', 28), -- Small home electrical
    ('vacuum-cleaner', 34), -- Vacuum
    ('canister-vacuum', 34), -- Vacuum
    ('cordless-stick-vacuum', 34), -- Vacuum
    ('robot-vacuum', 34), -- Vacuum
    ('upright-vacuum', 34), -- Vacuum
    ('wet-dry-vacuum', 34), -- Vacuum
    ('window-vacuum', 34), -- Vacuum
    ('washing-machine', 17), -- Large home electrical
    ('bikes-mobility', null::integer), -- Outside scope: bikes and mobility
    ('bicycle', null::integer), -- Outside scope: bikes
    ('bike-components', null::integer), -- Outside scope: bikes
    ('e-bike', null::integer), -- Outside scope: bikes, including electric bikes
    ('e-scooter', null::integer), -- Outside scope: mobility
    ('cars-and-trucks', null::integer), -- Outside scope: automotive
    ('car', null::integer), -- Outside scope: automotive
    ('motorcycle-scooter', null::integer), -- Outside scope: automotive
    ('furniture', null::integer), -- Mixed electrical lighting and non-electrical furniture; classify children explicitly
    ('bed-mattress', null::integer), -- Outside scope: non-electrical furniture
    ('chair-seating', null::integer), -- Outside scope: non-electrical furniture
    ('lighting', 15), -- Lamp: household lighting
    ('ceiling-pendant-light', 15), -- Lamp: household lighting, not decorative/safety lights (3)
    ('desk-work-lamp', 15), -- Lamp
    ('floor-lamp', 15), -- Lamp
    ('smart-lighting', 15), -- Lamp: connected household lighting
    ('storage-unit', null::integer), -- Outside scope: non-electrical furniture
    ('table-desk', null::integer), -- Outside scope: non-electrical furniture
    ('gadgets-and-electronics', 18), -- Misc: broad electronic-device group
    ('audio-and-hi-fi', 18), -- Misc: combines headphones, integrated/separate hi-fi and portable audio
    ('headphones-and-earphones', 11), -- Headphones
    ('home-hi-fi', 12), -- Hi-Fi integrated: home stereo; Speaker is mapped separately
    ('microphone', 13), -- Hi-Fi separates: standalone audio equipment
    ('portable-audio', 10), -- Handheld entertainment device: portable audio players
    ('speaker', 13), -- Hi-Fi separates
    ('cameras-and-imaging', 18), -- Misc: combines compact/DSLR/video cameras and drones
    ('action-camera-drone', 18), -- Misc: combines video cameras (6) and powered flying devices
    ('camera', 18), -- Misc: generic camera class does not distinguish compact (5) from DSLR/video (6)
    ('computers-and-peripherals', 18), -- Misc: combines computers and accessories
    ('desktop-components', 18), -- Misc: combines desktop systems (4) and components/accessories (22)
    ('desktop-computer', 4), -- Desktop computer
    ('keyboard-and-mouse', 22), -- PC accessory
    ('laptop', 16), -- Laptop
    ('storage-drive', 22), -- PC accessory
    ('gaming', 18), -- Misc: combines home/handheld consoles and accessories
    ('game-controller', 33), -- TV and gaming-related accessories
    ('handheld-console', 10), -- Handheld entertainment device
    ('home-console', 38), -- Games console
    ('networking', 18), -- Misc: routers and networking equipment have no dedicated ORDS class
    ('personal-care-and-grooming', 9), -- Hair & beauty item: broad personal-care class
    ('electric-toothbrush', 9), -- Hair & beauty item
    ('hair-clipper', 9), -- Hair & beauty item
    ('hair-dryer-and-styler', 39), -- Hair dryer: warm-air drying and styling appliances
    ('shaver-and-trimmer', 9), -- Hair & beauty item
    ('power-charging', 2), -- Battery/charger/adapter
    ('printers-scanners', 25), -- Printer/scanner
    ('smart-home-and-iot', 28), -- Small home electrical: home sensors, doorbells and controls
    ('smartphones-and-tablets', 18), -- Misc: combines Mobile (19) and Tablet (30)
    ('smartphone', 19), -- Mobile
    ('tablet', 30), -- Tablet
    ('tv-display', 18), -- Misc: combines flat screens (8) and projectors (26)
    ('monitor', 8), -- Flat screen
    ('projector', 26), -- Projector
    ('television', 8), -- Flat screen
    ('wearables', 35), -- Watch/clock: electronic watches and fitness monitors
    ('other-category', null::integer), -- Unspecified product type: cannot establish electrical scope
    ('sports-outdoor', null::integer), -- Mixed predominantly non-electrical sports/outdoor equipment
    ('camping-hiking', null::integer), -- Outside scope: general non-electrical outdoor equipment
    ('climbing-mountaineering', null::integer), -- Outside scope: non-electrical sports equipment
    ('fishing', null::integer), -- Outside scope: general non-electrical sports equipment
    ('fitness-equipment', 17), -- Large home electrical: closest class explicitly includes fitness machines
    ('golf-precision-sports', null::integer), -- Outside scope: non-electrical sports equipment
    ('hunting-nature', null::integer), -- Outside scope: general non-electrical outdoor equipment
    ('racket-sports', null::integer), -- Outside scope: non-electrical sports equipment
    ('swimming', null::integer), -- Outside scope: non-electrical sports equipment
    ('team-sports', null::integer), -- Outside scope: non-electrical sports equipment
    ('water-sports', null::integer), -- Outside scope: non-electrical sports equipment
    ('winter-sports', null::integer), -- Outside scope: non-electrical sports equipment
    ('tools', null::integer), -- Mixed manual tools and powered equipment; classify children explicitly
    ('hand-tool', null::integer), -- Outside scope: manual tools
    ('hammer', null::integer), -- Outside scope: manual tools
    ('hand-saw', null::integer), -- Outside scope: manual tools
    ('measuring-marking', null::integer), -- Outside scope: manual measuring/marking tools
    ('pliers', null::integer), -- Outside scope: manual tools
    ('screwdriver', null::integer), -- Outside scope: manual tools
    ('wrench-socket', null::integer), -- Outside scope: manual tools
    ('outdoor-tool', null::integer), -- Mixed powered gardening equipment and non-electrical irrigation
    ('chainsaw', 24), -- Power tool: powered gardening tool
    ('garden-water-pump', 24), -- Power tool: powered gardening equipment
    ('garden-watering-irrigation', null::integer), -- Mixed manual watering/irrigation and possible powered controls
    ('hedge-trimmer', 24), -- Power tool
    ('lawn-mower', 17), -- Large home electrical: lawnmower is an explicit ORDS example
    ('leaf-blower', 24), -- Power tool
    ('pressure-washer', 24), -- Power tool
    ('ride-on-mower-tractor', 17), -- Large home electrical: lawnmower product class
    ('robotic-mower', 17), -- Large home electrical: lawnmower product class
    ('trimmer-brushcutter', 24), -- Power tool
    ('power-tool', 24), -- Power tool
    ('angle-grinder', 24), -- Power tool
    ('circular-saw', 24), -- Power tool
    ('drill', 24), -- Power tool
    ('heat-gun', 24), -- Power tool
    ('impact-driver', 24), -- Power tool
    ('jigsaw', 24), -- Power tool
    ('miter-table-saw', 24), -- Power tool
    ('nailer-stapler', 24), -- Power tool
    ('oscillating-multi-tool', 24), -- Power tool
    ('rotary-tool', 24), -- Power tool
    ('router-planer', 24), -- Power tool
    ('sander', 24), -- Power tool
    ('tool-battery-charger', 2), -- Battery/charger/adapter: use the specific class, not Power tool
    ('safety-equipment', null::integer), -- Outside scope: general non-electrical protective equipment
    ('toys-and-games', null::integer), -- Mixed powered toys and non-electrical figures/building sets
    ('action-figure-doll', null::integer), -- Outside scope: general non-electrical toys
    ('building-set', null::integer), -- Outside scope: general non-electrical toys
    ('model-railway', 32), -- Toy: powered model trains
    ('rc-car-truck', 32), -- Toy: battery-powered remote-control vehicles, not road vehicles
    ('slot-car-racing', 32) -- Toy: powered slot cars
  )
  update public.categories as c
  set ords_category_id = mapping.ords_category_id
  from mapping
  where c.slug = mapping.slug;

  get diagnostics updated_category_count = row_count;
  if updated_category_count <> expected_category_count
     or updated_category_count <> (select count(*) from public.categories) then
    raise exception 'ORDS mapping must classify every category; review the taxonomy before applying';
  end if;
end
$mapping$;
