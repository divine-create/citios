export interface InterestCategory {
  category: string;
  tags: string[];
}

export const INTEREST_CATEGORIES: InterestCategory[] = [
  {
    category: 'Food & Culinary',
    tags: [
      'Foodie',
      'Local Street Food',
      'Cafes & Coffee',
      'Fine Dining',
      'Baking & Pastries',
      'Vegan & Healthy',
      'Night Markets',
    ],
  },
  {
    category: 'Arts, Culture & Entertainment',
    tags: [
      'Arts & Culture',
      'Live Music & Concerts',
      'Nightlife & Lounges',
      'Cinema & Film',
      'Theater & Comedy',
      'Photography',
      'Fashion & Style',
    ],
  },
  {
    category: 'Sports & Active Living',
    tags: [
      'Sports & Fitness',
      'Football',
      'Basketball',
      'Running & Marathon',
      'Swimming & Aquatics',
      'Yoga & Wellness',
      'Cycling',
      'Outdoor Adventures & Hiking',
    ],
  },
  {
    category: 'Community & Family',
    tags: [
      'Families & Kids',
      'Volunteering & Charity',
      'Faith & Religion',
      'Pets & Animals',
      'Gardening & Green Spaces',
      'Civic & Community Projects',
      'Youth Mentorship',
    ],
  },
  {
    category: 'Business, Tech & Career',
    tags: [
      'Tech & Startups',
      'Software & AI',
      'Business & Entrepreneurship',
      'Real Estate & Housing',
      'Finance & Wealth',
      'Education & Books',
      'Creative Design',
    ],
  },
  {
    category: 'Hobbies & Lifestyle',
    tags: [
      'Gaming & Esports',
      'Shopping & Thrift',
      'Travel & Staycations',
      'Auto & Cars',
      'DIY & Handcrafts',
      'Board Games & Chess',
    ],
  },
];

// Flat list for quick lookup and selection
export const ALL_INTEREST_TAGS: string[] = Array.from(
  new Set(INTEREST_CATEGORIES.flatMap((c) => c.tags))
);
