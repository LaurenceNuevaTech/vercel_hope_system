// Sample data. Generated from a fixed seed relative to "today", so every reset
// gives the same story: 12 months of closed deals, statements to NuevaTech,
// open leads, listings waiting for approval and a full audit trail.

import { DEFAULT_CATEGORIES, DEFAULT_CMS, DEFAULT_ROLES, INTEGRATIONS, defaultSettings } from './catalog.js';
import { addDays, pad, rng, slugify, ym } from './format.js';
import { computeDeal } from './money.js';

export const DATA_VERSION = 7;

const iso = (d) => new Date(d).toISOString();

const STAFF = [
  { id: 'u_super', name: 'NuevaTech Administrator', email: 'superadmin@nuevatech.test', role: 'super_admin', phone: '0917 000 0001', teamId: null, title: 'System provider' },
  { id: 'u_owner', name: 'Esperanza Dela Cruz', email: 'owner@hope.test', role: 'owner', phone: '0917 000 4673', teamId: null, title: 'Owner & Broker', license: 'PRC REB 0012345' },
  { id: 'u_admin', name: 'Carlo Mendoza', email: 'admin@hope.test', role: 'admin', phone: '0917 100 2001', teamId: null, title: 'Operations Admin' },
  { id: 'u_mgr1', name: 'Rachel Villanueva', email: 'manager@hope.test', role: 'manager', phone: '0917 100 3001', teamId: 't1', title: 'Team Manager – Metro Manila', license: 'PRC REB 0023456' },
  { id: 'u_mgr2', name: 'Joseph Navarro', email: 'manager2@hope.test', role: 'manager', phone: '0917 100 3002', teamId: 't2', title: 'Team Manager – Cavite & Laguna', license: 'PRC REB 0034567' },
  { id: 'u_fin', name: 'Liza Ramos', email: 'finance@hope.test', role: 'finance', phone: '0917 100 4001', teamId: null, title: 'Finance Officer' },
  { id: 'u_editor', name: 'Bea Torres', email: 'editor@hope.test', role: 'editor', phone: '0917 100 5001', teamId: null, title: 'Content Editor' },
  { id: 'u_ag1', name: 'Miguel Reyes', email: 'agent@hope.test', role: 'agent', phone: '0917 200 1001', teamId: 't1', license: 'PRC RES 1012345', bio: 'Condos and rentals in BGC, Makati and Ortigas. 6 years with Hope.' },
  { id: 'u_ag2', name: 'Andrea Lim', email: 'agent2@hope.test', role: 'agent', phone: '0917 200 1002', teamId: 't1', license: 'PRC RES 1023456', sharePct: 65, bio: 'Top agent 2025. Luxury condos and family homes in Metro Manila.' },
  { id: 'u_ag3', name: 'Paolo Garcia', email: 'agent3@hope.test', role: 'agent', phone: '0917 200 1003', teamId: 't1', bio: 'Vehicles specialist: cars, SUVs and vans, with financing assistance.' },
  { id: 'u_ag4', name: 'Kristine Bautista', email: 'agent4@hope.test', role: 'agent', phone: '0917 200 2001', teamId: 't2', license: 'PRC RES 1034567', bio: 'House & lot and townhouses in Imus, Bacoor and Dasmariñas.' },
  { id: 'u_ag5', name: 'Ramon Aquino', email: 'agent5@hope.test', role: 'agent', phone: '0917 200 2002', teamId: 't2', bio: 'Lots, farm lots and rest houses in Silang and Tagaytay.' },
  { id: 'u_ag6', name: 'Jessa Castillo', email: 'agent6@hope.test', role: 'agent', phone: '0917 200 2003', teamId: 't2', bio: 'Laguna homes (Santa Rosa, Biñan, Calamba) and motorcycles.' },
];

const TEAMS = [
  { id: 't1', name: 'Team Metro Manila', managerId: 'u_mgr1', area: 'Makati, BGC, Pasig, Quezon City, Mandaluyong, Parañaque' },
  { id: 't2', name: 'Team Cavite & Laguna', managerId: 'u_mgr2', area: 'Imus, Bacoor, Dasmariñas, Silang, Tagaytay, Santa Rosa, Biñan, Calamba' },
];

const CUSTOMERS = [
  ['Ana Cruz', 'customer@demo.test', '0917 123 4567'], ['Jose Rizal Manalo', 'jose.manalo@mail.test', '0918 222 1100'], ['Grace Santos', 'grace.santos@mail.test', '0919 333 2211'],
  ['Mark Dizon', 'mark.dizon@mail.test', '0920 444 3322'], ['Joanna Perez', 'joanna.perez@mail.test', '0921 555 4433'], ['Rhea Salazar', 'rhea.salazar@mail.test', '0922 666 5544'],
  ['Kevin Tan', 'kevin.tan@mail.test', '0923 777 6655'], ['Patricia Gomez', 'patricia.gomez@mail.test', '0927 888 7766'], ['Dennis Ocampo', 'dennis.ocampo@mail.test', '0928 999 8877'],
  ['Lovely Fernandez', 'lovely.f@mail.test', '0929 111 9988'], ['Nathan Uy', 'nathan.uy@mail.test', '0930 222 0099'], ['Carmela Ramos', 'carmela.r@mail.test', '0931 333 1188'],
  ['Victor Lopez', 'victor.lopez@mail.test', '0932 444 2277'], ['Shiela Mae Torres', 'shiela.t@mail.test', '0933 555 3366'], ['Arnel Bautista', 'arnel.b@mail.test', '0934 666 4455'],
  ['Mica De Leon', 'mica.dl@mail.test', '0935 777 5544'], ['Ronald Sy', 'ronald.sy@mail.test', '0936 888 6633'], ['Hazel Villareal', 'hazel.v@mail.test', '0937 999 7722'],
  ['Christian Mercado', 'christian.m@mail.test', '0938 111 8811'], ['Diane Pascual', 'diane.p@mail.test', '0939 222 9900'], ['Erwin Cruz', 'erwin.c@mail.test', '0940 333 0011'],
  ['Frances Yap', 'frances.y@mail.test', '0941 444 1122'], ['Gilbert Reyes', 'gilbert.r@mail.test', '0942 555 2233'], ['Isabel Chua', 'isabel.c@mail.test', '0943 666 3344'],
];

// [category, purpose, title, city, barangay, price, unit, specs, features, agent, status, featured]
const P = (category, purpose, title, city, barangay, price, unit, specs, features, agentId, status = 'published', featured = false) => ({ category, purpose, title, city, barangay, price, unit, specs, features, agentId, status, featured });
const NEW = (...a) => ({ ...P(...a), condition: 'brand_new' });
const PRE = (...a) => ({ ...P(...a), condition: 'pre_selling' });
const house = (b, ba, fa, la, pk, furn = 'Unfurnished') => ({ bedrooms: b, bathrooms: ba, floorArea: fa, lotArea: la, parking: pk, furnishing: furn });
const unit = (b, ba, fa, pk, floor, furn = 'Unfurnished') => ({ bedrooms: b, bathrooms: ba, floorArea: fa, parking: pk, floorLevel: floor, furnishing: furn });
const lotSpec = (la, zoning = 'Residential') => ({ lotArea: la, zoning, title: 'Clean title (TCT)' });
const car = (make, model, year, mileage, transmission, fuel, bodyType, color) => ({ make, model, year, mileage, transmission, fuel, bodyType, color });

