const cors = require("cors")({ origin: true });
const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const OpenAI = require("openai");

admin.initializeApp();
const db = admin.firestore();

/* =======================
   CONFIGURATION
======================= */
const CONFIG = {
  MAX_HISTORY: 6,
  CONFIDENCE_THRESHOLD: 0.6,
  CLARIFY_THRESHOLD: 0.5,
  MODEL: "gpt-4.1-mini"
};

/* =======================
   OPENAI CLIENT
======================= */
function createOpenAIClient() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
}

/* =======================
   UTILITIES
======================= */
function normalize(text = "") {
  return text.toLowerCase().trim();
}

function canAnswer(intentId, knowledge) {
  return intentId !== "unknown" && knowledge.length > 0;
}

function hasSufficientKnowledge(knowledge) {
  return knowledge.length >= 1 && knowledge[0].length > 40;
}

/* =======================
   BLOCKED QUESTIONS
======================= */
const BLOCKED_PATTERNS = [
  "birthday",
  "joke",
  "love"
];

const GREETING_PATTERNS = [
  "hi",
  "hello",
  "hey",
  "good morning",
  "good afternoon",
  "good evening"
];


function isBlockedQuestion(message) {
  const msg = normalize(message);
  return BLOCKED_PATTERNS.some(p => msg.includes(p));
}

function isGreeting(message) {
  const msg = normalize(message);
  return GREETING_PATTERNS.some(g => msg === g || msg.startsWith(g));
}


function isVagueFollowUp(message) {
  const msg = normalize(message);
  return [
    "how about",
    "what about",
    "and",
    "those",
    "that",
    "them",
    "more info",
    "details"
  ].some(p => msg.startsWith(p) || msg === p);
}


/* =======================
   SESSION HANDLING
======================= */
async function loadSessionHistory(sessionRef) {
  const snap = await sessionRef.get();
  if (!snap.exists) return [];

  return (snap.data().history || [])
    .filter(
      h => h.role === "user" || !h.content.includes("don’t have information")
    )
    .slice(-CONFIG.MAX_HISTORY);
}

/* =======================
   KEYWORD MATCHING
======================= */
function keywordMatch(message, intents) {
  const msg = normalize(message);

  for (const intent of intents) {
    if (!intent.enabled) continue;

    for (const kw of intent.keywords || []) {
      const keyword = normalize(kw);

      if (msg === keyword) {
        return { intentId: intent.id, confidence: 1.0, method: "keyword" };
      }

      if (msg.includes(keyword)) {
        return { intentId: intent.id, confidence: 0.9, method: "keyword" };
      }
    }
  }
  return null;
}

/* =======================
   AI INTENT CLASSIFIER (STUDENT SIDE)
======================= */
function buildIntentPrompt(message, intents) {
  const intentList = intents
    .filter(i => i.enabled)
    .map(i => `${i.id}: ${i.label}`)
    .join("\n");

  return `
Select ONE intent ID from the list below.
If none apply, return "unknown".

Respond ONLY in valid JSON:
{ "intent": "<id>", "confidence": 0.0-1.0 }

INTENTS:
${intentList}

QUESTION:
"${message}"
`;
}

async function classifyIntentAI(message, intents) {
  const openai = createOpenAIClient();

  const res = await openai.chat.completions.create({
    model: CONFIG.MODEL,
    messages: [
      { role: "system", content: "You classify student questions into predefined intents." },
      { role: "user", content: buildIntentPrompt(message, intents) }
    ],
    temperature: 0
  });

  try {
    return JSON.parse(res.choices[0].message.content);
  } catch {
    return { intent: "unknown", confidence: 0 };
  }
}

function applyConfidenceGate(detected) {
  if (
    detected.method === "ai" &&
    detected.confidence < CONFIG.CONFIDENCE_THRESHOLD
  ) {
    return { ...detected, intentId: "unknown" };
  }
  return detected;
}

/* =======================
   KNOWLEDGE
======================= */
async function getKnowledgeByIntent(intentId) {
  const snap = await db
    .collection("ptc_knowledge")
    .where("category", "==", intentId)
    .get();

  return snap.docs.map(d => d.data().content);
}

