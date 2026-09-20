import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CityConnect - Hyperlocal Smart Commerce & Living',
    short_name: 'CityConnect',
    description: 'City-wide super platform connecting local commerce, dining, pharmacies, and residents.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#1877F2',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/icons/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
    shortcuts: [
      {
        name: 'ShopOS POS',
        short_name: 'POS',
        description: 'Open Store POS Terminal',
        url: '/workspaces/shopos',
        icons: [{ src: '/icons/icon.svg', sizes: 'any' }],
      },
      {
        name: 'City Marketplace',
        short_name: 'Market',
        description: 'Explore City Marketplace',
        url: '/market',
        icons: [{ src: '/icons/icon.svg', sizes: 'any' }],
      },
      {
        name: 'Food & Dining',
        short_name: 'Food',
        description: 'Order from City Restaurants',
        url: '/food',
        icons: [{ src: '/icons/icon.svg', sizes: 'any' }],
      },
      {
        name: 'My Orders',
        short_name: 'Orders',
        description: 'View and track your orders',
        url: '/orders',
        icons: [{ src: '/icons/icon.svg', sizes: 'any' }],
      },
    ],
  };
}
