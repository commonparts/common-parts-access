-- ============================================================================
-- Seed data for Common Parts Access
-- Created: 2026-04-09
--
-- This file contains all reference data AND existing content data exported
-- from the production database. It is safe to run multiple times thanks to
-- ON CONFLICT DO NOTHING clauses.
--
-- Sections:
--   1. Reference data (licenses, brands, categories, products)
--      Always needed — the app depends on this data to function.
--   2. Content data (user_profiles, models, model_files, feedback, views)
--      Only inserts if the matching auth.users already exist.
--      After a reset, sign up again first, then run this seed.
-- ============================================================================

-- ############################################################################
-- SECTION 1: REFERENCE DATA
-- ############################################################################

-- ============================================================================
-- 1.1 Licenses
-- ============================================================================

insert into public.licenses (id, spdx_id, name, short_name, url, allows_redistribution, requires_attribution, allows_commercial, is_copyleft)
values
  ('cafa20ae-65cd-4c8c-8140-59049d276bf6', 'CC0-1.0',        'Creative Commons Zero v1.0 Universal',                                          'CC0',           'https://creativecommons.org/publicdomain/zero/1.0/',  true,  false, true,  false),
  ('38e1b3bb-c2ba-4771-9bda-0ab1c82b0b92', 'CC-BY-4.0',      'Creative Commons Attribution 4.0 International',                                'CC BY 4.0',     'https://creativecommons.org/licenses/by/4.0/',        true,  true,  true,  false),
  ('779433cb-5817-4a34-b282-06993e8b4c7d', 'CC-BY-SA-4.0',   'Creative Commons Attribution-ShareAlike 4.0 International',                     'CC BY-SA 4.0',  'https://creativecommons.org/licenses/by-sa/4.0/',     true,  true,  true,  true),
  ('ce24ea70-f792-4028-97d4-3b2c7fde939c', 'CC-BY-NC-4.0',   'Creative Commons Attribution-NonCommercial 4.0 International',                  'CC BY-NC 4.0',  'https://creativecommons.org/licenses/by-nc/4.0/',     true,  true,  false, false),
  ('e7009a24-a427-4a41-b39c-aff6a14c3085', 'CC-BY-NC-SA-4.0','Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International',       'CC BY-NC-SA 4.0','https://creativecommons.org/licenses/by-nc-sa/4.0/', true,  true,  false, true),
  ('debaa013-a29a-4fd7-80e5-341ef7d86911', 'MIT',            'MIT License',                                                                   'MIT',           'https://opensource.org/licenses/MIT',                 true,  true,  true,  false),
  ('c5e1a9d6-e6f2-456e-bb4c-90ad2f27d4b1', 'GPL-3.0-only',   'GNU General Public License v3.0 only',                                         'GPL 3.0',       'https://www.gnu.org/licenses/gpl-3.0.html',           true,  true,  true,  true)
on conflict (spdx_id) do nothing;

-- ============================================================================
-- 1.2 Brands
-- ============================================================================

