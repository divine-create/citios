const fs = require('fs');
let code = fs.readFileSync('app/api/voice/tools/route.ts', 'utf8');

const replacement = `    // Phase 7: Real cancellation via AbortController
    const abortController = new AbortController();
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => {
        abortController.abort(); // Actually abort the signal
        reject(new Error('TIMEOUT'));
      }, 8000)
    );
    
    // Pass the signal down
    const executionPromise = executeTool(name, args || {}, session, abortController.signal);
    const result = await Promise.race([executionPromise, timeoutPromise]);
    
    return NextResponse.json(result);`;

code = code.replace(/    \/\/ Add a strict timeout[\s\S]*return NextResponse.json\(result\);/m, replacement);
fs.writeFileSync('app/api/voice/tools/route.ts', code);