const ACTIVE = [
  NEW('house_lot', 'sale', 'Modern 3BR Single Detached House in Imus', 'Imus, Cavite', 'Anabu II', 6800000, 'total', house(3, 2, 120, 150, 1), ['Gated community', '24/7 security', 'Near school', 'Flood-free'], 'u_ag4', 'reserved', true),
  NEW('house_lot', 'sale', 'Corner House & Lot with Garden, Bacoor', 'Bacoor, Cavite', 'Molino III', 8950000, 'total', house(4, 3, 180, 220, 2), ['Garden', 'Gated community', 'Maid\'s room', 'Parking slot'], 'u_ag4', 'published', true),
  NEW('townhouse', 'sale', 'Affordable 2BR Townhouse near Dasmariñas Bayan', 'Dasmariñas, Cavite', 'Salitran', 3200000, 'total', house(2, 1, 60, 45, 1), ['Near school', 'Near mall'], 'u_ag4'),
  P('house_lot', 'sale', 'Tagaytay Ridge View Rest House', 'Tagaytay, Cavite', 'Kaybagal South', 14500000, 'total', house(3, 3, 160, 400, 3, 'Fully furnished'), ['Garden', 'Balcony', 'Fully furnished', 'Pet friendly'], 'u_ag5', 'published', true),
  P('lot', 'sale', 'Silang Residential Lot – 250 sqm, Clean Title', 'Silang, Cavite', 'Biga I', 3750000, 'total', lotSpec(250), ['Gated community', 'Flood-free'], 'u_ag5'),
  P('lot', 'sale', 'Farm Lot with Fruit Trees – 1,000 sqm', 'Silang, Cavite', 'Lalaan II', 4500000, 'total', lotSpec(1000, 'Agricultural'), ['Garden'], 'u_ag5', 'draft'),
  NEW('house_lot', 'sale', 'Santa Rosa 2-Storey Family Home near Nuvali', 'Santa Rosa, Laguna', 'Don Jose', 9800000, 'total', house(4, 3, 200, 180, 2), ['Clubhouse', 'Swimming pool', 'Gated community'], 'u_ag6', 'published', true),
  NEW('townhouse', 'sale', 'Biñan 3BR End-Unit Townhouse', 'Biñan, Laguna', 'Langkiwa', 4600000, 'total', house(3, 2, 85, 60, 1), ['Near school', 'Gated community'], 'u_ag6', 'pending'),
  P('commercial', 'sale', 'Commercial Lot along National Highway, Calamba', 'Calamba, Laguna', 'Real', 22000000, 'total', lotSpec(800, 'Commercial'), ['Flood-free'], 'u_ag6'),
  P('house_lot', 'rent', '3BR House for Rent in a Gated Subdivision, Imus', 'Imus, Cavite', 'Malagasang', 28000, 'month', house(3, 2, 110, 130, 1, 'Semi-furnished'), ['Gated community', 'Semi-furnished', 'Pet friendly'], 'u_ag4'),
  P('townhouse', 'rent', 'Townhouse near De La Salle Dasmariñas', 'Dasmariñas, Cavite', 'Zone IV', 12000, 'month', house(2, 1, 55, 40, 0, 'Semi-furnished'), ['Near school'], 'u_ag4', 'changes'),
  P('commercial', 'rent', 'Ground-floor Commercial Space, Bacoor', 'Bacoor, Cavite', 'Talaba', 45000, 'month', { floorArea: 90, parking: 2, zoning: 'Commercial' }, ['Parking slot', 'Flood-free'], 'u_mgr2'),
  P('car', 'sale', '2019 Toyota Fortuner 2.4 G AT', 'Imus, Cavite', 'Bucandala', 1380000, 'total', car('Toyota', 'Fortuner 2.4 G', 2019, 48000, 'Automatic', 'Diesel', 'SUV', 'Pearl White'), ['Casa maintained', 'First owner', 'Complete papers'], 'u_ag5', 'reserved'),
  P('motorcycle', 'sale', '2021 Honda Click 125i – Low Mileage', 'Dasmariñas, Cavite', 'Paliparan', 68000, 'total', car('Honda', 'Click 125i', 2021, 8200, 'Automatic', 'Gasoline', 'Scooter', 'Red'), ['Low mileage', 'Complete papers'], 'u_ag6'),
  P('car', 'sale', '2018 Mitsubishi Montero Sport GLS', 'Bacoor, Cavite', 'Niog', 1050000, 'total', car('Mitsubishi', 'Montero Sport GLS', 2018, 72000, 'Automatic', 'Diesel', 'SUV', 'Graphite Gray'), ['Complete papers', 'Dashcam', 'Reverse camera'], 'u_ag5'),
  P('motorcycle', 'sale', '2022 Yamaha NMAX 155 ABS', 'Santa Rosa, Laguna', 'Tagapo', 118000, 'total', car('Yamaha', 'NMAX 155', 2022, 5100, 'Automatic', 'Gasoline', 'Scooter', 'Matte Black'), ['Low mileage', 'First owner'], 'u_ag6', 'pending'),
  P('car', 'sale', '2020 Toyota Vios 1.3 XLE CVT', 'Imus, Cavite', 'Tanzang Luma', 585000, 'total', car('Toyota', 'Vios 1.3 XLE', 2020, 39000, 'Automatic', 'Gasoline', 'Sedan', 'Silver'), ['Casa maintained', 'Financing available'], 'u_ag4'),
  P('car', 'rent', 'Toyota Innova for Rent – with Driver Option', 'Dasmariñas, Cavite', 'Sampaloc', 3500, 'day', car('Toyota', 'Innova 2.8 E', 2022, 30000, 'Automatic', 'Diesel', 'MPV', 'Silver'), ['Casa maintained'], 'u_ag6'),
  NEW('condo', 'sale', '1BR Condo in BGC with Parking', 'Taguig (BGC)', 'Fort Bonifacio', 12500000, 'total', unit(1, 1, 55, 1, 21, 'Fully furnished'), ['Swimming pool', 'Gym', '24/7 security', 'Fully furnished', 'Parking slot'], 'u_ag2', 'reserved', true),
  P('condo', 'sale', 'Studio Unit near Ayala Avenue, Makati', 'Makati', 'Bel-Air', 6200000, 'total', unit(0, 1, 24, 0, 15), ['Gym', 'Swimming pool', '24/7 security'], 'u_ag1'),
  P('condo', 'sale', '2BR Corner Unit in Ortigas Center', 'Pasig', 'San Antonio', 9300000, 'total', unit(2, 2, 68, 1, 18, 'Semi-furnished'), ['Balcony', 'Gym', 'Swimming pool', 'Parking slot'], 'u_ag2', 'published', true),
  P('condo', 'sale', 'Pre-selling 1BR in Mandaluyong (2028 Turnover)', 'Mandaluyong', 'Highway Hills', 5400000, 'total', unit(1, 1, 32, 0, 12), ['Swimming pool', 'Gym', 'Near mall'], 'u_ag1', 'pending'),
  P('house_lot', 'sale', '4BR House near UP Diliman, Quezon City', 'Quezon City', 'Teachers Village', 18500000, 'total', house(4, 3, 240, 300, 2), ['Garden', 'Maid\'s room', 'Near school'], 'u_ag2'),
  NEW('townhouse', 'sale', 'Parañaque 3BR Townhouse with 2 Parking', 'Parañaque', 'BF Homes', 7900000, 'total', house(3, 3, 140, 90, 2), ['Gated community', 'Parking slot'], 'u_mgr1'),
  P('house_lot', 'sale', 'Alabang Hills Family Home with Pool', 'Muntinlupa (Alabang)', 'Cupang', 32000000, 'total', house(5, 5, 420, 500, 3), ['Swimming pool', 'Garden', 'Maid\'s room', 'Gated community', '24/7 security'], 'u_ag2', 'published', true),
  P('condo', 'rent', 'Fully-furnished 1BR for Rent, BGC', 'Taguig (BGC)', 'Fort Bonifacio', 55000, 'month', unit(1, 1, 50, 1, 27, 'Fully furnished'), ['Fully furnished', 'Gym', 'Swimming pool', 'Pet friendly'], 'u_ag1', 'reserved'),
  P('condo', 'rent', 'Studio for Rent in Makati CBD', 'Makati', 'San Lorenzo', 25000, 'month', unit(0, 1, 26, 0, 9, 'Fully furnished'), ['Fully furnished', 'Gym', 'Near mall'], 'u_ag1'),
  P('condo', 'rent', '2BR Semi-furnished in Ortigas', 'Pasig', 'Ugong', 38000, 'month', unit(2, 1, 60, 1, 11, 'Semi-furnished'), ['Semi-furnished', 'Swimming pool'], 'u_ag2'),
  P('house_lot', 'rent', '3BR House for Rent in Quezon City', 'Quezon City', 'Kamuning', 60000, 'month', house(3, 2, 150, 160, 2), ['Garden', 'Parking slot'], 'u_ag2', 'archived'),
  P('commercial', 'rent', '120 sqm Office Space in Makati', 'Makati', 'Legazpi Village', 150000, 'month', { floorArea: 120, parking: 2, zoning: 'Commercial', floorLevel: 8 }, ['24/7 security', 'Parking slot'], 'u_ag2', 'draft'),
  P('commercial', 'sale', 'Retail Space in Kapitolyo, Pasig', 'Pasig', 'Kapitolyo', 15000000, 'total', { floorArea: 95, parking: 1, zoning: 'Commercial' }, ['Parking slot'], 'u_mgr1'),
  P('car', 'sale', '2021 Honda Civic RS Turbo', 'Makati', 'Poblacion', 1250000, 'total', car('Honda', 'Civic RS Turbo', 2021, 28000, 'Automatic', 'Gasoline', 'Sedan', 'Rallye Red'), ['Casa maintained', 'Push start', 'Leather seats'], 'u_ag3', 'published', true),
  P('car', 'sale', '2017 Toyota Hiace GL Grandia', 'Quezon City', 'Cubao', 1200000, 'total', car('Toyota', 'Hiace GL Grandia', 2017, 95000, 'Manual', 'Diesel', 'Van', 'White'), ['Complete papers', 'New tires'], 'u_ag3'),
  P('car', 'sale', '2020 Ford Ranger Wildtrak 4x2', 'Pasig', 'Rosario', 1150000, 'total', car('Ford', 'Ranger Wildtrak', 2020, 51000, 'Automatic', 'Diesel', 'Pickup', 'Saber Orange'), ['Dashcam', 'Reverse camera', 'Complete papers'], 'u_ag3'),
  P('car', 'sale', '2016 Hyundai Accent CRDi', 'Quezon City', 'Novaliches', 380000, 'total', car('Hyundai', 'Accent CRDi', 2016, 110000, 'Manual', 'Diesel', 'Hatchback', 'Blue'), [], 'u_ag3', 'rejected'),
  P('car', 'sale', '2023 Toyota Raize 1.0 Turbo', 'Mandaluyong', 'Wack-Wack', 920000, 'total', car('Toyota', 'Raize 1.0 Turbo', 2023, 12000, 'Automatic', 'Gasoline', 'SUV', 'Turquoise'), ['First owner', 'Low mileage'], 'u_ag3', 'pending'),
  P('motorcycle', 'sale', '2020 Honda ADV 150', 'Makati', 'Guadalupe', 135000, 'total', car('Honda', 'ADV 150', 2020, 14000, 'Automatic', 'Gasoline', 'Scooter', 'Matte Gray'), ['Complete papers'], 'u_ag3'),
  P('car', 'rent', 'Toyota Vios for Rent – Self-drive', 'Pasig', 'Caniogan', 1800, 'day', car('Toyota', 'Vios 1.3 E', 2023, 18000, 'Automatic', 'Gasoline', 'Sedan', 'Gray'), ['Casa maintained'], 'u_ag3'),
  // Brand-new units (developers and dealers) — most of Hope's business
  NEW('house_lot', 'sale', 'Brand-new 3BR Single Attached House, Ready for Occupancy', 'Imus, Cavite', 'Alapan I', 5450000, 'total', house(3, 2, 98, 110, 1), ['Ready for occupancy', 'Developer unit', 'Gated community', 'Clubhouse', 'Bank / Pag-IBIG financing'], 'u_ag4', 'published', true),
  NEW('house_lot', 'sale', 'Brand-new 4BR Corner House & Lot near Nuvali', 'Santa Rosa, Laguna', 'Santo Domingo', 11200000, 'total', house(4, 3, 190, 200, 2), ['Ready for occupancy', 'Developer unit', 'Clubhouse', 'Swimming pool', 'Garden'], 'u_ag6', 'published', true),
  PRE('house_lot', 'sale', 'Pre-selling 3BR Single Detached (2027 turnover)', 'Dasmariñas, Cavite', 'Paliparan III', 6980000, 'total', house(3, 3, 120, 150, 1), ['Developer unit', 'Gated community', 'Clubhouse', 'Bank / Pag-IBIG financing'], 'u_ag4'),
  NEW('townhouse', 'sale', 'Brand-new 2-Storey Townhouse, Ready for Occupancy', 'Bacoor, Cavite', 'Molino VI', 4250000, 'total', house(3, 2, 82, 60, 1), ['Ready for occupancy', 'Developer unit', 'Gated community', 'Near mall'], 'u_ag5'),
  NEW('house_lot', 'sale', 'Brand-new Bungalow with Garden in Silang', 'Silang, Cavite', 'Lalaan I', 6750000, 'total', house(3, 2, 110, 200, 2), ['Ready for occupancy', 'Garden', 'Flood-free', 'Gated community'], 'u_ag5'),
  NEW('condo', 'sale', 'Brand-new Studio, Ready for Occupancy – Makati', 'Makati', 'Poblacion', 5900000, 'total', unit(0, 1, 26, 0, 22, 'Semi-furnished'), ['Ready for occupancy', 'Developer unit', 'Gym', 'Swimming pool'], 'u_ag1'),
  NEW('condo', 'sale', 'Brand-new 2BR with Balcony – Ortigas', 'Pasig', 'San Antonio', 10800000, 'total', unit(2, 2, 64, 1, 30), ['Ready for occupancy', 'Balcony', 'Gym', 'Swimming pool', 'Parking slot'], 'u_ag2', 'published', true),
  NEW('car', 'sale', 'Brand-new 2026 Toyota Vios 1.3 XLE CVT', 'Imus, Cavite', 'Bucandala', 1020000, 'total', car('Toyota', 'Vios 1.3 XLE CVT', 2026, 0, 'Automatic', 'Gasoline', 'Sedan', 'Red Mica'), ['Brand new', 'With warranty', 'Free PMS', 'Low down payment', 'Financing available'], 'u_ag3', 'published', true),
  NEW('car', 'sale', 'Brand-new 2026 Toyota Fortuner 2.8 LTD 4x4', 'Pasig', 'Ugong', 2390000, 'total', car('Toyota', 'Fortuner 2.8 LTD 4x4', 2026, 0, 'Automatic', 'Diesel', 'SUV', 'Attitude Black'), ['Brand new', 'With warranty', 'Free PMS', 'Financing available'], 'u_ag3', 'published', true),
  NEW('car', 'sale', 'Brand-new 2026 Mitsubishi Xpander GLS AT', 'Bacoor, Cavite', 'Niog', 1238000, 'total', car('Mitsubishi', 'Xpander GLS AT', 2026, 0, 'Automatic', 'Gasoline', 'MPV', 'Blade Silver'), ['Brand new', 'With warranty', 'Low down payment', 'Financing available'], 'u_ag5'),
  NEW('car', 'sale', 'Brand-new 2026 Ford Ranger Wildtrak 4x4', 'Quezon City', 'Cubao', 2050000, 'total', car('Ford', 'Ranger Wildtrak 4x4', 2026, 0, 'Automatic', 'Diesel', 'Pickup', 'Luxe Yellow'), ['Brand new', 'With warranty', 'Free PMS'], 'u_ag3', 'pending'),
  NEW('car', 'sale', 'Brand-new 2026 Honda City RS Hatchback', 'Makati', 'Guadalupe', 1180000, 'total', car('Honda', 'City RS Hatchback', 2026, 0, 'Automatic', 'Gasoline', 'Hatchback', 'Phoenix Orange'), ['Brand new', 'With warranty', 'Low down payment'], 'u_ag1'),
  NEW('car', 'sale', 'Brand-new 2026 Nissan Navara VL 4x4', 'Santa Rosa, Laguna', 'Balibago', 1895000, 'total', car('Nissan', 'Navara VL 4x4', 2026, 0, 'Automatic', 'Diesel', 'Pickup', 'Pearl White'), ['Brand new', 'With warranty', 'Financing available'], 'u_ag6'),
  NEW('motorcycle', 'sale', 'Brand-new 2026 Honda Click 160', 'Dasmariñas, Cavite', 'Salitran II', 126900, 'total', car('Honda', 'Click 160', 2026, 0, 'Automatic', 'Gasoline', 'Scooter', 'Pearl Red'), ['Brand new', 'With warranty', 'Low down payment'], 'u_ag6'),
  NEW('motorcycle', 'sale', 'Brand-new 2026 Yamaha NMAX 155 Tech Max', 'Imus, Cavite', 'Tanzang Luma', 163900, 'total', car('Yamaha', 'NMAX 155 Tech Max', 2026, 0, 'Automatic', 'Gasoline', 'Scooter', 'Matte Gray'), ['Brand new', 'With warranty', 'Low down payment'], 'u_ag4'),
  P('condo', 'sale', 'Studio Unit near Ayala Avenue, Makati (copy)', 'Makati', 'Bel-Air', 6200000, 'total', unit(0, 1, 24, 0, 15), ['Gym'], 'u_ag1', 'deleted'),
];

