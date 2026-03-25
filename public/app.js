const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');

function addMessage(content, isUser) {
  const msgDiv = document.createElement('div');
  msgDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;
  msgDiv.innerHTML = `<div class="message-content">${escapeHtml(content)}</div>`;
  messagesDiv.appendChild(msgDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function addTypingIndicator() {
  const msgDiv = document.createElement('div');
  msgDiv.className = 'message bot-message';
  msgDiv.id = 'typing';
  msgDiv.innerHTML = `<div class="message-content typing-indicator"><span></span><span></span><span></span></div>`;
  messagesDiv.appendChild(msgDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function removeTypingIndicator() {
  const typing = document.getElementById('typing');
  if (typing) typing.remove();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function sendMessage() {
  const message = messageInput.value.trim();
  if (!message) return;

  addMessage(message, true);
  messageInput.value = '';
  sendBtn.disabled = true;
  addTypingIndicator();

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });

    const data = await response.json();
    removeTypingIndicator();

    if (response.ok) {
      addMessage(data.reply, false);
    } else {
      addMessage(data.error || 'Something went wrong. Please try again.', false);
    }
  } catch (error) {
    removeTypingIndicator();
    addMessage('Connection error. Please try again.', false);
  }

  sendBtn.disabled = false;
  messageInput.focus();
}

sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendMessage();
});