insert into public.brands (id, name, slug, description, logo_url, website_url, founded_year, country, verified)
values
  ('d0227619-e315-4865-a77b-d29b64e815b9', '3M',              '3m',              'Industrial and consumer products including adhesives, tapes, and household goods.', null, null, null, null, false),
  ('e12a450d-22c3-4625-99b1-a38d65bae46b', 'Acer',            'acer',            'Computers and monitors.', null, null, null, null, false),
  ('232e5300-9bc2-4bb5-a6d6-5b60357b8f83', 'Anker',           'anker',           'Charging, power, and consumer electronics accessories.', null, null, null, null, false),
  ('69996b07-9d12-4144-9bf8-62735be14e3a', 'Apple',           'apple',           'Consumer electronics brand producing smartphones, computers, and accessories.', null, null, null, null, false),
  ('e72d013f-72ff-46d5-b8cb-8a795357aa0e', 'Arlo',            'arlo',            'Smart security cameras.', null, null, null, null, false),
  ('1a1d9ad4-072f-43ae-b565-f58f538c12df', 'Arthur Martin',   'arthur-martin',   'Home appliances brand in Europe.', null, null, null, null, false),
  ('fc020a4c-d66f-4c26-92d2-1b1fab60b44e', 'Asus',            'asus',            'Computers, components, and electronics.', null, null, null, null, false),
  ('24a401f1-664c-48a8-a3dc-7a7a51d802d6', 'Audi',            'audi',            'Premium cars and mobility products.', null, null, null, null, false),
  ('93414dac-9f59-4199-82d8-5d367692f555', 'Bang & Olufsen',  'bang-and-olufsen','Luxury audio and visual products.', null, null, null, null, false),
  ('e0d1d31f-85f0-4150-a327-da44ef72b7d0', 'Beats',           'beats',           'Consumer headphones and audio accessories.', null, null, null, null, false),
  ('64e96d99-f9a8-4252-b49f-12e10b1d1af5', 'Beko',            'beko',            'Consumer appliances focused on value and efficiency.', null, null, null, null, false),
  ('d56dcb44-86e7-4a6d-99ad-28a3e4898f85', 'Belkin',          'belkin',          'Connectivity and electronics accessories.', null, null, null, null, false),
  ('ee8d5331-9482-49c4-9757-d272fbde62ed', 'Bianchi',         'bianchi',         'Italian bicycle manufacturer.', null, null, null, null, false),
  ('151d2dcf-ac2a-4293-8268-b94eb21cc8c2', 'Bissell',         'bissell',         'Floor care and cleaning devices.', null, null, null, null, false),
  ('9374ee1a-c9e6-4390-af8d-73a05c2677e7', 'Black+Decker',   'black-decker',    'Consumer tools and small home appliances.', null, null, null, null, false),
  ('10f91da4-d898-4e07-9874-95754d7b2d8a', 'Blink',           'blink',           'Home security cameras.', null, null, null, null, false),
  ('b21b6354-f7d5-4bc5-996b-c033d30bd7f3', 'BMW',             'bmw',             'Premium automobiles.', null, null, null, null, false),
  ('c83cd4b0-b21c-42cf-b52f-6e1fb0278031', 'Bosch',           'bosch',           'Leading manufacturer of power tools and appliances.', 'https://upload.wikimedia.org/wikipedia/commons/d/dd/Logo_Bosch_Sicherheitssysteme_GmbH.png', 'https://www.bosch-home.com/', 1886, 'DE', false),
  ('7ee3fa44-86f1-41fd-b3db-3ef56fd77d28', 'Bose',            'bose',            'High-end audio equipment.', null, null, null, null, false),
  ('8b30f730-3756-42df-9ef3-9b9310af1254', 'Brandt',          'brandt',          'Household appliances and electronics.', null, null, null, null, false),
  ('6079bd2d-ce8b-4c07-bd6e-4cab13d0e1a9', 'Breville',        'breville',        'Premium kitchen appliances.', null, 'https://www.breville.com/', 1957, 'AU', false),
  ('ac144eee-289c-4849-99bd-80efd70cfdac', 'Brother',         'brother',         'Printers and sewing machines.', null, null, null, null, false),
  ('88b1bbc5-5aa6-4472-aa4f-ffb0e8af03e5', 'Calor',           'calor',           'Home appliances specializing in irons and garment care.', null, null, null, null, false),
  ('529c0a57-acd5-4704-8a35-4d84b934b1be', 'Campagnolo',      'campagnolo',      'High-end bicycle components.', null, null, null, null, false),
  ('726ad572-b8f5-47e4-8fbb-aed2b3fceb10', 'Cannondale',      'cannondale',      'Bicycles and cycling gear.', null, null, null, null, false),
  ('34fdf630-a52c-4910-9b7d-12f9bcdf75ed', 'Canon',           'canon',           'Cameras, printers, and imaging equipment.', null, null, null, null, false),
  ('2f80128e-29f9-436c-82c2-a99f70cb370e', 'Chevrolet',       'chevrolet',       'Passenger and utility vehicles.', null, null, null, null, false),
  ('0d48dbbf-7b5a-4e70-bbb8-051d30b94723', 'Corsair',         'corsair',         'PC components and gaming accessories.', null, null, null, null, false),
  ('8f191696-43e4-450d-9538-39d9e533e573', 'Cuisinart',       'cuisinart',       'Kitchen appliances and cookware.', null, null, null, null, false),
  ('bf1290df-d24a-41f0-b24c-be3bac5e6d2f', 'D-Link',          'd-link',          'Networking and connectivity products.', null, null, null, null, false),
  ('df6b45db-2b9c-4517-8e35-5dee4122acda', 'De Dietrich',     'de-dietrich',     'High-end kitchen and home appliances.', null, null, null, null, false),
  ('d3888141-8f2b-4c39-b007-bdd0ce3cabcf', 'Dell',            'dell',            'Personal computers and peripherals.', null, null, null, null, false),
  ('5bcd0e39-445b-4d00-96a1-8c9906aa7fa3', 'Denon',           'denon',           'Home audio and AV receivers.', null, null, null, null, false),
  ('b8a80daf-25b3-453e-a9b4-bd2dd89aa2ad', 'DeWalt',          'dewalt',          'Power tools and jobsite equipment brand.', null, null, null, null, false),
  ('5ba032b1-d30f-422e-acf6-93efc87a0242', 'DJI',             'dji',             'Drones and camera stabilization systems.', null, null, null, null, false),
  ('a7d14276-c11e-4ade-a327-a9fec3e7824f', 'Dremel',          'dremel',          'Specialist in rotary tools and accessories for precision work.', 'https://upload.wikimedia.org/wikipedia/commons/0/0a/Dremel_Logo.jpg', 'https://www.dremel.com/', 1932, 'US', false),
  ('8e32dd29-3f05-4425-a454-bb8dd18e287d', 'Dyson',           'dyson',           'Innovative vacuum cleaners and home appliances.', null, null, null, null, false),
  ('55077db5-0d47-46ec-a187-d849309d44c6', 'Echo',            'echo',            'Outdoor handheld power equipment.', null, null, null, null, false),
  ('557156e7-a2da-49ee-8aaf-10491b4f1d6c', 'Einhell',         'einhell',         'DIY tools and garden equipment.', null, null, null, null, false),
  ('48e26968-33a8-44e8-a8d2-cd83a42c404f', 'Electrolux',      'electrolux',      'Global home appliance manufacturer.', null, null, null, null, false),
  ('d0548646-d220-474c-b113-76a50dddee74', 'Epson',           'epson',           'Printers and imaging hardware.', null, null, null, null, false),
  ('d288e434-4ea3-4180-9158-95bf682332b2', 'Eufy',            'eufy',            'Smart home and robotic devices.', null, null, null, null, false),
  ('1f0757e2-2eaa-4633-87e4-81a33a66a95e', 'Faure',           'faure',           'Kitchen and home appliances.', null, null, null, null, false),
  ('4249529e-14c5-4dba-a282-64f124dda189', 'Festool',         'festool',         'High-end precision power tools.', null, null, null, null, false),
  ('fdd40380-08af-42f0-8e95-89ac8df08648', 'Fitbit',          'fitbit',          'Fitness trackers and wearables.', null, null, null, null, false),
  ('347e62cb-c34c-445e-a95e-d475ed926304', 'Ford',            'ford',            'Automotive manufacturer.', null, null, null, null, false),
  ('6442597f-6aa6-4136-a1d6-0fa1c6e26e2a', 'Frigidaire',      'frigidaire',      'Refrigerators, freezers, and cooling appliances.', null, null, null, null, false),
  ('8a0a594e-9bd6-477e-a5f4-fcc23ae00d7e', 'Fujifilm',        'fujifilm',        'Imaging, cameras, and printers.', null, null, null, null, false),
  ('0dad6ac6-9532-4bed-b1e6-f109d9701cf1', 'Garmin',          'garmin',          'GPS devices and smart wearables.', null, null, null, null, false),
  ('d67c8d24-c24a-4a9a-9ee0-582b3838b9d0', 'GE Appliances',   'ge-appliances',   'Home appliances including cooking and refrigeration.', null, null, null, null, false),
  ('e6761600-29ae-4f7c-baee-3b89fb9f433c', 'Giant',           'giant',           'Bicycles and components.', null, null, null, null, false),
  ('a489e470-b6f9-4b12-9e06-83f2b8a2fdb3', 'GoPro',           'gopro',           'Action cameras and accessories.', null, null, null, null, false),
  ('aa4783a9-e81b-4cce-b139-0fefcf321236', 'Hamilton Beach',  'hamilton-beach',  'Small kitchen appliances.', null, null, null, null, false),
  ('6ef291ce-5f09-463d-9e1e-dd4d65b78c5f', 'Hilti',           'hilti',           'Construction-focused power tools and fastening systems.', null, null, null, null, false),
  ('784ed0a9-4d96-4863-9ea8-868e2aebcf23', 'Hisense',         'hisense',         'Televisions and home appliances.', null, null, null, null, false),
  ('46844f7c-3fa9-4587-8c60-bf77bd07f286', 'Honda',           'honda',           'Automotive and power equipment.', null, null, null, null, false),
  ('7285081e-ec3f-44a9-8bb4-2007abc724d5', 'Hoover',          'hoover',          'Floor care and vacuum products.', null, null, null, null, false),
  ('28504b4a-9f74-4632-b32b-eedb82254b8b', 'HP',              'hp',              'Computers and printing devices.', null, null, null, null, false),
  ('da099e48-0cf3-4b91-9e2a-35b3abcc78ea', 'Husqvarna',       'husqvarna',       'Outdoor power equipment.', null, null, null, null, false),
  ('e6422b89-2f25-47ee-906d-87716fdd173b', 'IKEA',            'ikea',            null, null, null, null, null, false),
  ('35e86449-a7d5-4fff-aded-1167a0d7b7ab', 'Indesit',         'indesit',         'Affordable household appliances.', null, null, null, null, false),
  ('a03121a6-c4fa-4a34-affa-935fe7e062b6', 'iRobot',          'irobot',          'Robotic vacuum and cleaning devices.', null, null, null, null, false),
  ('d8c26215-f256-4f10-9c29-0c79e91fe2e7', 'JBL',             'jbl',             'Audio speakers and headphones.', null, null, null, null, false),
  ('c9b43047-4928-44bc-bf32-40a952fb6308', 'John Deere',      'john-deere',      'Agricultural and outdoor machinery.', null, null, null, null, false),
  ('19d1b745-7e7d-40fa-a268-c006d151f5d0', 'Kärcher',         'karcher',         'Cleaning equipment and pressure washers.', null, null, null, null, false),
  ('e524fb33-b288-4ab4-9114-d07f950773f2', 'KitchenAid',      'kitchenaid',      'Premium kitchen appliances and mixers.', null, null, null, null, false),
  ('0832ff4a-2038-420e-bb6e-60d042c59d22', 'Krups',           'krups',           'Coffee machines and small kitchen appliances.', null, null, null, null, false),
  ('38afd7b4-7d55-42eb-9595-8bb8d001a7fe', 'Kubota',          'kubota',          'Tractors and heavy equipment.', null, null, null, null, false),
  ('045a867f-751a-4c12-8ed7-e9dbae97ac75', 'Lefebvre',        'lefebvre',        'Industrial and household mechanical components.', null, null, null, null, false),
  ('53795adc-0a31-4c12-a4a4-80bd16df5c4e', 'Lenovo',          'lenovo',          'Computing devices and electronics.', null, null, null, null, false),
  ('71175f8d-bdb6-4d78-8729-95ac01f6133b', 'LG',              'lg',              'Electronics and appliance brand for home and entertainment products.', null, null, null, null, false),
  ('6babc35d-0a21-4c90-8239-3382c0f70887', 'Logitech',        'logitech',        'Computer peripherals and accessories.', null, null, null, null, false),
  ('61485a27-1b3f-4b47-b6c7-a0f959467a26', 'Makita',          'makita',          'Japanese manufacturer of power tools.', 'https://upload.wikimedia.org/wikipedia/fr/2/21/Makita_Logo.png', 'https://www.makita.com/', 1915, 'JP', false),
  ('63abb385-15c4-411f-bfe6-96679a613374', 'Marantz',         'marantz',         'High-end audio components.', null, null, null, null, false),
  ('dd623ef6-566d-4c25-86f0-5a37f099b4b8', 'Mercedes-Benz',   'mercedes-benz',   'Luxury vehicles.', null, null, null, null, false),
  ('6cc97571-7349-4c07-a572-1e33f0cc9699', 'Metabo',          'metabo',          'Power tools for metalworking and construction.', null, null, null, null, false),
  ('af157d0a-23b6-4cb3-9b6e-85916c9ba1a6', 'Microsoft',       'microsoft',       'Software and consumer hardware.', null, null, null, null, false),
  ('43081bfc-23ce-46cb-93f1-629d9557b36f', 'Microsoft Xbox',  'microsoft-xbox',  'Gaming consoles and accessories.', null, null, null, null, false),
  ('0fd2432c-76cb-455d-856a-ef5eac2480d2', 'Miele',           'miele',           'Premium household appliances.', null, null, null, null, false),
  ('e14a6069-db23-48bb-8574-f1d9d196dffa', 'Milwaukee',       'milwaukee',       'Professional-grade power tools and accessories.', null, null, null, null, false),
  ('a44201ab-4c12-4017-b3e2-c18ce8af70a0', 'Moulinex',        'moulinex',        'Small kitchen appliances focused on everyday cooking.', null, null, null, null, false),
  ('3acece7d-3d35-4600-ae9f-602d26a079ea', 'MSI',             'msi',             'Gaming laptops and PC hardware.', null, null, null, null, false),
  ('76b2f8eb-9b78-456e-87ed-60e97b9fbd8e', 'Nest',            'nest',            'Smart thermostats and home automation.', null, null, null, null, false),
  ('b9755cc5-2fef-4208-ae63-1d9b531284b3', 'Netgear',         'netgear',         'Networking equipment.', null, null, null, null, false),
  ('fb2d0e1f-fea4-4fb9-af8f-462122872078', 'Nikon',           'nikon',           'Imaging and optical products.', null, null, null, null, false),
  ('1a0ee018-9d9e-45b5-94de-4e9d3f159c15', 'Nilfisk',         'nilfisk',         'Professional cleaning equipment.', null, null, null, null, false),
  ('969bc09f-62c1-40e7-990e-8d3e8528acc3', 'Ninja',           'ninja',           'Blenders and kitchen appliances.', null, null, null, null, false),
  ('41874f7c-d5c4-437f-ad90-2612ec4bff42', 'Nintendo',        'nintendo',        'Gaming consoles and accessories.', null, null, null, null, false),
  ('1cb88ac5-4fa4-4327-926d-d1e09da135f1', 'Olympus',         'olympus',         'Optical and imaging equipment.', null, null, null, null, false),
  ('a7b0134c-df24-4215-a99e-4e6f77d02f59', 'Onkyo',           'onkyo',           'Home audio and AV systems.', null, null, null, null, false),
  ('4d255ef5-fe54-4b61-99a4-16b85d5c07a1', 'Oster',           'oster',           'Kitchen appliances and grooming devices.', null, null, null, null, false),
  ('d9fdc360-774d-4a89-b929-804854accad0', 'Panasonic',       'panasonic',       'Electronics, appliances, and audio-visual equipment.', null, null, null, null, false),
  ('78406de4-adf7-49d1-a75a-0c1c32186ea5', 'Peugeot',         'peugeot',         'French manufacturer of automobiles, bicycles, and household products.', null, null, null, null, false),
  ('cf04cbaa-0ecf-4a48-82e7-e20c7605bbf9', 'Philips',         'philips',         'Electronics, lighting, and personal care products.', null, null, null, null, false),
  ('447953bd-b5de-485f-94d8-a0c463e5c606', 'Pioneer',         'pioneer',         'Audio and DJ equipment.', null, null, null, null, false),
  ('31cf1a15-6867-4bcc-9046-3608e7c22ca1', 'Polar',           'polar',           'Sports and fitness monitoring devices.', null, null, null, null, false),
  ('ad8d0c7c-938a-40a6-88cb-e5b53d8d5995', 'Razer',           'razer',           'Gaming hardware and peripherals.', null, null, null, null, false),
  ('824cd698-8965-4722-8f50-4491372301b9', 'Ricoh',           'ricoh',           'Office imaging and industrial printers.', null, null, null, null, false),
  ('b52d93f5-bf53-4c77-9480-5f564ca92bf9', 'Ring',            'ring',            'Smart home security devices.', null, null, null, null, false),
  ('9044c771-5239-485c-86dd-9812657f794a', 'Rowenta',         'rowenta',         'Premium household appliances and vacuum cleaners.', null, null, null, null, false),
  ('2da6c1e4-49c8-47c4-95c4-f41d307cdd12', 'Ryobi',           'ryobi',           'DIY-oriented power tools and outdoor equipment.', null, null, null, null, false),
  ('797bcf7e-6e9c-4b10-85e4-de80bb535edc', 'Samsung',         'samsung',         'Global manufacturer of electronics and home appliances.', null, null, null, null, false),
  ('36d7cac7-f1a0-4f4e-9743-8b373923ca9c', 'SEB',             'seb',             'French group producing small household appliances.', null, null, null, null, false),
  ('541c55c6-cb96-4edf-86a0-1534d4fa48a4', 'Sebago',          'sebago',          'Consumer lifestyle and household products.', null, null, null, null, false),
  ('327835a6-9483-42fe-8c4a-be2a2a05f31c', 'Sennheiser',      'sennheiser',      'Professional and consumer audio products.', null, null, null, null, false),
  ('316854ac-9b5f-4830-974a-e142a7c384c2', 'Shark',           'shark',           'Vacuum cleaners and household appliances.', null, null, null, null, false),
  ('8a7544bf-4181-4f36-8714-b02c0c3572be', 'Sharp',           'sharp',           'Consumer electronics and appliances.', null, null, null, null, false),
  ('d7e5ccb7-3de7-4156-96fc-fe932a5c69b7', 'Shimano',         'shimano',         'Bicycle components and drivetrain systems.', null, null, null, null, false),
  ('e2a8aae3-e998-4ae3-ad69-80700924b4f5', 'Smeg',            'smeg',            'Design-focused kitchen appliances.', null, null, null, null, false),
  ('1efedbb0-b42a-4ced-91a7-82a4ca5bc7c5', 'Sony',            'sony',            'Consumer electronics, gaming, and audio-visual equipment.', null, null, null, null, false),
  ('08234a4a-f5af-45ed-9d18-e5d47da61209', 'Sony PlayStation', 'sony-playstation','Video game consoles and gaming hardware.', null, null, null, null, false),
  ('6e3372e0-f97c-4ad9-acdf-69a693ab1b71', 'Specialized',     'specialized',     'High-performance bicycles.', null, null, null, null, false),
  ('54978502-028f-47e3-a52a-20480f78fe4c', 'SRAM',            'sram',            'Bicycle components and drivetrains.', null, null, null, null, false),
  ('83ad8f41-d7b3-4610-b021-7e1aeb4dcb10', 'SteelSeries',     'steelseries',     'Gaming peripherals and accessories.', null, null, null, null, false),
  ('9b8489f2-fe62-4d84-aaa3-334725026d0a', 'Stihl',           'stihl',           'Chainsaws and outdoor power tools.', null, null, null, null, false),
  ('8a8f87ec-2d0f-4a2c-a707-d5d9670ca958', 'TCL',             'tcl',             'Consumer electronics, mainly televisions.', null, null, null, null, false),
  ('4d58a4eb-2288-4131-a196-602cee39dc32', 'Tefal',           'tefal',           'Cookware and kitchen appliances with non-stick technology.', null, null, null, null, false),
  ('06cd2737-d50e-4674-b61a-32b02023250b', 'Tesla',           'tesla',           'Electric vehicles and energy products.', null, null, null, null, false),
  ('4b8ba87f-e8ee-481b-ac9a-77be74a16944', 'Toro',            'toro',            'Lawn care and turf equipment.', null, null, null, null, false),
  ('a29aa093-d517-4c0b-8a65-631d132d1563', 'Toshiba',         'toshiba',         'Electronics and household appliances.', null, null, null, null, false),
  ('c4c9c3b9-25da-4edd-a5df-0ca554e24eab', 'Toyota',          'toyota',          'Automotive manufacturer.', null, null, null, null, false),
  ('4ef30122-420b-4cd8-abbd-d3507ed49384', 'TP-Link',         'tp-link',         'Consumer and enterprise networking hardware.', null, null, null, null, false),
  ('6578a239-c3c7-4a64-8ca1-4e3069644514', 'Trek',            'trek',            'Bicycles and cycling equipment.', null, null, null, null, false),
  ('804b3889-e942-4f9d-86a6-5e79c029d589', 'Ubiquiti',        'ubiquiti',        'Professional networking systems.', null, null, null, null, false),
  ('ac18d9d8-2f49-4f98-94e4-535ed5a368b3', 'Valve',           'valve',           'PC gaming hardware and software.', null, null, null, null, false),
  ('69225342-40b7-4903-bd64-4f4619496332', 'Vitamix',         'vitamix',         'High-performance blenders.', null, null, null, null, false),
  ('9a9b181d-cc2a-4bde-8bce-618963ba7f13', 'Vizio',           'vizio',           'Televisions and home audio products.', null, null, null, null, false),
  ('f86721e1-847a-4f4b-b8d1-3be2a3c01130', 'Volkswagen',      'volkswagen',      'Automobiles and parts.', null, null, null, null, false),
  ('26126180-0905-429f-8f86-3ede92738442', 'Whirlpool',       'whirlpool',       'Large household appliances for kitchen and laundry.', null, null, null, null, false),
  ('72f1e9ce-1cfc-435c-a774-3c158e747c7a', 'Withings',        'withings',        'Health-focused smart devices.', null, null, null, null, false),
  ('bd4a5819-3ad5-45e4-b3b3-44a7c4882403', 'Yamaha',          'yamaha',          'Audio equipment, instruments, and motorcycles.', null, null, null, null, false)
