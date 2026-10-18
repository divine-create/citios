async function testUrls() {
  const urls = [
    // Events
    { name: 'Hit FM Conference', url: 'https://cec.hitfmcalabar.com/wp-content/uploads/2026/09/WhatsApp-Image-2026-09-01-at-8.06.23-AM.jpeg' },
    { name: 'Hit FM Festival', url: 'https://cec.hitfmcalabar.com/wp-content/uploads/2026/09/WhatsApp-Image-2026-09-01-at-9.44.58-AMv-1024x684.jpeg' },
    { name: 'Carnival Calabar 1', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Carnival_Calabar_01.jpg/1280px-Carnival_Calabar_01.jpg' },
    { name: 'Bikers Carnival', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Bikers_Carnival_Calabar.jpg/1280px-Bikers_Carnival_Calabar.jpg' },
    
    // Tech Products
    { name: 'Starlink Kit', url: 'https://images.ctfassets.net/rhrb7qne0s49/4fXqF4bK1Kx1YxGk9V8c2c/e82b78a9c0d2b1f8/Starlink_Standard_Kit_Hardware.png' },
    { name: 'iPhone 16', url: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-16-finish-select-202409-6-1inch-black?wid=1200&hei=630&fmt=jpeg&qlt=95' },
    { name: 'AirPods Pro 2', url: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/MTJV3?wid=1144&hei=1144&fmt=jpeg&qlt=90' },
    { name: 'Watch Ultra 2', url: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/watch-ultra-2-case-hero-202409?wid=1000&hei=1000&fmt=jpeg&qlt=90' },
    { name: 'JBL Charge', url: 'https://www.jbl.com/dw/image/v2/AAUJ_PRD/on/demandware.static/-/Sites-masterCatalog_Harman/default/dw24508a3f/JBL_CHARGE5_HERO_BLACK_30537_x1.png' },
    { name: 'Maono Mic', url: 'https://www.maono.com/cdn/shop/products/maono-pd200x-usb-xlr-dynamic-microphone-black-1.png' },
  ];

  for (const item of urls) {
    try {
      const res = await fetch(item.url, { method: 'HEAD', headers: { 'User-Agent': 'Mozilla/5.0' } });
      console.log(`[${res.status === 200 ? 'OK' : res.status}] ${item.name}`);
    } catch (err: any) {
      console.error(`[ERR] ${item.name}:`, err.message);
    }
  }
}

testUrls().finally(() => process.exit(0));
