export interface Subcategory {
  name: string;
  slug: string;
}

export interface Category {
  name: string;
  slug: string;
  icon: string;
  subcategories: Subcategory[];
}

export const CATEGORIES: Category[] = [
  {
    name: "Appliances",
    slug: "appliances",
    icon: "Refrigerator",
    subcategories: [
      { name: "Refrigerators & Freezers", slug: "refrigerators" },
      { name: "Washing Machines & Dryers", slug: "washing-machines" },
      { name: "Dishwashers", slug: "dishwashers" },
      { name: "Microwaves & Ovens", slug: "microwaves" },
      { name: "Air Conditioners & Fans", slug: "air-conditioners" },
      { name: "Vacuum Cleaners", slug: "vacuums" },
    ],
  },
  {
    name: "Arts, Crafts & Sewing",
    slug: "arts-crafts-sewing",
    icon: "Palette",
    subcategories: [
      { name: "Painting & Drawing", slug: "painting" },
      { name: "Knitting & Crocheting", slug: "knitting" },
      { name: "Sewing & Quilting", slug: "sewing" },
      { name: "Scrapbooking", slug: "scrapbooking" },
      { name: "Printmaking", slug: "printmaking" },
      { name: "Beading & Jewelry Making", slug: "beading" },
    ],
  },
  {
    name: "Automotive",
    slug: "automotive",
    icon: "Car",
    subcategories: [
      { name: "Car Parts & Accessories", slug: "car-parts" },
      { name: "Tires & Wheels", slug: "tires" },
      { name: "Car Electronics", slug: "car-electronics" },
      { name: "Motorcycles & Scooters", slug: "motorcycles" },
      { name: "Tools & Equipment", slug: "auto-tools" },
      { name: "Car Care & Detailing", slug: "car-care" },
    ],
  },
  {
    name: "Baby Products",
    slug: "baby-products",
    icon: "Baby",
    subcategories: [
      { name: "Baby Clothing (0–24 Months)", slug: "baby-clothing" },
      { name: "Feeding & Nursing", slug: "feeding" },
      { name: "Nursery Furniture", slug: "nursery" },
      { name: "Strollers & Travel", slug: "strollers" },
      { name: "Car Seats", slug: "car-seats" },
      { name: "Baby & Toddler Toys (0–3 Years)", slug: "baby-toys" },
    ],
  },
  {
    name: "Beauty & Personal Care",
    slug: "beauty-personal-care",
    icon: "Sparkles",
    subcategories: [
      { name: "Skincare", slug: "skincare" },
      { name: "Haircare", slug: "haircare" },
      { name: "Makeup & Cosmetics", slug: "makeup" },
      { name: "Fragrances", slug: "fragrances" },
      { name: "Men's Grooming", slug: "mens-grooming" },
      { name: "Oral Care", slug: "oral-care" },
    ],
  },
  {
    name: "Books",
    slug: "books",
    icon: "BookOpen",
    subcategories: [
      { name: "Fiction", slug: "fiction" },
      { name: "Non-Fiction", slug: "non-fiction" },
      { name: "Children's Books", slug: "childrens-books" },
      { name: "Textbooks & Education", slug: "textbooks" },
      { name: "Comics & Graphic Novels", slug: "comics" },
      { name: "Rare & Collectible", slug: "rare-books" },
    ],
  },
  {
    name: "CDs & Vinyl",
    slug: "cds-vinyl",
    icon: "Disc",
    subcategories: [
      { name: "CDs", slug: "cds" },
      { name: "Cassettes", slug: "cassettes" },
      { name: "Box Sets", slug: "music-box-sets" },
      { name: "Other Music Formats", slug: "other-music-formats" },
      { name: "Vinyl Records", slug: "vinyl" },
    ],
  },
  {
    name: "Cell Phones & Accessories",
    slug: "cell-phones",
    icon: "Smartphone",
    subcategories: [
      { name: "Smartphones", slug: "smartphones" },
      { name: "Cases & Covers", slug: "phone-cases" },
      { name: "Chargers & Cables", slug: "chargers" },
      { name: "Screen Protectors", slug: "screen-protectors" },
      { name: "Earphones & Headsets (Legacy)", slug: "earphones" },
      { name: "Smartwatches", slug: "smartwatches" },
    ],
  },
  {
    name: "Clothing, Shoes & Jewelry",
    slug: "clothing-shoes-jewelry",
    icon: "ShoppingBag",
    subcategories: [
      { name: "Men's Clothing", slug: "mens-clothing" },
      { name: "Women's Clothing", slug: "womens-clothing" },
      { name: "Children's Clothing (2+ Years)", slug: "kids-clothing" },
      { name: "Shoes & Boots", slug: "shoes" },
      { name: "Jewelry & Watches (Legacy)", slug: "jewelry" },
      { name: "Bags & Accessories", slug: "bags" },
    ],
  },
  {
    name: "Computing",
    slug: "computing",
    icon: "Laptop",
    subcategories: [
      { name: "Laptops", slug: "laptops" },
      { name: "Desktop Computers", slug: "desktops" },
      { name: "Computer Components", slug: "components" },
      { name: "Monitors & Displays", slug: "monitors" },
      { name: "Storage & Memory", slug: "storage-memory" },
      { name: "Computer Peripherals", slug: "peripherals" },
      { name: "Networking & Wi-Fi", slug: "networking" },
      { name: "Printers & Scanners", slug: "printers-scanners" },
      { name: "Computer Accessories", slug: "computer-accessories" },
      { name: "Servers & Workstations", slug: "servers-workstations" },
    ],
  },
  {
    name: "Electronics",
    slug: "electronics",
    icon: "Monitor",
    subcategories: [
      { name: "TVs & Home Theater", slug: "tvs" },
      { name: "Audio & Headphones", slug: "audio" },
      { name: "Cameras & Photography", slug: "cameras" },
      { name: "Gaming Consoles (Legacy)", slug: "gaming-consoles" },
      { name: "Smart Home Devices", slug: "smart-home" },
    ],
  },
  {
    name: "Eco-Friendly Products",
    slug: "eco-friendly",
    icon: "Leaf",
    subcategories: [
      { name: "Solar & Renewable Energy", slug: "solar" },
      { name: "Organic & Natural Food", slug: "organic-food" },
      { name: "Reusable & Zero-Waste", slug: "reusable" },
      { name: "Natural Cleaning", slug: "natural-cleaning" },
      { name: "Sustainable Fashion", slug: "sustainable-fashion" },
      { name: "Green Tech", slug: "green-tech" },
    ],
  },
  {
    name: "Health & Household",
    slug: "health-household",
    icon: "Heart",
    subcategories: [
      { name: "Vitamins & Supplements", slug: "vitamins" },
      { name: "Medical Supplies", slug: "medical" },
      { name: "Cleaning Supplies", slug: "cleaning" },
      { name: "Air Fresheners", slug: "air-fresheners" },
      { name: "Pest Control", slug: "pest-control" },
    ],
  },
  {
    name: "Home & Kitchen",
    slug: "home-kitchen",
    icon: "Home",
    subcategories: [
      { name: "Cookware & Bakeware", slug: "cookware" },
      { name: "Bedding & Pillows", slug: "bedding" },
      { name: "Furniture", slug: "furniture" },
      { name: "Home Decor", slug: "home-decor" },
      { name: "Storage & Organization", slug: "storage" },
      { name: "Lighting", slug: "lighting" },
    ],
  },
  {
    name: "Industrial & Scientific",
    slug: "industrial-scientific",
    icon: "FlaskConical",
    subcategories: [
      { name: "Lab Equipment", slug: "lab-equipment" },
      { name: "Safety & PPE", slug: "safety" },
      { name: "Electrical Components", slug: "electrical" },
      { name: "Hydraulics & Pneumatics", slug: "hydraulics" },
      { name: "Janitorial & Facility", slug: "janitorial" },
    ],
  },
  {
    name: "Movies & TV",
    slug: "movies-tv",
    icon: "Tv",
    subcategories: [
      { name: "Blu-ray", slug: "blu-ray" },
      { name: "DVD", slug: "dvd" },
      { name: "4K UHD", slug: "4k-uhd" },
      { name: "TV Series Box Sets", slug: "tv-series" },
      { name: "Foreign & Art House", slug: "foreign-films" },
    ],
  },
  {
    name: "Musical Instruments",
    slug: "musical-instruments",
    icon: "Music",
    subcategories: [
      { name: "Guitars & Bass", slug: "guitars" },
      { name: "Pianos & Keyboards", slug: "pianos" },
      { name: "Drums & Percussion", slug: "drums" },
      { name: "Wind Instruments", slug: "wind" },
      { name: "DJ & Music Production", slug: "dj-equipment" },
      { name: "Accessories & Parts", slug: "instrument-accessories" },
    ],
  },
  {
    name: "Office Products",
    slug: "office-products",
    icon: "Briefcase",
    subcategories: [
      { name: "Printers & Scanners", slug: "printers" },
      { name: "Desk Accessories", slug: "desk-accessories" },
      { name: "Filing & Storage", slug: "filing" },
      { name: "Pens & Writing", slug: "pens" },
      { name: "Paper & Notebooks", slug: "paper" },
      { name: "Calendars & Planners", slug: "calendars" },
    ],
  },
  {
    name: "Patio, Lawn & Garden",
    slug: "patio-lawn-garden",
    icon: "TreePine",
    subcategories: [
      { name: "Outdoor Furniture", slug: "outdoor-furniture" },
      { name: "Grills & BBQ", slug: "grills" },
      { name: "Gardening Tools", slug: "gardening-tools" },
      { name: "Plants & Seeds", slug: "plants" },
      { name: "Outdoor Decor", slug: "outdoor-decor" },
    ],
  },
  {
    name: "Pet Supplies",
    slug: "pet-supplies",
    icon: "PawPrint",
    subcategories: [
      { name: "Dogs", slug: "dogs" },
      { name: "Cats", slug: "cats" },
      { name: "Birds", slug: "birds" },
      { name: "Fish & Aquatics", slug: "fish" },
      { name: "Small Animals", slug: "small-animals" },
      { name: "Reptiles", slug: "reptiles" },
    ],
  },
  {
    name: "Sports & Outdoors",
    slug: "sports-outdoors",
    icon: "Dumbbell",
    subcategories: [
      { name: "Fitness & Exercise", slug: "fitness" },
      { name: "Cycling", slug: "cycling" },
      { name: "Camping & Hiking", slug: "camping" },
      { name: "Water Sports", slug: "water-sports" },
      { name: "Team Sports", slug: "team-sports" },
      { name: "Winter Sports", slug: "winter-sports" },
    ],
  },
  {
    name: "Tools & Home Improvement",
    slug: "tools-home-improvement",
    icon: "Wrench",
    subcategories: [
      { name: "Power Tools", slug: "power-tools" },
      { name: "Hand Tools", slug: "hand-tools" },
      { name: "Electrical Installation", slug: "electrical-installation" },
      { name: "Electrical & Lighting (Legacy)", slug: "electrical-tools" },
      { name: "Plumbing", slug: "plumbing" },
      { name: "Paint & Supplies", slug: "paint" },
      { name: "Safety & PPE (Legacy)", slug: "safety-tools" },
    ],
  },
  {
    name: "Toys & Games",
    slug: "toys-games",
    icon: "Gamepad2",
    subcategories: [
      { name: "Action Figures & Collectibles", slug: "action-figures" },
      { name: "Board Games & Puzzles", slug: "board-games" },
      { name: "Dolls & Accessories", slug: "dolls" },
      { name: "Outdoor Toys", slug: "outdoor-toys" },
      { name: "STEM & Educational", slug: "stem" },
      { name: "Building Sets", slug: "building-sets" },
    ],
  },
  {
    name: "Video Games",
    slug: "video-games",
    icon: "Gamepad",
    subcategories: [
      { name: "Gaming Consoles", slug: "consoles" },
      { name: "PlayStation", slug: "playstation" },
      { name: "Xbox", slug: "xbox" },
      { name: "Nintendo", slug: "nintendo" },
      { name: "PC Gaming", slug: "pc-gaming" },
      { name: "VR Gaming", slug: "vr-gaming" },
    ],
  },
  {
    name: "Digital Products",
    slug: "digital",
    icon: "MonitorSmartphone",
    subcategories: [
      { name: "Software & Apps", slug: "software-apps" },
      { name: "Documents & Ebooks", slug: "documents-ebooks" },
      { name: "Graphics & Design", slug: "graphics-design" },
      { name: "Photography", slug: "photography" },
      { name: "Video", slug: "video" },
      { name: "Audio & Music", slug: "audio-music" },
      { name: "Games & Gaming", slug: "games-gaming" },
      { name: "Education & Courses", slug: "education-courses" },
      { name: "Business & Marketing", slug: "business-marketing" },
      { name: "AI & Automation", slug: "ai-automation" },
      { name: "3D & CAD", slug: "3d-cad" },
      { name: "Websites & Online Assets", slug: "websites-online-assets" },
      { name: "Virtual Goods", slug: "virtual-goods" },
      { name: "Other Digital", slug: "other-digital" },
    ],
  },
  {
    name: "Jewellery & Watches", slug: "jewellery-watches", icon: "Gem", subcategories: [
      { name: "Fine Jewellery", slug: "fine-jewellery" }, { name: "Fashion Jewellery", slug: "fashion-jewellery" },
      { name: "Rings", slug: "rings" }, { name: "Necklaces", slug: "necklaces" },
      { name: "Bracelets & Earrings", slug: "bracelets-earrings" }, { name: "Watches", slug: "watches" },
      { name: "Watch Parts & Accessories", slug: "watch-parts" }, { name: "Gemstones", slug: "gemstones" },
    ],
  },
  {
    name: "Adult",
    slug: "adult",
    icon: "ShieldAlert",
    subcategories: [
      { name: "Adult Clothing", slug: "adult-clothing" },
      { name: "Adult Media", slug: "adult-media" },
      { name: "Adult Collectibles", slug: "adult-collectibles" },
      { name: "Adult Accessories", slug: "adult-accessories" },
      { name: "Adult Wellness", slug: "adult-wellness" },
      { name: "Adult Toys", slug: "adult-toys" },
      { name: "Adult Digital (Restricted)", slug: "adult-digital" },
      { name: "Adult Services", slug: "adult-services" },
      { name: "Vintage & Collectors", slug: "adult-vintage-collectors" },
      { name: "Other Adult", slug: "other-adult" },
    ],
  },
];

