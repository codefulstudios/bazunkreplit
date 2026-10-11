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
    name: "Electronics",
    slug: "electronics",
    icon: "Monitor",
    subcategories: [
      { name: "Computers & Laptops", slug: "computers" },
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
    name: "Digital Products (Legacy)",
    slug: "digital-products",
    icon: "Download",
    subcategories: [
      { name: "Software & Apps", slug: "software" },
      { name: "eBooks", slug: "ebooks" },
      { name: "Music Downloads", slug: "music-downloads" },
      { name: "Stock Photos & Videos", slug: "stock-media" },
      { name: "Templates & Themes", slug: "templates" },
      { name: "Online Courses", slug: "online-courses" },
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

/** Suggested third-level taxonomy. Suggestions are editorial only until listing and search APIs support a third slug. */
export const THIRD_LEVEL_SUGGESTIONS: Record<string, {subcategory: string; suggestions: string[]}> = {
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
export function suggestedThirdLevel(categorySlug: string, subcategorySlug: string): string[] {
  const entry = THIRD_LEVEL_SUGGESTIONS[categorySlug];
  return entry?.subcategory === subcategorySlug ? entry.suggestions : [];
}

export function thirdLevelSlug(name: string): string {
  return name.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
