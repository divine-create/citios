const fs = require('fs');
let code = fs.readFileSync('lib/voice/core/orchestrator.ts', 'utf8');

const target1 = `import { SystemModule } from '../modules/system';`;
const replace1 = `import { SystemModule } from '../modules/system';
import { logisticsModule } from '../modules/logistics';
import { assertRateLimit } from './rate-limit';`;

code = code.replace(target1, replace1);

const target2 = `moduleRegistry.registerModule(SystemModule);`;
const replace2 = `moduleRegistry.registerModule(SystemModule);
moduleRegistry.registerModule(logisticsModule);`;

code = code.replace(target2, replace2);

const target3 = `export async function executeTool(name: string, args: any, session: any) {`;
const replace3 = `export async function executeTool(name: string, args: any, session: any, abortSignal?: AbortSignal) {`;
code = code.replace(target3, replace3);

const target4 = `  if (!def) {
    return { ok: false, error: { code: 'INVALID_TOOL', message: \`Tool \${name} is not registered.\` } };
  }`;
const replace4 = `  if (!def) {
    return { ok: false, error: { code: 'INVALID_TOOL', message: \`Tool \${name} is not registered.\` } };
  }
  
  try {
    let limitType: 'global' | 'expensive' | 'confirmation' = 'global';
    if (def.requiresConfirmation) limitType = 'confirmation';
    else if (def.riskLevel === 'irreversible' || def.riskLevel === 'financial') limitType = 'expensive';
    
    assertRateLimit(session.user.personId, limitType);
  } catch (e) {
    return { ok: false, error: { code: 'RATE_LIMITED', message: 'You are performing actions too quickly. Please wait a moment.' } };
  }`;
code = code.replace(target4, replace4);

const target5 = `const result = await def.execute(args, session);`;
const replace5 = `const result = await def.execute(args, session, abortSignal);`;
code = code.replace(target5, replace5);

fs.writeFileSync('lib/voice/core/orchestrator.ts', code);