// Pool for the closed deals of the past 12 months.
const CLOSED_POOL = [
  ['house_lot', 'sale', 'Brand-new 3BR House & Lot', ['Imus, Cavite', 'Bacoor, Cavite', 'Dasmariñas, Cavite', 'Santa Rosa, Laguna'], [5.2e6, 9.8e6], 't2', 'brand_new'],
  ['townhouse', 'sale', 'Brand-new 2BR Townhouse', ['Dasmariñas, Cavite', 'Biñan, Laguna', 'Imus, Cavite'], [3.2e6, 5.2e6], 't2', 'brand_new'],
  ['condo', 'sale', 'Brand-new 1BR Condo', ['Taguig (BGC)', 'Makati', 'Pasig', 'Mandaluyong'], [5.5e6, 12e6], 't1', 'brand_new'],
  ['car', 'sale', 'Toyota Vios 1.3 XLE', ['Imus, Cavite', 'Quezon City', 'Pasig'], [960000, 1050000], 'any', 'brand_new'],
  ['car', 'sale', 'Mitsubishi Xpander GLS', ['Bacoor, Cavite', 'Makati'], [1.15e6, 1.3e6], 'any', 'brand_new'],
  ['car', 'sale', 'Toyota Fortuner 2.8 LTD', ['Pasig', 'Imus, Cavite'], [2.3e6, 2.45e6], 'any', 'brand_new'],
  ['motorcycle', 'sale', 'Honda Click 160', ['Dasmariñas, Cavite', 'Santa Rosa, Laguna'], [120000, 130000], 't2', 'brand_new'],
  ['house_lot', 'sale', '3BR House & Lot', ['Imus, Cavite', 'Bacoor, Cavite', 'Dasmariñas, Cavite', 'Santa Rosa, Laguna'], [4.2e6, 9.5e6], 't2'],
  ['lot', 'sale', 'Residential Lot', ['Silang, Cavite', 'Tagaytay, Cavite', 'Calamba, Laguna'], [1.8e6, 6.5e6], 't2'],
  ['condo', 'rent', 'Studio for Rent', ['Makati', 'Taguig (BGC)', 'Pasig'], [18000, 45000], 't1'],
  ['house_lot', 'rent', 'House for Rent', ['Imus, Cavite', 'Quezon City', 'Bacoor, Cavite'], [22000, 65000], 'any'],
  ['car', 'sale', 'Toyota Vios', ['Imus, Cavite', 'Quezon City', 'Pasig'], [420000, 690000], 'any'],
  ['house_lot', 'sale', '4BR Family Home', ['Quezon City', 'Parañaque', 'Muntinlupa (Alabang)'], [11e6, 24e6], 't1'],
];