on conflict (name) do nothing;

-- ============================================================================
-- 1.3 Categories
-- Inserted level-by-level so the path trigger computes correctly.
-- ============================================================================

-- Level 0 (root categories)
insert into public.categories (id, name, slug, description, icon, parent_id)
values
  ('347b23ca-ebd0-4331-bc10-61cb7042a9cb', 'Appliances',            'appliances',             'Large and small household appliances for cooking, cleaning and food storage.', 'https://pyzttrqnxvirpkuxtjxl.supabase.co/storage/v1/object/public/category-icons/category_appliances.png', null),
  ('a38a6e94-5dbd-4c6e-b1c3-010429c86123', 'Cars & Trucks',         'cars-and-trucks',        'Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry''s standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book.', 'https://pyzttrqnxvirpkuxtjxl.supabase.co/storage/v1/object/public/category-icons/category_cars_trucks.png', null),
  ('8b29991d-a54a-46da-a7d8-3fed8eb3613b', 'Furniture',             'furniture',              'Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry''s standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book.', 'https://pyzttrqnxvirpkuxtjxl.supabase.co/storage/v1/object/public/category-icons/category_furniture.png', null),
  ('1da4a32c-0ca7-4fab-be29-ca8ae4a32783', 'Gadgets & Electronics', 'gadgets-and-electronics','Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry''s standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book.', 'https://pyzttrqnxvirpkuxtjxl.supabase.co/storage/v1/object/public/category-icons/category_gadgets_electronics.png', null),
  ('ef769541-ea4d-4d69-aa84-504c92e02ca4', 'Other',                 'other-category',         'Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry''s standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book.', 'https://pyzttrqnxvirpkuxtjxl.supabase.co/storage/v1/object/public/category-icons/default_icon.png', null),
  ('6345bb11-895f-48bc-b937-b2e2943fdd65', 'Tools',                 'tools',                  'Handheld and power tools for repair, construction and maintenance.', 'https://pyzttrqnxvirpkuxtjxl.supabase.co/storage/v1/object/public/category-icons/category_tools.png', null),
  ('aef1ceb6-af87-4a35-89e0-155066702ffb', 'Toys & Games',          'toys-and-games',         'Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry''s standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book.', 'https://pyzttrqnxvirpkuxtjxl.supabase.co/storage/v1/object/public/category-icons/category_toys_games.png', null)
