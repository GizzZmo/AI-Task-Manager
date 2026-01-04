import { GoogleGenAI, Type } from "@google/genai";
import { ProcessData, AnalysisResponse, RiskLevel, ResearchResponse } from "../types";

// Initialize Gemini
// NOTE: Ensure process.env.API_KEY is available in your environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeProcessWithGemini = async (processData: ProcessData): Promise<AnalysisResponse> => {
  try {
    const prompt = `
      You are the "AI Supervisor" of a specialized security Task Manager. 
      Analyze the following process telemetry data (feature vector) for potential security threats.
      
      Architectural Context:
      - High Entropy (>7.0) indicates packed code (malware).
      - Unsigned binaries in system folders are suspicious.
      - "Living off the Land" binaries (powershell, cmd) spawned by non-standard parents are suspicious.
      - High resource usage + Unsigned + High Entropy = Malicious.
      
      Process Data:
      ${JSON.stringify(processData, null, 2)}
      
      Return a JSON response with a risk score (0-1), a classification (SAFE, SUSPICIOUS, MALICIOUS), a concise reasoning string, and a recommended action (Kill, Monitor, Ignore).
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            riskScore: { type: Type.NUMBER },
            classification: { 
              type: Type.STRING,
              enum: ["SAFE", "SUSPICIOUS", "MALICIOUS", "UNKNOWN"]
            },
            reasoning: { type: Type.STRING },
            recommendedAction: { type: Type.STRING }
          },
          required: ["riskScore", "classification", "reasoning", "recommendedAction"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) throw new Error("No response from AI");

    const parsed = JSON.parse(resultText);
    
    // Map string to enum safely
    let riskLevel = RiskLevel.UNKNOWN;
    switch(parsed.classification) {
        case "SAFE": riskLevel = RiskLevel.SAFE; break;
        case "SUSPICIOUS": riskLevel = RiskLevel.SUSPICIOUS; break;
        case "MALICIOUS": riskLevel = RiskLevel.MALICIOUS; break;
    }

    return {
      riskScore: parsed.riskScore,
      classification: riskLevel,
      reasoning: parsed.reasoning,
      recommendedAction: parsed.recommendedAction
    };

  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return {
      riskScore: 0,
      classification: RiskLevel.UNKNOWN,
      reasoning: "AI Supervisor unavailable or API error.",
      recommendedAction: "Manual Inspection Required"
    };
  }
};

export const researchProcess = async (processName: string): Promise<ResearchResponse> => {
  try {
    const prompt = `Research the Windows process named "${processName}". 
    1. Identify what software it belongs to (Vendor/Product).
    2. Determine its typical function.
    3. State if it is commonly impersonated by malware.
    
    Provide a concise summary suitable for a security dashboard.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    // Extract sources from grounding metadata
    const sources: { title: string; uri: string }[] = [];
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    
    if (groundingChunks) {
      groundingChunks.forEach(chunk => {
        if (chunk.web) {
          sources.push({
            title: chunk.web.title || "Source",
            uri: chunk.web.uri || "#"
          });
        }
      });
    }

    return {
      content: response.text || "No intelligence gathered.",
      sources: sources
    };

  } catch (error) {
    console.error("Gemini research failed:", error);
    return {
      content: "Unable to connect to Global Intelligence Network.",
      sources: []
    };
  }
};

export const analyzeSystemScreenshot = async (base64Data: string, mimeType: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          },
          {
            text: "You are a Level 3 Security Analyst. Analyze this screenshot. It may contain system logs, code snippets, dashboard metrics, or error messages. Summarize the technical content, identify any visible errors, and highlight potential security risks or anomalies. Be concise and professional."
          }
        ]
      }
    });

    return response.text || "Analysis complete, but no textual output returned.";
  } catch (error) {
    console.error("Visual analysis failed:", error);
    return "Error analyzing image. Please ensure the image is valid and the service is available.";
  }
};