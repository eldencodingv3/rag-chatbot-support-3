const lancedb = require('@lancedb/lancedb');
const OpenAI = require('openai');
const path = require('path');
const fs = require('fs');

let openai;
try {
  openai = new OpenAI.default({ apiKey: process.env.OPENAI_API_KEY });
} catch (e) {
  openai = null;
}

let db = null;
let table = null;
let faqData = [];

// Load FAQ data for fallback keyword search
function loadFAQData() {
  try {
    const faqPath = path.join(__dirname, '..', 'data', 'faqs.json');
    faqData = JSON.parse(fs.readFileSync(faqPath, 'utf-8'));
  } catch (e) {
    console.warn('Could not load FAQ data for fallback search');
    faqData = [];
  }
}

async function initVectorDB() {
  loadFAQData();
  const dbPath = path.join(__dirname, '..', 'data', 'lancedb');
  db = await lancedb.connect(dbPath);
  try {
    table = await db.openTable('faqs');
    console.log('LanceDB table loaded successfully');
  } catch (e) {
    console.warn('LanceDB table not found. Run "npm run ingest" to create embeddings.');
    table = null;
  }
}

async function getEmbedding(text) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: text,
  });
  return response.data[0].embedding;
}

async function searchFAQs(query, topK = 3) {
  if (!table) {
    return [];
  }
  const queryVector = await getEmbedding(query);
  const results = await table.vectorSearch(queryVector).limit(topK).toArray();
  return results;
}

// Simple keyword-based fallback search
function keywordSearchFAQs(query, topK = 3) {
  if (faqData.length === 0) return [];

  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);

  const scored = faqData.map(faq => {
    const text = (faq.question + ' ' + faq.answer).toLowerCase();
    let score = 0;
    for (const word of queryWords) {
      if (text.includes(word)) score++;
    }
    return { ...faq, score };
  });

  return scored
    .filter(f => f.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

async function generateResponse(userMessage) {
  // Try full RAG pipeline with OpenAI
  try {
    if (!openai || !process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
      throw new Error('OpenAI API key not configured');
    }

    const relevantFAQs = await searchFAQs(userMessage);

    let context = '';
    if (relevantFAQs.length > 0) {
      context = 'Here are relevant FAQ entries:\n\n';
      relevantFAQs.forEach((faq, i) => {
        context += `${i + 1}. Q: ${faq.question}\n   A: ${faq.answer}\n\n`;
      });
    }

    const systemPrompt = `You are a helpful customer support assistant for CloudSync, a cloud data synchronization service. Answer the user's question based on the provided FAQ context. If the context contains relevant information, use it to answer accurately. If the context doesn't cover the question, provide a helpful general response and suggest contacting support for more specific help. Keep responses concise and friendly.`;

    const messages = [
      { role: 'system', content: systemPrompt },
    ];

    if (context) {
      messages.push({ role: 'system', content: context });
    }

    messages.push({ role: 'user', content: userMessage });

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: messages,
      temperature: 0.7,
      max_tokens: 500,
    });

    return completion.choices[0].message.content;
  } catch (error) {
    // Fallback: keyword-based FAQ search
    console.log('OpenAI unavailable, using keyword fallback:', error.message);

    const matches = keywordSearchFAQs(userMessage);

    if (matches.length > 0) {
      const best = matches[0];
      let response = best.answer;
      if (matches.length > 1) {
        response += '\n\nYou might also find these helpful:\n';
        for (let i = 1; i < Math.min(matches.length, 3); i++) {
          response += `- ${matches[i].question}\n`;
        }
      }
      return response;
    }

    return "Thank you for your question! I'm currently operating in limited mode. For the best experience, please try again later or contact our support team directly. Common topics I can help with include: pricing plans, account setup, data synchronization, billing, security, integrations, and data export.";
  }
}

module.exports = { initVectorDB, generateResponse };
