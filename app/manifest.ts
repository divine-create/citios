import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '9jaLive - Hyperlocal Smart Commerce & Living',
    short_name: '9jaLive',
    description: 'Nigeria’s hyperlocal super platform connecting local commerce, dining, stays, events, and residents.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#1877F2',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
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
