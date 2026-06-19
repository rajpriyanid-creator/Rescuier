import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectMongoDB } from '../config/mongodb';
import { User } from '../models/User.model';
import { DisasterEvent } from '../models/DisasterEvent.model';
import { UserLocation, MapMarker } from '../models/index';
import { SOSRequest } from '../models/SOSRequest.model';

const SALEM  = { lat: 11.6643, lng: 78.1460 };
const CHENNAI = { lat: 13.0827, lng: 80.2707 };
const ARIYALUR = { lat: 11.1378, lng: 79.0700 };

const genId = (city: string, suffix: string) =>
  `DM-${city.slice(0,3).toUpperCase()}-${new Date().getFullYear()}-${suffix}`;

const run = async () => {
  console.log('🌱 Starting expanded seed...');
  await connectMongoDB();

  console.log('🧹 Clearing collections...');
  await Promise.all([
    User.deleteMany({}),
    DisasterEvent.deleteMany({}),
    UserLocation.deleteMany({}),
    SOSRequest.deleteMany({}),
    MapMarker.deleteMany({}),
  ]);

  const pw = await bcrypt.hash('password', 10);

  // ─── Admins ──────────────────────────────────────────────
  const adminSalem = await User.create({
    name: 'Admin Salem', phone: '9999999999', password: pw,
    city: 'Salem', role: 'admin', disasterId: genId('Salem','ADMIN'),
    language: 'en', isActive: true,
  });
  const adminChennai = await User.create({
    name: 'Admin Chennai', phone: '8888888888', password: pw,
    city: 'Chennai', role: 'admin', disasterId: genId('Chennai','ADMIN'),
    language: 'ta', isActive: true,
  });
  const adminAriyalur = await User.create({
    name: 'Admin Ariyalur', phone: '7777777777', password: pw,
    city: 'Ariyalur', role: 'admin', disasterId: genId('Ariyalur','ADMIN'),
    language: 'ta', isActive: true,
  });

  // ─── Disaster Events ─────────────────────────────────────
  const salemEvent = await DisasterEvent.create({
    type: 'flood', severity: 'critical', city: 'Salem',
    affectedZones: ['Ammapet', 'Salem Junction', 'Suramangalam', 'Omalur Road', 'Hasthampatti'],
    epicenter: { latitude: SALEM.lat, longitude: SALEM.lng },
    declaredBy: adminSalem._id, status: 'active',
    description: 'Severe flooding across Salem — Thirumanimuthar river has breached banks. Roads submerged in 9 wards.',
    instructions: 'Move to high ground immediately. Avoid Ammapet underpass. Boats dispatched to Omalur Road.',
  });
  const chennaiEvent = await DisasterEvent.create({
    type: 'cyclone', severity: 'critical', city: 'Chennai',
    affectedZones: ['Velachery', 'Adyar', 'Mylapore', 'OMR', 'Thiruvanmiyur', 'Besant Nagar'],
    epicenter: { latitude: CHENNAI.lat, longitude: CHENNAI.lng },
    declaredBy: adminChennai._id, status: 'active',
    description: 'Cyclone Mandous-II making landfall. Sustained winds 120 km/h. Storm surge expected along coast.',
    instructions: 'Stay indoors. Avoid Marina Beach area. Power cuts across 6 zones. Emergency helpline: 1800-425-1111.',
  });
  const ariyalurEvent = await DisasterEvent.create({
    type: 'flood', severity: 'critical', city: 'Ariyalur',
    affectedZones: ['Sendurai Road', 'Ariyalur Junction', 'Bus Stand Area', 'Marudaiyar River Bank', 'Vailappadi'],
    epicenter: { latitude: ARIYALUR.lat, longitude: ARIYALUR.lng },
    declaredBy: adminAriyalur._id, status: 'active',
    description: 'Heavy rainfall in Ariyalur district. Marudaiyar river overflowing. Inundation in low-lying residential wards.',
    instructions: 'Evacuate low-lying areas near Marudaiyar River. Relief center set up at Corporation Hall near Bus Stand.',
  });

  // ─── Salem Users ─────────────────────────────────────────
  const salemPeople = [
    { name:'Karthik Raja',    phone:'9876543210', role:'volunteer',  status:'safe',      lat: SALEM.lat-0.012, lng: SALEM.lng+0.008 },
    { name:'Suresh Kumar',    phone:'9876543211', role:'responder',  status:'safe',      lat: SALEM.lat+0.015, lng: SALEM.lng-0.010 },
    { name:'Raj Prasad',      phone:'9876543212', role:'user',       status:'need_help', lat: SALEM.lat+0.005, lng: SALEM.lng+0.005 },
    { name:'Ananya Nair',     phone:'9876543213', role:'user',       status:'evacuating',lat: SALEM.lat-0.008, lng: SALEM.lng-0.007 },
    { name:'Priya Sundar',    phone:'9876543214', role:'user',       status:'shelter',   lat: SALEM.lat+0.002, lng: SALEM.lng-0.012 },
    { name:'Murugan Selvam',  phone:'9876543215', role:'user',       status:'need_help', lat: SALEM.lat+0.009, lng: SALEM.lng+0.011 },
    { name:'Lakshmi Devi',    phone:'9876543216', role:'volunteer',  status:'safe',      lat: SALEM.lat-0.003, lng: SALEM.lng+0.015 },
    { name:'Saravanan M',     phone:'9876543217', role:'user',       status:'evacuating',lat: SALEM.lat+0.013, lng: SALEM.lng-0.003 },
    { name:'Kavitha Rajan',   phone:'9876543218', role:'user',       status:'shelter',   lat: SALEM.lat-0.017, lng: SALEM.lng+0.004 },
    { name:'Vijay Anand',     phone:'9876543219', role:'responder',  status:'safe',      lat: SALEM.lat+0.007, lng: SALEM.lng-0.016 },
    { name:'Senthil Kumar',   phone:'9876543220', role:'user',       status:'need_help', lat: SALEM.lat-0.004, lng: SALEM.lng+0.019 },
    { name:'Revathi Priya',   phone:'9876543221', role:'user',       status:'safe',      lat: SALEM.lat+0.018, lng: SALEM.lng+0.002 },
    { name:'Dinesh Babu',     phone:'9876543222', role:'user',       status:'evacuating',lat: SALEM.lat-0.009, lng: SALEM.lng-0.014 },
    { name:'Padmavathi K',    phone:'9876543223', role:'volunteer',  status:'safe',      lat: SALEM.lat+0.004, lng: SALEM.lng+0.020 },
    { name:'Arumugam S',      phone:'9876543224', role:'user',       status:'need_help', lat: SALEM.lat-0.014, lng: SALEM.lng+0.012 },
  ];

  const salemSosTypes = ['trapped','injured','water','medicine','rescue'] as const;
  for (let i = 0; i < salemPeople.length; i++) {
    const p = salemPeople[i];
    const u = await User.create({
      name: p.name, phone: p.phone, password: pw, city: 'Salem',
      role: p.role as any, disasterId: genId('Salem',`${String(i+1).padStart(4,'0')}`),
      language: i%3===0?'ta':'en', isActive: true,
      medicalProfile: {
        bloodGroup: ['O+','A+','B+','AB+'][i%4],
        allergies: i%5===0?['Penicillin']:[],
        conditions: i%6===0?['Diabetes']:[],
        medications: [],
      },
    });
    await UserLocation.create({
      userId: u._id, eventId: salemEvent._id,
      latitude: p.lat, longitude: p.lng,
      status: p.status as any, isLastKnown: true,
    });
    if (p.status === 'need_help') {
      await SOSRequest.create({
        sosId: `SOS-SAL-${Date.now()}-${i}`,
        userId: u._id, eventId: salemEvent._id,
        type: salemSosTypes[i % salemSosTypes.length],
        description: [
          'Water has risen to second floor. Need boat rescue immediately.',
          'Person with fracture, cannot walk. Ambulance blocked by flood.',
          'No drinking water since 2 days. 8 people including elderly.',
          'Diabetic patient needs insulin urgently.',
          'Elderly couple stranded on terrace. Cannot climb down.',
        ][i % 5],
        peopleCount: (i % 4) + 1,
        latitude: p.lat, longitude: p.lng,
        priority: i%3===0?'critical':'urgent',
        status: i%2===0?'sent':'assigned',
      });
    }
  }

  // ─── Chennai Users ────────────────────────────────────────
  const chennaiPeople = [
    { name:'Vignesh Balan',   phone:'7776543210', role:'volunteer',  status:'safe',      lat: CHENNAI.lat+0.010, lng: CHENNAI.lng+0.020 },
    { name:'Divya Selvam',    phone:'7776543211', role:'responder',  status:'safe',      lat: CHENNAI.lat-0.015, lng: CHENNAI.lng+0.010 },
    { name:'Ganesh Moorthy',  phone:'7776543212', role:'user',       status:'need_help', lat: CHENNAI.lat+0.006, lng: CHENNAI.lng-0.005 },
    { name:'Meera Krishnan',  phone:'7776543213', role:'user',       status:'evacuating',lat: CHENNAI.lat-0.008, lng: CHENNAI.lng+0.012 },
    { name:'Ravi Chandran',   phone:'7776543214', role:'user',       status:'shelter',   lat: CHENNAI.lat+0.020, lng: CHENNAI.lng-0.018 },
    { name:'Sathya Priya',    phone:'7776543215', role:'user',       status:'need_help', lat: CHENNAI.lat+0.003, lng: CHENNAI.lng+0.025 },
    { name:'Kumar Swamy',     phone:'7776543216', role:'responder',  status:'safe',      lat: CHENNAI.lat-0.022, lng: CHENNAI.lng-0.008 },
    { name:'Janaki Ammal',    phone:'7776543217', role:'user',       status:'evacuating',lat: CHENNAI.lat+0.014, lng: CHENNAI.lng+0.006 },
    { name:'Balachandran P',  phone:'7776543218', role:'user',       status:'shelter',   lat: CHENNAI.lat-0.005, lng: CHENNAI.lng-0.020 },
    { name:'Nithya Lakshmi',  phone:'7776543219', role:'volunteer',  status:'safe',      lat: CHENNAI.lat+0.017, lng: CHENNAI.lng-0.010 },
    { name:'Thiruppathi R',   phone:'7776543220', role:'user',       status:'need_help', lat: CHENNAI.lat-0.012, lng: CHENNAI.lng+0.018 },
    { name:'Malathi Devi',    phone:'7776543221', role:'user',       status:'evacuating',lat: CHENNAI.lat+0.008, lng: CHENNAI.lng-0.025 },
    { name:'Prakash Nathan',  phone:'7776543222', role:'user',       status:'shelter',   lat: CHENNAI.lat-0.018, lng: CHENNAI.lng+0.003 },
    { name:'Suganya M',       phone:'7776543223', role:'user',       status:'safe',      lat: CHENNAI.lat+0.025, lng: CHENNAI.lng+0.015 },
    { name:'Arul Murugan',    phone:'7776543224', role:'user',       status:'need_help', lat: CHENNAI.lat-0.009, lng: CHENNAI.lng-0.015 },
  ];

  const chennaiSosTypes = ['rescue','trapped','injured','water','fire'] as const;
  for (let i = 0; i < chennaiPeople.length; i++) {
    const p = chennaiPeople[i];
    const u = await User.create({
      name: p.name, phone: p.phone, password: pw, city: 'Chennai',
      role: p.role as any, disasterId: genId('Chennai',`${String(i+1).padStart(4,'0')}`),
      language: i%2===0?'ta':'en', isActive: true,
      medicalProfile: {
        bloodGroup: ['A+','O+','B-','AB-'][i%4],
        allergies: [], conditions: [], medications: [],
      },
    });
    await UserLocation.create({
      userId: u._id, eventId: chennaiEvent._id,
      latitude: p.lat, longitude: p.lng,
      status: p.status as any, isLastKnown: true,
    });
    if (p.status === 'need_help') {
      await SOSRequest.create({
        sosId: `SOS-CHE-${Date.now()}-${i}`,
        userId: u._id, eventId: chennaiEvent._id,
        type: chennaiSosTypes[i % chennaiSosTypes.length],
        description: [
          'Cyclone has destroyed roof. Family of 5 needs shelter.',
          'Tree fallen on car, person trapped inside near Adyar signal.',
          'Storm surge flooding ground floor, need boat rescue in Besant Nagar.',
          'Hospital generator failed. ICU patients at risk in Mylapore.',
          'Fire broke out due to short circuit. 3 floors of apartment.',
        ][i % 5],
        peopleCount: (i % 5) + 1,
        latitude: p.lat, longitude: p.lng,
        priority: i%2===0?'critical':'urgent',
        status: 'sent',
      });
    }
  }

  // ─── Ariyalur Users ──────────────────────────────────────
  const ariyalurPeople = [
    { name:'Arun Kumar',      phone:'9876543301', role:'volunteer',  status:'safe',      lat: ARIYALUR.lat-0.006, lng: ARIYALUR.lng+0.008 },
    { name:'Sanjay Dutt',      phone:'9876543302', role:'responder',  status:'safe',      lat: ARIYALUR.lat+0.008, lng: ARIYALUR.lng-0.007 },
    { name:'Mani Maran',       phone:'9876543303', role:'user',       status:'need_help', lat: ARIYALUR.lat+0.003, lng: ARIYALUR.lng+0.004 },
    { name:'Soundarya R',      phone:'9876543304', role:'user',       status:'evacuating',lat: ARIYALUR.lat-0.004, lng: ARIYALUR.lng-0.003 },
    { name:'Elangovan S',      phone:'9876543305', role:'user',       status:'shelter',   lat: ARIYALUR.lat+0.001, lng: ARIYALUR.lng-0.006 },
    { name:'Kaviarasan M',     phone:'9876543306', role:'user',       status:'need_help', lat: ARIYALUR.lat-0.009, lng: ARIYALUR.lng+0.005 },
  ];

  const ariyalurSosTypes = ['trapped','injured','water','medicine'] as const;
  for (let i = 0; i < ariyalurPeople.length; i++) {
    const p = ariyalurPeople[i];
    const u = await User.create({
      name: p.name, phone: p.phone, password: pw, city: 'Ariyalur',
      role: p.role as any, disasterId: genId('Ariyalur',`${String(i+1).padStart(4,'0')}`),
      language: i%2===0?'ta':'en', isActive: true,
      medicalProfile: {
        bloodGroup: ['O+','A+','B+','AB+'][i%4],
        allergies: [], conditions: [], medications: [],
      },
    });
    await UserLocation.create({
      userId: u._id, eventId: ariyalurEvent._id,
      latitude: p.lat, longitude: p.lng,
      status: p.status as any, isLastKnown: true,
    });
    if (p.status === 'need_help') {
      await SOSRequest.create({
        sosId: `SOS-ARI-${Date.now()}-${i}`,
        userId: u._id, eventId: ariyalurEvent._id,
        type: ariyalurSosTypes[i % ariyalurSosTypes.length],
        description: [
          'Marudaiyar flood waters entering house, trapped on first floor.',
          'Elderly mother needs asthma inhaler and medicine, road flooded.',
        ][i % 2],
        peopleCount: (i % 3) + 1,
        latitude: p.lat, longitude: p.lng,
        priority: 'critical',
        status: 'sent',
      });
    }
  }

  // ─── Map Markers ──────────────────────────────────────────
  console.log('📍 Seeding map markers...');

  type MarkerType = 'safe_zone'|'water'|'hospital'|'high_ground'|'shelter'|'food'|'hazard'|'fire_station'|'police'|'custom';
  const allMarkers: {cityId:string;type:MarkerType;name:string;lat:number;lng:number;info:Record<string,unknown>}[] = [

    // ══ SALEM MARKERS ══
    // Hospitals
    { cityId:'Salem', type:'hospital', name:'Salem Govt. General Hospital',
      lat: SALEM.lat+0.004, lng: SALEM.lng-0.006,
      info:{ bedsAvailable:48, emergencyStatus:'active', bloodBank:true, ambulances:6, phone:'0427-2411291' }},
    { cityId:'Salem', type:'hospital', name:'SKS Hospital',
      lat: SALEM.lat+0.018, lng: SALEM.lng+0.005,
      info:{ bedsAvailable:22, emergencyStatus:'active', icu:true, phone:'0427-4055555' }},
    { cityId:'Salem', type:'hospital', name:'Salem Railway Hospital',
      lat: SALEM.lat-0.006, lng: SALEM.lng+0.014,
      info:{ bedsAvailable:15, emergencyStatus:'limited', phone:'0427-2411399' }},
    { cityId:'Salem', type:'hospital', name:'Vinayaka Mission Hospital',
      lat: SALEM.lat+0.022, lng: SALEM.lng-0.009,
      info:{ bedsAvailable:35, emergencyStatus:'active', icu:true, phone:'0427-3910100' }},

    // Shelters / Relief Camps
    { cityId:'Salem', type:'shelter', name:'Salem Corporation Relief Camp – Ward 1',
      lat: SALEM.lat-0.006, lng: SALEM.lng-0.008,
      info:{ capacity:300, occupants:87, foodServed:true, waterAvailable:true, blankets:true }},
    { cityId:'Salem', type:'shelter', name:'Suramangalam Community Hall Camp',
      lat: SALEM.lat+0.016, lng: SALEM.lng+0.013,
      info:{ capacity:200, occupants:54, foodServed:true, waterAvailable:true }},
    { cityId:'Salem', type:'shelter', name:'Ammapet School Relief Centre',
      lat: SALEM.lat-0.014, lng: SALEM.lng+0.010,
      info:{ capacity:150, occupants:112, foodServed:true, note:'Nearly full' }},
    { cityId:'Salem', type:'shelter', name:'Hasthampatti Town Hall',
      lat: SALEM.lat+0.008, lng: SALEM.lng-0.018,
      info:{ capacity:250, occupants:30, foodServed:false, waterAvailable:true }},

    // Safe / High Ground
    { cityId:'Salem', type:'safe_zone', name:'Omalur Road High Ground Assembly',
      lat: SALEM.lat+0.015, lng: SALEM.lng+0.002,
      info:{ description:'Elevated roadside, clear of flood water. Capacity: unlimited.' }},
    { cityId:'Salem', type:'high_ground', name:'Yercaud Ghat Road Junction',
      lat: SALEM.lat+0.028, lng: SALEM.lng-0.005,
      info:{ altitude:'350m above flood plain', accessible:'4WD + foot only' }},
    { cityId:'Salem', type:'safe_zone', name:'Salem Steel Plant Ground',
      lat: SALEM.lat-0.020, lng: SALEM.lng-0.012,
      info:{ description:'Open paved area, elevation confirmed safe. CISF guarded.' }},

    // Water
    { cityId:'Salem', type:'water', name:'Water Tanker – Salem Junction',
      lat: SALEM.lat+0.001, lng: SALEM.lng+0.003,
      info:{ status:'full', schedule:'7AM–7PM', litresAvailable:6000 }},
    { cityId:'Salem', type:'water', name:'Water Tanker – Ammapet Main Road',
      lat: SALEM.lat-0.010, lng: SALEM.lng+0.009,
      info:{ status:'half', schedule:'8AM–5PM', litresAvailable:3000 }},
    { cityId:'Salem', type:'water', name:'RO Water Plant – Hasthampatti',
      lat: SALEM.lat+0.006, lng: SALEM.lng-0.020,
      info:{ status:'operational', capacityLPH:5000 }},

    // Food
    { cityId:'Salem', type:'food', name:'Free Meals – Rotary Club Salem',
      lat: SALEM.lat+0.003, lng: SALEM.lng+0.017,
      info:{ meals:'Breakfast + Lunch + Dinner', servings:400, timing:'6AM–9PM' }},
    { cityId:'Salem', type:'food', name:'Government Anna Canteen – Flood Relief',
      lat: SALEM.lat-0.008, lng: SALEM.lng-0.003,
      info:{ meals:'Lunch + Dinner', servings:600, timing:'12PM–9PM', free:true }},

    // Police
    { cityId:'Salem', type:'police', name:'Salem West Police Station',
      lat: SALEM.lat-0.005, lng: SALEM.lng+0.021,
      info:{ officers:28, emergencyVehicles:4, phone:'0427-2412100', open24h:true }},
    { cityId:'Salem', type:'police', name:'Salem North Police Station',
      lat: SALEM.lat+0.011, lng: SALEM.lng-0.013,
      info:{ officers:22, emergencyVehicles:3, phone:'0427-2411500', open24h:true }},

    // Fire Stations
    { cityId:'Salem', type:'fire_station', name:'Salem Fire Station – Main',
      lat: SALEM.lat+0.000, lng: SALEM.lng-0.009,
      info:{ engines:4, personnel:18, rescueBoats:2, phone:'101', open24h:true }},
    { cityId:'Salem', type:'fire_station', name:'Suramangalam Fire Post',
      lat: SALEM.lat+0.020, lng: SALEM.lng+0.008,
      info:{ engines:2, personnel:10, phone:'0427-2440101', open24h:true }},

    // Hazards
    { cityId:'Salem', type:'hazard', name:'⚠ Thirumanimuthar River Breach Point',
      lat: SALEM.lat+0.003, lng: SALEM.lng+0.006,
      info:{ radius:400, severity:'critical', description:'Active flood breach. Do NOT approach.' }},
    { cityId:'Salem', type:'hazard', name:'⚠ Ammapet Underpass Submerged',
      lat: SALEM.lat-0.011, lng: SALEM.lng+0.008,
      info:{ radius:150, severity:'high', description:'Underpass flooded 8 feet. Vehicles warned.' }},
    { cityId:'Salem', type:'hazard', name:'⚠ Omalur Road Landslide Zone',
      lat: SALEM.lat+0.025, lng: SALEM.lng-0.004,
      info:{ radius:200, severity:'moderate', description:'Loose soil after rains. Risk of slides.' }},

    // ══ CHENNAI MARKERS ══
    // Hospitals
    { cityId:'Chennai', type:'hospital', name:'Govt. Stanley Hospital',
      lat: CHENNAI.lat+0.040, lng: CHENNAI.lng-0.015,
      info:{ bedsAvailable:120, emergencyStatus:'active', bloodBank:true, phone:'044-25281201' }},
    { cityId:'Chennai', type:'hospital', name:'Apollo Hospitals – Greams Road',
      lat: CHENNAI.lat+0.015, lng: CHENNAI.lng-0.018,
      info:{ bedsAvailable:60, emergencyStatus:'active', icu:true, phone:'044-28290200' }},
    { cityId:'Chennai', type:'hospital', name:'Fortis Malar – Adyar',
      lat: CHENNAI.lat-0.020, lng: CHENNAI.lng-0.010,
      info:{ bedsAvailable:30, emergencyStatus:'active', ambulances:4, phone:'044-42892222' }},
    { cityId:'Chennai', type:'hospital', name:'AIIMS Chennai',
      lat: CHENNAI.lat-0.035, lng: CHENNAI.lng+0.025,
      info:{ bedsAvailable:80, emergencyStatus:'active', phone:'044-24770000' }},

    // Shelters
    { cityId:'Chennai', type:'shelter', name:'Velachery Community Center Camp',
      lat: CHENNAI.lat-0.010, lng: CHENNAI.lng+0.005,
      info:{ capacity:600, occupants:198, foodServed:true, waterAvailable:true }},
    { cityId:'Chennai', type:'shelter', name:'Adyar Govt School Camp',
      lat: CHENNAI.lat-0.022, lng: CHENNAI.lng-0.012,
      info:{ capacity:400, occupants:310, foodServed:true, waterAvailable:true, note:'Near capacity' }},
    { cityId:'Chennai', type:'shelter', name:'Saidapet Railway Colony Hall',
      lat: CHENNAI.lat-0.005, lng: CHENNAI.lng-0.025,
      info:{ capacity:300, occupants:65, foodServed:false, waterAvailable:true }},
    { cityId:'Chennai', type:'shelter', name:'Thiruvanmiyur Beach Camp',
      lat: CHENNAI.lat-0.040, lng: CHENNAI.lng+0.010,
      info:{ capacity:500, occupants:140, foodServed:true, waterAvailable:true }},

    // Safe / High Ground
    { cityId:'Chennai', type:'safe_zone', name:'Kotturpuram Elevated Road',
      lat: CHENNAI.lat-0.015, lng: CHENNAI.lng-0.018,
      info:{ description:'Flyover area clear of flood. Accessible.' }},
    { cityId:'Chennai', type:'high_ground', name:'Guindy Race Course Grounds',
      lat: CHENNAI.lat-0.008, lng: CHENNAI.lng-0.030,
      info:{ description:'Large open grounds, elevated, army deployed.' }},
    { cityId:'Chennai', type:'safe_zone', name:'IIT Madras Gate Assembly',
      lat: CHENNAI.lat-0.020, lng: CHENNAI.lng-0.022,
      info:{ description:'IIT campus perimeter. Secure and elevated.' }},

    // Water
    { cityId:'Chennai', type:'water', name:'Corporation Water Tanker – T. Nagar',
      lat: CHENNAI.lat+0.005, lng: CHENNAI.lng-0.012,
      info:{ status:'full', schedule:'6AM–8PM', litresAvailable:10000 }},
    { cityId:'Chennai', type:'water', name:'Water Tanker – Adyar Bus Stand',
      lat: CHENNAI.lat-0.025, lng: CHENNAI.lng-0.005,
      info:{ status:'half', schedule:'8AM–6PM', litresAvailable:5000 }},

    // Food
    { cityId:'Chennai', type:'food', name:'Akshaya Patra – Flood Relief Kitchen',
      lat: CHENNAI.lat+0.010, lng: CHENNAI.lng+0.008,
      info:{ meals:'All 3 meals', servings:1500, timing:'6AM–10PM', free:true }},
    { cityId:'Chennai', type:'food', name:'Sri Sai Canteen – Emergency Meals',
      lat: CHENNAI.lat-0.018, lng: CHENNAI.lng+0.015,
      info:{ meals:'Lunch + Dinner', servings:500, timing:'11AM–9PM' }},

    // Police
    { cityId:'Chennai', type:'police', name:'T. Nagar Police Station',
      lat: CHENNAI.lat+0.003, lng: CHENNAI.lng-0.015,
      info:{ phone:'044-24321212', officers:45, open24h:true }},
    { cityId:'Chennai', type:'police', name:'Adyar Police Station',
      lat: CHENNAI.lat-0.028, lng: CHENNAI.lng-0.008,
      info:{ phone:'044-24912345', officers:35, open24h:true }},

    // Fire Stations
    { cityId:'Chennai', type:'fire_station', name:'Chennai Fire Station – Egmore',
      lat: CHENNAI.lat+0.025, lng: CHENNAI.lng-0.010,
      info:{ engines:6, rescueBoats:3, phone:'101', open24h:true }},
    { cityId:'Chennai', type:'fire_station', name:'Adyar Fire Station',
      lat: CHENNAI.lat-0.030, lng: CHENNAI.lng-0.003,
      info:{ engines:4, rescueBoats:2, phone:'044-24412345', open24h:true }},

    // Hazards
    { cityId:'Chennai', type:'hazard', name:'⚠ Adyar River Overflow Zone',
      lat: CHENNAI.lat-0.018, lng: CHENNAI.lng-0.006,
      info:{ radius:500, severity:'critical', description:'River overflowing. Do NOT cross bridge.' }},
    { cityId:'Chennai', type:'hazard', name:'⚠ Besant Nagar Coastal Surge Area',
      lat: CHENNAI.lat-0.038, lng: CHENNAI.lng+0.020,
      info:{ radius:600, severity:'critical', description:'Storm surge active. Coastal area evacuation mandatory.' }},
    { cityId:'Chennai', type:'hazard', name:'⚠ Velachery Submerged Road',
      lat: CHENNAI.lat-0.008, lng: CHENNAI.lng+0.007,
      info:{ radius:250, severity:'high', description:'Velachery main road flooded. 2 feet water.' }},

    // ══ ARIYALUR MARKERS ══
    // Hospitals
    { cityId:'Ariyalur', type:'hospital', name:'Ariyalur Govt District Headquarters Hospital',
      lat: ARIYALUR.lat+0.003, lng: ARIYALUR.lng+0.002,
      info:{ bedsAvailable:45, emergencyStatus:'active', bloodBank:true, phone:'04329-220022' }},
    { cityId:'Ariyalur', type:'hospital', name:'Sri Ram Hospital',
      lat: ARIYALUR.lat-0.005, lng: ARIYALUR.lng-0.004,
      info:{ bedsAvailable:18, emergencyStatus:'active', icu:true, phone:'04329-221055' }},
    
    // Shelters
    { cityId:'Ariyalur', type:'shelter', name:'Ariyalur Corporation Marriage Hall Camp',
      lat: ARIYALUR.lat+0.001, lng: ARIYALUR.lng+0.005,
      info:{ capacity:250, occupants:42, foodServed:true, waterAvailable:true }},
    { cityId:'Ariyalur', type:'shelter', name:'Sendurai Road School Camp',
      lat: ARIYALUR.lat-0.007, lng: ARIYALUR.lng-0.009,
      info:{ capacity:180, occupants:95, foodServed:true, waterAvailable:true }},

    // Safe zone
    { cityId:'Ariyalur', type:'safe_zone', name:'Ariyalur Sports Stadium Ground',
      lat: ARIYALUR.lat+0.007, lng: ARIYALUR.lng+0.009,
      info:{ description:'Open playground at high altitude, secure and assembly point.' }},

    // Water
    { cityId:'Ariyalur', type:'water', name:'Water Tanker - Bus Stand Junction',
      lat: ARIYALUR.lat-0.002, lng: ARIYALUR.lng+0.001,
      info:{ status:'full', schedule:'7AM–6PM', litresAvailable:5000 }},

    // Food
    { cityId:'Ariyalur', type:'food', name:'Free Relief Kitchen - Lions Club Ariyalur',
      lat: ARIYALUR.lat+0.002, lng: ARIYALUR.lng-0.001,
      info:{ meals:'Lunch + Dinner', servings:300, timing:'11AM–8PM' }},

    // Police
    { cityId:'Ariyalur', type:'police', name:'Ariyalur Police Station',
      lat: ARIYALUR.lat-0.003, lng: ARIYALUR.lng+0.003,
      info:{ phone:'04329-220021', officers:20, open24h:true }},

    // Fire
    { cityId:'Ariyalur', type:'fire_station', name:'Ariyalur Fire Station',
      lat: ARIYALUR.lat-0.004, lng: ARIYALUR.lng+0.001,
      info:{ engines:2, rescueBoats:1, phone:'101', open24h:true }},

    // Hazards
    { cityId:'Ariyalur', type:'hazard', name:'⚠ Marudaiyar River Bank Flood Zone',
      lat: ARIYALUR.lat+0.010, lng: ARIYALUR.lng+0.012,
      info:{ radius:350, severity:'critical', description:'Marudaiyar river overflow. Flash floods.' }},
  ];

  for (const m of allMarkers) {
    await MapMarker.create({
      cityId: m.cityId, type: m.type, name: m.name,
      latitude: m.lat, longitude: m.lng, info: m.info,
      addedBy: m.cityId === 'Salem' ? adminSalem._id : m.cityId === 'Chennai' ? adminChennai._id : adminAriyalur._id,
      isActive: true,
    });
  }

  console.log('\n✨ Seeding complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Salem Admin   → ID: DM-SAL-${new Date().getFullYear()}-ADMIN  | PW: password`);
  console.log(`Chennai Admin → ID: DM-CHE-${new Date().getFullYear()}-ADMIN  | PW: password`);
  console.log(`Ariyalur Admin→ ID: DM-ARI-${new Date().getFullYear()}-ADMIN  | PW: password`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Users seeded  : Salem ${salemPeople.length} + Chennai ${chennaiPeople.length} + Ariyalur ${ariyalurPeople.length} = ${salemPeople.length+chennaiPeople.length+ariyalurPeople.length}`);
  console.log(`Markers seeded: ${allMarkers.length}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await mongoose.disconnect();
};

run().catch(e => { console.error('❌ Seed failed:', e); process.exit(1); });