on conflict (slug) do nothing;

-- Level 1
insert into public.categories (id, name, slug, description, icon, parent_id)
values
  -- Appliances children
  ('2964221f-6710-4283-8044-8c606ab49a90', 'Dishwasher',            'dishwasher',             null, null, '347b23ca-ebd0-4331-bc10-61cb7042a9cb'),
  ('ede984b8-f640-4e3e-889e-db7b71b6386e', 'Dryer',                 'dryer',                  null, null, '347b23ca-ebd0-4331-bc10-61cb7042a9cb'),
  ('7b16d43f-2352-4903-86eb-7b4ee0d2ce59', 'Oven',                  'oven',                   'Conventional and convection ovens for baking and roasting.', null, '347b23ca-ebd0-4331-bc10-61cb7042a9cb'),
  ('884e2d49-c7e7-4256-ac41-6286c338ac9f', 'Refrigerator',          'refrigerator',           'Fridges and freezers for food preservation.', null, '347b23ca-ebd0-4331-bc10-61cb7042a9cb'),
  ('b875d4a7-0bdb-4ed2-a30b-777e3d2dde94', 'Small Kitchen Appliance','small-kitchen-appliance','Compact countertop appliances and accessories.', null, '347b23ca-ebd0-4331-bc10-61cb7042a9cb'),
  ('134d3d99-5405-4540-ae8b-75dc8fcbb105', 'Steam Cleaner',         'steam-cleaner',          null, null, '347b23ca-ebd0-4331-bc10-61cb7042a9cb'),
  ('696c116f-a5fd-4d7c-ac59-a234d261a44f', 'Vacuum Cleaner',        'vacuum-cleaner',         null, null, '347b23ca-ebd0-4331-bc10-61cb7042a9cb'),
  ('e8793bc8-c179-4e92-bc4d-a30d845584a4', 'Washing Machine',       'washing-machine',        'Top-load and front-load laundry machines.', null, '347b23ca-ebd0-4331-bc10-61cb7042a9cb'),
  -- Furniture children
  ('bd1a077c-7e98-4457-bd54-3c5a88f83f1e', 'Storage Unit',          'storage-unit',           null, null, '8b29991d-a54a-46da-a7d8-3fed8eb3613b'),
  -- Tools children
  ('ead24077-d069-4b6c-80cf-54f124d42ec4', 'Hand Tool',             'hand-tool',              'Manual tools for carpentry, plumbing, and general repairs', null, '6345bb11-895f-48bc-b937-b2e2943fdd65'),
  ('cdbb349a-8d20-4220-9e79-812c75acc639', 'Outdoor Tool',          'outdoor-tool',           null, null, '6345bb11-895f-48bc-b937-b2e2943fdd65'),
  ('3e3efc03-d16c-4696-bed4-05601a6f9186', 'Power Tool',            'power-tool',             'Drills, saws, sanders and other motorized tools.', null, '6345bb11-895f-48bc-b937-b2e2943fdd65')
