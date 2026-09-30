const fs = require('fs');

let code = fs.readFileSync('lib/voice/core/context.ts', 'utf8');
code += `

export async function startWorkflow(personId: string, workflowId: string, workflowData: any) {
  const data = await getVoiceContext(personId);
  const activeWorkflows = data.activeWorkflows || {};
  activeWorkflows[workflowId] = workflowData;
  await updateVoiceContext(personId, { activeWorkflows });
}

export async function endWorkflow(personId: string, workflowId: string) {
  const data = await getVoiceContext(personId);
  if (data.activeWorkflows && data.activeWorkflows[workflowId]) {
    delete data.activeWorkflows[workflowId];
    await updateVoiceContext(personId, { activeWorkflows: data.activeWorkflows });
  }
}
`;
fs.writeFileSync('lib/voice/core/context.ts', code);
