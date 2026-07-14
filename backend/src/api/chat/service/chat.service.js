import db from "../../../../db/db.config.js";
import { GoogleGenAI } from "@google/genai";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const geminiClient = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export const getRecentConversationRows = async (limit = 5) => {
  const normalizedLimit = Number.parseInt(limit, 10);
  const safeLimit =
    Number.isNaN(normalizedLimit) || normalizedLimit <= 0
      ? 20
      : normalizedLimit;
  const [rows] = await db.execute(
    `SELECT id, role, content, created_at FROM conversations ORDER BY created_at DESC LIMIT ?`,
    [safeLimit],
  );
  return rows;
};

const generateAssistantAnswer = async ({ historyRows, question }) => {
  const formattedHistory = historyRows.map((row) => ({
    role: row.role === "assistant" ? "model" : "user",
    parts: [{ text: row.content }],
  }));

  const result = await geminiClient.models.generateContent({
    model: GEMINI_MODEL,
    config: {
      maxOutputTokens: 1024,
      temperature: 0.5,
    },
    contents: [
      ...formattedHistory,
      {
        role: "user",
        parts: [{ text: question }],
      },
    ],
  });
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return {
    text,
    totalTokens: result.usageMetadata?.totalTokenCount || 0,
  };
};

const getMessageById = async (messageId) => {
  const [rows] = await db.execute(
    `SELECT id, role, content, created_at FROM conversations WHERE id = ? LIMIT 1`,
    [messageId],
  );
  if (!rows[0]) return null;
  return {
    id: rows[0].id,
    role: rows[0].role,
    content: rows[0].content,
    tokenCount: rows[0].token_count || 0,
    createdAt: rows[0].created_at,
  };
};

export async function createConversationService(question) {
  try {
    // validation
    if (!question || !question.trim()) {
      const error = new Error("Question is required");
      error.status = 400;
      throw error;
    }
    const historyRows = await getRecentConversationRows(5);
    //save to database
    const [result] = await db.execute(
      'INSERT INTO conversations (content, role) VALUES (?, "user")',
      [question],
    );
    
    const { text, totalTokens } = await generateAssistantAnswer({
      historyRows,
      question,
    });
    const createAssistantMessageResult = await db.execute(
      "INSERT INTO conversations (role, content, token_count) VALUES (?, ?, ?)",
      ["assistant", text, totalTokens],
    );

    const userConversation = await getMessageById(result.insertId);
    const assistantConversation = await getMessageById(
      createAssistantMessageResult[0].insertId,
    );
    return {
      userConversation,
      assistantConversation,
    };
  } catch (error) {
    throw error;
  }
}
