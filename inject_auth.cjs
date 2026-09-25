const fs = require('fs');
let content = fs.readFileSync('lib/auth.ts', 'utf8');

// In `jwt({ token, user, trigger })`
content = content.replace(
  'token.onboardingComplete = residentProfile?.onboardingComplete ?? false;',
  'token.onboardingComplete = residentProfile?.onboardingComplete ?? false;\n            token.isSystemAdmin = dbPerson.isSystemAdmin ?? false;'
);

content = content.replace(
  'token.isCourier = token.isCourier ?? false;\n          }',
  'token.isCourier = token.isCourier ?? false;\n          token.isSystemAdmin = token.isSystemAdmin ?? false;\n          }'
);

// In `session({ session, token })`
content = content.replace(
  'session.user.onboardingComplete = (token.onboardingComplete as boolean | undefined) ?? false;',
  'session.user.onboardingComplete = (token.onboardingComplete as boolean | undefined) ?? false;\n        session.user.isSystemAdmin = (token.isSystemAdmin as boolean | undefined) ?? false;'
);

fs.writeFileSync('lib/auth.ts', content);
