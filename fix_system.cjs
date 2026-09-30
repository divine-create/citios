const fs = require('fs');
let c = fs.readFileSync('lib/voice/tools/impl/system.ts', 'utf8');
c = c.replace(/const ctx = await buildResidentContext\(session\.user\.personId\);/g, "const ctx = await buildResidentContext(session.user.personId);\n    const { generateRecommendations } = await import('../../intelligence/recommendation');\n    const recs = await generateRecommendations(ctx);");
c = c.replace(/preferences: ctx\.preferences/g, 'preferences: ctx.preferences, recommendations: recs');
fs.writeFileSync('lib/voice/tools/impl/system.ts', c);
