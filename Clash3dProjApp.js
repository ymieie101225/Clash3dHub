(() => {
  const STORAGE_KEY = 'clash3d-community-messages';
  const PROFILE_KEY = 'clash3d-community-profile';
  const MAX_MESSAGES = 80;
  const MAX_FILE_SIZE = 250 * 1024;
  const FIREBASE_CONFIG = {
    apiKey: 'YSMAV6M16jqRlls6Rg2JPNsG4Af3xPYV2jurewMc',
    databaseURL: (window.FIREBASE_DATABASE_URL || localStorage.getItem('clash3d-firebase-db-url') || '').trim(),
  };

  const seedMessages = [
    {
      id: crypto.randomUUID ? crypto.randomUUID() : `msg-${Date.now()}-1`,
      username: 'Nova',
      text: 'Welcome to the Clash3D community hub. Share your best runs and squad calls!',
      timestamp: new Date().toISOString(),
      replies: [
        {
          id: crypto.randomUUID ? crypto.randomUUID() : `reply-${Date.now()}-1`,
          username: 'Rex',
          text: 'Love the lane tempo focus.',
          timestamp: new Date().toISOString(),
        },
      ],
      comments: [
        {
          id: crypto.randomUUID ? crypto.randomUUID() : `comment-${Date.now()}-1`,
          username: 'Mina',
          text: 'I will share a replay soon.',
          timestamp: new Date().toISOString(),
        },
      ],
      emojis: [
        { id: 'thumbs-up', label: '👍', count: 2, users: ['Nova', 'Rex'] },
      ],
    },
    {
      id: crypto.randomUUID ? crypto.randomUUID() : `msg-${Date.now()}-2`,
      username: 'Rex',
      text: 'The 3-lane shooter feels amazing. I love the fast lane switches!',
      timestamp: new Date().toISOString(),
      replies: [],
      comments: [],
      emojis: [{ id: 'fire', label: '🔥', count: 1, users: ['Nova'] }],
    },
  ];

  function normalizeReply(reply, fallbackTimestamp) {
    return {
      id: reply?.id || `reply-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      username: typeof reply?.username === 'string' && reply.username.trim() ? reply.username : 'Guest',
      text: typeof reply?.text === 'string' ? reply.text : '',
      timestamp: reply?.timestamp || fallbackTimestamp,
    };
  }

  function normalizeComment(comment, fallbackTimestamp, depth = 0) {
    return {
      id: comment?.id || `comment-${Date.now()}-${depth}-${Math.random().toString(16).slice(2)}`,
      username: typeof comment?.username === 'string' && comment.username.trim() ? comment.username : 'Guest',
      text: typeof comment?.text === 'string' ? comment.text : '',
      timestamp: comment?.timestamp || fallbackTimestamp,
      replies: Array.isArray(comment?.replies)
        ? comment.replies.map((reply) => normalizeReply(reply, fallbackTimestamp))
        : [],
    };
  }

  function normalizeEmoji(emoji) {
    return {
      id: emoji?.id || `emoji-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      label: emoji?.label || emoji?.name || '👍',
      count: Number(emoji?.count) || 1,
      users: Array.isArray(emoji?.users) ? emoji.users : [],
    };
  }

  function normalizeMessage(message, index = 0) {
    const fallbackTimestamp = message?.timestamp || new Date().toISOString();
    return {
      id: message?.id || `msg-${Date.now()}-${index}`,
      username: typeof message?.username === 'string' && message.username.trim() ? message.username : 'Guest',
      text: typeof message?.text === 'string' ? message.text : '',
      timestamp: fallbackTimestamp,
      attachment: message?.attachment || null,
      replies: Array.isArray(message?.replies)
        ? message.replies.map((reply) => normalizeReply(reply, fallbackTimestamp))
        : [],
      comments: Array.isArray(message?.comments)
        ? message.comments.map((comment, commentIndex) => normalizeComment(comment, fallbackTimestamp, commentIndex))
        : [],
      emojis: Array.isArray(message?.emojis)
        ? message.emojis.map((emoji) => normalizeEmoji(emoji))
        : [],
    };
  }

  function normalizeMessages(messages) {
    return (Array.isArray(messages) ? messages : []).map((message, index) => normalizeMessage(message, index));
  }

  async function loadMessagesFromFirebase() {
    const databaseUrl = FIREBASE_CONFIG.databaseURL;
    if (!databaseUrl || databaseUrl.includes('YOUR-PROJECT-ID') || databaseUrl.includes('your-project-id')) {
      return null;
    }

    try {
      const response = await fetch(`${databaseUrl.replace(/\/$/, '')}/community/messages.json`);
      if (!response.ok) throw new Error(`Firebase read failed: ${response.status}`);

      const payload = await response.json();
      if (!payload) return null;

      return normalizeMessages(Array.isArray(payload) ? payload : Object.values(payload));
    } catch (error) {
      console.warn('Unable to load messages from Firebase:', error);
      return null;
    }
  }

  async function saveMessagesToFirebase(messages) {
    const databaseUrl = FIREBASE_CONFIG.databaseURL;
    if (!databaseUrl || databaseUrl.includes('YOUR-PROJECT-ID') || databaseUrl.includes('your-project-id')) {
      return false;
    }

    try {
      const response = await fetch(`${databaseUrl.replace(/\/$/, '')}/community/messages.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messages),
      });

      if (!response.ok) throw new Error(`Firebase write failed: ${response.status}`);
      return true;
    } catch (error) {
      console.warn('Unable to save messages to Firebase:', error);
      return false;
    }
  }

  const CommunityAPI = {
    async getMessages() {
      try {
        const remoteMessages = await loadMessagesFromFirebase();
        if (remoteMessages && remoteMessages.length) {
          return remoteMessages;
        }

        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return normalizeMessages(seedMessages);
        const parsed = JSON.parse(stored);
        const normalized = normalizeMessages(Array.isArray(parsed) && parsed.length ? parsed : seedMessages);
        return normalized;
      } catch (error) {
        console.warn('Unable to read chat messages:', error);
        return normalizeMessages(seedMessages);
      }
    },

    async saveMessages(messages) {
      const trimmed = normalizeMessages(messages).slice(-MAX_MESSAGES);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
      await saveMessagesToFirebase(trimmed);
      return trimmed;
    },

    async addMessage(message) {
      const current = await this.getMessages();
      const normalizedMessage = normalizeMessage(message, current.length);
      const updated = [...current, normalizedMessage].slice(-MAX_MESSAGES);
      await this.saveMessages(updated);
      return updated;
    },

    async getProfile() {
      try {
        return localStorage.getItem(PROFILE_KEY) || 'Guest';
      } catch (error) {
        console.warn('Unable to read profile:', error);
        return 'Guest';
      }
    },

    async saveProfile(username) {
      localStorage.setItem(PROFILE_KEY, username);
      return username;
    },
  };

  function createMarkup() {
    const existingRoot = document.getElementById('clash3d-community-root');
    if (existingRoot) return existingRoot;

    const target = document.querySelector('[data-community-root]') || document.body;
    const root = document.createElement('section');
    root.id = 'clash3d-community-root';
    root.innerHTML = `
      <style>
        #clash3d-community-root {
          font-family: Arial, sans-serif;
          max-width: 760px;
          margin: 24px auto;
          padding: 20px;
          border-radius: 18px;
          background: linear-gradient(135deg, #111827, #1f2937 60%, #0f172a);
          color: #f8fafc;
          box-shadow: 0 18px 45px rgba(0, 0, 0, 0.35);
        }

        #clash3d-community-root h2 {
          margin: 0 0 6px;
          font-size: 1.6rem;
        }

        #clash3d-community-root p {
          margin: 0 0 14px;
          color: #cbd5e1;
          line-height: 1.5;
        }

        .community-panel {
          display: grid;
          gap: 12px;
        }

        .community-form {
          display: grid;
          gap: 10px;
          padding: 14px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
        }

        .community-form input,
        .community-form textarea,
        .community-form button {
          border: none;
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 0.95rem;
        }

        .community-form textarea {
          min-height: 80px;
          resize: vertical;
        }

        .community-form button {
          background: #22c55e;
          color: white;
          cursor: pointer;
          font-weight: 700;
        }

        .community-form button:hover {
          background: #16a34a;
        }

        .community-search {
          margin-top: 4px;
        }

        .community-search input,
        .firebase-config input,
        .firebase-config button {
          border: none;
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 0.95rem;
        }

        .community-search input {
          width: 100%;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 999px;
          padding: 10px 12px;
          background: rgba(255, 255, 255, 0.08);
          color: #f8fafc;
          font-size: 0.95rem;
        }

        .community-search input::placeholder {
          color: #94a3b8;
        }

        .firebase-config {
          display: grid;
          gap: 8px;
          padding: 12px 14px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .firebase-config .community-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .firebase-config input {
          flex: 1 1 220px;
          background: rgba(255, 255, 255, 0.08);
          color: #f8fafc;
          border: 1px solid rgba(255, 255, 255, 0.14);
        }

        .firebase-config button {
          background: #38bdf8;
          color: white;
          cursor: pointer;
          font-weight: 700;
        }

        .firebase-config button:hover {
          background: #0ea5e9;
        }

        .firebase-config .status {
          margin-top: 2px;
        }

        .community-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: center;
        }

        .community-file {
          color: #f8fafc;
          font-size: 0.9rem;
        }

        .community-messages {
          display: grid;
          gap: 10px;
          margin-top: 4px;
        }

        .message-card {
          padding: 12px 14px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.11);
          display: grid;
          gap: 8px;
        }

        .message-card strong {
          color: #86efac;
        }

        .message-meta {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          font-size: 0.8rem;
          color: #94a3b8;
          margin-bottom: 2px;
        }

        .message-activity {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          font-size: 0.8rem;
          color: #cbd5e1;
        }

        .message-subthread {
          display: grid;
          gap: 6px;
          padding: 8px 10px;
          border-radius: 10px;
          background: rgba(15, 23, 42, 0.42);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .message-subthread-title {
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #38bdf8;
        }

        .message-subthread-item {
          font-size: 0.9rem;
          color: #f8fafc;
        }

        .message-emojis {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .emoji-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 8px;
          border-radius: 999px;
          background: rgba(34, 197, 94, 0.18);
          color: #bbf7d0;
          font-size: 0.86rem;
        }

        .attachment {
          margin-top: 8px;
          padding: 8px;
          border-radius: 8px;
          background: rgba(15, 23, 42, 0.55);
          overflow: auto;
        }

        .attachment img {
          max-width: 100%;
          max-height: 220px;
          border-radius: 8px;
          display: block;
        }

        .status {
          font-size: 0.9rem;
          color: #fbbf24;
        }
      </style>

      <div class="community-panel">
        <div>
          <h2>Clash3D Community Hub</h2>
          <p>Share your favorite lane setups, squad invites, and game-day hype for the 3-lane shooter.</p>
        </div>

        <form class="community-form" id="community-form">
          <input id="username-input" type="text" placeholder="Your gamer tag" maxlength="24" required>
          <textarea id="message-input" placeholder="Write a message to the community..." maxlength="280" required></textarea>
          <div class="community-actions">
            <input id="file-input" type="file" class="community-file" accept="image/*,.txt,.json">
            <button type="submit">Send message</button>
          </div>
          <div class="status" id="status-text">Small files are stored locally in this browser for quick sharing.</div>
        </form>

        <div class="firebase-config">
          <label class="message-subthread-title" for="firebase-url-input">Firebase Realtime Database URL</label>
          <div class="community-actions">
            <input id="firebase-url-input" type="text" placeholder="https://your-project-default-rtdb.firebaseio.com" />
            <button type="button" id="firebase-connect-btn">Connect</button>
          </div>
          <div class="status" id="firebase-status">Using local storage until a database URL is connected.</div>
        </div>

        <div class="community-search">
          <input id="post-search-input" type="search" placeholder="Search posts by username or keyword" aria-label="Search community posts">
        </div>
        <div class="community-messages" id="community-messages"></div>
      </div>
    `;

    target.appendChild(root);
    return root;
  }

  function renderMessages(messages, container) {
    if (!container) return;
    container.innerHTML = '';

    if (!messages.length) {
      container.innerHTML = '<div class="message-card">No messages yet. Be the first to post.</div>';
      return;
    }

    const fragment = document.createDocumentFragment();
    messages.slice().reverse().forEach((message) => {
      const card = document.createElement('div');
      card.className = 'message-card';
      const time = new Date(message.timestamp).toLocaleString();
      card.innerHTML = `
        <div class="message-meta">
          <strong>${message.username}</strong>
          <span>${time}</span>
        </div>
        <div>${message.text}</div>
      `;

      const activity = document.createElement('div');
      activity.className = 'message-activity';
      activity.innerHTML = `
        <span>${(message.replies || []).length} replies</span>
        <span>${(message.comments || []).length} comments</span>
        <span>${(message.emojis || []).length} emoji reactions</span>
      `;
      card.appendChild(activity);

      if (message.attachment) {
        const attachment = document.createElement('div');
        attachment.className = 'attachment';

        if (message.attachment.type?.startsWith('image/')) {
          const image = document.createElement('img');
          image.src = message.attachment.data;
          image.alt = 'Shared attachment';
          attachment.appendChild(image);
        } else {
          const pre = document.createElement('pre');
          pre.textContent = message.attachment.data;
          attachment.appendChild(pre);
        }

        card.appendChild(attachment);
      }

      if ((message.replies || []).length) {
        const replies = document.createElement('div');
        replies.className = 'message-subthread';
        replies.innerHTML = '<div class="message-subthread-title">Replies</div>';
        (message.replies || []).forEach((reply) => {
          const item = document.createElement('div');
          item.className = 'message-subthread-item';
          item.textContent = `${reply.username}: ${reply.text}`;
          replies.appendChild(item);
        });
        card.appendChild(replies);
      }

      if ((message.comments || []).length) {
        const comments = document.createElement('div');
        comments.className = 'message-subthread';
        comments.innerHTML = '<div class="message-subthread-title">Comments</div>';
        (message.comments || []).forEach((comment) => {
          const item = document.createElement('div');
          item.className = 'message-subthread-item';
          item.textContent = `${comment.username}: ${comment.text}`;
          comments.appendChild(item);
        });
        card.appendChild(comments);
      }

      if ((message.emojis || []).length) {
        const reactions = document.createElement('div');
        reactions.className = 'message-emojis';
        (message.emojis || []).forEach((emoji) => {
          const pill = document.createElement('span');
          pill.className = 'emoji-pill';
          pill.textContent = `${emoji.label} ${emoji.count}`;
          reactions.appendChild(pill);
        });
        card.appendChild(reactions);
      }

      fragment.appendChild(card);
    });

    container.appendChild(fragment);
  }

  function readFileAsData(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Unable to read file'));

      if (file.type.startsWith('image/')) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    });
  }

  function filterMessages(messages, query) {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return messages;

    return messages.filter((message) => {
      const haystack = [
        message.username,
        message.text,
        message.attachment?.name || '',
        ...(message.replies || []).map((reply) => reply.text),
        ...(message.comments || []).map((comment) => comment.text),
        ...(message.emojis || []).map((emoji) => emoji.label),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }

  async function init() {
    if (document.getElementById('clash3d-community-root')) return;

    createMarkup();
    const form = document.getElementById('community-form');
    const usernameInput = document.getElementById('username-input');
    const messageInput = document.getElementById('message-input');
    const fileInput = document.getElementById('file-input');
    const messagesContainer = document.getElementById('community-messages');
    const statusText = document.getElementById('status-text');
    const searchInput = document.getElementById('post-search-input');
    const firebaseUrlInput = document.getElementById('firebase-url-input');
    const firebaseConnectButton = document.getElementById('firebase-connect-btn');
    const firebaseStatus = document.getElementById('firebase-status');

    const profileName = await CommunityAPI.getProfile();
    usernameInput.value = profileName;

    if (FIREBASE_CONFIG.databaseURL) {
      firebaseUrlInput.value = FIREBASE_CONFIG.databaseURL;
    }

    let allMessages = await CommunityAPI.getMessages();

    const renderVisibleMessages = () => {
      const visibleMessages = filterMessages(allMessages, searchInput.value);
      renderMessages(visibleMessages, messagesContainer);
    };

    const connectFirebase = async () => {
      const url = firebaseUrlInput.value.trim().replace(/\/$/, '');
      if (!url) {
        firebaseStatus.textContent = 'Add your Firebase Realtime Database URL to connect.';
        return;
      }

      if (!url.includes('firebaseio.com')) {
        firebaseStatus.textContent = 'That does not look like a Firebase Realtime Database URL.';
        return;
      }

      window.FIREBASE_DATABASE_URL = url;
      FIREBASE_CONFIG.databaseURL = url;
      localStorage.setItem('clash3d-firebase-db-url', url);
      firebaseStatus.textContent = 'Connecting to Firebase…';

      const refreshMessages = await CommunityAPI.getMessages();
      allMessages = refreshMessages;
      renderVisibleMessages();
      statusText.textContent = 'Connected to Firebase. New posts will sync to the database.';
      firebaseStatus.textContent = `Connected to ${url}`;
    };

    firebaseConnectButton.addEventListener('click', connectFirebase);
    firebaseUrlInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        connectFirebase();
      }
    });

    searchInput.addEventListener('input', renderVisibleMessages);
    renderVisibleMessages();

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const username = usernameInput.value.trim() || 'Guest';
      const text = messageInput.value.trim();

      if (!text) {
        statusText.textContent = 'Please add a message before sending.';
        return;
      }

      await CommunityAPI.saveProfile(username);

      let attachment = null;
      const chosenFile = fileInput.files[0];
      if (chosenFile) {
        if (chosenFile.size > MAX_FILE_SIZE) {
          statusText.textContent = 'That file is too large. Try a smaller file under 250 KB.';
          return;
        }

        try {
          const data = await readFileAsData(chosenFile);
          attachment = {
            name: chosenFile.name,
            size: chosenFile.size,
            type: chosenFile.type,
            data,
          };
        } catch (error) {
          statusText.textContent = 'The file could not be attached.';
          return;
        }
      }

      const newMessage = {
        id: crypto.randomUUID ? crypto.randomUUID() : `msg-${Date.now()}`,
        username,
        text,
        timestamp: new Date().toISOString(),
        attachment,
        replies: [],
        comments: [],
        emojis: [],
      };

      const updatedMessages = await CommunityAPI.addMessage(newMessage);
      allMessages = updatedMessages;
      renderVisibleMessages();
      form.reset();
      statusText.textContent = 'Message posted to the community.';
    });
  }

  document.addEventListener('DOMContentLoaded', init);
  window.Clash3DCommunity = { CommunityAPI, init };
})();
