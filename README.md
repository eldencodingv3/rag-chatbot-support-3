# RAG Chatbot - Customer Support

A simple Node.js RAG (Retrieval-Augmented Generation) chatbot that answers customer support questions. Uses LanceDB for vector storage and OpenAI GPT-3.5-turbo for generating responses.

## Features

- Loads FAQ/support documents from JSON
- Stores document embeddings in LanceDB (embedded vector database)
- Generates contextual responses using OpenAI GPT-3.5-turbo
- Simple HTML/CSS/JS chat interface
- No authentication or conversation history required

## Setup

### Prerequisites
- Node.js 18+
- OpenAI API key

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/eldencodingv3/rag-chatbot-support-3.git
   cd rag-chatbot-support-3
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file from the example:
   ```bash
   cp .env.example .env
   ```

4. Add your OpenAI API key to `.env`:
   ```
   OPENAI_API_KEY=sk-your-key-here
   ```

5. Ingest the FAQ documents (generates embeddings):
   ```bash
   npm run ingest
   ```

6. Start the server:
   ```bash
   npm start
   ```

7. Open http://localhost:3000 in your browser.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | Your OpenAI API key (required) | - |
| `PORT` | Server port | `3000` |

## Updating the Dataset

To update the FAQ dataset:

1. Edit `data/faqs.json` — add, remove, or modify FAQ entries
2. Each entry should have a `question` and `answer` field
3. Re-run the ingestion script to update embeddings:
   ```bash
   npm run ingest
   ```
4. Restart the server

## Architecture

- **Backend**: Express.js server with REST API
- **Vector DB**: LanceDB (embedded, no separate server needed)
- **Embeddings**: OpenAI text-embedding-ada-002
- **LLM**: OpenAI GPT-3.5-turbo
- **Frontend**: Static HTML/CSS/JS

## API Endpoints

- `GET /` — Chat interface
- `GET /api/health` — Health check
- `POST /api/chat` — Send a message, get a RAG response
  - Body: `{ "message": "your question" }`
  - Response: `{ "reply": "bot response" }`