on conflict (slug) do nothing;

-- Level 2
insert into public.categories (id, name, slug, description, icon, parent_id)
values
  -- Small Kitchen Appliance children
  ('d5e1dbf5-5a69-4034-addb-7185bd02e883', 'Air Fryer',       'air-fryer',       null, null, 'b875d4a7-0bdb-4ed2-a30b-777e3d2dde94'),
  ('69c9b9df-7427-4d9b-9011-bc9ad9c7011e', 'Blender',         'blender',         'Countertop and immersion blenders for food prep.', null, 'b875d4a7-0bdb-4ed2-a30b-777e3d2dde94'),
  ('ac174543-d344-49a6-b735-5103e1d189e6', 'Coffee Maker',    'coffee-maker',    'Drip, espresso, and pod coffee machines.', null, 'b875d4a7-0bdb-4ed2-a30b-777e3d2dde94'),
  ('08637fe0-f11a-45a9-a26d-581091046e40', 'Cooker',          'cooker',          null, null, 'b875d4a7-0bdb-4ed2-a30b-777e3d2dde94'),
  ('b3927bf0-68d6-42ee-b7d1-a5635422624e', 'Food Processor',  'food-processor',  null, null, 'b875d4a7-0bdb-4ed2-a30b-777e3d2dde94'),
  ('2f33fec5-1574-4aed-ae1d-0d3f704ed91f', 'Kettle',          'kettle',          'Electric and stovetop kettles for boiling water.', null, 'b875d4a7-0bdb-4ed2-a30b-777e3d2dde94'),
  ('e0a3913d-4abc-4f16-8dd5-7c15bccd419a', 'Microwave Oven',  'microwave-oven',  null, null, 'b875d4a7-0bdb-4ed2-a30b-777e3d2dde94'),
  -- Hand Tool children
  ('be197004-0043-4a41-ac4d-be06c0c90249', 'Hammer',          'hammer',          'Claw, sledge, and mallet hammers.', null, 'ead24077-d069-4b6c-80cf-54f124d42ec4'),
  ('f69e947d-3458-4a39-956c-5bee9fe8515d', 'Pliers',          'pliers',          'Cutting and gripping pliers.', null, 'ead24077-d069-4b6c-80cf-54f124d42ec4'),
  ('46106835-c530-47b0-b996-0980407eeae8', 'Screwdriver',     'screwdriver',     'Flathead, Phillips and specialty screwdrivers.', null, 'ead24077-d069-4b6c-80cf-54f124d42ec4'),
  -- Power Tool children
  ('3a9e4e83-c481-4ece-b433-977610ecdcad', 'Impact Driver',   'impact-driver',   null, null, '3e3efc03-d16c-4696-bed4-05601a6f9186'),
  ('fb04a22f-e0d4-4c8f-9069-4fdc2b904e76', 'Angle Grinder',   'angle-grinder',   null, null, '3e3efc03-d16c-4696-bed4-05601a6f9186'),
  ('f310cc1e-a928-4661-b84c-426c0345492a', 'Circular Saw',    'circular-saw',    null, null, '3e3efc03-d16c-4696-bed4-05601a6f9186'),
  ('61da04eb-9ac3-4c02-ba6f-c616778ffa60', 'Drill',           'drill',           null, null, '3e3efc03-d16c-4696-bed4-05601a6f9186'),
  ('9bd37c2f-80c4-477d-86b5-72b12774fd6e', 'Jigsaw',          'jigsaw',          null, null, '3e3efc03-d16c-4696-bed4-05601a6f9186'),
  ('64ebb796-4c38-4617-b21c-37524fb2cdd1', 'Sander',          'sander',          null, null, '3e3efc03-d16c-4696-bed4-05601a6f9186')