const MESSAGES = {
  ask: ['Hi, is this still available?', 'Good day! Can I schedule a viewing this weekend?', 'Is the price still negotiable?', 'Hello, what are the payment terms? Bank financing possible?', 'Are pets allowed?', 'Can you send more photos of the kitchen and bathroom?', 'How much is the reservation fee?', 'Is the title clean? Any pending taxes?'],
  reply: ['Hello! Yes, it is still available. When would you like to view it?', 'Hi! The owner is open to reasonable offers. Let\'s talk after the viewing.', 'Good day! Bank financing is possible; I can help with the requirements.', 'Hi! I sent additional photos. Saturday 10 AM is open for viewing.', 'Yes, the title is clean and the taxes are updated. I can show copies at the viewing.'],
};

const DESCRIPTIONS = {
  property_new: '{ntitle}. Straight from the developer and ready for occupancy ({city}). Bank and Pag-IBIG financing available; Hope assists with the reservation, documents and turnover. Model unit viewing by appointment.',
  property_pre: '{title} in {city}. Pre-selling unit from the developer: low monthly down payment during construction, then bank or Pag-IBIG financing. Reserve early for the best price and unit choice.',
  vehicle_new: '{ntitle}, 0 km, with full manufacturer warranty and free periodic maintenance. Low down payment with partner banks; Hope handles the reservation, financing papers and release.',
  property: 'Well-kept {title} in {city}. Close to schools, malls and public transport. Documents are complete and the owner has signed an Authority to Sell with Hope. Viewing by appointment with your Hope account specialist.',
  vehicle: '{title}, {mileage} km. Regularly maintained, complete OR/CR, with deed of sale ready. Test drive and inspection by appointment. Financing assistance available through partner banks.',
};

function describe(l) {
  const t = DESCRIPTIONS[l.condition === 'brand_new' ? `${l.group}_new` : l.condition === 'pre_selling' && l.group === 'property' ? 'property_pre' : l.group] || DESCRIPTIONS[l.group];
  return t.replace('{ntitle}', /brand-new/i.test(l.title) ? l.title : `Brand-new ${l.title}`).replace('{title}', l.title).replace('{city}', l.city).replace('{mileage}', (l.specs.mileage || 0).toLocaleString());
}