/* =======================
   ANSWER GENERATION
======================= */
async function generateAnswer(history, knowledge, question) {
  const openai = createOpenAIClient();

  const res = await openai.chat.completions.create({
    model: CONFIG.MODEL,
    messages: [
      {
        role: "system",
        content: `
You are the official Student Guide for Pateros Technological College (PTC).

PERSONALITY:
- Friendly and professional
- Clear and calm
- Helpful and reassuring
- Not casual, not playful

RULES:
- Answer ONLY using the provided reference
- Do not guess or invent information
- Keep answers concise and easy to understand
- When appropriate, gently guide the student to related topics
`
      },
      ...history,
      {
        role: "system",
        content: `REFERENCE:\n${knowledge.map(k => `• ${k}`).join("\n")}`
      },
      { role: "user", content: question }
    ],
    temperature: 0.2
  });

  return res.choices[0].message.content;
}

function formatReply(reply, confidence) {
  if (confidence < 0.75) {
    return `Based on available information, ${reply}`;
  }
  return reply;
}

/* =======================
   AUTO-LEARNING (RUNTIME)
======================= */
async function autoLearnIntent(intentId, message, confidence) {
  if (confidence < CONFIG.CONFIDENCE_THRESHOLD) return;

  const ref = db.collection("ptc_intents").doc(intentId);
  const snap = await ref.get();
  if (!snap.exists) return;

  const tokens = normalize(message)
    .split(" ")
    .filter(w => w.length > 3)
    .slice(0, 5);

  if (!tokens.length) return;

  await ref.update({
    keywords: admin.firestore.FieldValue.arrayUnion(...tokens),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
}

/* ======================================================
   ADMIN AI: GENERATE INTENT + KEYWORDS FROM KNOWLEDGE
====================================================== */
async function generateIntentFromKnowledge(knowledgeText) {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  const intentsSnap = await admin.firestore()
    .collection("ptc_intents")
    .get();

  const existingIntents = intentsSnap.docs.map(d => ({
    id: d.id,
    label: d.data().label,
    keywords: d.data().keywords || []
  }));

  const prompt = `
You are an AI assistant for a university chatbot.

GOAL:
Your primary goal is to reuse existing intent categories whenever possible.
Improve existing intents by suggesting additional keywords instead of creating new ones.

STRICT RULES:
- You MUST prefer an existing intent if the knowledge is related.
- ONLY create a new intent if the knowledge is clearly unrelated to ALL existing intents.
- Do NOT create new intents for subtopics such as requirements, process, eligibility, details, steps, or guidelines.

EXISTING INTENTS:
${existingIntents
      .map(i => `- ${i.id} (${i.label}): ${i.keywords.join(", ")}`)
      .join("\n")}

OUTPUT FORMAT (JSON ONLY):
{
  "useExistingIntent": true | false,
  "intentId": "string_snake_case",
  "label": "Human Readable Label",
  "keywords": ["keyword1", "keyword2", "keyword3"]
}

GUIDELINES:
- If the topic matches an existing intent, reuse its intentId and label.
- Put subtopics (e.g. requirements, eligibility) into keywords, NOT new intents.
- Keywords should reflect how students naturally ask questions.

KNOWLEDGE:
"""${knowledgeText}"""
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a strict JSON API. Do not use markdown." },
      { role: "user", content: prompt }
    ],
    temperature: 0.2
  });

  let raw = response.choices?.[0]?.message?.content?.trim();

  if (!raw) {
    console.error("AI returned empty content");
    return {
      useExistingIntent: false,
      intentId: "unknown",
      label: "Uncategorized",
      keywords: []
    };
  }

  console.log("AI RAW OUTPUT:", raw);

  // 🧹 Remove markdown code fences if present
  if (raw.startsWith("```")) {
    raw = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.error("JSON parse failed after cleanup:", raw);
    return {
      useExistingIntent: false,
      intentId: "unknown",
      label: "Uncategorized",
      keywords: []
    };
  }

  // 🛡️ HARD REUSE GUARD (SYSTEM TRUTH WINS)
  const existing = existingIntents.find(
    i => i.id === parsed.intentId
  );

  if (existing) {
    return {
      useExistingIntent: true,
      intentId: existing.id,
      label: existing.label,
      keywords: Array.isArray(parsed.keywords)
        ? parsed.keywords.map(k => k.toLowerCase().trim())
        : []
    };
  }

  // 🛡️ FINAL VALIDATION + NORMALIZATION
  return {
    useExistingIntent: !!parsed.useExistingIntent,
    intentId: parsed.intentId || "unknown",
    label: parsed.label || "Uncategorized",
    keywords: Array.isArray(parsed.keywords)
      ? parsed.keywords.map(k => k.toLowerCase().trim())
      : []
  };
}




/* =======================
   ADMIN ENDPOINT
======================= */
/* =======================
   ADMIN ENDPOINT
======================= */
exports.suggestIntentFromKnowledge = onRequest(
  {
    region: "asia-southeast1",
    secrets: ["OPENAI_API_KEY"]
  },
  (req, res) => {
    cors(req, res, async () => {
      try {
        if (req.method !== "POST") {
          return res.status(405).json({ error: "Method not allowed" });
        }

        const { knowledge } = req.body;

        if (!knowledge) {
          return res.status(400).json({ error: "Missing knowledge" });
        }

        // ✅ CORRECT FUNCTION NAME
        const suggestion = await generateIntentFromKnowledge(knowledge);

        if (!suggestion) {
          return res.status(500).json({ error: "AI returned no suggestion" });
        }

        return res.json({ suggestion });

      } catch (err) {
        console.error("ADMIN AI ERROR:", err);
        return res.status(500).json({ error: "AI processing failed" });
      }
    });
  }
);



/* =======================
   STUDENT CHATBOT API
======================= */
exports.chatWithNano = onRequest(
  { region: "asia-southeast1", secrets: ["OPENAI_API_KEY"] },
  async (req, res) => {
    try {
      const { sessionId, message } = req.body;
      if (!sessionId || !message) {
        return res.status(400).json({ error: "Missing sessionId or message" });
      }

      if (isGreeting(message)) {
        return res.json({
          reply: "Hello! 👋 I’m the PTC Student Guide. How can I help you today?"
        });
      }

      if (isBlockedQuestion(message)) {
        return res.json({
          reply: "I’m here to help with official PTC-related questions like enrollment, scholarships, and executive classes."
        });
      }


      const sessionRef = db.collection("chats").doc(sessionId);
      const history = await loadSessionHistory(sessionRef);
      const sessionSnap = await sessionRef.get();
      const lastIntent = sessionSnap.exists
        ? sessionSnap.data().lastIntent || null
        : null;

      const intentSnap = await db.collection("ptc_intents").get();
      const intents = intentSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      let detected = keywordMatch(message, intents);

      if (!detected) {
        const ai = await classifyIntentAI(message, intents);
        detected = { intentId: ai.intent, confidence: ai.confidence, method: "ai" };
      }

      // 🧠 REUSE LAST INTENT FOR VAGUE FOLLOW-UPS
      if (
        detected.intentId === "unknown" &&
        lastIntent &&
        isVagueFollowUp(message)
      ) {
        detected = {
          intentId: lastIntent,
          confidence: 0.9,
          method: "context"
        };
      }


      detected = applyConfidenceGate(detected);

      if (
        detected.method === "ai" &&
        detected.confidence >= CONFIG.CLARIFY_THRESHOLD &&
        detected.confidence < CONFIG.CONFIDENCE_THRESHOLD
      ) {
        return res.json({
          reply: "Can you please clarify what you are asking about?"
        });
      }

      const knowledge =
        detected.intentId !== "unknown"
          ? await getKnowledgeByIntent(detected.intentId)
          : [];

      if (!canAnswer(detected.intentId, knowledge) || !hasSufficientKnowledge(knowledge)) {
        return res.json({
          reply: "I may not have details on that yet, but I can help with PTC-related questions like enrollment, scholarships, and executive classes 😊"
        });
      }


      if (knowledge.length === 1) {
        return res.json({
          reply: formatReply(knowledge[0], detected.confidence)
        });
      }

      const rawReply = await generateAnswer(history, knowledge, message);
      const finalReply = formatReply(rawReply, detected.confidence);

      if (detected.method === "ai") {
        await autoLearnIntent(detected.intentId, message, detected.confidence);
      }

      await sessionRef.set(
        {
          history: [
            ...history,
            { role: "user", content: message },
            { role: "assistant", content: finalReply }
          ],
          lastIntent: detected.intentId,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        },
        { merge: true }
      );


      res.json({ reply: finalReply });

    } catch (err) {
      console.error("CHAT ERROR:", err);
      res.status(500).json({ error: "Server error" });
    }
  }
);