on conflict (slug) do nothing;

-- Level 3
insert into public.categories (id, name, slug, description, icon, parent_id)
values
  ('e66e2c1e-ac96-4035-b8d2-d252d2ca4c16', 'Rice Cooker', 'rice-cooker', null, null, '08637fe0-f11a-45a9-a26d-581091046e40')
on conflict (slug) do nothing;

-- ============================================================================
-- 1.4 Products
-- ============================================================================

insert into public.products (id, name, slug, brand_id, category_id, model_number, description, release_year, discontinued, image_url)
values
  ('9b2f2d9f-2343-4b1a-8690-a5929b523e9d', 'BCG800XL Smart Grinder', 'bcg800xl-smart-grinder',
    '6079bd2d-ce8b-4c07-bd6e-4cab13d0e1a9', 'ac174543-d344-49a6-b735-5103e1d189e6',
    null, null, null, false,
    'https://pyzttrqnxvirpkuxtjxl.supabase.co/storage/v1/object/public/product-thumbnails/9b2f2d9f-2343-4b1a-8690-a5929b523e9d/breville-bcg800xl-smart-grinder.png'),
  ('d522114b-6069-435f-bd3b-c73b0a8421e4', 'B26FT50SNS French Door Bottom Mount Refrigerator', 'b26ft50sns-french-door-bottom-mount-refrigerator',
    'c83cd4b0-b21c-42cf-b52f-6e1fb0278031', '884e2d49-c7e7-4256-ac41-6286c338ac9f',
    null, null, null, false, ''),
  ('f5c397e0-f3a8-48d6-9480-6a8891d4dab9', 'B30BB830SS Built-in Bottom Freezer Refrigerator', 'b30bb830ss-built-in-bottom-freezer-refrigerator',
    'c83cd4b0-b21c-42cf-b52f-6e1fb0278031', '884e2d49-c7e7-4256-ac41-6286c338ac9f',
    null, null, null, false,
    'https://pyzttrqnxvirpkuxtjxl.supabase.co/storage/v1/object/public/product-thumbnails/d126b874-b56d-44a0-8e32-43530b830402/product-1765916883528-MCSA052958_B30BB830SS_def.webp'),
  ('1bd83164-dc8c-4e92-a14a-26561e77df2d', 'HJÄLPA', 'hjlpa',
    'e6422b89-2f25-47ee-906d-87716fdd173b', 'bd1a077c-7e98-4457-bd54-3c5a88f83f1e',
    null, null, null, false, null)
on conflict (slug) do nothing;


-- ############################################################################
-- SECTION 2: CONTENT DATA
-- Requires matching auth.users rows. After a database reset, sign up first
-- so auth.users and user_profiles are recreated by the trigger.
-- These inserts silently skip if the referenced user does not exist.
-- ############################################################################

-- ============================================================================
-- 2.1 User profiles (upsert additional fields not set by handle_new_user)
-- ============================================================================

-- wooduf2000
update public.user_profiles set
  avatar_url     = 'https://pyzttrqnxvirpkuxtjxl.supabase.co/storage/v1/object/public/user-avatars/d126b874-b56d-44a0-8e32-43530b830402/3d3a9a844bd5797aa082f1ad3f9429bf.png',
  verified_maker = true
where id = 'd126b874-b56d-44a0-8e32-43530b830402';

-- ============================================================================
-- 2.2 Models (depends on user_profiles, products, brands, categories, licenses)
-- ============================================================================

insert into public.models (
  id, name, slug, description, user_id, product_id, brand_id, category_id,
  material, print_settings, thumbnail_url, images, status,
  download_count, view_count, like_count,
  origin_type, source_url, source_platform, original_author, original_author_url,
  license_id, source_license_id, verification_status, makes_count, tags
)
select
  '6f7f7549-6f23-4abe-99b5-73bf20f48fc0',
  'IKEA Wardrobe replacement bracket',
  'ikea-wardrobe-replacement-bracket',
  'An easily 3D printable replacement ''HJÄLPA'' clothes rail bracket as found in IKEA wardrobes like the ''PLATSA''.',
  'd126b874-b56d-44a0-8e32-43530b830402',
  '1bd83164-dc8c-4e92-a14a-26561e77df2d',
  'e6422b89-2f25-47ee-906d-87716fdd173b',
  'bd1a077c-7e98-4457-bd54-3c5a88f83f1e',
  'PLA / PETG',
  '{"infill": 30, "supports": "buildplate_only", "layer_height": 0.2}'::jsonb,
  'https://pyzttrqnxvirpkuxtjxl.supabase.co/storage/v1/object/public/model-thumbnails/d126b874-b56d-44a0-8e32-43530b830402/6f7f7549-6f23-4abe-99b5-73bf20f48fc0/thumbnails/render-2c1c1408-709b-4409-b62a-8ccfae5e08c9.webp',
  array[
    'https://pyzttrqnxvirpkuxtjxl.supabase.co/storage/v1/object/public/model-thumbnails/d126b874-b56d-44a0-8e32-43530b830402/6f7f7549-6f23-4abe-99b5-73bf20f48fc0/thumbnails/render-2c1c1408-709b-4409-b62a-8ccfae5e08c9.webp',
    'https://pyzttrqnxvirpkuxtjxl.supabase.co/storage/v1/object/public/model-thumbnails/d126b874-b56d-44a0-8e32-43530b830402/6f7f7549-6f23-4abe-99b5-73bf20f48fc0/thumbnails/thumb-d6781629-fa00-4ec9-9c29-29c23d71d6ba.webp'
  ],
  'published', 0, 3, 0,
  'curated',
  'https://www.printables.com/model/580093-ikea-wardrobe-replacement-bracket',
  'printables',
  'TeachingTech',
  'https://www.printables.com/@TeachingTech',
  'cafa20ae-65cd-4c8c-8140-59049d276bf6',
  'cafa20ae-65cd-4c8c-8140-59049d276bf6',
  'community_validated', 0,
  array[]::text[]
where exists (select 1 from public.user_profiles where id = 'd126b874-b56d-44a0-8e32-43530b830402')
on conflict (slug) do nothing;

-- ============================================================================
-- 2.3 Model files
-- ============================================================================

