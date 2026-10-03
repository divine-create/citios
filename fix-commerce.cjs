const fs = require('fs');
let content = fs.readFileSync('app/actions/commerce.ts', 'utf8');

const regex = /status:\s*o\.status === 'CONFIRMED' \? 'packing' : 'delivered',[\s\S]*?time:\s*o\.createdAt\.toLocaleTimeString\(\),/;
const replacement = `status: o.status === 'CANCELLED' ? 'CANCELLED' : o.fulfillmentStatus,
        time: o.createdAt.toLocaleTimeString(),
        deliveryJobId: null, // Will populate if delivery exists`;

content = content.replace(regex, replacement);

fs.writeFileSync('app/actions/commerce.ts', content);
