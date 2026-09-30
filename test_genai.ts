import { GoogleGenAI } from '@google/genai';
async function m() {
  const ai = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY});
  const res = await ai.models.list();
  console.log(res);
}
m();
