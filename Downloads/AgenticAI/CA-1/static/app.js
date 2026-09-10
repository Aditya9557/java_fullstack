// app.js - Frontend Logic for Smart Packing Agent

document.addEventListener("DOMContentLoaded", () => {
  const chatHistory = document.getElementById("chatHistory");
  const chatForm = document.getElementById("chatForm");
  const userInput = document.getElementById("userInput");
  const sendBtn = document.getElementById("sendBtn");
  const resetBtn = document.getElementById("resetBtn");
  const weatherContent = document.getElementById("weatherContent");
  const weatherStatusBadge = document.getElementById("weatherStatusBadge");
  const packingListContainer = document.getElementById("packingListContainer");
  const totalItemsBadge = document.getElementById("totalItemsBadge");
  const memorySummary = document.getElementById("memorySummary");
  const turnsBadge = document.getElementById("turnsBadge");
  const promptChips = document.querySelectorAll(".chip");

  let turnCount = 0;

  // Prompt Chips Handler
  promptChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      userInput.value = chip.getAttribute("data-prompt");
      userInput.focus();
    });
  });

  // Fetch initial session state
  fetchState();

  // Chat Form Submission
  chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const prompt = userInput.value.trim();
    if (!prompt) return;

    // Append User Message to UI
    appendUserMessage(prompt);
    userInput.value = "";
    userInput.disabled = true;
    sendBtn.disabled = true;

    // Show Loading Typing Indicator
    const typingId = showTypingIndicator();

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();
      removeTypingIndicator(typingId);

      if (data.error) {
        appendAgentMessage(`⚠️ **Error:** ${data.error}`, []);
      } else {
        turnCount += 1;
        turnsBadge.textContent = `Turn ${turnCount}`;
        
        // Append Agent Response with Step Traces
        appendAgentMessage(data.response, data.traces || []);
        
        // Update Dashboard (Packing List & Weather)
        updatePackingList(data.packing_list);
        extractAndDisplayWeather(data.traces);
        fetchState();
      }
    } catch (err) {
      removeTypingIndicator(typingId);
      appendAgentMessage(`⚠️ **Network Error:** ${err.message}`, []);
    } finally {
      userInput.disabled = false;
      sendBtn.disabled = false;
      userInput.focus();
      scrollChatToBottom();
    }
  });

  // Reset Session
  resetBtn.addEventListener("click", async () => {
    if (!confirm("Are you sure you want to reset conversation memory and packing list?")) return;
    try {
      await fetch("/api/reset", { method: "POST" });
      chatHistory.innerHTML = `
        <div class="message-bubble agent-message">
          <div class="avatar">🤖</div>
          <div class="message-content">
            <div class="sender-name">PackBot Agent</div>
            <p>Session and memory have been reset. Where are you planning to travel next?</p>
          </div>
        </div>
      `;
      turnCount = 0;
      turnsBadge.textContent = "Turn 0";
      weatherStatusBadge.textContent = "No Destination Set";
      weatherContent.innerHTML = `<div class="weather-empty"><p>Share your destination with the agent to load real-time weather and temperature insights.</p></div>`;
      packingListContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🎒</div>
          <p>Your packing list is empty.</p>
          <span>Ask the agent to plan your trip to see items categorized automatically!</span>
        </div>
      `;
      totalItemsBadge.textContent = "0 Items";
      memorySummary.textContent = "Session reset. Ready for a new trip goal.";
    } catch (err) {
      alert("Failed to reset: " + err.message);
    }
  });

  // Append User Message to UI
  function appendUserMessage(text) {
    const bubble = document.createElement("div");
    bubble.className = "message-bubble user-message";
    bubble.innerHTML = `
      <div class="avatar">👤</div>
      <div class="message-content">
        <div class="sender-name">You</div>
        <p>${escapeHtml(text)}</p>
      </div>
    `;
    chatHistory.appendChild(bubble);
    scrollChatToBottom();
  }

  // Append Agent Message with Multi-Step Plan-Act Trace
  function appendAgentMessage(text, traces) {
    const bubble = document.createElement("div");
    bubble.className = "message-bubble agent-message";

    let traceHtml = "";
    if (traces && traces.length > 0) {
      traceHtml = `
        <div class="trace-block">
          <div class="trace-header" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'flex' : 'none'">
            <span>⚙️ Agent Plan-Act Execution Trace (${traces.length} steps)</span>
            <span style="margin-left:auto; font-size: 0.7rem;">[Click to Toggle]</span>
          </div>
          <div class="trace-body">
            ${traces
              .map(
                (t) => `
              <div class="trace-step">
                <div class="trace-action">Step ${t.step}: Tool Call &rarr; <code>${t.action}(${JSON.stringify(t.args)})</code></div>
                <div class="trace-obs">${escapeHtml(t.observation)}</div>
              </div>
            `
              )
              .join("")}
          </div>
        </div>
      `;
    }

    // Format markdown bold & line breaks
    const formattedText = formatMarkdown(text);

    bubble.innerHTML = `
      <div class="avatar">🤖</div>
      <div class="message-content">
        <div class="sender-name">PackBot Agent</div>
        ${traceHtml}
        <div>${formattedText}</div>
      </div>
    `;
    chatHistory.appendChild(bubble);
    scrollChatToBottom();
  }

  // Show Loading Typing Indicator
  function showTypingIndicator() {
    const id = "typing-" + Date.now();
    const bubble = document.createElement("div");
    bubble.id = id;
    bubble.className = "message-bubble agent-message";
    bubble.innerHTML = `
      <div class="avatar">🤖</div>
      <div class="message-content">
        <div class="sender-name">PackBot Agent (Reasoning & Calling Tools)</div>
        <div class="typing-dots">
          <span></span><span></span><span></span>
        </div>
      </div>
    `;
    chatHistory.appendChild(bubble);
    scrollChatToBottom();
    return id;
  }

  function removeTypingIndicator(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  }

  // Update Packing List Checklist
  function updatePackingList(packingList) {
    if (!packingList || !packingList.categories || Object.keys(packingList.categories).length === 0) {
      packingListContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🎒</div>
          <p>Your packing list is empty.</p>
        </div>
      `;
      totalItemsBadge.textContent = "0 Items";
      return;
    }

    totalItemsBadge.textContent = `${packingList.total_items_count} Items`;
    let html = "";

    for (const [category, items] of Object.entries(packingList.categories)) {
      html += `
        <div class="category-group">
          <div class="category-title">
            <span>${escapeHtml(category)}</span>
            <span>${items.length} items</span>
          </div>
          <div class="category-items">
            ${items
              .map(
                (it) => `
              <div class="pack-item-row">
                <label class="item-left">
                  <input type="checkbox" class="item-checkbox" />
                  <span>${escapeHtml(it.item)}</span>
                </label>
                <span class="item-qty">&times;${it.quantity}</span>
              </div>
            `
              )
              .join("")}
          </div>
        </div>
      `;
    }
    packingListContainer.innerHTML = html;
  }

  // Extract Weather from Tool Traces
  function extractAndDisplayWeather(traces) {
    if (!traces) return;
    for (const t of traces) {
      if (t.action === "check_weather") {
        try {
          const w = JSON.parse(t.observation);
          weatherStatusBadge.textContent = w.city;
          weatherStatusBadge.className = "badge badge-accent";
          weatherContent.innerHTML = `
            <div class="weather-grid">
              <div class="weather-stat">
                <div class="stat-label">Temperature</div>
                <div class="stat-val">${w.temp_c}&deg;C</div>
              </div>
              <div class="weather-stat">
                <div class="stat-label">Condition</div>
                <div class="stat-val" style="font-size: 0.95rem;">${w.condition}</div>
              </div>
              <div class="weather-stat">
                <div class="stat-label">Rain Risk</div>
                <div class="stat-val">${w.rain_probability || "N/A"}</div>
              </div>
              <div class="weather-stat">
                <div class="stat-label">Humidity</div>
                <div class="stat-val">${w.humidity || "N/A"}</div>
              </div>
            </div>
            ${
              w.clothing_hint
                ? `<div class="weather-hint-box"><strong>💡 Climate Packing Hint:</strong> ${escapeHtml(w.clothing_hint)}</div>`
                : ""
            }
          `;
        } catch (e) {
          console.error("Could not parse weather observation", e);
        }
      }
    }
  }

  // Fetch Current State from Backend
  async function fetchState() {
    try {
      const res = await fetch("/api/state");
      const data = await res.json();
      if (data.packing_list) updatePackingList(data.packing_list);
      if (data.memory_summary) memorySummary.textContent = data.memory_summary;
    } catch (e) {
      console.warn("Could not sync state:", e);
    }
  }

  function scrollChatToBottom() {
    chatHistory.scrollTop = chatHistory.scrollHeight;
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatMarkdown(text) {
    if (!text) return "";
    let clean = escapeHtml(text);
    // Bold
    clean = clean.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    // Headers
    clean = clean.replace(/^### (.*$)/gim, '<h4 style="margin: 10px 0 4px; color: #67e8f9;">$1</h4>');
    clean = clean.replace(/^## (.*$)/gim, '<h3 style="margin: 12px 0 6px; color: #93c5fd;">$1</h3>');
    // Bullet points
    clean = clean.replace(/^\* (.*$)/gim, '<li style="margin-left: 18px;">$1</li>');
    clean = clean.replace(/^- (.*$)/gim, '<li style="margin-left: 18px;">$1</li>');
    // Paragraph linebreaks
    clean = clean.replace(/\n\n/g, "<br/><br/>");
    return clean;
  }
});
