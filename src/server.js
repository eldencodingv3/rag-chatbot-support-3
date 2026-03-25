require('dotenv').config();
const express = require('express');
const path = require('path');
const { initVectorDB, generateResponse } = require('./rag');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required and must be a non-empty string' });
    }

    const reply = await generateResponse(message.trim());
    res.json({ reply });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to generate response' });
  }
});

async function start() {
  try {
    await initVectorDB();
  } catch (error) {
    console.error('Failed to initialize vector DB:', error.message);
    console.log('Server will start but RAG responses may not work until ingestion is done.');
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start();