insert into public.model_files (id, model_id, filename, original_filename, file_type, file_size, file_url, file_category, upload_path)
select * from (values
  ('45bdd6fa-1179-4851-875a-9e292bf443bd'::uuid, '6f7f7549-6f23-4abe-99b5-73bf20f48fc0'::uuid,
    'ikea-wardrobe-clip-v3-5bbebdda-17fd-46b7-9d1d-16a5f1c85831.step', 'ikea wardrobe - clip v3.step', 'step', 168627::bigint,
    'https://pyzttrqnxvirpkuxtjxl.supabase.co/storage/v1/object/public/model-files/d126b874-b56d-44a0-8e32-43530b830402/6f7f7549-6f23-4abe-99b5-73bf20f48fc0/files/ikea-wardrobe-clip-v3-5bbebdda-17fd-46b7-9d1d-16a5f1c85831.step',
    'model', 'd126b874-b56d-44a0-8e32-43530b830402/6f7f7549-6f23-4abe-99b5-73bf20f48fc0/files/ikea-wardrobe-clip-v3-5bbebdda-17fd-46b7-9d1d-16a5f1c85831.step'),
  ('87380e1d-d0bd-48bf-8f1f-46b15daab961'::uuid, '6f7f7549-6f23-4abe-99b5-73bf20f48fc0'::uuid,
    'ikea-wardrobe-KOMPLEMENT-clip-61207338-c0f6-4d74-bc03-5430855a91b1.stl', 'ikea wardrobe - KOMPLEMENT clip.stl', 'stl', 14610926::bigint,
    'https://pyzttrqnxvirpkuxtjxl.supabase.co/storage/v1/object/public/model-files/d126b874-b56d-44a0-8e32-43530b830402/6f7f7549-6f23-4abe-99b5-73bf20f48fc0/files/ikea-wardrobe-KOMPLEMENT-clip-61207338-c0f6-4d74-bc03-5430855a91b1.stl',
    'model', 'd126b874-b56d-44a0-8e32-43530b830402/6f7f7549-6f23-4abe-99b5-73bf20f48fc0/files/ikea-wardrobe-KOMPLEMENT-clip-61207338-c0f6-4d74-bc03-5430855a91b1.stl'),
  ('1f9ed473-e8e0-4c79-b1b3-eb101828d884'::uuid, '6f7f7549-6f23-4abe-99b5-73bf20f48fc0'::uuid,
    'render-2c1c1408-709b-4409-b62a-8ccfae5e08c9.webp', 'render.webp', 'webp', 14466::bigint,
    'https://pyzttrqnxvirpkuxtjxl.supabase.co/storage/v1/object/public/model-thumbnails/d126b874-b56d-44a0-8e32-43530b830402/6f7f7549-6f23-4abe-99b5-73bf20f48fc0/thumbnails/render-2c1c1408-709b-4409-b62a-8ccfae5e08c9.webp',
    'image', 'd126b874-b56d-44a0-8e32-43530b830402/6f7f7549-6f23-4abe-99b5-73bf20f48fc0/thumbnails/render-2c1c1408-709b-4409-b62a-8ccfae5e08c9.webp'),
  ('e274e2a8-716d-46c3-8580-f86f1ea8e709'::uuid, '6f7f7549-6f23-4abe-99b5-73bf20f48fc0'::uuid,
    'thumb-d6781629-fa00-4ec9-9c29-29c23d71d6ba.webp', 'thumb.webp', 'webp', 68430::bigint,
    'https://pyzttrqnxvirpkuxtjxl.supabase.co/storage/v1/object/public/model-thumbnails/d126b874-b56d-44a0-8e32-43530b830402/6f7f7549-6f23-4abe-99b5-73bf20f48fc0/thumbnails/thumb-d6781629-fa00-4ec9-9c29-29c23d71d6ba.webp',
    'image', 'd126b874-b56d-44a0-8e32-43530b830402/6f7f7549-6f23-4abe-99b5-73bf20f48fc0/thumbnails/thumb-d6781629-fa00-4ec9-9c29-29c23d71d6ba.webp')
) as t(id, model_id, filename, original_filename, file_type, file_size, file_url, file_category, upload_path)
where exists (select 1 from public.models where id = '6f7f7549-6f23-4abe-99b5-73bf20f48fc0')
on conflict (id) do nothing;

-- ============================================================================
-- 2.4 Feedback
-- ============================================================================

