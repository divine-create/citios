const fs = require('fs');
let c = fs.readFileSync('components/cityos/voice/CityOSVoice.tsx', 'utf8');

const regex = /const { token } = await tokenRes\.json\(\);/;
c = c.replace(regex, "const { token, systemPrompt } = await tokenRes.json();");

const configRegex = /const config: AgentSessionConfig = \{[\s\S]*?tools: dynamicTools\s*\};/;
c = c.replace(configRegex, `const config: AgentSessionConfig = {
          system_prompt: systemPrompt || "You are CityOS Voice. NEVER hallucinate. ALWAYS use tools.",
          greeting: "Hi, I'm CityOS. How can I help?",
          output: { type: "audio" },
          tools: dynamicTools
        };`);

fs.writeFileSync('components/cityos/voice/CityOSVoice.tsx', c);
