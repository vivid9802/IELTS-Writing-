import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

// Ensure Gemini API key is configured
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn("WARNING: GEMINI_API_KEY environment variable is not set!");
}

// Lazy initialization of Gemini client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not defined in the environment variables.");
    }
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for body parsing
  app.use(express.json());

  // API Route for evaluating essays
  app.post("/api/evaluate", async (req, res) => {
    try {
      const { taskType, promptText, essayText } = req.body;

      if (!taskType || !promptText || !essayText) {
        return res.status(400).json({ error: "Missing required fields: taskType, promptText, and essayText are required." });
      }

      if (essayText.trim().length < 20) {
        return res.status(400).json({ error: "The essay must be at least 20 characters long." });
      }

      const client = getGeminiClient();

      const systemInstruction = 
        `You are an expert, strict, and official IELTS Examiner and Academic Translation/Writing Specialist with 15+ years of experience grading and proofreading IELTS Academic essays (Task 1 and Task 2) and high-level academic texts.
Your evaluations must strictly align with both the official public IELTS Band Descriptors AND the 7-CAT professional translation and academic writing quality standards (Accuracy, Naturalness, Register, Terminology, Rhetoric, Smoothness, Tailoring).

IELTS EVALUATION STANDARDS:
1. TASK ACHIEVEMENT (Task 1) / TASK RESPONSE (Task 2):
- Task 1 requires: A clear introduction, a visible Overview paragraph summarizing main trends/stages/differences (without actual numbers in the overview), and detailed body paragraphs. If there is no clear overview paragraph, the score for Task Achievement MUST NOT exceed 5.0. If key features are merely listed without logical comparison or summary, limit to 6.0.
- Task 2 requires: Addressing all parts of the prompt fully, presenting a clear and consistent position throughout, and extending/supporting key ideas. Off-topic, tangential, or superficial ideas must cap Task Response at 5.0 or 6.0.
- Word count: Check the word count. If Task 1 is under 150 words or Task 2 is under 250 words, apply a penalty by reducing the Task Achievement/Task Response score proportionately, as the response cannot be fully developed.

2. COHERENCE AND COHESION (CC):
- Paragraphing: Ideas must be grouped into logical paragraphs (typically 3-4 paragraphs for Task 1, exactly 4-5 paragraphs for Task 2). If there are no paragraphs or only one continuous paragraph, CC score MUST NOT exceed 5.0.
- Cohesive Devices: Use a range of linking words naturally. If linking words are used mechanically, repetitively, or incorrectly (e.g., overusing "Furthermore", "In addition", "On the other hand" in a repetitive list format), limit CC to 6.0 or below.

3. LEXICAL RESOURCE (LR):
- Vocabulary range: Evaluate the variety and precision of vocabulary, academic word choice, collocations, and idiomatic expressions.
- Errors: Note spelling and word-formation errors. If errors are frequent or impede communication, limit LR to 5.0 or 6.0.

4. GRAMMATICAL RANGE AND ACCURACY (GRA):
- Grammatical range: Look for complex sentence structures (subordinate clauses, relative clauses, conditionals, passive voice, inversion, perfect tenses). If only simple sentences are used, GRA cannot exceed 5.0.
- Accuracy / Error-free rate: To score a Band 7.0 or higher in GRA, at least 50% of the sentences in the essay must be completely error-free. If errors dominate, limit GRA to 5.0 or 6.0.

7-CAT ACADEMIC WRITING & TRANSLATION QUALITY STANDARDS (Score each from 0-9):
1. Accuracy: Completeness of the transfer of meaning/thought without undertranslation or overtranslation.
2. Naturalness: Use of idiomatic, native-like English collocations rather than literal translation of Vietnamese phrasing.
3. Register: Use of formal academic register, avoiding colloquialisms, abbreviations (don't, can't), and personal pronouns unless specified.
4. Terminology: Precision and consistency in using specialized academic and domain terminology.
5. Rhetoric: Preservation of rhetorical structures and academic hedging language (e.g., "appears to", "could arguably suggest").
6. Smoothness: Syntactic fluency, flow of ideas, avoidance of clumsy or repetitive sentence starters and passive voice over-complications.
7. Tailoring: Adapting the language to fit the expectations and cultural nuances of a highly academic reader (the IELTS examiner).

Provide accurate, realistic, and highly constructive IELTS and 7-CAT grading. Do not inflate scores; maintain the realistic, strict standards used by Cambridge/British Council examiners.`;

      const userPrompt = 
        `IELTS Task Type: Writing Task ${taskType}
Prompt / Question:
"""
${promptText}
"""

Candidate's Answer:
"""
${essayText}
"""

Please thoroughly evaluate this answer according to the official examiner instructions.
Grade the overall band score (calculated as the average of the 4 criteria rounded to the nearest half-band, e.g. 6.25 -> 6.5, 6.75 -> 7.0, 6.125 -> 6.0) and the individual bands for each criteria (Task Achievement/Response, Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy).
Also, perform a parallel assessment under the 7-CAT quality framework (Accuracy, Naturalness, Register, Terminology, Rhetoric, Smoothness, Tailoring) and assign scores from 0-9 for each CAT dimension with helpful feedback.
Identify 2-4 core strengths, 2-4 core weaknesses, and 3 specific action items.
Extract direct inline corrections for specific sentences with mistakes (grammar, vocabulary, punctuation, or style).
Finally, provide two full rewrites of the essay: one matching an ideal, natural Band 7.0 level, and another matching an elite, highly academic Band 8.5+ level.`;

      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: userPrompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              overallBand: { type: Type.NUMBER, description: "Overall band score, can be integer or half-band, e.g. 5.5, 6.0, 6.5, 7.0, etc." },
              wordCount: { type: Type.INTEGER, description: "The exact word count of the candidate's essay" },
              criteria: {
                type: Type.OBJECT,
                properties: {
                  taskAchievement: {
                    type: Type.OBJECT,
                    properties: {
                      score: { type: Type.NUMBER, description: "Individual criteria score (0-9)" },
                      feedback: { type: Type.STRING, description: "Detailed feedback on Task Achievement (for Task 1) or Task Response (for Task 2)" }
                    },
                    required: ["score", "feedback"]
                  },
                  coherenceCohesion: {
                    type: Type.OBJECT,
                    properties: {
                      score: { type: Type.NUMBER, description: "Individual criteria score (0-9)" },
                      feedback: { type: Type.STRING, description: "Detailed feedback on Coherence and Cohesion (paragraphing, linking words, flow)" }
                    },
                    required: ["score", "feedback"]
                  },
                  lexicalResource: {
                    type: Type.OBJECT,
                    properties: {
                      score: { type: Type.NUMBER, description: "Individual criteria score (0-9)" },
                      feedback: { type: Type.STRING, description: "Detailed feedback on Lexical Resource (vocabulary range, spelling, collocation)" }
                    },
                    required: ["score", "feedback"]
                  },
                  grammaticalRange: {
                    type: Type.OBJECT,
                    properties: {
                      score: { type: Type.NUMBER, description: "Individual criteria score (0-9)" },
                      feedback: { type: Type.STRING, description: "Detailed feedback on Grammatical Range and Accuracy (sentence structure variety, error-free rate, punctuation)" }
                    },
                    required: ["score", "feedback"]
                  }
                },
                required: ["taskAchievement", "coherenceCohesion", "lexicalResource", "grammaticalRange"]
              },
              sevenCat: {
                type: Type.OBJECT,
                properties: {
                  accuracy: {
                    type: Type.OBJECT,
                    properties: {
                      score: { type: Type.NUMBER, description: "Accuracy score (0-9) based on fidelity and preservation of facts/concepts without over or under translation" },
                      feedback: { type: Type.STRING, description: "Feedback on Accuracy dimension" }
                    },
                    required: ["score", "feedback"]
                  },
                  naturalness: {
                    type: Type.OBJECT,
                    properties: {
                      score: { type: Type.NUMBER, description: "Naturalness score (0-9) based on collocations and idiomatic phrasing" },
                      feedback: { type: Type.STRING, description: "Feedback on Naturalness dimension" }
                    },
                    required: ["score", "feedback"]
                  },
                  register: {
                    type: Type.OBJECT,
                    properties: {
                      score: { type: Type.NUMBER, description: "Register score (0-9) based on formal and academic tone maintenance" },
                      feedback: { type: Type.STRING, description: "Feedback on Register/Tone dimension" }
                    },
                    required: ["score", "feedback"]
                  },
                  terminology: {
                    type: Type.OBJECT,
                    properties: {
                      score: { type: Type.NUMBER, description: "Terminology score (0-9) based on domain-specific term usage" },
                      feedback: { type: Type.STRING, description: "Feedback on Terminology dimension" }
                    },
                    required: ["score", "feedback"]
                  },
                  rhetoric: {
                    type: Type.OBJECT,
                    properties: {
                      score: { type: Type.NUMBER, description: "Rhetoric score (0-9) based on hedging language and rhetorical flows" },
                      feedback: { type: Type.STRING, description: "Feedback on Rhetoric dimension" }
                    },
                    required: ["score", "feedback"]
                  },
                  smoothness: {
                    type: Type.OBJECT,
                    properties: {
                      score: { type: Type.NUMBER, description: "Smoothness score (0-9) based on transition, lack of syntactic hiccups, and fluency" },
                      feedback: { type: Type.STRING, description: "Feedback on Smoothness dimension" }
                    },
                    required: ["score", "feedback"]
                  },
                  tailoring: {
                    type: Type.OBJECT,
                    properties: {
                      score: { type: Type.NUMBER, description: "Tailoring score (0-9) based on audience adaptation (IELTS examiner target)" },
                      feedback: { type: Type.STRING, description: "Feedback on Tailoring dimension" }
                    },
                    required: ["score", "feedback"]
                  }
                },
                required: ["accuracy", "naturalness", "register", "terminology", "rhetoric", "smoothness", "tailoring"]
              },
              strengths: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "List of 2-4 key strengths identified in the candidate's essay"
              },
              weaknesses: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "List of 2-4 key weaknesses or major mistakes found in the candidate's essay"
              },
              actionItems: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "3 concrete, actionable steps the candidate should take next to raise their band score"
              },
              corrections: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    original: { type: Type.STRING, description: "The exact or partial original sentence from the essay that contains an error" },
                    corrected: { type: Type.STRING, description: "The corrected, polished, natural-sounding version of the sentence" },
                    explanation: { type: Type.STRING, description: "Clear explanation of why this is a mistake and how the correction improves it" },
                    category: { type: Type.STRING, description: "Categorize as 'grammar', 'vocabulary', 'punctuation', or 'style'" }
                  },
                  required: ["original", "corrected", "explanation", "category"]
                },
                description: "List of sentence-level corrections for errors in the essay"
              },
              rewrites: {
                type: Type.OBJECT,
                properties: {
                  band7: { type: Type.STRING, description: "The candidate's essay rewritten/revised to meet Band 7.0 requirements" },
                  band8: { type: Type.STRING, description: "The candidate's essay rewritten/revised to meet Band 8.5+ requirements" }
                },
                required: ["band7", "band8"]
              }
            },
            required: [
              "overallBand",
              "wordCount",
              "criteria",
              "sevenCat",
              "strengths",
              "weaknesses",
              "actionItems",
              "corrections",
              "rewrites"
            ]
          }
        }
      });

      const text = response.text;
      if (!text) {
        throw new Error("No response text returned from Gemini API");
      }

      const evaluationResult = JSON.parse(text);
      res.json(evaluationResult);

    } catch (error: any) {
      console.error("Evaluation error:", error);
      res.status(500).json({ error: error.message || "Failed to evaluate the essay. Please make sure your GEMINI_API_KEY is configured in Settings." });
    }
  });

  // Serve static files / Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express server running on port ${PORT} with environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

startServer();
