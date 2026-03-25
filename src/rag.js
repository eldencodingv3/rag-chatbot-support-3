const lancedb = require('@lancedb/lancedb');
const OpenAI = require('openai');
const path = require('path');

const openai = new OpenAI.default({ apiKey: process.env.OPENAI_API_KEY });

let db = null;
let table = null;

async function initVectorDB() {
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

async function generateResponse(userMessage) {
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
}

module.exports = { initVectorDB, generateResponse };
