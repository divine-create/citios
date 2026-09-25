const fs = require('fs');
let content = fs.readFileSync('types/next-auth.d.ts', 'utf8');

content = content.replace(
  'onboardingComplete?: boolean;\n    };\n  }',
  'onboardingComplete?: boolean;\n      isSystemAdmin?: boolean;\n    };\n  }'
);

content = content.replace(
  'onboardingComplete?: boolean;\n  }\n}',
  'onboardingComplete?: boolean;\n    isSystemAdmin?: boolean;\n  }\n}'
);

fs.writeFileSync('types/next-auth.d.ts', content);
