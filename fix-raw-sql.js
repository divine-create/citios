import fs from 'fs';

let code = fs.readFileSync('lib/actions/restaurantos.ts', 'utf8');

// Fix raw SQL table names
code = code.replace(/"RestaurantOrder"/g, '"restaurantOrder"');
code = code.replace(/"RestaurantInventoryItem"/g, '"restaurantInventoryItem"');
code = code.replace(/"RestaurantShift"/g, '"restaurantShift"');
code = code.replace(/"RestaurantReservation"/g, '"restaurantReservation"');

fs.writeFileSync('lib/actions/restaurantos.ts', code);