export function defaultState() {
  const r = rng(20261108);
  const now = new Date();
  const settings = defaultSettings();
  const roles = structuredClone(DEFAULT_ROLES);
  const categories = structuredClone(DEFAULT_CATEGORIES);
  const groupOf = (cat) => categories.find((c) => c.key === cat)?.group || 'property';
  const counters = { listing: 0, deal: 0, receipt: 0, voucher: 0, statement: 0, ntReceipt: 0, ticket: 0 };
  const audit = [];
  const ips = ['112.198.24.17', '49.145.10.88', '180.190.33.2', '203.177.45.9', '120.29.110.54'];
  const devs = ['Chrome · Windows', 'Safari · iPhone', 'Hope app · Android', 'Hope app · iOS', 'Edge · Windows'];

  const staff = STAFF.map((s, i) => ({
    ...s, status: 'active', mfa: { enabled: true, setupAt: iso(addDays(now, -300 + i)) }, failed: 0, lockedUntil: null, lockCount: 0, lastLockAt: null,
    sharePct: s.sharePct ?? null, license: s.license || '', bio: s.bio || '', photo: null, joinedAt: iso(addDays(now, -420 + i * 9)), lastLoginAt: iso(addDays(now, -r.int(0, 3))),
  }));
  const staffById = Object.fromEntries(staff.map((s) => [s.id, s]));
  const teamOf = (id) => staffById[id]?.teamId;
  const managerOf = (id) => TEAMS.find((t) => t.id === teamOf(id))?.managerId;
  const actor = (id) => (id ? { type: 'staff', id, name: staffById[id].name, role: staffById[id].role } : { type: 'system', id: null, name: 'System', role: null });

  // Sample dates never lie in the future (e.g. a payout 12 days after a deal closed this week).
  const past = (d) => new Date(Math.min(new Date(d).getTime(), now.getTime() - 3600000));
  const log = (at, actorObj, event, description, extra = {}) => audit.push({
    id: `a${audit.length + 1}`, at: iso(past(at)), actor: actorObj, event, description, severity: extra.severity || 'info',
    subject: extra.subject || null, changes: extra.changes || null, ip: extra.ip || r.pick(ips), device: extra.device || r.pick(devs), channel: extra.channel || 'admin',
  });

  const customers = CUSTOMERS.map(([name, email, mobile], i) => ({
    id: `c${i + 1}`, name, email, mobile, status: 'active', verified: true, createdAt: iso(addDays(now, -360 + i * 13)),
    favourites: [], failed: 0, lockedUntil: null, lockCount: 0, lastLockAt: null, source: i % 3 === 0 ? 'mobile' : 'web', lastLoginAt: iso(addDays(now, -r.int(0, 20))),
  }));

  // ------------------------------------------------------------ listings
  const listings = [];
  const mkListing = (t, createdAt, extra = {}) => {
    counters.listing += 1;
    const group = groupOf(t.category);
    const code = `${settings.listings.workflow.codePrefix}-${new Date(createdAt).getFullYear()}-${pad(counters.listing)}`;
    const l = {
      id: `l${counters.listing}`, code, slug: `${slugify(t.title)}-${counters.listing}`, title: t.title, purpose: t.purpose, category: t.category, group,
      price: t.price, priceUnit: t.unit, negotiable: r.chance(0.6), city: t.city, barangay: t.barangay, address: `Lot ${r.int(1, 40)} Blk ${r.int(1, 20)}, Brgy. ${t.barangay}, ${t.city}`,
      specs: t.specs, features: t.features, description: '', photos: [], artSeed: counters.listing * 3 + 1,
      agentId: t.agentId, teamId: teamOf(t.agentId), ownerName: r.pick(['Mr. & Mrs. Santos', 'Dr. R. Lacson', 'L. Fernandez', 'Spouses Garcia', 'A. Villanueva', 'M. Dimaculangan', 'R. Uy']), ownerPhone: `0917 ${r.int(100, 999)} ${r.int(1000, 9999)}`,
      authority: { type: r.chance(0.6) ? 'Exclusive' : 'Non-exclusive', file: 'Authority-to-Sell.pdf', validUntil: iso(addDays(createdAt, 180)) },
      condition: t.condition || (/pre-selling/i.test(t.title) ? 'pre_selling' : 'pre_owned'),
      status: t.status, featured: !!t.featured, views: 0, shares: { link: 0, facebook: 0, messenger: 0, viber: 0, qr: 0 },
      createdAt: iso(createdAt), createdBy: t.agentId, submittedAt: null, approvedAt: null, approvedBy: null, publishedAt: null, expiresAt: null,
      updatedAt: iso(createdAt), updatedBy: t.agentId, review: null, deleted: null, ...extra,
    };
    l.description = describe(l);
    listings.push(l);
    return l;
  };

  const approverFor = (agentId) => {
    const m = managerOf(agentId);
    return m && m !== agentId ? m : 'u_admin';
  };

  const publish = (l, createdAt, daysToApprove = 1) => {
    const sub = addDays(createdAt, 0.2);
    const appr = addDays(createdAt, daysToApprove);
    const by = approverFor(l.agentId);
    l.submittedAt = iso(sub); l.approvedAt = iso(appr); l.approvedBy = by; l.publishedAt = iso(appr);
    l.expiresAt = iso(addDays(appr, settings.listings.workflow.validityDays));
    l.review = { decision: 'approved', by, at: iso(appr), note: 'Documents and photos checked.' };
    const subj = { type: 'listing', id: l.id, label: `${l.code} · ${l.title}` };
    log(createdAt, actor(l.agentId), 'listing.created', `Created listing ${l.code} "${l.title}"`, { subject: subj });
    log(sub, actor(l.agentId), 'listing.submitted', `Submitted ${l.code} for approval`, { subject: subj });
    log(appr, actor(by), 'listing.approved', `Approved and published ${l.code}`, { subject: subj });
  };

  // Active and in-review listings
  ACTIVE.forEach((t, i) => {
    const created = addDays(now, -r.int(5, 80));
    const l = mkListing(t, created);
    const subj = { type: 'listing', id: l.id, label: `${l.code} · ${l.title}` };
    if (['published', 'reserved', 'archived'].includes(t.status) || t.status === 'deleted') {
      publish(l, created, r.int(1, 2));
      l.views = r.int(120, 2600); l.shares = { link: r.int(2, 40), facebook: r.int(3, 90), messenger: r.int(1, 30), viber: r.int(0, 15), qr: r.int(0, 8) };
      if (i % 4 === 1) {
        const old = Math.round(l.price * 1.06 / 1000) * 1000;
        const at = addDays(created, 3);
        log(at, actor(l.agentId), 'listing.updated', `Updated ${l.code}: price`, { subject: subj, changes: [{ field: 'price', label: 'Price', from: old, to: l.price }] });
        l.updatedAt = iso(at);
      }
      if (i % 5 === 2) {
        const at = addDays(created, 4);
        log(at, actor(l.agentId), 'listing.updated', `Updated ${l.code}: description, photos`, { subject: subj, changes: [{ field: 'description', label: 'Description', from: '(shorter text)', to: '(new text)' }, { field: 'photos', label: 'Photos', from: '3 photos', to: '4 photos' }] });
      }
    }
    if (t.status === 'pending') {
      l.submittedAt = iso(addDays(created, 0.3));
      l.createdAt = iso(addDays(now, -r.int(0, 3)));
      log(new Date(l.createdAt), actor(l.agentId), 'listing.created', `Created listing ${l.code} "${l.title}"`, { subject: subj });
      log(new Date(l.createdAt), actor(l.agentId), 'listing.submitted', `Submitted ${l.code} for approval`, { subject: subj });
    }
    if (t.status === 'changes') {
      const by = approverFor(l.agentId);
      l.submittedAt = iso(addDays(created, 0.3));
      l.review = { decision: 'changes', by, at: iso(addDays(created, 1)), note: 'Photos are dark and the Authority to Lease is missing. Please re-upload and add the floor area.' };
      log(created, actor(l.agentId), 'listing.created', `Created listing ${l.code} "${l.title}"`, { subject: subj });
      log(addDays(created, 1), actor(by), 'listing.changes_requested', `Requested changes on ${l.code}: ${l.review.note}`, { subject: subj, severity: 'warning' });
    }
    if (t.status === 'rejected') {
      const by = approverFor(l.agentId);
      l.review = { decision: 'rejected', by, at: iso(addDays(created, 1)), note: 'The owner could not show the OR/CR. We cannot list the vehicle without complete papers.' };
      log(created, actor(l.agentId), 'listing.created', `Created listing ${l.code} "${l.title}"`, { subject: subj });
      log(addDays(created, 1), actor(by), 'listing.rejected', `Rejected ${l.code}: ${l.review.note}`, { subject: subj, severity: 'warning' });
    }
    if (t.status === 'draft') log(created, actor(l.agentId), 'listing.created', `Created draft ${l.code} "${l.title}"`, { subject: subj });
    if (t.status === 'archived') {
      const at = addDays(now, -4);
      log(at, actor(l.agentId), 'listing.archived', `Archived ${l.code}: the owner withdrew the property`, { subject: subj, changes: [{ field: 'status', label: 'Status', from: 'published', to: 'archived' }] });
    }
    if (t.status === 'deleted') {
      l.status = 'published';
      l.deleted = { at: iso(addDays(now, -2)), by: 'u_mgr1', reason: 'Duplicate of the Studio Unit near Ayala Avenue listing.' };
      log(addDays(now, -2), actor('u_mgr1'), 'listing.deleted', `Moved ${l.code} to Trash: ${l.deleted.reason}`, { subject: subj, severity: 'warning' });
    }
  });

  // ------------------------------------------------------------ closed deals (past 12 months)
  const inquiries = []; const viewings = []; const deals = []; const payments = []; const commissions = []; const fees = []; const statements = [];
  let inqN = 0; let vwN = 0; let payN = 0;
  const agentsOfTeam = (team) => staff.filter((s) => s.role === 'agent' && (team === 'any' || s.teamId === team)).map((s) => s.id);

  const addPayment = (deal, kind, amount, at, method, byId, payer, online = false) => {
    counters.receipt += 1; payN += 1;
    const p = { id: `p${payN}`, no: `${settings.brand.documents.receiptPrefix}-${pad(counters.receipt, 6)}`, dealId: deal.id, customerId: kind === 'commission' ? null : deal.customerId, payer, kind, amount, method, ref: method === 'Cash' ? '' : `REF${r.int(100000, 999999)}`, at: iso(past(at)), receivedBy: byId, online, void: null };
    payments.push(p);
    log(at, online ? { type: 'customer', id: deal.customerId, name: payer, role: null } : actor(byId), 'payment.recorded', `Receipt ${p.no}: ₱${amount.toLocaleString()} ${kind.replace('_', ' ')} for ${deal.code}`, { subject: { type: 'deal', id: deal.id, label: deal.code }, channel: online ? 'mobile' : 'admin' });
    return p;
  };

  const mkInquiry = (l, cust, created, stage, source) => {
    inqN += 1;
    const msgs = [{ id: `m${inqN}a`, from: 'customer', text: r.pick(MESSAGES.ask), at: iso(created) }];
    if (stage !== 'new') msgs.push({ id: `m${inqN}b`, from: 'agent', staffId: l.agentId, text: r.pick(MESSAGES.reply), at: iso(addDays(created, r.int(1, 8) / 24)) });
    const q = { id: `q${inqN}`, listingId: l.id, customerId: cust.id, agentId: l.agentId, teamId: l.teamId, stage, source, createdAt: iso(created), updatedAt: msgs[msgs.length - 1].at, firstReplyAt: msgs[1]?.at || null, messages: msgs, lostReason: stage === 'lost' ? r.pick(['Bought elsewhere', 'Budget too low', 'No response from customer', 'Financing not approved']) : null };
    inquiries.push(q);
    return q;
  };

  const months = 12;
  for (let k = months - 1; k >= 0; k--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - k, 1);
    const count = k === 0 ? 2 : 2 + Math.round((months - k) / 4) + (r.chance(0.4) ? 1 : 0);
    for (let j = 0; j < count; j++) {
      const t = r.pick(CLOSED_POOL);
      const [category, purpose, base, cities, [lo, hi], team, condition = 'pre_owned'] = t;
      const isNew = condition === 'brand_new';
      const agentId = r.pick(agentsOfTeam(team));
      const price = purpose === 'rent' ? Math.round((lo + r() * (hi - lo)) / 500) * 500 : Math.round((lo + r() * (hi - lo)) / 10000) * 10000;
      const city = r.pick(cities);
      const maxDay = k === 0 ? Math.max(1, now.getDate() - 1) : 26;
      const closedAt = new Date(monthStart.getFullYear(), monthStart.getMonth(), r.int(1, maxDay), r.int(9, 17), r.int(0, 59));
      const created = addDays(closedAt, -r.int(25, 70));
      const g = groupOf(category);
      const specs = g === 'vehicle' ? car(base.split(' ')[0], base.split(' ').slice(1).join(' '), isNew ? closedAt.getFullYear() : 2017 + r.int(0, 6), isNew ? 0 : r.int(8, 90) * 1000, 'Automatic', 'Gasoline', category === 'motorcycle' ? 'Scooter' : 'Sedan', r.pick(['White', 'Silver', 'Black', 'Red'])) : category === 'lot' ? lotSpec(r.int(120, 600)) : category === 'condo' ? unit(r.int(0, 2), 1, r.int(22, 70), r.int(0, 1), r.int(5, 30)) : house(r.int(2, 4), r.int(1, 3), r.int(60, 220), r.int(45, 300), r.int(0, 2));
      const title = `${g === 'vehicle' ? `${isNew ? 'Brand-new ' : ''}${specs.year} ` : ''}${base} in ${city.split(',')[0]}`;
      const l = mkListing({ condition, category, purpose, title, city, barangay: r.pick(['Poblacion', 'San Isidro', 'Santo Niño', 'Bagong Silang', 'San Jose']), price, unit: purpose === 'rent' ? 'month' : 'total', specs, features: [], agentId, status: purpose === 'rent' ? 'rented' : 'sold' }, created);
      publish(l, created, r.int(1, 3));
      l.views = r.int(200, 3000); l.shares = { link: r.int(2, 30), facebook: r.int(5, 80), messenger: r.int(1, 25), viber: r.int(0, 10), qr: r.int(0, 5) };
      const cust = r.pick(customers);
      const src = r.pick(['web', 'mobile', 'facebook', 'facebook', 'messenger', 'referral', 'walk_in', 'qr']);
      const q = mkInquiry(l, cust, addDays(created, r.int(2, 12)), 'won', src);
      vwN += 1;
      viewings.push({ id: `v${vwN}`, inquiryId: q.id, listingId: l.id, customerId: cust.id, agentId, at: iso(addDays(new Date(q.createdAt), r.int(2, 6))), status: 'done', notes: 'Client liked the place.', createdAt: q.createdAt });

      counters.deal += 1;
      const reservedAt = addDays(closedAt, -r.int(7, 20));
      const deal = {
        id: `d${counters.deal}`, code: `DL-${reservedAt.getFullYear()}-${pad(counters.deal)}`, listingId: l.id, inquiryId: q.id, customerId: cust.id, agentId, managerId: managerOf(agentId), teamId: teamOf(agentId), category, feeOverride: null, source: src,
        type: purpose, group: g, price, unit: l.priceUnit, leaseMonths: purpose === 'rent' ? 12 : null, days: null, scheme: purpose === 'rent' ? 'Lease' : r.pick(['Cash', 'Bank financing', 'Pag-IBIG', 'Cash']),
        status: 'closed', reservedAt: iso(reservedAt), closedAt: iso(closedAt), closedBy: managerOf(agentId), cancelledAt: null, cancelReason: null, rateOverride: null,
        sellerName: l.ownerName, notes: '', createdBy: agentId, createdAt: iso(reservedAt),
        documents: [{ name: 'Reservation agreement', done: true }, { name: purpose === 'rent' ? 'Lease contract' : 'Deed of Absolute Sale', done: true }, { name: 'Valid IDs', done: true }, { name: purpose === 'rent' ? 'Post-dated checks' : 'Transfer documents', done: true }],
      };
      deal.computation = computeDeal(deal, settings, { agent: staffById[agentId], hasManager: !!deal.managerId });
      deals.push(deal);
      const dsubj = { type: 'deal', id: deal.id, label: `${deal.code} · ${l.title}` };
      log(reservedAt, actor(agentId), 'deal.created', `Created deal ${deal.code} for ${l.code} (${cust.name}) · source: ${src}`, { subject: dsubj });
      if (purpose === 'sale') {
        addPayment(deal, 'reservation', g === 'vehicle' ? 10000 : 20000, reservedAt, r.pick(['GCash', 'Bank transfer', 'Online (PayMongo)']), agentId, cust.name, r.chance(0.3));
      } else {
        addPayment(deal, 'deposit', price * 2, addDays(reservedAt, 2), 'Bank transfer', agentId, cust.name);
        addPayment(deal, 'advance', price, addDays(reservedAt, 2), 'Bank transfer', agentId, cust.name);
      }
      const collected = k >= 1 || r.chance(0.5);
      if (collected) addPayment(deal, 'commission', deal.computation.gross, addDays(closedAt, r.int(1, 6)), 'Bank transfer', 'u_fin', deal.sellerName);
      l.status = purpose === 'rent' ? 'rented' : 'sold';
      log(closedAt, actor(deal.closedBy), 'deal.closed', `Closed ${deal.code}: ${purpose === 'rent' ? 'rented' : 'sold'} at ₱${price.toLocaleString()}. Commission ₱${deal.computation.gross.toLocaleString()}`, { subject: dsubj });

      // commissions
      const parts = [['agent', agentId, deal.computation.agentShare, deal.computation.agentWht, deal.computation.agentNet]];
      if (deal.computation.managerShare > 0) parts.push(['manager', deal.managerId, deal.computation.managerShare, deal.computation.managerWht, deal.computation.managerNet]);
      for (const [role, sid, gross, wht, net] of parts) {
        counters.voucher += 1;
        const status = !collected ? 'pending' : k >= 2 ? 'paid' : k === 1 ? r.pick(['paid', 'approved']) : 'for_approval';
        const cm = { id: `cm${counters.voucher}`, no: `${settings.brand.documents.voucherPrefix}-${pad(counters.voucher, 5)}`, dealId: deal.id, staffId: sid, role, gross, wht, net, status, createdAt: iso(closedAt), approvedBy: ['approved', 'paid'].includes(status) ? 'u_fin' : null, approvedAt: ['approved', 'paid'].includes(status) ? iso(past(addDays(closedAt, 7))) : null, paidBy: status === 'paid' ? 'u_fin' : null, paidAt: status === 'paid' ? iso(past(addDays(closedAt, 12))) : null };
        commissions.push(cm);
        if (cm.paidAt) log(new Date(cm.paidAt), actor('u_fin'), 'commission.paid', `Paid commission ${cm.no} to ${staffById[sid].name}: ₱${net.toLocaleString()}`, { subject: dsubj });
      }
      // platform fee
      if (deal.computation.platformFee > 0) fees.push({ id: `f${deals.length}`, dealId: deal.id, source: deal.source, amount: deal.computation.platformFee, basis: deal.computation.platformBasis, month: ym(closedAt), closedAt: iso(closedAt), status: 'unbilled', statementId: null });
      q.stage = 'won';
    }
  }

  // Statements of account from NuevaTech for the past months
  const monthsWithFees = [...new Set(fees.map((f) => f.month))].sort();
  monthsWithFees.forEach((m) => {
    const [y, mo] = m.split('-').map(Number);
    const issued = new Date(y, mo, 1, 9, 0);
    if (issued > now) return; // current month: not billed yet
    counters.statement += 1;
    const items = fees.filter((f) => f.month === m);
    const total = Math.round(items.reduce((a, f) => a + f.amount, 0) * 100) / 100;
    const due = addDays(issued, settings.platform.billing.dueDays);
    const isLast = issued.getMonth() === now.getMonth() && issued.getFullYear() === now.getFullYear();
    const st = { id: `st${counters.statement}`, no: `SOA-${m}`, period: m, feeIds: items.map((f) => f.id), total, issuedAt: iso(issued), dueAt: iso(due), status: isLast ? 'issued' : 'paid', payments: [], confirmedAt: null, confirmedBy: null, receiptNo: null };
    items.forEach((f) => { f.status = isLast ? 'billed' : 'paid'; f.statementId = st.id; });
    log(issued, actor('u_super'), 'billing.statement_issued', `Issued ${st.no} to Hope: ₱${total.toLocaleString()} (${items.length} deal${items.length === 1 ? '' : 's'})`, { subject: { type: 'statement', id: st.id, label: st.no } });
    if (!isLast) {
      const paidAt = past(addDays(issued, r.int(3, 12)));
      st.payments.push({ id: `sp${st.id}`, amount: total, method: 'Bank transfer', ref: `BPI${r.int(100000, 999999)}`, at: iso(paidAt), by: 'u_owner', note: '' });
      counters.ntReceipt += 1;
      st.confirmedAt = iso(addDays(paidAt, 1)); st.confirmedBy = 'u_super'; st.receiptNo = `NT-OR-${pad(counters.ntReceipt, 5)}`;
      log(paidAt, actor('u_owner'), 'billing.payment_submitted', `Submitted payment ₱${total.toLocaleString()} for ${st.no}`, { subject: { type: 'statement', id: st.id, label: st.no } });
      log(addDays(paidAt, 1), actor('u_super'), 'billing.payment_confirmed', `Confirmed payment for ${st.no}; receipt ${st.receiptNo}`, { subject: { type: 'statement', id: st.id, label: st.no } });
    }
    statements.push(st);
  });

  // ------------------------------------------------------------ open deals on reserved listings
  listings.filter((l) => l.status === 'reserved').forEach((l, i) => {
    const cust = customers[i === 0 ? 0 : i + 3];
    const q = mkInquiry(l, cust, addDays(now, -r.int(12, 25)), 'reserved', i === 0 ? 'facebook' : r.pick(['web', 'mobile']));
    q.messages.push({ id: `${q.id}c`, from: 'customer', text: 'Thank you! We would like to reserve.', at: iso(addDays(now, -9)) });
    vwN += 1;
    viewings.push({ id: `v${vwN}`, inquiryId: q.id, listingId: l.id, customerId: cust.id, agentId: l.agentId, at: iso(addDays(now, -10)), status: 'done', notes: 'Ready to reserve.', createdAt: q.createdAt });
    counters.deal += 1;
    const reservedAt = addDays(now, -r.int(3, 8));
    const deal = {
      id: `d${counters.deal}`, code: `DL-${reservedAt.getFullYear()}-${pad(counters.deal)}`, listingId: l.id, inquiryId: q.id, customerId: cust.id, agentId: l.agentId, managerId: managerOf(l.agentId), teamId: l.teamId, category: l.category, feeOverride: null, source: q.source,
      type: l.purpose, group: l.group, price: l.purpose === 'sale' ? Math.round(l.price * 0.97 / 10000) * 10000 : l.price, unit: l.priceUnit, leaseMonths: l.purpose === 'rent' ? 12 : null, days: null,
      scheme: l.purpose === 'rent' ? 'Lease' : i === 0 ? 'Pag-IBIG' : 'Bank financing', status: i % 2 ? 'processing' : 'reserved', reservedAt: iso(reservedAt), closedAt: null, closedBy: null, cancelledAt: null, cancelReason: null, rateOverride: null,
      sellerName: l.ownerName, notes: '', createdBy: l.agentId, createdAt: iso(reservedAt), computation: null,
      documents: [{ name: 'Reservation agreement', done: true }, { name: l.purpose === 'rent' ? 'Lease contract' : 'Deed of Absolute Sale', done: i % 2 === 1 }, { name: 'Valid IDs', done: true }, { name: l.purpose === 'rent' ? 'Post-dated checks' : 'Loan approval / proof of funds', done: false }],
    };
    deals.push(deal);
    log(reservedAt, actor(l.agentId), 'deal.created', `Created deal ${deal.code} for ${l.code} (${cust.name})`, { subject: { type: 'deal', id: deal.id, label: deal.code } });
    log(reservedAt, actor(l.agentId), 'listing.reserved', `${l.code} marked Reserved`, { subject: { type: 'listing', id: l.id, label: `${l.code} · ${l.title}` }, changes: [{ field: 'status', label: 'Status', from: 'published', to: 'reserved' }] });
    if (l.purpose === 'sale') addPayment(deal, 'reservation', l.group === 'vehicle' ? 10000 : 20000, reservedAt, i === 0 ? 'Online (PayMongo)' : 'GCash', l.agentId, cust.name, i === 0);
    else addPayment(deal, 'deposit', l.price * 2, reservedAt, 'Bank transfer', l.agentId, cust.name);
  });

  // One cancelled deal
  {
    const l = listings.find((x) => x.status === 'published' && x.category === 'condo');
    const cust = customers[6];
    const q = mkInquiry(l, cust, addDays(now, -40), 'lost', 'web');
    q.lostReason = 'Financing not approved';
    counters.deal += 1;
    deals.push({ id: `d${counters.deal}`, code: `DL-${now.getFullYear()}-${pad(counters.deal)}`, listingId: l.id, inquiryId: q.id, customerId: cust.id, agentId: l.agentId, managerId: managerOf(l.agentId), teamId: l.teamId, category: l.category, feeOverride: null, source: q.source, type: 'sale', group: 'property', price: l.price, unit: 'total', leaseMonths: null, days: null, scheme: 'Bank financing', status: 'cancelled', reservedAt: iso(addDays(now, -35)), closedAt: null, closedBy: null, cancelledAt: iso(addDays(now, -15)), cancelReason: 'Bank loan was not approved. Reservation fee forfeited per agreement.', rateOverride: null, sellerName: l.ownerName, notes: '', createdBy: l.agentId, createdAt: iso(addDays(now, -35)), computation: null, documents: [] });
    log(addDays(now, -15), actor(managerOf(l.agentId)), 'deal.cancelled', `Cancelled ${deals[deals.length - 1].code}: bank loan not approved`, { subject: { type: 'deal', id: `d${counters.deal}`, label: deals[deals.length - 1].code }, severity: 'warning' });
  }

  // ------------------------------------------------------------ open leads on published listings
  const live = listings.filter((l) => l.status === 'published' && !l.deleted);
  const stages = ['new', 'new', 'new', 'new', 'new', 'new', 'contacted', 'contacted', 'contacted', 'contacted', 'contacted', 'contacted', 'contacted', 'viewing', 'viewing', 'viewing', 'viewing', 'viewing', 'viewing', 'negotiating', 'negotiating', 'negotiating', 'negotiating', 'lost', 'lost', 'lost', 'lost', 'lost'];
  stages.forEach((stage, i) => {
    const l = live[i % live.length];
    const cust = customers[(i * 5 + 1) % customers.length];
    const created = stage === 'new' ? addDays(now, -r.int(0, 2) - r() * 0.8) : addDays(now, -r.int(3, 30));
    const q = mkInquiry(l, cust, created, stage, r.pick(['web', 'mobile', 'facebook', 'messenger', 'viber', 'qr', 'web', 'mobile']));
    if (i === 0) { q.customerId = 'c1'; q.messages[0].text = 'Hi! Is the house still available? We are a family of four. Can we view it this Saturday?'; }
    if (stage === 'viewing' || stage === 'negotiating') {
      vwN += 1;
      const at = stage === 'viewing' ? addDays(now, r.int(-1, 6)) : addDays(now, -r.int(2, 8));
      at.setHours(r.pick([9, 10, 13, 14, 15, 16]), 0, 0, 0);
      viewings.push({ id: `v${vwN}`, inquiryId: q.id, listingId: l.id, customerId: q.customerId, agentId: l.agentId, at: iso(at), status: at > now ? (r.chance(0.7) ? 'confirmed' : 'requested') : 'done', notes: '', createdAt: q.createdAt });
    }
  });
  // Ana (customer@demo.test): favourites, one inquiry with a viewing
  customers[0].favourites = live.slice(0, 4).map((l) => l.id);
  {
    const l = live.find((x) => x.category === 'condo' && x.purpose === 'rent') || live[2];
    const q = mkInquiry(l, customers[0], addDays(now, -3), 'viewing', 'mobile');
    q.messages.push({ id: `${q.id}c`, from: 'customer', text: 'Saturday 10 AM works for us. Thank you!', at: iso(addDays(now, -2)) });
    vwN += 1;
    const at = addDays(now, 2); at.setHours(10, 0, 0, 0);
    viewings.push({ id: `v${vwN}`, inquiryId: q.id, listingId: l.id, customerId: 'c1', agentId: l.agentId, at: iso(at), status: 'confirmed', notes: 'Bring a valid ID.', createdAt: q.createdAt });
  }

  // ------------------------------------------------------------ owner submissions ("Sell with Hope")
  const submissions = [
    { id: 'sb1', customerId: 'c3', kind: 'house_lot', purpose: 'sale', title: '3BR bungalow in Imus', city: 'Imus, Cavite', price: 5200000, details: '150 sqm lot, 90 sqm floor area. Clean title. Moving abroad.', status: 'new', assignedTo: null, listingId: null, createdAt: iso(addDays(now, -1)), notes: [] },
    { id: 'sb2', customerId: 'c8', kind: 'car', purpose: 'sale', title: '2019 Honda City VX', city: 'Bacoor, Cavite', price: 690000, details: '45,000 km, first owner, casa maintained.', status: 'assigned', assignedTo: 'u_ag5', listingId: null, createdAt: iso(addDays(now, -4)), notes: [{ at: iso(addDays(now, -3)), by: 'u_mgr2', text: 'Assigned to Ramon. Please call the owner within 24 hours.' }] },
    { id: 'sb3', customerId: 'c11', kind: 'condo', purpose: 'rent', title: 'Studio in Makati for lease', city: 'Makati', price: 22000, details: 'Fully furnished, 24 sqm. Available next month.', status: 'declined', assignedTo: null, listingId: null, createdAt: iso(addDays(now, -20)), notes: [{ at: iso(addDays(now, -19)), by: 'u_mgr1', text: 'Declined: the owner is not the registered owner and has no SPA.' }] },
  ];

  // ------------------------------------------------------------ notifications
  const notifications = [
    { id: 'n1', to: { type: 'customer', id: 'c1' }, title: 'Viewing confirmed', body: 'Your viewing is confirmed for Saturday 10:00 AM.', link: '/account/viewings', at: iso(addDays(now, -2)), read: false },
    { id: 'n2', to: { type: 'customer', id: 'c1' }, title: 'Payment received', body: 'Receipt for your reservation fee is ready.', link: '/account/deals', at: iso(addDays(now, -6)), read: true },
    { id: 'n3', to: { type: 'staff', id: 'u_mgr1' }, title: 'Listings waiting for approval', body: '2 listings from your team are waiting for your review.', link: '/admin/approvals', at: iso(addDays(now, -0.2)), read: false },
    { id: 'n4', to: { type: 'staff', id: 'u_owner' }, title: 'NuevaTech statement issued', body: 'The statement for last month is ready.', link: '/admin/billing', at: iso(new Date(now.getFullYear(), now.getMonth(), 1, 9)), read: false },
  ];

  // ------------------------------------------------------------ other audit events
  log(addDays(now, -60), actor('u_owner'), 'settings.updated', 'Changed Commission & splits → Agent share', { subject: { type: 'settings', id: 'commission', label: 'Commission & splits' }, changes: [{ field: 'commission.splits.agentPct', label: 'Agent share', from: '55%', to: '60%' }] });
  log(addDays(now, -45), actor('u_super'), 'settings.updated', 'Changed NuevaTech platform fee → Rate', { subject: { type: 'settings', id: 'platform', label: 'NuevaTech platform fee' }, changes: [{ field: 'platform.fee.ratePct', label: 'Rate', from: '3%', to: '5%' }] });
  log(addDays(now, -30), actor('u_admin'), 'integration.enabled', 'Switched on Semaphore (SMS) after a successful test', { subject: { type: 'integration', id: 'sms', label: 'Semaphore' } });
  log(addDays(now, -6), { type: 'guest', id: null, name: 'Guest', role: null }, 'auth.login.failed', 'Incorrect password for agent3@hope.test', { severity: 'warning', channel: 'admin' });
  log(addDays(now, -6), { type: 'guest', id: null, name: 'Guest', role: null }, 'auth.login.failed', 'Incorrect password for agent3@hope.test', { severity: 'warning', channel: 'admin' });
  log(addDays(now, -6), { type: 'guest', id: null, name: 'Guest', role: null }, 'auth.login.failed', 'Incorrect password for agent3@hope.test', { severity: 'warning', channel: 'admin' });
  log(addDays(now, -6), actor(null), 'auth.account.locked', 'agent3@hope.test locked for 15 minutes', { severity: 'warning' });
  staff.forEach((s) => log(new Date(s.lastLoginAt), actor(s.id), 'auth.login', `${s.name} signed in (password + authenticator code)`, { channel: 'admin' }));

  audit.sort((a, b) => (a.at < b.at ? 1 : -1));

  // ------------------------------------------------------------ website traffic (last 30 days)
  const traffic = Array.from({ length: 30 }, (_, i) => {
    const d = addDays(now, i - 29);
    const wk = [0, 6].includes(d.getDay()) ? 1.35 : 1;
    const visits = Math.round((380 + i * 6 + r.int(-60, 60)) * wk);
    return { date: iso(d).slice(0, 10), visits, views: Math.round(visits * (2.4 + r() * 0.6)), shares: r.int(8, 40), signups: r.int(1, 9), appOpens: Math.round(visits * 0.55) };
  });

  const integrations = Object.fromEntries(INTEGRATIONS.map((i) => [i.key, { on: false, values: {}, test: null }]));
  integrations.sms = { on: true, values: { apiKey: '••••••••5f2a', sender: 'HOPE' }, test: { ok: true, at: iso(addDays(now, -30)), message: 'Test SMS sent to 0917 000 4673.' } };
  integrations.email = { on: true, values: { apiKey: '••••••••91c0', apiSecret: '••••••••77de', from: 'no-reply@hope.example' }, test: { ok: true, at: iso(addDays(now, -30)), message: 'Test email delivered.' } };
  integrations.paymongo = { on: true, values: { publicKey: 'pk_test_51Hope', secretKey: '••••••••test', webhookSecret: '••••••••whsk' }, test: { ok: true, at: iso(addDays(now, -20)), message: 'Connected (test mode).' } };

  return {
    version: DATA_VERSION, seededAt: iso(now), settings, roles, categories, cms: structuredClone(DEFAULT_CMS), integrations, teams: structuredClone(TEAMS),
    staff, customers, listings, submissions, inquiries, viewings, deals, payments, commissions, fees, statements, notifications, audit, traffic, counters,
    staffSession: null, customerSession: null, trustedDevices: [], deviceCredentials: [], phone: null,
  };
}
