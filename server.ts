import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Resilient Model Fallback Ladder
const MODEL_FALLBACK_LADDER = [
  'gemini-3.6-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-3.7-flash',
] as const;

// Recoverable status codes or error identifiers
const RECOVERABLE_STATUS_CODES = [503, 429, 404, 500];
const RECOVERABLE_PATTERNS = [
  'UNAVAILABLE',
  'RESOURCE_EXHAUSTED',
  'NOT_FOUND',
  'INTERNAL',
  'overloaded',
  'rate limit',
  'Quota exceeded',
];

interface FallbackResult {
  text: string;
  modelUsed: string;
}

/**
 * Standard Helper Implementation: generateContentWithFallback
 * Sequentially attempts models in fallback ladder upon encountering recoverable errors.
 */
async function generateContentWithFallback(
  ai: GoogleGenAI,
  promptText: string,
  systemInstruction?: string
): Promise<FallbackResult> {
  let lastError: unknown = null;

  for (const model of MODEL_FALLBACK_LADDER) {
    try {
      console.log(`[Gemini API] Attempting generation with model: ${model}`);
      const response = await ai.models.generateContent({
        model,
        contents: promptText,
        config: systemInstruction
          ? {
              systemInstruction,
              temperature: 0.3,
            }
          : {
              temperature: 0.3,
            },
      });

      const responseText = response.text || '';
      if (responseText) {
        return {
          text: responseText,
          modelUsed: model,
        };
      }
    } catch (err: any) {
      lastError = err;
      const status = err?.status || err?.statusCode || 0;
      const msg = String(err?.message || '');
      const isRecoverable =
        RECOVERABLE_STATUS_CODES.includes(status) ||
        RECOVERABLE_PATTERNS.some((pattern) =>
          msg.toLowerCase().includes(pattern.toLowerCase())
        );

      console.warn(
        `[Gemini Fallback] Model ${model} failed (Status: ${status}). Recoverable: ${isRecoverable}. Error: ${msg}`
      );

      if (!isRecoverable) {
        // If it's a fatal validation error or bad key, rethrow immediately
        break;
      }
      // Otherwise continue down the ladder
    }
  }

  throw lastError || new Error('All models in fallback ladder failed.');
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // 1. Top-Level Request Deserialization (Ordering Guarantee)
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Health check endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      modelsSupported: MODEL_FALLBACK_LADDER,
    });
  });

  // 2. Chat / Reflection API with Defensive Payload Ingestion
  app.post('/api/chat', async (req: Request, res: Response): Promise<void> => {
    try {
      // Defensive Payload Ingestion (Null-Safe Destructuring)
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
      const category = typeof body.category === 'string' ? body.category : 'general';
      const userRole = typeof body.userRole === 'string' ? body.userRole.trim() : 'Team Member';
      const department = typeof body.department === 'string' ? body.department.trim() : 'Operations';
      const jobDescription = typeof body.jobDescription === 'string' ? body.jobDescription.trim() : '';
      const history = Array.isArray(body.history) ? body.history : [];
      const companyStandards = Array.isArray(body.companyStandards)
        ? body.companyStandards
        : [];

      if (!prompt) {
        res.status(400).json({ error: 'Field "prompt" is required and cannot be empty.' });
        return;
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        res.status(500).json({
          error: 'GEMINI_API_KEY is not configured on the server environment.',
        });
        return;
      }

      const ai = new GoogleGenAI({ apiKey });

      // Construct grounded context
      const formattedStandards = companyStandards
        .slice(0, 5)
        .map(
          (std: any, idx: number) =>
            `[Standard ${idx + 1}: ${std.title || 'General'} (${std.category || 'Quality'})]\n${std.content || ''}`
        )
        .join('\n\n');

      const systemPrompt = `You are the Lead Quality, Safety & Environmental Auditor for Tawi-Tawi Divers Club Inc.
Your role is to conduct thorough, empathetic, and highly rigorous quality audits of dive operations, equipment maintenance, maritime boat logistics, staff workflows, customer safety, and marine sanctuary conservation.

Context of Employee at Tawi-Tawi Divers Club Inc.:
- Role / Title: ${userRole}
- Department: ${department}
- Specific Function / Job Description: ${jobDescription || 'Active dive team contributor'}

${
  formattedStandards
    ? `Company Quality Standards & Dive Safety Benchmarks (Baseline Grounding):\n${formattedStandards}\n`
    : 'Baseline: PADI / ISO 24803 Recreational Diving Safety Standards, Philippine Coast Guard Maritime Regulations, and Tawi-Tawi Marine Sanctuary Environmental Policies.'
}

Interaction Category: ${category.toUpperCase()}

Instructions for Response:
1. Provide a direct, professional, and actionable reflection grounded in dive safety, operational excellence, and Tawi-Tawi marine conditions.
2. If the user discusses bottlenecks, equipment wear, or safety complaints, analyze root causes (equipment/compressors, boat operations, dive buddy procedures, weather/current conditions, guest management).
3. Offer constructive brainstorming ideas or structured recommendations (immediate dive safety actions vs. long-term operational enhancements).
4. At the very end of your response, output a structured block wrapped in JSON brackets matching this schema:
\`\`\`json
{
  "summary": "1-2 sentence executive takeaway of this entry",
  "sentiment": "positive" | "neutral" | "needs_attention" | "critical",
  "actionItems": ["Action 1", "Action 2"],
  "tags": ["dive-safety", "fleet", ...]
}
\`\`\`
Ensure the main response text is outside the JSON block so the user has an engaging, structured response.`;

      // Build conversation history transcript
      const conversationContext = history
        .map((h: any) => `${h.role === 'user' ? 'Employee' : 'Auditor'}: ${h.content}`)
        .join('\n\n');

      const fullPrompt = `${conversationContext ? `Prior Conversation Context:\n${conversationContext}\n\n` : ''}Employee Current Input:\n${prompt}`;

      const { text, modelUsed } = await generateContentWithFallback(
        ai,
        fullPrompt,
        systemPrompt
      );

      // Parse metadata block if present
      let reflectionSummary = 'Quality audit entry recorded and analyzed.';
      let sentiment: 'positive' | 'neutral' | 'needs_attention' | 'critical' = 'neutral';
      let actionItems: string[] = [];
      let tags: string[] = [category];
      let cleanText = text;

      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        try {
          const parsed = JSON.parse(jsonMatch[1]);
          if (parsed.summary) reflectionSummary = String(parsed.summary);
          if (
            ['positive', 'neutral', 'needs_attention', 'critical'].includes(
              parsed.sentiment
            )
          ) {
            sentiment = parsed.sentiment;
          }
          if (Array.isArray(parsed.actionItems)) {
            actionItems = parsed.actionItems.map(String);
          }
          if (Array.isArray(parsed.tags)) {
            tags = Array.from(new Set([...tags, ...parsed.tags.map(String)]));
          }
          // Strip json block from visible text for clean rendering
          cleanText = text.replace(/```json[\s\S]*?```/, '').trim();
        } catch {
          // If JSON parsing fails, retain raw text
        }
      }

      res.json({
        response: cleanText,
        reflectionSummary,
        sentiment,
        actionItems,
        tags,
        modelUsed,
      });
    } catch (error: any) {
      console.error('[API /api/chat Error]:', error);
      res.status(500).json({
        error: error.message || 'An error occurred while generating audit reflections.',
      });
    }
  });

  // 3. Super Admin Aggregated Audit Analysis API
  app.post(
    '/api/admin/aggregate-analysis',
    async (req: Request, res: Response): Promise<void> => {
      try {
        const body = req.body && typeof req.body === 'object' ? req.body : {};
        const interactions = Array.isArray(body.interactions) ? body.interactions : [];
        const benchmarks = Array.isArray(body.benchmarks) ? body.benchmarks : [];

        if (interactions.length === 0) {
          res.status(400).json({ error: 'No user interactions provided for analysis.' });
          return;
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
          res.status(500).json({
            error: 'GEMINI_API_KEY is not configured on the server environment.',
          });
          return;
        }

        const ai = new GoogleGenAI({ apiKey });

        const interactionSummaries = interactions
          .slice(0, 50)
          .map(
            (item: any, i: number) =>
              `[Entry ${i + 1}] User: ${item.userEmail || 'Anonymous'} | Role: ${item.userRole || 'Staff'} | Dept: ${item.department || 'General'} | Category: ${item.category}\nPrompt: ${item.prompt}\nSummary: ${item.reflectionSummary || 'N/A'}\nSentiment: ${item.sentiment || 'neutral'}`
          )
          .join('\n---\n');

        const benchmarkSummaries = benchmarks
          .slice(0, 5)
          .map(
            (bm: any) =>
              `[Benchmark: ${bm.title} (${bm.category})]: ${bm.content?.slice(0, 500)}...`
          )
          .join('\n');

        const prompt = `You are the Lead Quality & Marine Safety Executive conducting an organization-wide audit review for Tawi-Tawi Divers Club Inc.
Your goal is to evaluate cross-departmental operations (Dive Guides, Boat Captains, Compressor Technicians, Guest Services, and Eco-Conservation) against company standards and maritime diving safety regulations.

Company Benchmarks & Protocols for Tawi-Tawi Divers Club Inc.:
${benchmarkSummaries || 'PADI / ISO 24803 Recreational Diving Standards, Coast Guard Boat Operations, and Tawi-Tawi Marine Sanctuary Guidelines.'}

Submissions from Staff & Dive Operations Crew:
${interactionSummaries}

Provide an exhaustive Executive Quality & Dive Safety Audit Report in JSON format strictly matching this schema:
\`\`\`json
{
  "executiveSummary": "Concise high-level synthesis of Tawi-Tawi Divers Club Inc. operational health, dive safety compliance, vessel readiness, and staff feedback.",
  "complianceScore": 90,
  "topConcerns": ["Concern 1", "Concern 2", "Concern 3"],
  "departmentInsights": [
    {
      "department": "Dive Operations",
      "status": "Healthy" | "Attention Needed" | "Critical",
      "summary": "Key summary of department feedback",
      "recommendations": ["Recommendation 1", "Recommendation 2"]
    }
  ],
  "strategicRoadmap": [
    { "phase": "Immediate (30 Days)", "action": "Dive safety or equipment calibration step" },
    { "phase": "Mid-term (90 Days)", "action": "Marine fleet or training enhancement step" }
  ]
}
\`\`\`
Return ONLY valid JSON wrapped in the triple backticks.`;

        const { text, modelUsed } = await generateContentWithFallback(ai, prompt);

        let parsedReport: any = null;
        const match = text.match(/```json\s*([\s\S]*?)\s*```/);
        if (match && match[1]) {
          try {
            parsedReport = JSON.parse(match[1]);
          } catch {
            // fallback
          }
        }

        if (!parsedReport) {
          try {
            parsedReport = JSON.parse(text);
          } catch {
            parsedReport = {
              executiveSummary: text,
              complianceScore: 78,
              topConcerns: ['Process misalignment', 'Communication friction'],
              departmentInsights: [],
              strategicRoadmap: [],
            };
          }
        }

        res.json({
          report: parsedReport,
          modelUsed,
          analyzedEntriesCount: interactions.length,
        });
      } catch (error: any) {
        console.error('[API /api/admin/aggregate-analysis Error]:', error);
        res.status(500).json({
          error: error.message || 'Failed to generate aggregate audit analysis.',
        });
      }
    }
  );

  // 4. Vite Dev Server vs Production Static Serving
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: isHmrDisabled ? false : undefined,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AegisAudit AI Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal Server Startup Error:', err);
  process.exit(1);
});
