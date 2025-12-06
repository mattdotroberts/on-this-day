import { GoogleGenAI, Type, Schema } from "@google/genai";
import { BookEntry, UserPreferences, CoverStyle } from "../types";

export const generateBookEntries = async (
  prefs: UserPreferences,
  apiKey: string
): Promise<BookEntry[]> => {
  const ai = new GoogleGenAI({ apiKey });
  
  const birthDay = parseInt(prefs.birthDay) || 1;
  const birthMonth = prefs.birthMonth || "January";
  const birthYear = parseInt(prefs.birthYear) || 2000;
  const currentYear = new Date().getFullYear();
  const age = currentYear - birthYear;
  
  // Determine Reading Level / Style based on Age
  let styleInstruction = "";
  if (age <= 7) {
    styleInstruction = "READING LEVEL: EARLY READER (Ages 5-7). Use simple words but make the story long and descriptive (approx 100-150 words). Focus on magical details.";
  } else if (age <= 12) {
    styleInstruction = "READING LEVEL: MIDDLE GRADE (Ages 8-12). Fun facts, adventurous tone. Length: approx 150-200 words.";
  } else if (age <= 18) {
    styleInstruction = "READING LEVEL: YOUNG ADULT (Ages 13-18). Engaging, dynamic. Length: approx 200-250 words.";
  } else {
    styleInstruction = "READING LEVEL: ADULT. Sophisticated, witty, and elegant. Style similar to 'The New Yorker'. Length: approx 200-250 words.";
  }

  // Determine Blending Strictness
  let blendInstruction = "";
  if (prefs.blendLevel === 'focused') {
    blendInstruction = `
      MODE: SINGULAR FOCUS PER DAY.
      - Each day's entry must focus on EXACTLY ONE interest.
      - **CRITICAL**: You must rotate through ALL the user's interests across the book. Do not just stick to one. 
      - Example: Jan 1 is about [Interest A], Feb 14 is about [Interest B], Mar 20 is about [Interest A].
    `;
  } else { // diverse
    blendInstruction = `
      MODE: INTERWOVEN CONNECTIONS.
      - Try to find events where multiple interests overlap (e.g. Science + Art).
      - If no overlap exists for a date, pick one interest and tell it beautifully.
    `;
  }

  const prompt = `
    You are writing a book titled "A Year's History Of ${prefs.name}".
    
    TARGET AUDIENCE:
    - Name: ${prefs.name}
    - Age: ${age} (Born ${birthYear})
    - Interests: ${prefs.interests.join(", ")}
    - Birth Date: ${birthMonth} ${birthDay}, ${birthYear}

    **CORE HISTORY RULES (READ CAREFULLY):**
    1. **ANY YEAR ALLOWED**: For the daily entries, you can pick historical events from **ANY YEAR IN HUMAN HISTORY**. You are NOT limited to ${birthYear}.
       - Look for events from Ancient Rome, the Renaissance, the 1920s, or 1000 years ago.
       - The goal is to find the *best possible story* for that calendar day that relates to the user's interests.
    
    2. **BIRTHDAY EXCEPTION**:
       - The entry for **${birthMonth} ${birthDay}** MUST be about the specific year **${birthYear}** (the year they were born).
       - Headline: "A Star is Born: ${prefs.name} Arrives!"
       - Content: Focus on their birth, but mention one other real event from ${birthMonth} ${birthDay}, ${birthYear} as context.

    3. **INTEREST DRIVEN**:
       - EVERY entry must be directly related to the user's interests.
       - Do not include random general history unless it ties to an interest.

    4. **CONTENT LENGTH**:
       - The 'historyEvent' narrative MUST be substantial (approx 200-250 words). 
       - It needs to fill about 50-60% of a book page. 
       - Go into detail about the event. Paint a scene. Don't just summarize.

    5. **SOURCES**:
       - Provide 1-2 real sources (Title and URL) for the historical fact if available (e.g. Wikipedia link, Encyclopedia Britannica, or Museum link).

    TASK:
    Generate a JSON array of 12-15 daily entries covering the calendar year (Jan - Dec).
    
    **OUTPUT FORMAT**:
    Return strictly a valid JSON array of objects.
  `;

  const responseSchema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        day: { type: Type.STRING, description: 'e.g. January 1' },
        year: { type: Type.STRING, description: 'The year this event happened, e.g. 1923 or 44 BC' },
        headline: { type: Type.STRING },
        historyEvent: { type: Type.STRING, description: 'Long narrative text, approx 200 words.' },
        nameLink: { type: Type.STRING, nullable: true },
        whyIncluded: { type: Type.STRING },
        sources: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              url: { type: Type.STRING }
            }
          }
        }
      },
      required: ["day", "year", "headline", "historyEvent", "whyIncluded"],
    },
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        systemInstruction: "You are a professional biographer and historian. You find fascinating connections between specific dates and personal interests across all of history. You write in depth.",
      },
    });

    if (response.text) {
      const entries = JSON.parse(response.text) as BookEntry[];
      
      // Sort by calendar date (ignoring year of event, we want Jan -> Dec flow)
      entries.sort((a, b) => {
        const dateA = new Date(`${a.day}, 2000`); // Use arbitrary leap year to catch Feb 29
        const dateB = new Date(`${b.day}, 2000`);
        
        const timeA = isNaN(dateA.getTime()) ? 0 : dateA.getTime();
        const timeB = isNaN(dateB.getTime()) ? 0 : dateB.getTime();
        
        return timeA - timeB;
      });

      return entries;
    }
    
    throw new Error("No content generated");
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

const COVER_PROMPTS: Record<CoverStyle, string> = {
  classic: "Classic antique leather bound history book cover. Elegant, sophisticated, vintage, gold leaf embossing texture, timeless design. Deep rich colors like burgundy, navy, or forest green.",
  minimalist: "Modern minimalist book cover. Clean typography, plenty of negative space, abstract geometric shapes, high-end design magazine aesthetic. Bauhaus influence.",
  whimsical: "Whimsical hand-drawn illustration style. Colorful, watercolor or ink textures, magical atmosphere, detailed and charming. Soft pastel or vibrant palette.",
  cinematic: "Cinematic and dramatic book cover. Realistic lighting, moody atmosphere, movie poster quality, high contrast. Epic scale.",
  retro: "Retro vintage poster style (1950s-1970s). Bold colors, distressed texture, pop art or mid-century modern influence. Screen print aesthetic."
};

export const generateBookCover = async (
  prefs: UserPreferences,
  apiKey: string
): Promise<string | undefined> => {
  const ai = new GoogleGenAI({ apiKey });
  
  // For the cover, we still use the birth year as the "Edition" year visually
  const stylePrompt = COVER_PROMPTS[prefs.coverStyle] || COVER_PROMPTS.classic;

  const prompt = `
    A beautiful, high-quality book cover image for a book titled "A Year's History Of ${prefs.name}".
    
    The cover should visually represent these themes: ${prefs.interests.join(", ")}.
    
    STYLE: ${stylePrompt}
    FORMAT: Portrait aspect ratio (book cover).
    
    No text on the image if possible, or very minimal.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: "3:4"
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return undefined;
  } catch (error) {
    console.error("Cover generation failed:", error);
    return undefined;
  }
};