// Canonical taxonomy for new listings and importer destinations.
// Legacy slugs remain readable until the server-side listing migration is complete.
export const CATEGORY_ALIASES: Record<string, string> = {
  "digital-products": "digital",
};
export const SUBCATEGORY_ALIASES: Record<string, { category: string; subcategory: string }> = {
  "electronics:gaming-consoles": { category: "video-games", subcategory: "consoles" },
  "cell-phones:earphones": { category: "electronics", subcategory: "audio" },
  "clothing-shoes-jewelry:jewelry": { category: "jewellery-watches", subcategory: "fashion-jewellery" },
  "tools-home-improvement:safety-tools": { category: "industrial-scientific", subcategory: "safety" },
  "tools-home-improvement:electrical-tools": { category: "tools-home-improvement", subcategory: "electrical-installation" },
  "digital-products:software": { category: "digital", subcategory: "software-apps" },
  "digital-products:ebooks": { category: "digital", subcategory: "documents-ebooks" },
  "digital-products:music-downloads": { category: "digital", subcategory: "audio-music" },
  "digital-products:stock-media": { category: "digital", subcategory: "photography" },
  "digital-products:templates": { category: "digital", subcategory: "graphics-design" },
  "digital-products:online-courses": { category: "digital", subcategory: "education-courses" },
  "cds-vinyl:pop-rock": { category: "cds-vinyl", subcategory: "cds" },
  "cds-vinyl:hip-hop": { category: "cds-vinyl", subcategory: "cds" },
  "cds-vinyl:classical": { category: "cds-vinyl", subcategory: "cds" },
  "cds-vinyl:country": { category: "cds-vinyl", subcategory: "cds" },
};
export function resolveCategory(category: string, subcategory?: string | null) {
  const alias = subcategory ? SUBCATEGORY_ALIASES[`${category}:${subcategory}`] : undefined;
  if (alias) return alias;
  return { category: CATEGORY_ALIASES[category] ?? category, subcategory: subcategory ?? "" };
}
export const ACTIVE_CATEGORIES = CATEGORIES.filter(c => !["digital-products", "eco-friendly"].includes(c.slug)).map(c => ({
  ...c,
  subcategories: c.subcategories.filter(s => !(
    ["electronics:gaming-consoles", "cell-phones:earphones", "clothing-shoes-jewelry:jewelry", "tools-home-improvement:safety-tools"].includes(`${c.slug}:${s.slug}`)
  )),
}));

