export interface VillageItem {
  id: string;
  name: string;
  location: string;
  period: string;
  description: string;
  image: string;
  tags: string[];
  metrics: {
    label: string;
    icon: string;
  }[];
  categoryBadge?: {
    text: string;
    color: string;
  };
}

export interface ProductItem {
  id: string;
  title: string;
  artisan: string;
  village: string;
  category: 'all' | 'pottery' | 'silk' | 'lacquer';
  badge: string;
  description: string;
  price: number;
  formattedPrice: string;
  image: string;
  story?: string;
  material?: string;
}

export interface WorkshopItem {
  id: string;
  title: string;
  tag: string;
  tagColor: string;
  location: string;
  duration: string;
  description: string;
  pricePerGuest: number;
  formattedPrice: string;
  image: string;
  rating?: number;
  artisanGuide?: string;
}

export interface MasterArtisan {
  name: string;
  title: string;
  experienceYears: number;
  honorTitle: string;
  medal: string;
  quote: string;
  storyParagraph1: string;
  storyParagraph2: string;
  image: string;
  metrics: {
    value: string;
    label: string;
  }[];
}

export interface AIQueryPreset {
  id: string;
  query: string;
  tags: string[];
  recommendation: {
    title: string;
    matchScore: number;
    matchLabel: string;
    artisan: string;
    description: string;
    image: string;
    price: string;
  };
}
