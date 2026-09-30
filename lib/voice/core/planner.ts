import { GoogleGenAI, Type } from '@google/genai';
import { getRegisteredTools } from './orchestrator';
import { WorkflowPlan } from './workflow-types';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function planWorkflow(intent: string, session: any): Promise<WorkflowPlan | { error: string }> {
  // Only plan using orchestrationEligible tools
  const tools = getRegisteredTools().filter((t: any) => t.orchestrationEligible !== false);
  
  const toolDescriptions = tools.map((t: any) => 
    `Tool: ${t.name}\nDescription: ${t.description}\nInput Schema: ${JSON.stringify(t.parameters)}`
  ).join('\n\n');

  const systemPrompt = `You are the CityOS Voice Workflow Planner.
Your job is to transform a user's intent into a structured, bounded workflow plan.
You must select from the available tools to achieve the user's goal.

Available Tools:
${toolDescriptions}

Rules:
1. Only use tools listed above.
2. If multiple steps are required, sequence them. 
3. If step B depends on the output of step A, add step A's ID to step B's dependsOn array.
4. Output MUST be valid JSON conforming to the schema.
5. Do NOT create loops.
6. The maximum number of steps is 10.
7. Use variables like "{{step-1.output.id}}" in arguments to refer to previous step outputs.

Output JSON Schema:
{
  "workflowType": "string",
  "steps": [
    {
      "id": "string",
      "toolName": "string",
      "arguments": { ... },
      "dependsOn": ["string"]
    }
  ]
}
`;

  try {
    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { role: 'user', parts: [{ text: intent }] }
      ],
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        temperature: 0,
      }
    });

    const text = result.text;
    if (!text) return { error: 'Failed to generate plan' };
    
    const plan = JSON.parse(text);
    return plan as WorkflowPlan;
  } catch (error) {
    console.error('Planner error:', error);
    return { error: 'Failed to parse generated plan' };
  }
}
