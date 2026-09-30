const fs = require('fs');

let code = fs.readFileSync('lib/voice/core/registry.ts', 'utf8');

const target = `  registerModule(mod: VoiceModule) {
    if (this.modules.has(mod.id)) {
      console.warn(\`Voice Module \${mod.id} is already registered.\`);
      return;
    }
    this.modules.set(mod.id, mod);
    
    for (const tool of mod.tools) {
      if (this.tools.has(tool.name)) {
        console.warn(\`Tool conflict: \${tool.name} is already registered.\`);
        continue;
      }
      this.tools.set(tool.name, tool);
    }
  }`;

const replacement = `  registerModule(mod: VoiceModule) {
    if (!mod.id || !mod.name) {
      throw new Error('Module must have an id and name.');
    }
    if (this.modules.has(mod.id)) {
      throw new Error(\`Voice Module \${mod.id} is already registered.\`);
    }
    
    // Validate tools
    for (const tool of mod.tools) {
      if (!tool.name) throw new Error(\`Tool in module \${mod.id} is missing a name.\`);
      if (this.tools.has(tool.name)) {
        throw new Error(\`Tool conflict: \${tool.name} is already registered.\`);
      }
      if (!['read', 'reversible', 'financial', 'irreversible', 'sensitive'].includes(tool.riskLevel)) {
        throw new Error(\`Tool \${tool.name} has invalid risk level: \${tool.riskLevel}\`);
      }
      if (typeof tool.execute !== 'function') {
        throw new Error(\`Tool \${tool.name} is missing an execute handler.\`);
      }
      if (!tool.inputSchema || typeof tool.inputSchema !== 'object') {
        throw new Error(\`Tool \${tool.name} is missing a valid input schema.\`);
      }
      if (['financial', 'irreversible', 'sensitive'].includes(tool.riskLevel) && tool.requiresConfirmation === false && tool.name !== 'cancel_workflow') {
        // We enforce that highly privileged tools (other than purely reading ones if misclassified) require confirmation
        if (tool.name !== 'cancel_workflow') {
           throw new Error(\`Tool \${tool.name} with risk level \${tool.riskLevel} must require confirmation.\`);
        }
      }
    }

    this.modules.set(mod.id, mod);
    for (const tool of mod.tools) {
      this.tools.set(tool.name, tool);
    }
  }`;

code = code.replace(target, replacement);

fs.writeFileSync('lib/voice/core/registry.ts', code);
