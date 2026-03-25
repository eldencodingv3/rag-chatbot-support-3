require('dotenv').config();
const lancedb = require('@lancedb/lancedb');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

const openai = new OpenAI.default({ apiKey: process.env.OPENAI_API_KEY });

async function getEmbedding(text) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: text,
  });
  return response.data[0].embedding;
}

async function ingest() {
  const faqPath = path.join(__dirname, '..', 'data', 'faqs.json');
  const faqs = JSON.parse(fs.readFileSync(faqPath, 'utf-8'));

  console.log(`Ingesting ${faqs.length} FAQ documents...`);

  const records = [];
  for (let i = 0; i < faqs.length; i++) {
    const faq = faqs[i];
    const text = `Question: ${faq.question}\nAnswer: ${faq.answer}`;
    const vector = await getEmbedding(text);
    records.push({
      id: i,
      question: faq.question,
      answer: faq.answer,
      text: text,
      vector: vector,
    });
    console.log(`  [${i + 1}/${faqs.length}] Embedded: ${faq.question.substring(0, 50)}...`);
  }

  const dbPath = path.join(__dirname, '..', 'data', 'lancedb');
  const db = await lancedb.connect(dbPath);

  // Drop existing table if it exists
  try {
    await db.dropTable('faqs');
  } catch (e) {
    // Table doesn't exist yet, that's fine
  }

  await db.createTable('faqs', records);
  console.log(`Successfully ingested ${records.length} documents into LanceDB`);
}

ingest().catch(console.error);