/** Load display-only category settings before the storefront mounts. Permanent slugs never change. */
export async function loadCategoryPresentation():Promise<void>{
 try{
  const response=await fetch("/api/taxonomy/category-overrides");
  if(!response.ok)return;
  const data=await response.json();
  if(!Array.isArray(data.overrides))return;
  const overrides=new Map<string,{name:string;visible:boolean;sort_order:number}>();
  for(const o of data.overrides){
   if(typeof o.category_slug==="string"&&typeof o.subcategory_slug==="string"&&typeof o.name==="string")
    overrides.set(o.category_slug+":"+o.subcategory_slug,o);
  }
  for(const c of CATEGORIES){
   const o=overrides.get(c.slug+":");if(o)c.name=o.name;
   for(const sub of c.subcategories){const setting=overrides.get(c.slug+":"+sub.slug);if(setting)sub.name=setting.name;}
   c.subcategories.sort((a,b)=>(overrides.get(c.slug+":"+a.slug)?.sort_order??9999)-(overrides.get(c.slug+":"+b.slug)?.sort_order??9999));
  }
  CATEGORIES.sort((a,b)=>(overrides.get(a.slug+":")?.sort_order??9999)-(overrides.get(b.slug+":")?.sort_order??9999));
  for(const c of ACTIVE_CATEGORIES){
   const o=overrides.get(c.slug+":");
   if(o){c.name=o.name;}
   for(const sub of c.subcategories){const setting=overrides.get(c.slug+":"+sub.slug);if(setting)sub.name=setting.name;}
   c.subcategories.sort((a,b)=>(overrides.get(c.slug+":"+a.slug)?.sort_order??9999)-(overrides.get(c.slug+":"+b.slug)?.sort_order??9999));
  }
  ACTIVE_CATEGORIES.sort((a,b)=>(overrides.get(a.slug+":")?.sort_order??9999)-(overrides.get(b.slug+":")?.sort_order??9999));
  for(let i=ACTIVE_CATEGORIES.length-1;i>=0;i--){if(overrides.get(ACTIVE_CATEGORIES[i].slug+":")?.visible===false)ACTIVE_CATEGORIES.splice(i,1);}
  for(const c of ACTIVE_CATEGORIES){for(let i=c.subcategories.length-1;i>=0;i--){if(overrides.get(c.slug+":"+c.subcategories[i].slug)?.visible===false)c.subcategories.splice(i,1);}}
 }catch{/* Use built-in taxonomy if the API is unavailable. */}
}

