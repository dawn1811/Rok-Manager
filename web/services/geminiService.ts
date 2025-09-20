
import { GoogleGenAI } from "@google/genai";

// Ensure the API key is handled by the environment.
// Do not add any UI or code to handle the API key.
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.warn("API_KEY environment variable not set. AI features will be disabled.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export const generateEventDescription = async (eventTitle: string): Promise<string> => {
  if (!API_KEY) {
    return "AI service is unavailable. Please set the API_KEY environment variable.";
  }
  
  try {
    const prompt = `Generate a short, exciting, and engaging event description for a video game event titled "${eventTitle}". The description should be suitable for an in-game announcement. Focus on rallying players to participate. Maximum 3 sentences.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.8,
        topP: 0.9,
      }
    });

    return response.text;
  } catch (error) {
    console.error("Error generating event description:", error);
    return "Failed to generate AI description. Please try again later.";
  }
};
