import fs from 'fs';

let c = fs.readFileSync('lib/actions/retail.ts', 'utf8');

c = c.replace('shiftId?: string; locationId?: string | null;\\n  locationId?: string;', 'shiftId?: string;\\n  locationId?: string | null;');
c = c.replace('shiftId?: string; locationId?: string | null;\n  locationId?: string;', 'shiftId?: string;\n  locationId?: string | null;');

c = c.replace('locationId: input.locationId,\\n        locationId: input.locationId,', 'locationId: input.locationId,');
c = c.replace('locationId: input.locationId,\n        locationId: input.locationId,', 'locationId: input.locationId,');

fs.writeFileSync('lib/actions/retail.ts', c);
console.log('Fixed duplicates');
