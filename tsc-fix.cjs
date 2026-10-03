const fs = require('fs');

function fix() {
  // Fix ResidentOrders
  let orders = fs.readFileSync('components/cityos/ResidentOrders.tsx', 'utf8');
  orders = orders.replace(/await cancelOrder\(id\);/, `await cancelOrder(id, { reason: 'User requested' });`);
  orders = orders.replace(/await refundOrder\(id, 'User requested'\);/, `await refundOrder(id, { reason: 'User requested' });`);
  fs.writeFileSync('components/cityos/ResidentOrders.tsx', orders);

  // Fix InventoryManager
  let inv = fs.readFileSync('components/retail/InventoryManager.tsx', 'utf8');
  inv = inv.replace(/setForm\(\{ \.\.\.EMPTY_FORM, sku: nextSku \}\);/g, `setForm({ ...EMPTY_FORM, sku: nextSku } as any);`);
  fs.writeFileSync('components/retail/InventoryManager.tsx', inv);

  // Fix ShopDashboard
  let dash = fs.readFileSync('components/retail/ShopDashboard.tsx', 'utf8');
  dash = dash.replace(/setOrders\(orders\.map/g, `setDashboard({ ...dashboard, orders: dashboard.orders.map`);
  dash = dash.replace(/ : o\)\);/g, ` : o) });`);
  dash = dash.replace(/await refundOrder\(id, 'Merchant requested'\);/, `await refundOrder(id, { reason: 'Merchant requested' });`);
  fs.writeFileSync('components/retail/ShopDashboard.tsx', dash);
}

fix();