/** Suggested third-level taxonomy. Suggestions are editorial only until listing and search APIs support a third slug. */
export const THIRD_LEVEL_SUGGESTIONS: Record<string, {subcategory: string; suggestions: string[]}> = {
  "computing": {
    "subcategory": "laptops",
    "suggestions": ["Windows Laptops","MacBooks","Chromebooks","Gaming Laptops","2-in-1 Laptops","Laptop Parts"]
  },
  "appliances": {
    "subcategory": "refrigerators",
    "suggestions": [
      "French-door fridges",
      "Chest freezers",
      "Mini fridges"
    ]
  },
  "arts-crafts-sewing": {
    "subcategory": "painting",
    "suggestions": [
      "Acrylic paints",
      "Watercolour sets",
      "Drawing pencils"
    ]
  },
  "automotive": {
    "subcategory": "car-parts",
    "suggestions": [
      "Brake parts",
      "Filters",
      "Engine components"
    ]
  },
  "baby-products": {
    "subcategory": "baby-clothing",
    "suggestions": [
      "Bodysuits",
      "Sleepwear",
      "Outfits"
    ]
  },
  "beauty-personal-care": {
    "subcategory": "skincare",
    "suggestions": [
      "Cleansers",
      "Moisturisers",
      "Sunscreen"
    ]
  },
  "books": {
    "subcategory": "fiction",
    "suggestions": [
      "Mystery & Thriller",
      "Romance",
      "Science Fiction"
    ]
  },
  "cds-vinyl": {
    "subcategory": "vinyl",
    "suggestions": [
      "LP Albums",
      "7-inch Singles",
      "Picture Discs"
    ]
  },
  "cell-phones": {
    "subcategory": "smartphones",
    "suggestions": [
      "Android Phones",
      "iPhones",
      "Refurbished Phones"
    ]
  },
  "clothing-shoes-jewelry": {
    "subcategory": "mens-clothing",
    "suggestions": [
      "Shirts",
      "Jackets & Coats",
      "Jeans"
    ]
  },
  "electronics": {
    "subcategory": "computers",
    "suggestions": [
      "Gaming Laptops",
      "Desktop PCs",
      "Monitors"
    ]
  },
  "health-household": {
    "subcategory": "medical",
    "suggestions": [
      "Bandages",
      "First Aid Kits",
      "Dressings"
    ]
  },
  "home-kitchen": {
    "subcategory": "furniture",
    "suggestions": [
      "Sofas",
      "Tables",
      "Storage Units"
    ]
  },
  "industrial-scientific": {
    "subcategory": "safety",
    "suggestions": [
      "Protective Eyewear",
      "Safety Gloves",
      "Hi-vis Clothing"
    ]
  },
  "movies-tv": {
    "subcategory": "dvd",
    "suggestions": [
      "Films",
      "TV Box Sets",
      "Special Editions"
    ]
  },
  "musical-instruments": {
    "subcategory": "guitars",
    "suggestions": [
      "Electric Guitars",
      "Acoustic Guitars",
      "Bass Guitars"
    ]
  },
  "office-products": {
    "subcategory": "pens",
    "suggestions": [
      "Ballpoint Pens",
      "Gel Pens",
      "Fountain Pens"
    ]
  },
  "patio-lawn-garden": {
    "subcategory": "gardening-tools",
    "suggestions": [
      "Lawnmowers",
      "Hedge Trimmers",
      "Hand Tools"
    ]
  },
  "pet-supplies": {
    "subcategory": "dogs",
    "suggestions": [
      "Dog Food",
      "Leads & Collars",
      "Dog Beds"
    ]
  },
  "sports-outdoors": {
    "subcategory": "fitness",
    "suggestions": [
      "Weights",
      "Exercise Bikes",
      "Yoga Equipment"
    ]
  },
  "tools-home-improvement": {
    "subcategory": "power-tools",
    "suggestions": [
      "Drills",
      "Saws",
      "Sanders"
    ]
  },
  "toys-games": {
    "subcategory": "action-figures",
    "suggestions": [
      "Collectible Figures",
      "Playsets",
      "Accessories"
    ]
  },
  "video-games": {
    "subcategory": "consoles",
    "suggestions": [
      "PlayStation Consoles",
      "Xbox Consoles",
      "Nintendo Consoles"
    ]
  },
  "digital": {
    "subcategory": "software-apps",
    "suggestions": [
      "Desktop Software",
      "Mobile Apps",
      "Plugins"
    ]
  },
  "jewellery-watches": {
    "subcategory": "watches",
    "suggestions": [
      "Smart Watches",
      "Analogue Watches",
      "Watch Straps"
    ]
  },
  "adult": {
    "subcategory": "adult-clothing",
    "suggestions": [
      "Lingerie",
      "Costumes",
      "Accessories"
    ]
  }
};
// Editorial suggestion library. Applies to every current subcategory; never automatically publishes taxonomy.
const THIRD_LEVEL_BY_SUBCATEGORY: Record<string,string[]> = {
 tires:["Car Tyres","Motorcycle Tyres","Alloy Wheels","Steel Wheels","Wheel Accessories"],
 vacuums:["Cordless Vacuums","Upright Vacuums","Cylinder Vacuums","Robot Vacuums","Wet & Dry Vacuums","Parts & Accessories"],
 "smart-home":["Smart Plugs","Smart Sensors","Smart Lighting","Home Security","Smart Hubs"],
 cameras:["Digital Cameras","Security Cameras","Dash Cams","Drones","Action Cameras","Camera Accessories"],
 computers:["Laptops","Desktop PCs","Monitors","Computer Components","Computer Accessories"],
 "car-parts":["Interior Accessories","Exterior & Body Parts","Engine Parts","Brakes","Car Lighting"],
 "mens-clothing":["Jackets & Coats","Shirts","T-Shirts","Jeans & Trousers","Underwear","Activewear"],
 cookware:["Pots & Pans","Cookware Sets","Bakeware","Cooking Utensils"],
 furniture:["Office & Gaming Chairs","Sofas","Tables","Cabinets & Storage","Beds"],
 beading:["Gemstone Beads","Glass Beads","Jewellery Findings","Beading Kits"],
 storage:["Kitchen Storage","Bathroom Storage","Shelving","Storage Boxes"],
 audio:["In-Ear Headphones","Over-Ear Headphones","Speakers","Soundbars","Hi-Fi Equipment"],
 consoles:["PlayStation Consoles","Xbox Consoles","Nintendo Consoles","Retro Consoles","Console Accessories"],
 "adult-wellness":["Condoms & Protection","Intimate Care","Wellness Accessories"],
 "adult-toys":["Adult Accessories"],
 refrigerators:["Fridges","Freezers","Fridge Freezers","Mini Fridges"],
 "air-conditioners":["Portable Air Conditioners","Fans","Air Purifiers","Parts & Accessories"],
 smartphones:["Apple iPhone","Samsung Galaxy","Google Pixel","Xiaomi","Other Android Phones"],
 "phone-cases":["iPhone Cases","Samsung Cases","Other Phone Cases"],
 chargers:["Wall Chargers","Charging Cables","Wireless Chargers","Power Banks"],
 "washing-machines":["Washing Machines","Tumble Dryers","Washer Dryers","Accessories"],
 microwaves:["Microwave Ovens","Combination Ovens","Accessories"],
 skincare:["Cleansers","Moisturisers","Sunscreen","Serums"],
 fragrances:["Men's Fragrances","Women's Fragrances","Unisex Fragrances","Gift Sets"],
 fiction:["Crime & Thriller","Romance","Fantasy","Science Fiction","Historical Fiction"],
 cds:["Albums","Singles","Compilations","Box Sets"],
 bedding:["Duvets","Pillows","Sheets","Bed Linen Sets"],
 dogs:["Dog Food","Leads & Collars","Dog Beds","Dog Toys","Grooming"],
 fitness:["Weights","Cardio Equipment","Resistance Bands","Yoga Equipment"],
 "power-tools":["Drills","Saws","Sanders","Grinders","Batteries"],
 playstation:["PS5 Games","PS4 Games","Controllers","PlayStation Accessories"],
 xbox:["Xbox Games","Controllers","Xbox Accessories"],
 nintendo:["Switch Games","Nintendo Consoles","Controllers","Accessories"],
 "software-apps":["Desktop Software","Mobile Apps","Plugins","Utilities"],
 watches:["Analogue Watches","Digital Watches","Luxury Watches","Watch Accessories"],
 "adult-clothing":["Lingerie","Costumes","Specialist Clothing"],
 "adult-media":["Calendars","Collectible Print Media"],
};
const EXPANDED_THIRD_LEVEL: Record<string,string[]> = {
 "laptops": ["Windows Laptops","MacBooks","Chromebooks","Gaming Laptops","2-in-1 Laptops","Laptop Parts"],
 "desktops": ["Desktop PCs","All-in-One PCs","Gaming Desktops","Mini PCs","Barebone PCs"],
 "components": ["Processors (CPUs)","Graphics Cards (GPUs)","Motherboards","Power Supplies","PC Cases","Cooling & Fans"],
 "monitors": ["Gaming Monitors","4K Monitors","Ultrawide Monitors","Portable Monitors","Monitor Arms"],
 "storage-memory": ["SSD Drives","Hard Drives","External Storage","USB Flash Drives","RAM Memory","Memory Cards"],
 "peripherals": ["Keyboards","Mice & Trackballs","Webcams","Headsets","Speakers","Docking Stations"],
 "networking": ["Routers","Mesh Wi-Fi","Network Switches","Wi-Fi Adapters","Network Cables","Modems"],
 "printers-scanners": ["Inkjet Printers","Laser Printers","3D Printers","Document Scanners","Printer Ink & Toner"],
 "computer-accessories": ["Laptop Chargers","Laptop Bags & Sleeves","USB Hubs","Cables & Adapters","Stands & Cooling Pads","Screen Protectors"],
 "servers-workstations": ["Rack Servers","Tower Servers","Workstations","Network Attached Storage (NAS)","Server Components"],
 "painting": [
  "Acrylic Paints",
  "Watercolours",
  "Oil Paints",
  "Brushes",
  "Canvases",
  "Drawing Sets"
 ],
 "knitting": [
  "Yarn",
  "Knitting Needles",
  "Crochet Hooks",
  "Patterns",
  "Kits"
 ],
 "sewing": [
  "Sewing Machines",
  "Fabric",
  "Thread",
  "Quilting Kits",
  "Sewing Accessories"
 ],
 "scrapbooking": [
  "Albums",
  "Stickers",
  "Paper",
  "Stamping",
  "Cutting Tools"
 ],
 "printmaking": [
  "Printing Ink",
  "Blocks",
  "Screens",
  "Brayers",
  "Printing Tools"
 ],
 "car-electronics": [
  "Dash Cameras",
  "Car Audio",
  "Satellite Navigation",
  "Parking Sensors",
  "Car Chargers"
 ],
 "motorcycles": [
  "Motorcycles",
  "Scooters",
  "Protective Gear",
  "Motorcycle Parts"
 ],
 "auto-tools": [
  "Diagnostic Tools",
  "Jacks",
  "Mechanics Tool Sets",
  "Tyre Tools"
 ],
 "car-care": [
  "Cleaning Products",
  "Polishing Products",
  "Interior Care",
  "Pressure Washers"
 ],
 "baby-clothing": [
  "Bodysuits",
  "Baby Sleepwear",
  "Baby Outfits",
  "Baby Shoes",
  "Baby Accessories"
 ],
 "feeding": [
  "Bottles",
  "Sterilisers",
  "High Chairs",
  "Breastfeeding Supplies",
  "Feeding Accessories"
 ],
 "nursery": [
  "Cots",
  "Cribs",
  "Changing Tables",
  "Nursery Storage",
  "Mattresses"
 ],
 "strollers": [
  "Pushchairs",
  "Travel Systems",
  "Prams",
  "Baby Carriers",
  "Travel Accessories"
 ],
 "car-seats": [
  "Infant Car Seats",
  "Toddler Car Seats",
  "Booster Seats",
  "Car Seat Accessories"
 ],
 "baby-toys": [
  "Soft Toys",
  "Rattles",
  "Activity Mats",
  "Developmental Toys"
 ],
 "haircare": [
  "Shampoos",
  "Conditioners",
  "Styling Products",
  "Hair Tools",
  "Hair Treatments"
 ],
 "makeup": [
  "Face Makeup",
  "Eye Makeup",
  "Lip Makeup",
  "Makeup Brushes",
  "Makeup Sets"
 ],
 "mens-grooming": [
  "Shaving",
  "Beard Care",
  "Grooming Kits",
  "Clippers"
 ],
 "oral-care": [
  "Toothbrushes",
  "Toothpaste",
  "Floss & Interdental",
  "Whitening",
  "Mouthwash"
 ],
 "non-fiction": [
  "Biography",
  "History",
  "Business",
  "Self Help",
  "Science",
  "Travel"
 ],
 "childrens-books": [
  "Picture Books",
  "Early Readers",
  "Young Adult",
  "Activity Books"
 ],
 "textbooks": [
  "School Textbooks",
  "University Textbooks",
  "Language Learning",
  "Revision Guides"
 ],
 "comics": [
  "Superhero Comics",
  "Manga",
  "Graphic Novels",
  "Comic Collections"
 ],
 "rare-books": [
  "First Editions",
  "Signed Books",
  "Antiquarian Books",
  "Collectible Sets"
 ],
 "cassettes": [
  "Cassette Albums",
  "Cassette Singles",
  "Cassette Box Sets"
 ],
 "music-box-sets": [
  "CD Box Sets",
  "Vinyl Box Sets",
  "Collector Editions"
 ],
 "other-music-formats": [
  "MiniDiscs",
  "8-Track Tapes",
  "Music Accessories"
 ],
 "vinyl": [
  "LP Albums",
  "7 Inch Singles",
  "12 Inch Singles",
  "Picture Discs",
  "Collectors Vinyl"
 ],
 "screen-protectors": [
  "Tempered Glass",
  "Privacy Protectors",
  "Film Protectors"
 ],
 "smartwatches": [
  "Apple Watch",
  "Samsung Watch",
  "Fitness Watches",
  "Accessories"
 ],
 "womens-clothing": [
  "Dresses",
  "Tops",
  "Jackets & Coats",
  "Jeans & Trousers",
  "Knitwear",
  "Underwear"
 ],
 "kids-clothing": [
  "Boys Clothing",
  "Girls Clothing",
  "Coats",
  "School Uniform",
  "Footwear"
 ],
 "shoes": [
  "Trainers",
  "Boots",
  "Formal Shoes",
  "Sandals",
  "Slippers"
 ],
 "bags": [
  "Handbags",
  "Backpacks",
  "Wallets",
  "Belts",
  "Travel Bags"
 ],
 "tvs": [
  "Smart TVs",
  "4K TVs",
  "Projectors",
  "TV Mounts",
  "Streaming Devices"
 ],
 "solar": [
  "Solar Panels",
  "Solar Batteries",
  "Solar Chargers",
  "Renewable Accessories"
 ],
 "organic-food": [
  "Organic Pantry",
  "Organic Snacks",
  "Natural Beverages"
 ],
 "reusable": [
  "Reusable Bags",
  "Reusable Bottles",
  "Food Storage",
  "Zero Waste Accessories"
 ],
 "natural-cleaning": [
  "Laundry Products",
  "Surface Cleaners",
  "Dishwashing"
 ],
 "sustainable-fashion": [
  "Second-Hand Clothing",
  "Sustainable Accessories"
 ],
 "green-tech": [
  "Smart Energy Devices",
  "Energy Monitors",
  "Eco Gadgets"
 ],
 "vitamins": [
  "Multivitamins",
  "Single Vitamins",
  "Minerals",
  "Nutrition Supplements"
 ],
 "medical": [
  "First Aid Kits",
  "Bandages",
  "Dressings",
  "Medical Equipment"
 ],
 "cleaning": [
  "Laundry",
  "Surface Cleaning",
  "Bathroom Cleaning",
  "Dishwashing"
 ],
 "air-fresheners": [
  "Room Sprays",
  "Diffusers",
  "Air Freshener Refills"
 ],
 "pest-control": [
  "Insect Control",
  "Rodent Control",
  "Traps",
  "Repellents"
 ],
 "home-decor": [
  "Wall Art",
  "Mirrors",
  "Vases",
  "Clocks",
  "Decorative Objects"
 ],
 "lighting": [
  "Ceiling Lights",
  "Table Lamps",
  "Floor Lamps",
  "LED Lighting"
 ],
 "lab-equipment": [
  "Microscopes",
  "Measuring Equipment",
  "Glassware",
  "Lab Accessories"
 ],
 "safety": [
  "Gloves",
  "Eye Protection",
  "Respiratory Protection",
  "Workwear"
 ],
 "electrical": [
  "Connectors",
  "Switches",
  "Sensors",
  "Cables",
  "Components"
 ],
 "hydraulics": [
  "Hydraulic Pumps",
  "Cylinders",
  "Pneumatic Parts",
  "Fittings"
 ],
 "janitorial": [
  "Cleaning Machines",
  "Cleaning Supplies",
  "Facility Equipment"
 ],
 "blu-ray": [
  "Blu-ray Films",
  "Blu-ray TV Box Sets",
  "Special Editions"
 ],
 "dvd": [
  "DVD Films",
  "TV Series",
  "Box Sets",
  "Special Editions"
 ],
 "4k-uhd": [
  "4K Films",
  "4K Box Sets",
  "Collector Editions"
 ],
 "tv-series": [
  "Drama Series",
  "Comedy Series",
  "Documentaries",
  "Complete Collections"
 ],
 "foreign-films": [
  "World Cinema",
  "Arthouse",
  "Cult Films"
 ],
 "guitars": [
  "Electric Guitars",
  "Acoustic Guitars",
  "Bass Guitars",
  "Guitar Amplifiers"
 ],
 "pianos": [
  "Digital Pianos",
  "Acoustic Pianos",
  "Keyboards",
  "Synthesizers"
 ],
 "drums": [
  "Drum Kits",
  "Cymbals",
  "Electronic Drums",
  "Percussion"
 ],
 "wind": [
  "Woodwind",
  "Brass",
  "Flutes",
  "Saxophones"
 ],
 "dj-equipment": [
  "DJ Controllers",
  "Mixers",
  "Audio Interfaces",
  "Studio Monitors"
 ],
 "instrument-accessories": [
  "Strings",
  "Cases",
  "Stands",
  "Cables",
  "Replacement Parts"
 ],
 "printers": [
  "Inkjet Printers",
  "Laser Printers",
  "Scanners",
  "All-in-One Printers",
  "Ink & Toner"
 ],
 "desk-accessories": [
  "Desk Organisers",
  "Desk Lamps",
  "Keyboard Trays"
 ],
 "filing": [
  "Filing Cabinets",
  "Folders",
  "Document Storage"
 ],
 "pens": [
  "Ballpoint Pens",
  "Gel Pens",
  "Fountain Pens",
  "Markers"
 ],
 "paper": [
  "Copy Paper",
  "Notebooks",
  "Sticky Notes",
  "Stationery Sets"
 ],
 "calendars": [
  "Wall Calendars",
  "Desk Calendars",
  "Diaries",
  "Planners"
 ],
 "outdoor-furniture": [
  "Garden Tables",
  "Garden Chairs",
  "Outdoor Sofas",
  "Sun Loungers"
 ],
 "grills": [
  "Charcoal Barbecues",
  "Gas Barbecues",
  "Portable Barbecues",
  "Accessories"
 ],
 "gardening-tools": [
  "Lawnmowers",
  "Trimmers",
  "Hand Tools",
  "Watering Equipment"
 ],
 "plants": [
  "Indoor Plants",
  "Garden Plants",
  "Flower Seeds",
  "Vegetable Seeds"
 ],
 "outdoor-decor": [
  "Planters",
  "Garden Ornaments",
  "Outdoor Lighting"
 ],
 "cats": [
  "Cat Food",
  "Litter & Trays",
  "Cat Beds",
  "Toys",
  "Scratching Posts"
 ],
 "birds": [
  "Bird Food",
  "Cages",
  "Perches",
  "Bird Toys"
 ],
 "fish": [
  "Aquariums",
  "Filters",
  "Fish Food",
  "Aquatic Decor"
 ],
 "small-animals": [
  "Cages",
  "Bedding",
  "Food",
  "Toys"
 ],
 "reptiles": [
  "Terrariums",
  "Heating",
  "Reptile Food",
  "Habitat Decor"
 ],
 "cycling": [
  "Bicycles",
  "Helmets",
  "Bike Parts",
  "Cycling Accessories"
 ],
 "camping": [
  "Tents",
  "Sleeping Bags",
  "Backpacks",
  "Camping Cooking"
 ],
 "water-sports": [
  "Swimming",
  "Surfing",
  "Paddleboarding",
  "Boating Equipment"
 ],
 "team-sports": [
  "Football",
  "Basketball",
  "Cricket",
  "Rugby",
  "Training Gear"
 ],
 "winter-sports": [
  "Skiing",
  "Snowboarding",
  "Ice Skating",
  "Accessories"
 ],
 "hand-tools": [
  "Spanners",
  "Screwdrivers",
  "Pliers",
  "Tool Sets"
 ],
 "electrical-installation": [
  "Cables",
  "Sockets",
  "Switches",
  "Circuit Protection"
 ],
 "electrical-tools": [
  "Electrical Testers",
  "Installation Tools",
  "Lighting Accessories"
 ],
 "plumbing": [
  "Pipes",
  "Fittings",
  "Taps",
  "Plumbing Tools"
 ],
 "paint": [
  "Paints",
  "Brushes",
  "Rollers",
  "Decorating Supplies"
 ],
 "safety-tools": [
  "Protective Gloves",
  "Safety Goggles",
  "Dust Masks"
 ],
 "action-figures": [
  "Collectible Figures",
  "Playsets",
  "Figure Accessories"
 ],
 "board-games": [
  "Board Games",
  "Card Games",
  "Jigsaw Puzzles",
  "Strategy Games"
 ],
 "dolls": [
  "Fashion Dolls",
  "Baby Dolls",
  "Dollhouses",
  "Doll Accessories"
 ],
 "outdoor-toys": [
  "Ride-On Toys",
  "Outdoor Games",
  "Water Toys"
 ],
 "stem": [
  "Science Kits",
  "Robotics",
  "Learning Toys",
  "Coding Toys"
 ],
 "building-sets": [
  "Construction Bricks",
  "Model Kits",
  "Magnetic Tiles"
 ],
 "pc-gaming": [
  "PC Games",
  "Gaming Keyboards",
  "Gaming Mice",
  "Controllers"
 ],
 "vr-gaming": [
  "VR Headsets",
  "VR Games",
  "VR Accessories"
 ],
 "documents-ebooks": [
  "Ebooks",
  "Guides",
  "Templates",
  "Digital Documents"
 ],
 "graphics-design": [
  "Design Templates",
  "Fonts",
  "Icons",
  "Digital Artwork"
 ],
 "photography": [
  "Stock Photos",
  "Photo Presets",
  "Photography Tools"
 ],
 "video": [
  "Stock Footage",
  "Video Templates",
  "Editing Presets"
 ],
 "audio-music": [
  "Music Tracks",
  "Sound Effects",
  "Audio Templates"
 ],
 "games-gaming": [
  "Digital Games",
  "Game Assets",
  "Gaming Tools"
 ],
 "education-courses": [
  "Online Courses",
  "Workbooks",
  "Learning Materials"
 ],
 "business-marketing": [
  "Marketing Templates",
  "Business Plans",
  "Social Media Assets"
 ],
 "ai-automation": [
  "AI Prompts",
  "Automation Templates",
  "AI Workflows"
 ],
 "3d-cad": [
  "3D Models",
  "CAD Templates",
  "3D Printing Files"
 ],
 "websites-online-assets": [
  "Website Templates",
  "Domain Assets",
  "Site Components"
 ],
 "virtual-goods": [
  "Virtual Collectibles",
  "Digital Items",
  "Game Virtual Goods"
 ],
 "other-digital": [
  "Mixed Digital Bundles",
  "Other Downloads"
 ],
 "fine-jewellery": [
  "Gold Jewellery",
  "Silver Jewellery",
  "Precious Gem Jewellery"
 ],
 "fashion-jewellery": [
  "Costume Jewellery",
  "Statement Pieces",
  "Jewellery Sets"
 ],
 "rings": [
  "Engagement Rings",
  "Wedding Bands",
  "Fashion Rings"
 ],
 "necklaces": [
  "Chains",
  "Pendants",
  "Necklace Sets"
 ],
 "bracelets-earrings": [
  "Bracelets",
  "Stud Earrings",
  "Drop Earrings"
 ],
 "watch-parts": [
  "Watch Straps",
  "Watch Batteries",
  "Watch Tools"
 ],
 "gemstones": [
  "Loose Gemstones",
  "Gemstone Beads",
  "Specimens"
 ],
 "adult-collectibles": [
  "Collectible Memorabilia",
  "Vintage Collectibles"
 ],
 "adult-accessories": [
  "Novelty Accessories",
  "Specialist Accessories"
 ],
 "adult-digital": [
  "Restricted Digital Collectibles"
 ],
 "adult-services": [
  "Other Restricted Services"
 ],
 "adult-vintage-collectors": [
  "Vintage Media",
  "Collectors Prints"
 ],
 "other-adult": [
  "Other Adult Collectibles"
 ]
};
export function thirdLevelProposals(categorySlug:string,subcategorySlug:string,subcategoryName:string):string[]{
 const expanded=EXPANDED_THIRD_LEVEL[subcategorySlug];
 if(expanded)return expanded;
 const specific=THIRD_LEVEL_BY_SUBCATEGORY[subcategorySlug];
 if(specific)return specific;
 const curated=THIRD_LEVEL_SUGGESTIONS[categorySlug];
 if(curated?.subcategory===subcategorySlug)return curated.suggestions;
 const base=subcategoryName.replace(/\s*\(Legacy\)/g,"").trim();
 // A conservative fallback for niche areas: meaningful options can be reviewed/renamed by admin.
 return [base+" - Main Products",base+" - Accessories",base+" - Parts & Supplies"];
}
type ThirdLevelEntry = { category: string; subcategory: string; slug: string; name: string; visible: boolean; sort_order: number };
let taxonomyOverrides: ThirdLevelEntry[] = [];
let taxonomyLoaded = false;
export async function loadThirdLevelTaxonomy(): Promise<void> {
  try {
    const response = await fetch("/api/taxonomy/third-level");
    if (!response.ok) return;
    const data = await response.json();
    if (Array.isArray(data.categories)) { taxonomyOverrides = data.categories; taxonomyLoaded = true; }
  } catch { /* static taxonomy remains available offline */ }
}
export function suggestedThirdLevel(categorySlug: string, subcategorySlug: string): string[] {
  const entry = THIRD_LEVEL_SUGGESTIONS[categorySlug];
  const original = entry?.subcategory === subcategorySlug ? entry.suggestions : [];
  if (!taxonomyLoaded) return original;
  const overrides = taxonomyOverrides.filter(e => e.category === categorySlug && e.subcategory === subcategorySlug);
  const saved = overrides.filter(e => e.visible).sort((a,b) => a.sort_order-b.sort_order).map(e => e.name);
  return saved; // A saved hidden category must never leak through static fallback suggestions.
}

export function thirdLevelSlug(name: string): string {
  return name.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
