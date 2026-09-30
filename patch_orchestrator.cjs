const fs = require('fs');
let code = fs.readFileSync('lib/voice/core/orchestrator.ts', 'utf8');

code = code.replace(
  "import { logisticsModule } from '../modules/logistics';",
  "import { logisticsModule } from '../modules/logistics';\nimport { HotelModule } from '../modules/hotels';"
);

code = code.replace(
  "moduleRegistry.registerModule(logisticsModule);",
  "moduleRegistry.registerModule(logisticsModule);\nmoduleRegistry.registerModule(HotelModule);"
);

fs.writeFileSync('lib/voice/core/orchestrator.ts', code);