insert into public.feedback (id, created_at, user_id, email, type, title, description, url, user_agent, status, github_issue_url, github_issue_number, triage_notes)
values
  ('8ba5ad8e-2ccd-4d57-987d-b065dd754ec2', '2026-03-27T17:23:16.3701+00:00',
    'd126b874-b56d-44a0-8e32-43530b830402', null, 'improvement', 'Web page is too white',
    'Hello, I think that it would be better with a blue navigation bar for readbility.',
    'http://localhost:3000/', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:149.0) Gecko/20100101 Firefox/149.0',
    'github_issue_created', 'https://github.com/wooduf2000/common-parts-access/issues/1', 1,
    'Low priority improvement request for UI enhancement. While not critical, it addresses readability concerns that could improve user experience.'),
  ('a240b6f9-510a-42e3-9fe2-9699cf5ae951', '2026-03-27T17:39:15.594334+00:00',
    'd126b874-b56d-44a0-8e32-43530b830402', null, 'improvement', 'Can''t see the models I published anywhere',
    'Hi team, I would like to be able to manage the parts I published somewhere on a dashboard or something. To be able to modify them, or even delete them.\nThank you!',
    'http://localhost:3000/upload', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:149.0) Gecko/20100101 Firefox/149.0',
    'github_issue_created', 'https://github.com/wooduf2000/common-parts-access/issues/2', 2,
    'Classified as high priority improvement because it directly impacts user content management and platform usability.'),
  ('ef4c3296-ee61-4af6-bf5d-f927587703ab', '2026-03-27T17:57:43.16851+00:00',
    'd126b874-b56d-44a0-8e32-43530b830402', null, 'improvement', 'Can''t see the models I published anywhere',
    'Hi team, I would like to be able to manage the parts I published somewhere on a dashboard or something. To be able to modify them, or even delete them.\nThank you!',
    'http://localhost:3000/upload', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:149.0) Gecko/20100101 Firefox/149.0',
    'github_issue_created', 'https://github.com/wooduf2000/common-parts-access/issues/3', 3,
    'User explicitly requests a management interface for published parts, indicating a missing core feature.'),
  ('2085a489-b69b-414f-80be-8f649218daa5', '2026-03-27T20:23:12.024857+00:00',
    'd126b874-b56d-44a0-8e32-43530b830402', null, 'improvement', 'Can''t see the models I published anywhere',
    'Hi team, I would like to be able to manage the parts I published somewhere on a dashboard or something. To be able to modify them, or even delete them.\nThank you!',
    'http://localhost:3000/', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:149.0) Gecko/20100101 Firefox/149.0',
    'github_issue_created', 'https://github.com/wooduf2000/common-parts-access/issues/4', 4,
    'User explicitly requests a management interface for published parts, indicating a missing feature with significant friction.'),
  ('c321308c-46ee-4ad7-8d0c-3995b8d74c61', '2026-03-27T20:26:50.506234+00:00',
    'd126b874-b56d-44a0-8e32-43530b830402', null, 'improvement', 'Can''t see the models I published anywhere',
    'Hi team, I would like to be able to manage the parts I published somewhere on a dashboard or something. To be able to modify them, or even delete them.\nThank you!',
    'http://localhost:3000/', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:149.0) Gecko/20100101 Firefox/149.0',
    'github_issue_created', 'https://github.com/wooduf2000/common-parts-access/issues/5', 5,
    'Priority set to high due to significant friction in managing published content, which is a core platform feature.'),
  ('3b497c82-5dd6-4943-a41c-ea12b1497c6b', '2026-03-30T08:06:32.658122+00:00',
    'd126b874-b56d-44a0-8e32-43530b830402', null, 'bug', 'There is a console error',
    'A tree hydrated but some attributes of the server rendered HTML didn''t match the client properties.',
    'http://localhost:3000/', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:149.0) Gecko/20100101 Firefox/149.0',
    'github_issue_created', 'https://github.com/wooduf2000/common-parts-access/issues/8', 8,
    'Priority set to high due to potential runtime errors affecting SSR functionality.'),
  ('c2a10d2d-f4b7-472d-9f6d-7d9b294ec787', '2026-03-30T17:44:35.302723+00:00',
    null, null, 'improvement', 'model cards are not the same height',
    'model cards are not the same height because some titles are on one line, and some are on two lines, and it is not very nice and well aligned',
    'https://common-parts-access-9eae2l4l4-wooduf2000s-projects.vercel.app/browse', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:149.0) Gecko/20100101 Firefox/149.0',
    'github_issue_created', 'https://github.com/wooduf2000/common-parts-access/issues/15', 15,
    'Priority set to medium due to visual inconsistency without functional impact.'),
  ('ed72141e-c4e0-453a-a78f-d51d436ebd69', '2026-04-02T17:09:52.537121+00:00',
    'd126b874-b56d-44a0-8e32-43530b830402', null, 'improvement', 'Bad auth workflow',
    'When I try to upload a model when I''m not authenticated. I fill everything in. I upload the files, and so on. And When I click on upload, nothing happens.',
    'https://common-parts-access-ab9907e0b-wooduf2000s-projects.vercel.app/upload', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:149.0) Gecko/20100101 Firefox/149.0',
    'github_issue_created', 'https://github.com/wooduf2000/common-parts-access/issues/32', 32,
    'The workflow creates significant friction by losing user input, warranting a high priority for correction.'),
  ('8ea80870-1891-4a2a-8b4d-c70cde699589', '2026-04-02T17:15:25.549852+00:00',
    'd126b874-b56d-44a0-8e32-43530b830402', null, 'improvement', 'wrong redirect',
    'If I click on "View model", I''m redirected to the browse page instead of the model page.',
    'https://common-parts-access-ab9907e0b-wooduf2000s-projects.vercel.app/upload/success?slug=v-testtttt', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:149.0) Gecko/20100101 Firefox/149.0',
    'github_issue_created', 'https://github.com/wooduf2000/common-parts-access/issues/33', 33,
    'The issue causes significant user friction by failing to navigate to the expected destination, warranting high priority.'),
  ('d2578caf-0a80-4dfa-b030-d13f54b90510', '2026-04-03T07:14:06.035567+00:00',
    'd126b874-b56d-44a0-8e32-43530b830402', null, 'bug', 'Weird components on create new product form',
    'Hello, when I''m creating a new product on the form, the input fields "Brand", "Category" and "Description" are weird, not like the others.',
    'https://common-parts-access-744sppynd-wooduf2000s-projects.vercel.app/upload', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:149.0) Gecko/20100101 Firefox/149.0',
    'github_issue_created', 'https://github.com/wooduf2000/common-parts-access/issues/34', 34,
    'The issue describes a visual inconsistency in form fields, which is noticeable but does not block functionality.'),
  ('3f824a3f-6972-44e2-8a07-39bb9804f9a6', '2026-04-04T22:24:15.090351+00:00',
    null, null, 'bug', 'Bas navbar on mobile',
    'Ok mobile phone, the navbar is too big for the page, we see all buttons instead of a three bars menu',
    'https://common-parts-access-qk8lvtz9t-wooduf2000s-projects.vercel.app/', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3 Mobile/15E148 Safari/604.1',
    'github_issue_created', 'https://github.com/wooduf2000/common-parts-access/issues/43', 43,
    'Priority set to high due to significant mobile usability issue blocking content visibility.'),
  ('c99880d0-2e5e-49e1-87ba-17f8359c889c', '2026-04-04T22:27:33.726714+00:00',
    null, null, 'bug', 'Feedback button transparent and too big',
    'The feedback button is transparent and too big, on mobile it''s very ugly. Going on top of everything.',
    'https://common-parts-access-qk8lvtz9t-wooduf2000s-projects.vercel.app/', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3 Mobile/15E148 Safari/604.1',
    'github_issue_created', 'https://github.com/wooduf2000/common-parts-access/issues/44', 44,
    'Priority set to medium due to visual disruption but no functional impact.'),
  ('025ebf8b-610c-4d58-92ba-fdf50daa51a9', '2026-04-04T22:30:26.565824+00:00',
    null, null, 'bug', 'Weird footer on mobile',
    'On mobile, the elements in the footer are one under the others instead of one on the left and one on the right as on computer',
    'https://common-parts-access-qk8lvtz9t-wooduf2000s-projects.vercel.app/', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3 Mobile/15E148 Safari/604.1',
    'github_issue_created', 'https://github.com/wooduf2000/common-parts-access/issues/45', 45,
    'The issue describes a layout inconsistency between mobile and desktop views.'),
  ('f3805c6b-314e-4456-b961-9aa5ba75ac9e', '2026-04-04T22:33:45.714731+00:00',
    'd126b874-b56d-44a0-8e32-43530b830402', null, 'bug', 'Too long inputs on mobile',
    'On mobile, the dropdowns, combobox and some inputs are bigger than the cards they are in.',
    'https://common-parts-access-qk8lvtz9t-wooduf2000s-projects.vercel.app/upload', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3 Mobile/15E148 Safari/604.1',
    'github_issue_created', 'https://github.com/wooduf2000/common-parts-access/issues/46', 46,
    'The issue describes a visual layout problem on mobile where UI elements exceed their container bounds.'),
  ('cc6cac38-5f7f-491a-b6d8-811b414f974b', '2026-04-04T22:56:02.303684+00:00',
    'd126b874-b56d-44a0-8e32-43530b830402', null, 'bug', 'Upload failed',
    'When I try to upload a model, the upload fail. The button load, and then I stay on the upload page.',
    'https://access.commonparts.org/upload', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:149.0) Gecko/20100101 Firefox/149.0',
    'github_issue_created', 'https://github.com/wooduf2000/common-parts-access/issues/48', 48,
    'Priority set to high due to failed core functionality (upload) with a clear error message.'),
  ('e529855e-3b0f-428d-ac10-55927e80320b', '2026-04-07T17:07:31.781933+00:00',
    null, null, 'bug', 'erreur',
    'erreur pas de hachage',
    'https://access.commonparts.org/error?error=No%20token%20hash%20or%20type', 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/146.0.7680.151 Mobile/15E148 Safari/604.1',
    'github_issue_created', 'https://github.com/wooduf2000/common-parts-access/issues/53', 53,
    'The error suggests a critical authentication failure that prevents users from accessing the platform.')
on conflict (id) do nothing;
