const GEMINI_KEY = process.env.EXPO_PUBLIC_GEMINI_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;

const callGemini = async (prompt) => {
  try {
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 500, temperature: 0.3 },
      }),
    });
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } catch (error) {
    return '';
  }
};

export const summarizeProblems = async (problems) => {
  if (!problems || problems.length === 0) return '';
  const problemText = problems.map(p => `- ${p.title}: ${p.description}`).join('\n');
  const prompt = `Ye India ke logon ki problems hain. Inhe 3 lines mein Hindi mein summarize karo, aur sabse important problem pehle batao:\n${problemText}`;
  return await callGemini(prompt);
};

export const filterWorldChatMessage = async (message) => {
  const prompt = `Ye message check karo. Agar isme gaali, nafrat, spam ya koi harmful content hai to "REMOVE" return karo. Agar theek hai to "OK" return karo. Sirf REMOVE ya OK return karo, kuch nahi.\nMessage: "${message}"`;
  const result = await callGemini(prompt);
  return result.trim().toUpperCase() === 'REMOVE';
};

export const generateProblemSummary = async (title, description) => {
  const prompt = `Ye ek civic problem hai India mein. Isko 1 line mein summarize karo Hindi mein:\nTitle: ${title}\nDescription: ${description}`;
  return await callGemini(prompt);
};

export const analyzeLeaderPerformance = async (leader, problems, votes) => {
  const prompt = `Ye ek Indian leader hai:\nNaam: ${leader.name}\nRole: ${leader.leader_type}\nArea: ${leader.leader_area}\nPositive Votes: ${votes?.positive || 0}\nNegative Votes: ${votes?.negative || 0}\nArea mein problems: ${problems?.length || 0}\n\nInke baare mein 2-3 lines mein honest analysis do Hindi mein.`;
  return await callGemini(prompt);
};

export const summarizeWorldChatForLeader = async (messages) => {
  if (!messages || messages.length === 0) return '';
  const msgText = messages.map(m => m.message).join('\n');
  const prompt = `Ye public ke messages hain ek civic app par. Inhe leaders ke liye 5 main points mein summarize karo Hindi mein. Gaali aur spam ignore karo:\n${msgText}`;
  return await callGemini(prompt);
};
