if (typeof window.spamDetectorEnabled === 'undefined') {
  window.spamDetectorEnabled = false;
}

async function checkSpamDetectorStatus() {
  try {
    const result = await chrome.storage.sync.get('spamDetectorEnabled');
    window.spamDetectorEnabled = result.spamDetectorEnabled ?? false;
  } catch (error) {
    console.error('Error checking spam detector status:', error);
    window.spamDetectorEnabled = false;
  }
}

function addAIReplyButton(replyButton) {
  if (replyButton.nextElementSibling?.classList.contains("ai-reply-button")) {
    return;
  }

  const aiReplyButton = document.createElement("button");
  aiReplyButton.classList.add("ai-reply-button", "enabled");
  aiReplyButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ai-reply-icon">
      <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
      <path d="M16 18a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm0 -12a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm-7 12a6 6 0 0 1 6 -6a6 6 0 0 1 -6 -6a6 6 0 0 1 -6 6a6 6 0 0 1 6 6z" />
    </svg>
    <span>AI Reply</span>
  `;

  replyButton.parentNode.insertBefore(aiReplyButton, replyButton.nextSibling);

  aiReplyButton.addEventListener('click', async () => {
    try {
      const { autoLove } = await chrome.storage.sync.get('autoLove');

      aiReplyButton.classList.add('loading');
      const originalContent = aiReplyButton.innerHTML;
      aiReplyButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ai-reply-icon">
          <path d="M12 3a9 9 0 0 1 9 9" />
        </svg>
        <span>Generating...</span>
      `;

      const { geminiApiKey } = await chrome.storage.sync.get('geminiApiKey');
      if (!geminiApiKey) {
        alert('Please set your Gemini API key first');
        return;
      }

      const commentContainer = replyButton.closest('ytcp-comment');
      if (!commentContainer) {
        throw new Error('Could not find comment container');
      }

      const commentElement = commentContainer.querySelector('#content-text');
      const titleElement = document.querySelector('ytcp-comment-video-thumbnail yt-formatted-string');
      let videoTitle = titleElement?.textContent?.trim();

      if (!videoTitle) {
        const entityNameElement = document.querySelector('#entity-name.entity-name');
        videoTitle = entityNameElement?.textContent?.trim();
      }

      const commentText = commentElement?.textContent?.trim();
      
      if (!commentText || !videoTitle) {
        throw new Error('Could not find comment text or video title');
      }

      const originalButton = replyButton.querySelector('button');
      originalButton?.click();
      
      if (autoLove) {
          setTimeout(() => {
              const commentContainer = replyButton.closest('ytcp-comment');
              if (commentContainer) {
                  const heartButton = commentContainer.querySelector('#creator-heart-button ytcp-icon-button');
                  if (heartButton && !heartButton.hasAttribute('active')) {
                      heartButton.dispatchEvent(new MouseEvent('mousedown', {
                          bubbles: true,
                          cancelable: true,
                          view: window
                      }));
                      
                      heartButton.dispatchEvent(new MouseEvent('mouseup', {
                          bubbles: true,
                          cancelable: true,
                          view: window
                      }));

                      heartButton.dispatchEvent(new MouseEvent('click', {
                          bubbles: true,
                          cancelable: true,
                          view: window,
                          detail: 1
                      }));
                  }
              }
          }, 1000);
      }

      await new Promise(resolve => setTimeout(resolve, 500));

      const activeTextarea = commentContainer.querySelector('textarea#textarea');
      if (!activeTextarea) {
        throw new Error('Could not find textarea');
      }

      activeTextarea.value = 'Generating AI response...';
      activeTextarea.disabled = true;

      const { languageStyle } = await chrome.storage.sync.get('languageStyle');
      const styleText = languageStyle || 'standar';
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Bantu balas komentar ini "${commentText}" dari judul video "${videoTitle}".
              Requirements:
              - Pastikan gunakan bahasa mengikuti bahasa pada komentar tersebut, jika Indonesia balas Indonesia jika Inggris bala Inggis dan bahasa lainnya.
              - Gaya bahasa: ${styleText === 'standar' ? 'standar' : 
                            styleText === 'santai' ? 'santai dan tidak kaku' :
                            styleText === 'gaul' ? 'gaul' :
                            styleText === 'jaksel' ? 'gaul anak jaksel (campur inggris dan Indonesia)' :
                            'formal dan kaku'}
              - Jangan gunakan emoji dan tanda " di awal dan akhir komentar
              - Langsung kirimkan rekomendasi balasan tanpa penjelasan apapun`
            }]
          }],
          generationConfig: {
            temperature: 1.0,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 500
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      const aiReply = data.candidates[0].content.parts[0].text.trim();

      activeTextarea.value = aiReply;
      activeTextarea.disabled = false;

      const event = new Event('input', { bubbles: true });
      activeTextarea.dispatchEvent(event);

      activeTextarea.focus();

      aiReplyButton.classList.remove('loading');
      aiReplyButton.innerHTML = originalContent;

    } catch (error) {
      console.error('Error:', error);
      alert('Failed to generate AI response. Please try again.');
      
      aiReplyButton.classList.remove('loading');
      aiReplyButton.innerHTML = originalContent;
    }
  });
}

function addAIReplyPublicButton(replyButtonEnd) {
  const creatorHeart = document.querySelector('#creator-heart-button');
  if (!creatorHeart) {
    return;
  }

  if (replyButtonEnd.nextElementSibling?.classList.contains("ai-reply-public-button")) {
    return;
  }

  const aiReplyPublicButton = document.createElement("button");
  aiReplyPublicButton.classList.add("ai-reply-public-button", "enabled");
  aiReplyPublicButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ai-reply-icon">
      <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
      <path d="M16 18a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm0 -12a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm-7 12a6 6 0 0 1 6 -6a6 6 0 0 1 -6 -6a6 6 0 0 1 -6 6a6 6 0 0 1 6 6z" />
    </svg>
    <span>AI Reply</span>
  `;

  replyButtonEnd.parentNode.insertBefore(aiReplyPublicButton, replyButtonEnd.nextSibling);

  aiReplyPublicButton.addEventListener('click', () => handleAIReplyPublic(aiReplyPublicButton));
}

async function getVideoDetails(commentContainer) {
  let commentText;
  if (commentContainer.closest('ytd-comment-replies-renderer')) {
    const commentElement = commentContainer.querySelector('#content-text');
    commentText = commentElement?.textContent?.trim();
  } else {
    const commentElement = commentContainer.querySelector('#comment yt-attributed-string#content-text');
    commentText = commentElement?.textContent?.trim();
  }

  const titleElement = document.querySelector('#title yt-formatted-string');
  const videoTitle = titleElement?.textContent?.trim();

  const descriptionElement = document.querySelector('#description ytd-text-inline-expander yt-attributed-string');
  const videoDescription = descriptionElement?.textContent?.trim();

  return { commentText, videoTitle, videoDescription };
}

async function handleAIReplyPublic(aiReplyPublicButton) {
  try {
    const originalContent = aiReplyPublicButton.innerHTML;
    aiReplyPublicButton.classList.add('loading');
    aiReplyPublicButton.innerHTML = `
      <svg class="ai-reply-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
        <path fill="currentColor" d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8Z"/>
      </svg>
      <span>Generating...</span>
    `;

    const commentContainer = aiReplyPublicButton.closest('ytd-comment-view-model');
    const isSubComment = commentContainer.closest('ytd-comment-replies-renderer') !== null;

    const { commentText, videoTitle, videoDescription } = await getVideoDetails(commentContainer);

    const { geminiApiKey, languageStyle, autoLove } = await chrome.storage.sync.get(['geminiApiKey', 'languageStyle', 'autoLove']);
    if (!geminiApiKey) throw new Error('Please set your Gemini API key first');

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Bantu balas komentar ini "${commentText}" dari video berjudul "${videoTitle}" dengan deskripsi video "${videoDescription}"
            Requirements:
            - Pastikan gunakan bahasa mengikuti bahasa pada komentar tersebut, jika Indonesia balas Indonesia jika Inggris bala Inggis dan bahasa lainnya.
            - Gaya bahasa: ${languageStyle === 'standar' ? 'standar' : 
                          languageStyle === 'santai' ? 'santai dan tidak kaku' :
                          languageStyle === 'gaul' ? 'gaul' :
                          languageStyle === 'jaksel' ? 'gaul anak jaksel (campur inggris dan Indonesia)' :
                          'formal dan kaku'}
            - Jangan gunakan emoji dan tanda " di awal dan akhir komentar
            - Langsung kirimkan rekomendasi balasan tanpa penjelasan apapun
            - Pastikan kasih respon sesuai bahasa komentar`
          }]
        }],
        generationConfig: {
          temperature: 1.0,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 500
        }
      })
    });

    if (!response.ok) {
      throw new Error('Failed to generate AI response');
    }

    const data = await response.json();
    const aiReply = data.candidates[0].content.parts[0].text.trim();

    const replyButton = commentContainer.querySelector('#reply-button-end button');
    if (!replyButton) throw new Error('Reply button not found');
    replyButton.click();

    await new Promise(resolve => setTimeout(resolve, 1000));
    const textarea = commentContainer.querySelector('#contenteditable-root');
    if (!textarea) throw new Error('Comment textarea not found');

    textarea.textContent = aiReply;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));

    if (autoLove) {
      try {
        const creatorHeartButton = commentContainer.querySelector('#creator-heart ytd-creator-heart-renderer #creator-heart-button');
        if (creatorHeartButton) {
          creatorHeartButton.click();
        }
      } catch (error) {
        console.error('Error auto-loving comment:', error);
      }
    }

    aiReplyPublicButton.classList.remove('loading');
    aiReplyPublicButton.innerHTML = originalContent;
  } catch (error) {
    console.error('Error:', error);
    alert('Failed to generate AI response. Please try again.');
    aiReplyPublicButton.classList.remove('loading');
    aiReplyPublicButton.innerHTML = originalContent;
  }
}

function createSpamAlert() {
  if (document.querySelector('.spam-alert-tab')) return;

  const tabsContainer = document.querySelector('#tabsContent');
  const mentionsTab = document.querySelector('#mentions-tab');
  
  if (!tabsContainer || !mentionsTab) return;

  const alertTab = document.createElement('div');
  alertTab.className = 'spam-alert-tab';
  alertTab.innerHTML = `
    <div class="alert-content">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="alert-icon">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
        <path d="M12 9v4" />
        <path d="M12 16v.01" />
      </svg>
      <div class="alert-text">
        <span class="alert-message">Ditemukan komentar spam </span>
        <span class="alert-action">
          Lihat 
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
            <path d="M11 13l9 -9" />
            <path d="M15 4h5v5" />
          </svg>
        </span>
      </div>
    </div>
  `;

  mentionsTab.insertAdjacentElement('afterend', alertTab);

  alertTab.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'openExtension' });
  });
}

function hasSpamCharacters(text) {
  const emojiRegex = /[\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F64F}\u{1F680}-\u{1F6FF}]/u;
  const textWithoutEmoji = text.replace(emojiRegex, '');
  const nonStandardRegex = /[^\x00-\x7F\s.,!?@#$%^&*()_+=\-[\]{};:'"`~<>\/\\|a-zA-Z0-9]/;
  return nonStandardRegex.test(textWithoutEmoji);
}

function extractSuspiciousWords(text) {
  const emojiRegex = /[\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F64F}\u{1F680}-\u{1F6FF}]/ug;
  const textWithoutEmoji = text.replace(emojiRegex, '');
  const words = textWithoutEmoji.split(/\s+/);
  return words.filter(word => hasSpamCharacters(word));
}

function clearSuspiciousWords() {
  chrome.storage.local.set({ suspiciousWords: [] });
}

function addGenerateTitleButton() {
  const isVideoPage = document.querySelector('ytcp-video-metadata-editor');
  if (!isVideoPage) return;

  const formInputContainer = document.querySelector('ytcp-social-suggestions-textbox div.style-scope.ytcp-form-input-container');
  const descriptionContainer = document.querySelector('ytcp-video-description');
  
  if (!formInputContainer || !descriptionContainer || document.querySelector('.bt-generate-title-wrapper')) {
    return;
  }

  const accordionContainer = document.createElement('div');
  accordionContainer.className = 'bt-generate-title-wrapper';

  const accordionHeader = document.createElement('div');
  accordionHeader.className = 'bt-generate-header';
  accordionHeader.innerHTML = `
    <div class="bt-generate-wrapper">
      <button class="bt-generate-title">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M16 18a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm0 -12a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm-7 12a6 6 0 0 1 6 -6a6 6 0 0 1 -6 -6a6 6 0 0 1 -6 6a6 6 0 0 1 6 6z" />
        </svg>
        <span>Generate Title</span>
      </button>
      <span class="bt-status-message"></span>
    </div>
    <div class="bt-header-controls">
      <button class="bt-settings-toggle">
        <svg xmlns="http://www.w3.org/2000/svg"  width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
          <path d="M14 6m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
          <path d="M4 6l8 0" /><path d="M16 6l4 0" />
          <path d="M8 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
          <path d="M4 12l2 0" /><path d="M10 12l10 0" />
          <path d="M17 18m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
          <path d="M4 18l11 0" /><path d="M19 18l1 0" />
        </svg>
      </button>
      <div class="bt-suggestions-toggle">
        <span>Rekomendasi Judul</span>
        <svg class="bt-arrow-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </div>
    </div>
  `;

  const suggestionsContent = document.createElement('div');
  suggestionsContent.className = 'bt-suggestions-content';
  suggestionsContent.style.display = 'none';
  const emptyState = document.createElement('div');
  emptyState.className = 'bt-empty-state';
  emptyState.innerHTML = `
    <div class="bt-empty-message">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="background: #7d7d7d21; padding: 10px; border-radius: 20px; width: 20px; height: 20px;">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M9 5h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2h-2" /><path d="M9 3m0 2a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v0a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2z" /><path d="M9 12l.01 0" /><path d="M13 12l2 0" /><path d="M9 16l.01 0" /><path d="M13 16l2 0" />
      </svg>
      <span style="font-size:12px;">Klik tombol <b>Generate Title</b> untuk membuat judul baru.</span>
    </div>
  `;

  suggestionsContent.appendChild(emptyState);
  const settingsPanel = document.createElement('div');
  settingsPanel.className = 'bt-settings-panel';
  settingsPanel.style.display = 'none';
  settingsPanel.innerHTML = `
  <div class="bt-settings-row">
    <div class="bt-select-group">
      <span class="bt-select-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
      </span>
      <select class="bt-select" id="bt-language-style">
        <option value="" disabled selected>Gaya Bahasa</option>
        <option value="normal dan tidak kaku">Standar</option>
        <option value="formal">Formal</option>
        <option value="santai, friendly dan tidak kaku">Santai</option>
        <option value="terkesan clickbait">Clickbait</option>
      </select>
    </div>
    <div class="bt-select-group">
      <span class="bt-select-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
      </span>
      <select class="bt-select" id="bt-audience">
        <option value="" disabled selected>Target Audiens</option>
        <option value="semua usia">Umum</option>
        <option value="dewasa">Dewasa</option>
        <option value="remaja">Remaja</option>
      </select>
    </div>
    <div class="bt-input-keyword-group">
      <span class="bt-select-icon">
        <svg  xmlns="http://www.w3.org/2000/svg"  width="14"  height="14"  viewBox="0 0 24 24"  fill="none"  stroke="currentColor"  stroke-width="2">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M8 9h8" /><path d="M8 13h5" />
        <path d="M12 21l-.5 -.5l-2.5 -2.5h-3a3 3 0 0 1 -3 -3v-8a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v4.5" />
        <path d="M18 18m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
        <path d="M20.2 20.2l1.8 1.8" />
        </svg>
      </span>
      <input type="text" class="bt-input-keyword" id="bt-keyword" placeholder="Keyword Utama">
    </div>
    <div class="bt-toggle-wrapper">
      <label class="bt-toggle">
        <input type="checkbox" id="bt-emoji-toggle">
        <span class="bt-toggle-track">
          <span class="bt-toggle-thumb"></span>
        </span>
        <span class="bt-toggle-label">
          🔥Emoji
        </span>
      </label>
    </div>
  </div>
`;

  accordionContainer.appendChild(accordionHeader);
  accordionContainer.appendChild(settingsPanel);
  accordionContainer.appendChild(suggestionsContent);
  formInputContainer.appendChild(accordionContainer);

  const settingsToggle = accordionHeader.querySelector('.bt-settings-toggle');
  const suggestionsToggle = accordionHeader.querySelector('.bt-suggestions-toggle');

  settingsToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const isVisible = settingsPanel.style.display === 'block';
    settingsPanel.style.display = isVisible ? 'none' : 'block';
    settingsToggle.classList.toggle('active');
  });

  suggestionsToggle.addEventListener('click', () => {
    const isExpanded = suggestionsContent.style.display === 'block';
    suggestionsContent.style.display = isExpanded ? 'none' : 'block';
    suggestionsToggle.classList.toggle('expanded');
  });

  const generateButton = accordionHeader.querySelector('.bt-generate-title');
  
  async function sendPromptToGemini(prompt, apiKey, retryCount = 0, maxRetries = 3) {
    const statusMessage = document.querySelector('.bt-status-message');
    
    try {
      if (retryCount > 0) {
        statusMessage.textContent = `Mencoba ulang... (${retryCount}/${maxRetries})`;
        statusMessage.className = 'bt-status-message';
      }
  
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 1.2,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1000
          }
        })
      });
  
      if (!response.ok) {
        if (retryCount < maxRetries) {
          console.log(`Retry attempt ${retryCount + 1} of ${maxRetries}`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
          return sendPromptToGemini(prompt, apiKey, retryCount + 1, maxRetries);
        }
        throw new Error('Failed after max retries');
      }
  
      return response.json();
    } catch (error) {
      if (retryCount < maxRetries) {
        console.log(`Retry attempt ${retryCount + 1} of ${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return sendPromptToGemini(prompt, apiKey, retryCount + 1, maxRetries);
      }
      throw error;
    }
  }
  
  generateButton.addEventListener('click', async () => {
    try {
      const { geminiApiKey } = await chrome.storage.sync.get('geminiApiKey');
      if (!geminiApiKey) {
        alert('Please set your Gemini API key first');
        return;
      }
  
      const languageStyle = document.querySelector('#bt-language-style').value || 'jangan gunakan bahasa yang formal dan kaku, tapi gunakan bahasa yang lebih santai dan seperti percakapan di social media';
      const audience = document.querySelector('#bt-audience').value || 'semua usia';
      const keyword = document.querySelector('#bt-keyword').value;
      const emojiEnabled = document.querySelector('#bt-emoji-toggle').checked;
  
      const titleInput = document.querySelector('ytcp-social-suggestion-input[id="input"] #textbox');
      const descriptionInput = document.querySelector('ytcp-video-description ytcp-social-suggestion-input[id="input"] #textbox');
      
      const originalTitle = titleInput?.textContent?.trim() || '';
      const description = descriptionInput?.textContent?.trim() || '';

      if (!originalTitle) {
        const statusMessage = document.querySelector('.bt-status-message');
        statusMessage.textContent = '× Judul harus diisi terlebih dahulu';
        statusMessage.className = 'bt-status-message error';
        setTimeout(() => {
          statusMessage.textContent = '';
        }, 3000);
        return;
      }
  
      generateButton.classList.add('loading');
      generateButton.disabled = true;
      const originalContent = generateButton.innerHTML;
      generateButton.innerHTML = `
        <svg class="loading-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 3a9 9 0 0 1 9 9" />
        </svg>
        <span>Generating...</span>
      `;
  
      const generateTitlePrompt = `As a YouTube SEO Specialist, generate 5 highly optimized titles based on:
      
      Input Data:
      - Original Title: "${originalTitle}"
      - Description: "${description}"
      - Primary Keyword: "${keyword}"
      - Writing Style: "${languageStyle}"
      - Target Audience: "${audience}"
      - Emoji Usage: ${emojiEnabled ? 'Include relevant emojis' : 'No emojis'}
      
      Title Requirements:
      1. SEO Optimization:
      - Place primary keyword within first 50 characters
      - Include high-CTR terms
      - Optimize for YouTube search algorithm
      - Add numbers when relevant (e.g., "5 Ways", "3 Tips", etc.)
      
      2. Engagement Factors:
      - Create curiosity gap without being clickbait
      - Use power words to increase CTR
      - Add emotional triggers when appropriate
      - Keep length between 60-75 characters (max 90)
      
      3. Title Structure:
      - Start with strongest hook
      - Include benefit or value proposition
      - Add urgency/relevancy when possible
      - Avoid generic templates and repetitive patterns
      
      4. Format & Style:
      - Natural language flow
      - Match target audience's language style
      - Proper capitalization
      - No excessive punctuation
      
      Output Format:
      {
        "titles": [
          {
            "id": 1,
            "title": "Title text here",
            "characters": "character count"
          }
        ]
      }
      
      Ensure each title is unique and follows YouTube's best practices for maximum visibility and engagement.`;
  
      const data = await sendPromptToGemini(generateTitlePrompt, geminiApiKey);
  
      let cleanResponse = data.candidates[0].content.parts[0].text
        .replace(/```json\n|\n```/g, '')
        .replace(/,(\s*})/g, '$1');
      try {
        const titlesResponse = JSON.parse(cleanResponse);
        suggestionsContent.innerHTML = '';
        titlesResponse.titles.forEach((item, index) => {
          const suggestionItem = document.createElement('div');
          suggestionItem.className = 'bt-suggestion-item';
          suggestionItem.setAttribute('role', 'button');
          suggestionItem.setAttribute('tabindex', '0');
          suggestionItem.innerHTML = `
            <div class="bt-suggestion-text">
              <span class="bt-suggestion-number">${index + 1}</span>
              ${item.title}
            </div>
          `;
  
          suggestionItem.addEventListener('click', () => {
            const titleInput = document.querySelector('ytcp-social-suggestions-textbox #textbox');
            if (titleInput) {
              titleInput.textContent = item.title;
              titleInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
          });
  
          suggestionsContent.appendChild(suggestionItem);
        });
  
        suggestionsContent.style.display = 'block';
        suggestionsToggle.classList.add('expanded');
  
        const statusMessage = document.querySelector('.bt-status-message');
        
        statusMessage.textContent = '✓ Berhasil generate judul';
        statusMessage.className = 'bt-status-message success';
        
        setTimeout(() => {
          statusMessage.classList.add('fade-out');
        }, 3000);
  
      } catch (parseError) {
        console.error('Error parsing JSON:', parseError);
        throw new Error('Failed to parse AI response');
      }
  
      generateButton.classList.remove('loading');
      generateButton.disabled = false;
      generateButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M16 18a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm0 -12a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm-7 12a6 6 0 0 1 6 -6a6 6 0 0 1 -6 -6a6 6 0 0 1 -6 6a6 6 0 0 1 6 6z" />
        </svg>
        <span>Generate Title</span>
      `;
  
    } catch (error) {
      console.error('Error:', error);
      const statusMessage = document.querySelector('.bt-status-message');
      statusMessage.textContent = '× Generate judul gagal, coba lagi!';
      statusMessage.className = 'bt-status-message error';
      
      setTimeout(() => {
        statusMessage.classList.add('fade-out');
      }, 3000);
  
      generateButton.classList.remove('loading');
      generateButton.disabled = false;
      generateButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M16 18a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm0 -12a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm-7 12a6 6 0 0 1 6 -6a6 6 0 0 1 -6 -6a6 6 0 0 1 -6 6a6 6 0 0 1 6 6z" />
        </svg>
        <span>Generate Title</span>
      `;
    }
  });
}

function addGenerateDescriptionButton() {
  if (document.querySelector('.bt-generate-description')) return;

  const descContainer = document.querySelector('ytcp-video-description ytcp-social-suggestions-textbox #container-content');
  if (!descContainer) return;

  const generatePanel = document.createElement('div');
  generatePanel.className = 'bt-generate-description-panel';
  generatePanel.innerHTML = `
    <div class="bt-generate-header">
      <div class="bt-generate-wrapper">
        <button class="bt-generate-description">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M16 18a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm0 -12a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm-7 12a6 6 0 0 1 6 -6a6 6 0 0 1 -6 -6a6 6 0 0 1 -6 6a6 6 0 0 1 6 6z"/>
          </svg>
          <span>Generate Description</span>
        </button>
        <span class="bt-status-message"></span>
      </div>
      <div class="bt-description-settings">
        <div class="bt-desc-select-group">
          <span class="bt-desc-select-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
          </span>
          <select class="bt-desc-select" id="bt-desc-style">
            <option value="" disabled selected>Gaya Tulisan</option>
            <option value="naratif dan menarik">Storytelling</option>
            <option value="formal dan detail">Professional</option>
            <option value="promosi dan call-to-action">Promosi</option>
            <option value="ringkas dan to the point">Simple</option>
          </select>
        </div>
        <div class="bt-desc-select-group">
          <span class="bt-desc-select-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke="none" d="M0 0h24h24H0z" fill="none"/><path d="M4 8v-2a2 2 0 0 1 2 -2h2" /><path d="M4 16v2a2 2 0 0 0 2 2h2" /><path d="M16 4h2a2 2 0 0 1 2 2v2" /><path d="M16 20h2a2 2 0 0 0 2 -2v-2" /><path d="M8 12h8" /><path d="M8 9h6" /><path d="M8 15h4" />
            </svg>
          </span>
          <select class="bt-desc-select" id="bt-desc-length">
            <option value="" disabled selected>Panjang Deskripsi</option>
            <option value="100-300">Pendek</option>
            <option value="500-900">Sedang</option>
            <option value="1000-2000">Panjang</option>
          </select>
        </div>
      </div>
    </div>
  `;

  const containerBottom = descContainer.querySelector('.container-bottom');
  if (containerBottom) {
    containerBottom.insertAdjacentElement('afterend', generatePanel);
  }

  const generateButton = generatePanel.querySelector('.bt-generate-description');
  const statusMessage = generatePanel.querySelector('.bt-status-message');
  
  async function sendPromptToGemini(prompt, apiKey, retryCount = 0, maxRetries = 3) {
    try {
      if (retryCount > 0) {
        statusMessage.textContent = `Mencoba ulang... (${retryCount}/${maxRetries})`;
        statusMessage.className = 'bt-status-message';
      }

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 1.2,
            topK: 50,
            topP: 0.92,
            maxOutputTokens: 1000
          }
        })
      });

      if (!response.ok) {
        if (retryCount < maxRetries) {
          console.log(`Retry attempt ${retryCount + 1} of ${maxRetries}`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
          return sendPromptToGemini(prompt, apiKey, retryCount + 1, maxRetries);
        }
        throw new Error('Failed after max retries');
      }

      return response.json();
    } catch (error) {
      if (retryCount < maxRetries) {
        console.log(`Retry attempt ${retryCount + 1} of ${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return sendPromptToGemini(prompt, apiKey, retryCount + 1, maxRetries);
      }
      throw error;
    }
  }
  
  generateButton.addEventListener('click', async () => {
    try {
      const originalButtonContent = generateButton.innerHTML;

      const { geminiApiKey } = await chrome.storage.sync.get('geminiApiKey');
      if (!geminiApiKey) {
        alert('Please set your Gemini API key first');
        return;
      }

      const descStyle = document.querySelector('#bt-desc-style').value || 'naratif dan menarik';
      const descLength = document.querySelector('#bt-desc-length').value || '700';

      const titleInput = document.querySelector('ytcp-social-suggestion-input[id="input"] #textbox');
      const originalTitle = titleInput?.textContent?.trim() || '';

      if (!originalTitle) {
        statusMessage.textContent = '× Judul harus diisi terlebih dahulu';
        statusMessage.className = 'bt-status-message error';
        setTimeout(() => {
          statusMessage.textContent = '';
        }, 3000);
        return;
      }

      const titleLangStyle = document.querySelector('#bt-language-style').value || 'normal dan tidak kaku';
      const titleAudience = document.querySelector('#bt-audience').value || 'semua usia';
      const titleKeyword = document.querySelector('#bt-keyword').value || '';
      const titleEmojiEnabled = document.querySelector('#bt-emoji-toggle').checked;

      generateButton.classList.add('loading');
      generateButton.disabled = true;
      generateButton.innerHTML = `
        <svg class="loading-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 3a9 9 0 0 1 9 9" />
        </svg>
        <span>Generating...</span>
      `;

      const generateDescriptionPrompt = `As a YouTube SEO Specialist, create an optimized description for the video titled "${originalTitle}".

      Requirements:
      1. Main Elements:
      - Primary keyword: "${titleKeyword}"
      - Writing style: ${descStyle === 'naratif dan menarik' ? 'engaging storytelling with clear flow' :
                      descStyle === 'formal dan detail' ? 'professional and detailed explanation' :
                      descStyle === 'promosi dan call-to-action' ? 'persuasive with strong CTAs' :
                      'concise and straightforward'}
      - Target audience: ${titleAudience}
      - Length: ${descLength} characters
      - Language style: ${titleLangStyle}
      ${titleEmojiEnabled ? '- Include relevant emojis strategically' : '- No emojis'}

      2. SEO Structure:
      - First 2-3 lines: Hook and main value proposition
      - Body: Detailed content breakdown with LSI keywords
      - End section: Call-to-action and engagement prompts
      - Bottom: 5-7 relevant hashtags

      3. Must Include:
      - Primary keyword in first 100 characters
      - Related search terms and LSI keywords

      Output the description directly without any explanations or prefixes.`;

      const data = await sendPromptToGemini(generateDescriptionPrompt, geminiApiKey);
      
      const generatedDescription = data.candidates[0].content.parts[0].text.trim();

      const descriptionInput = document.querySelector('ytcp-video-description ytcp-social-suggestion-input[id="input"] #textbox');
      if (descriptionInput) {
        descriptionInput.textContent = generatedDescription;
        descriptionInput.dispatchEvent(new Event('input', { bubbles: true }));
      }

      statusMessage.textContent = '✓ Sukses';
      statusMessage.className = 'bt-status-message success';
      
      setTimeout(() => {
        statusMessage.classList.add('fade-out');
      }, 3000);

      generateButton.classList.remove('loading');
      generateButton.disabled = false;
      generateButton.innerHTML = originalButtonContent;

    } catch (error) {
      console.error('Error:', error);
      
      statusMessage.textContent = '× Gagal';
      statusMessage.className = 'bt-status-message error';
      
      setTimeout(() => {
        statusMessage.classList.add('fade-out');
      }, 3000);

      generateButton.classList.remove('loading');
      generateButton.disabled = false;
      generateButton.innerHTML = originalButtonContent;
    }
  });
}

function addGenerateTagsButton() {
  const tagsContainer = document.querySelector('ytcp-form-input-container#tags-container');
  const descriptionElement = tagsContainer?.querySelector('#description');
  
  if (!tagsContainer || !descriptionElement || document.querySelector('.bt-generate-tags-wrapper')) {
    return;
  }

  const tagsAccordionContainer = document.createElement('div');
  tagsAccordionContainer.className = 'bt-generate-tags-wrapper';

  const tagsAccordionHeader = document.createElement('div'); 
  tagsAccordionHeader.className = 'bt-generate-header';
  tagsAccordionHeader.innerHTML = `
    <div class="bt-generate-wrapper">
      <button class="bt-generate-tags">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M16 18a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm0 -12a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm-7 12a6 6 0 0 1 6 -6a6 6 0 0 1 -6 -6a6 6 0 0 1 -6 6a6 6 0 0 1 6 6z" />
        </svg>
        <span>Generate Tags</span>
      </button>
      <span class="bt-status-message"></span>
    </div>
    <div class="bt-header-controls">
      <div class="bt-suggestions-toggle">
        <span>Rekomendasi Tags</span>
        <svg class="bt-arrow-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </div>
    </div>
  `;

  const tagsSuggestionsContent = document.createElement('div');
  tagsSuggestionsContent.className = 'bt-suggestions-content';
  tagsSuggestionsContent.style.display = 'none';

  const emptyState = document.createElement('div');
  emptyState.className = 'bt-empty-state';
  emptyState.innerHTML = `
    <div class="bt-empty-message">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="background: #7d7d7d21; padding: 10px; border-radius: 20px; width: 20px; height: 20px;">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M9 5h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2h-2" />
        <path d="M9 3m0 2a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v0a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2z" />
        <path d="M9 12l.01 0" /><path d="M13 12l2 0" />
        <path d="M9 16l.01 0" /><path d="M13 16l2 0" />
      </svg>
      <span style="font-size:12px;">Klik tombol <b>Generate Tags</b> untuk membuat tags baru.</span>
    </div>
  `;

  tagsSuggestionsContent.appendChild(emptyState);

  tagsAccordionContainer.appendChild(tagsAccordionHeader);
  tagsAccordionContainer.appendChild(tagsSuggestionsContent);
  descriptionElement.insertAdjacentElement('afterend', tagsAccordionContainer);

  const suggestionsToggle = tagsAccordionHeader.querySelector('.bt-suggestions-toggle');
  const generateButton = tagsAccordionHeader.querySelector('.bt-generate-tags');

  suggestionsToggle.addEventListener('click', () => {
    const isExpanded = tagsSuggestionsContent.style.display === 'block';
    tagsSuggestionsContent.style.display = isExpanded ? 'none' : 'block';
    suggestionsToggle.classList.toggle('expanded');
  });

  generateButton.addEventListener('click', async () => {
    try {
      const { geminiApiKey } = await chrome.storage.sync.get('geminiApiKey');
      if (!geminiApiKey) {
        alert('Please set your Gemini API key first');
        return;
      }

      const titleInput = document.querySelector('ytcp-social-suggestion-input[id="input"] #textbox');
      const descriptionInput = document.querySelector('ytcp-video-description ytcp-social-suggestion-input[id="input"] #textbox');
      
      const title = titleInput?.textContent?.trim() || '';
      const description = descriptionInput?.textContent?.trim() || '';

      if (!title && !description) {
        alert('Title or description must be filled first');
        return;
      }
      const chipElements = document.querySelectorAll('ytcp-chip-bar ytcp-chip');
      const existingTags = Array.from(chipElements)
        .map(chip => chip.querySelector('#text')?.textContent?.trim())
        .filter(Boolean)
        .join(', ');
      generateButton.disabled = true;
      generateButton.classList.add('loading');
      const originalContent = generateButton.innerHTML;
      generateButton.innerHTML = `
        <svg class="loading-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 3a9 9 0 0 1 9 9" />
        </svg>
        <span>Generating...</span>
      `;

      const generateTagsPrompt = `As a YouTube SEO Specialist, generate 15 highly optimized tags based on:
      
      Input Data:
      - Video Title: "${title}"
      - Video Description: "${description}"
      - Existing Tags: "${existingTags}"
      
      Tag Requirements:
      1. SEO Optimization:
      - Include high-volume search terms
      - Mix of short-tail and long-tail keywords
      - Use trending/popular variations
      - Include misspellings of main keywords
      - Add related brand/person names if relevant
      
      2. Tag Structure:
      - Range from 2-5 words per tag
      - Include singular and plural forms
      - Mix specific and broad terms
      - Use natural language phrases
      - Include question-based tags when relevant
      
      3. Tag Categories:
      - Main topic keywords
      - Related subtopics
      - Target audience terms
      - Content type/format
      - Problem/solution terms
      
      4. Language Style:
      - Use conversational language
      - Avoid formal/stiff phrasing
      - Match viewer search patterns
      - Include common variations
      - Use natural social media language
      
      Note: 
      - Make sure there are no duplicate tags with existing tags in this list: "${existingTags}"
      - Order tags by search volume/relevance
      - Exclude irrelevant clickbait terms
      - Keep within YouTube's tag limits
      
      Output Format:
      {
        "tags": [
          "tag1",
          "tag2"
        ]
      }`;

      const data = await sendPromptToGemini(generateTagsPrompt, geminiApiKey);

      let cleanResponse = data.candidates[0].content.parts[0].text
        .replace(/```json\n|\n```/g, '')
        .replace(/,(\s*})/g, '$1');

      const tagsResponse = JSON.parse(cleanResponse);
      const uniqueTags = tagsResponse.tags.filter(tag => 
        !existingTags.includes(tag.toLowerCase().trim())
      );

      tagsSuggestionsContent.innerHTML = '';

      if (uniqueTags.length === 0) {
        const noTagsMessage = document.createElement('div');
        noTagsMessage.className = 'bt-empty-state';
        noTagsMessage.innerHTML = `
          <div class="bt-empty-message">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="background: #7d7d7d21; padding: 10px; border-radius: 20px;">
              <path d="M12 9v4m0 0v.01M12 3a9 9 0 110 18 9 9 0 010-18z"/>
            </svg>
            <span>Semua tags yang dihasilkan sudah ada.<br>Silakan generate lagi untuk mendapatkan tags baru.</span>
          </div>
        `;
        tagsSuggestionsContent.appendChild(noTagsMessage);
      } else {
        const tagsContainer = document.createElement('div');
        tagsContainer.className = 'bt-tags-container';

        uniqueTags.forEach(tag => {
          const tagElement = document.createElement('button');
          tagElement.className = 'bt-tag-item';
          tagElement.textContent = tag;

          tagElement.addEventListener('click', () => {
            let textInput = document.querySelector('ytcp-uploads-dialog ytcp-chip-bar #text-input');
            
            if (!textInput) {
              textInput = document.querySelector('ytcp-chip-bar #text-input');
            }
          
            if (textInput) {
              const currentValue = textInput.value || '';
              const newValue = currentValue ? `${currentValue}, ${tag}` : tag;
              
              textInput.value = newValue;
              textInput.dispatchEvent(new Event('input'));
              
              textInput.dispatchEvent(new KeyboardEvent('keydown', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13, 
                which: 13,
                bubbles: true
              }));
              
              tagElement.remove();
            }
          });

          tagsContainer.appendChild(tagElement);
        });

        tagsSuggestionsContent.appendChild(tagsContainer);
      }

      tagsSuggestionsContent.style.display = 'block';
      suggestionsToggle.classList.add('expanded');

      const statusMessage = tagsAccordionHeader.querySelector('.bt-status-message');
      statusMessage.textContent = '✓ Berhasil generate tags';
      statusMessage.className = 'bt-status-message success';
      
      setTimeout(() => {
        statusMessage.classList.add('fade-out');
      }, 3000);

      generateButton.disabled = false;
      generateButton.classList.remove('loading');
      generateButton.innerHTML = originalContent;

    } catch (error) {
      console.error('Error:', error);
      const statusMessage = document.querySelector('.bt-status-message');
      statusMessage.textContent = '× Generate tags gagal';
      statusMessage.className = 'bt-status-message error';
      
      setTimeout(() => {
        statusMessage.classList.add('fade-out');
      }, 3000);

      generateButton.disabled = false;
      generateButton.classList.remove('loading');
      generateButton.innerHTML = originalContent;
    }
  });

  async function sendPromptToGemini(prompt, apiKey, retryCount = 0, maxRetries = 3) {
    const statusMessage = document.querySelector('.bt-status-message');
    
    try {
      if (retryCount > 0) {
        statusMessage.textContent = `Mencoba ulang... (${retryCount}/${maxRetries})`;
        statusMessage.className = 'bt-status-message';
      }

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 50,
            topP: 0.9,
            maxOutputTokens: 500
          }
        })
      });

      if (!response.ok) {
        if (retryCount < maxRetries) {
          console.log(`Retry attempt ${retryCount + 1} of ${maxRetries}`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
          return sendPromptToGemini(prompt, apiKey, retryCount + 1, maxRetries);
        }
        throw new Error('Failed after max retries');
      }

      statusMessage.textContent = '✓ Berhasil generate tags';
      statusMessage.className = 'bt-status-message success';
      setTimeout(() => {
        statusMessage.classList.add('fade-out');
      }, 3000);

      return response.json();

    } catch (error) {
      if (retryCount < maxRetries) {
        console.log(`Retry attempt ${retryCount + 1} of ${maxRetries}`);
        statusMessage.textContent = `Mencoba ulang... (${retryCount + 1}/${maxRetries})`;
        statusMessage.className = 'bt-status-message';
        
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return sendPromptToGemini(prompt, apiKey, retryCount + 1, maxRetries);
      }

      statusMessage.textContent = '× Generate tags gagal';
      statusMessage.className = 'bt-status-message error';
      setTimeout(() => {
        statusMessage.classList.add('fade-out');
      }, 3000);

      throw error;
    }
  }
}

function addGeneratePlaylistDescriptionButton() {
  if (document.querySelector('.bt-generate-playlist-header')) return;

  const observer = new MutationObserver((mutations, obs) => {
    const descContainer = document.querySelector('.input-container.description.style-scope.ytcp-playlist-metadata-editor');
    const innerContainer = descContainer?.querySelector('#outer');
    const childInput = innerContainer?.querySelector('#child-input');
    const buttonExists = document.querySelector('.bt-generate-playlist-header');

    if (innerContainer && childInput && !buttonExists) {
      const generatePanel = document.createElement('div');
      generatePanel.className = 'bt-generate-playlist-header';
      
      generatePanel.innerHTML = `
        <div class="bt-generate-header">
          <div class="bt-generate-wrapper">
            <button class="bt-generate-playlist-description">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M16 18a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm0 -12a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm-7 12a6 6 0 0 1 6 -6a6 6 0 0 1 -6 -6a6 6 0 0 1 -6 6a6 6 0 0 1 6 6z"/>
              </svg>
              <span>Generate Description</span>
            </button>
            <span class="bt-status-message"></span>
          </div>
        </div>
      `;

      childInput.insertAdjacentElement('afterend', generatePanel);
      initGeneratePlaylistDescription(generatePanel);
      
      obs.disconnect();
    }
  });

  const target = document.querySelector('ytcp-playlist-metadata-editor');
  if (target) {
    observer.observe(target, {
      childList: true,
      subtree: true
    });
  }
}

function initGeneratePlaylistDescription(generatePanel) {
  const generateButton = generatePanel.querySelector('.bt-generate-playlist-description');
  const statusMessage = generatePanel.querySelector('.bt-status-message');

  async function sendPromptToGemini(prompt, apiKey, retryCount = 0, maxRetries = 3) {
    try {
      if (retryCount > 0) {
        statusMessage.textContent = `Mencoba ulang... (${retryCount}/${maxRetries})`;
        statusMessage.className = 'bt-status-message';
      }

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 1.2,
            topK: 50,
            topP: 0.92,
            maxOutputTokens: 2000
          }
        })
      });

      if (!response.ok) {
        if (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
          return sendPromptToGemini(prompt, apiKey, retryCount + 1, maxRetries);
        }
        throw new Error('Failed after max retries');
      }

      return response.json();
    } catch (error) {
      if (retryCount < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return sendPromptToGemini(prompt, apiKey, retryCount + 1, maxRetries);
      }
      throw error;
    }
  }

  generateButton.addEventListener('click', async () => {
    try {
      const originalButtonContent = generateButton.innerHTML;
      const { geminiApiKey } = await chrome.storage.sync.get('geminiApiKey');
      
      if (!geminiApiKey) {
        alert('API Key belum diatur. Silakan atur di menu extension.');
        return;
      }

      const titleInput = document.querySelector('.input-container.title.style-scope.ytcp-playlist-metadata-editor #textbox');
      const playlistTitle = titleInput?.textContent?.trim() || '';

      if (!playlistTitle) {
        statusMessage.textContent = '× Judul playlist harus diisi terlebih dahulu';
        statusMessage.className = 'bt-status-message error';
        setTimeout(() => {
          statusMessage.textContent = '';
        }, 3000);
        return;
      }

      generateButton.disabled = true;
      generateButton.classList.add('loading');
      generateButton.innerHTML = `
        <svg class="loading-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 3a9 9 0 0 1 9 9" />
        </svg>
        <span>Generating...</span>
      `;

      const generatePlaylistDescPrompt = `As a YouTube SEO Specialist, create an engaging and SEO-optimized description for a YouTube playlist titled "${playlistTitle}".

     SEO Structure:
      - Body: Detailed content breakdown with LSI keywords
      - End section: Call-to-action and engagement prompts
      - Bottom: 5-7 relevant hashtags

      Must Include:
      - Primary keyword in first 100 characters
      - Related search terms and LSI keywords
      - Use same language as the title
      - Dont use text with **text** or _text_ format
      
      Output the description directly without any explanations or additional text.`;

      const data = await sendPromptToGemini(generatePlaylistDescPrompt, geminiApiKey);
      const description = data.candidates[0].content.parts[0].text.trim();

      const descInput = document.querySelector('.input-container.description.style-scope.ytcp-playlist-metadata-editor #textbox');
      if (descInput) {
        descInput.textContent = description;
        descInput.dispatchEvent(new Event('input'));
      }

      statusMessage.textContent = '✓ Berhasil generate description';
      statusMessage.className = 'bt-status-message success';
      
      setTimeout(() => {
        statusMessage.textContent = '';
      }, 3000);

      generateButton.disabled = false;
      generateButton.classList.remove('loading');
      generateButton.innerHTML = originalButtonContent;

    } catch (error) {
      console.error('Error:', error);
      statusMessage.textContent = '× Generate description gagal';
      statusMessage.className = 'bt-status-message error';
      
      setTimeout(() => {
        statusMessage.textContent = '';
      }, 3000);

      generateButton.disabled = false;
      generateButton.classList.remove('loading');
      generateButton.innerHTML = originalButtonContent;
    }
  });
}

function addTranslateButton() {
  const observer = new MutationObserver((mutations, obs) => {
    const languageRow = document.querySelector('#language-name-row.style-scope.ytgn-metadata-editor');
    const translatedDiv = languageRow?.querySelector('.metadata-editor-translated');
    const buttonExists = document.querySelector('.bt-translate-button');
    
    if (translatedDiv && !buttonExists) {
      translatedDiv.style.display = 'flex';
      translatedDiv.style.alignItems = 'center';
      translatedDiv.style.gap = '8px';
      
      const translateButton = document.createElement('button');
      translateButton.className = 'bt-translate-button';
      
      translateButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M16 18a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm0 -12a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm-7 12a6 6 0 0 1 6 -6a6 6 0 0 1 -6 -6a6 6 0 0 1 -6 6a6 6 0 0 1 6 6z"/>
        </svg>
        <span>Translate</span>
      `;

      translatedDiv.appendChild(translateButton);
      initTranslateButton(translateButton);
     
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

function initTranslateButton(translateButton) {
  async function sendPromptToGemini(prompt, apiKey, retryCount = 0, maxRetries = 3) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1000
          }
        })
      });

      if (!response.ok) {
        if (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
          return sendPromptToGemini(prompt, apiKey, retryCount + 1, maxRetries);
        }
        throw new Error('Failed after max retries');
      }

      return response.json();
    } catch (error) {
      if (retryCount < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return sendPromptToGemini(prompt, apiKey, retryCount + 1, maxRetries);
      }
      throw error;
    }
  }

  translateButton.addEventListener('click', async () => {
    try {
      // Get API key
      const { geminiApiKey } = await chrome.storage.sync.get('geminiApiKey');
      if (!geminiApiKey) {
        alert('API Key belum diatur. Silakan atur di menu extension.');
        return;
      }

      const originalTitle = document.querySelector('#original-title textarea')?.value?.trim() || '';
      const originalDesc = document.querySelector('#original-description textarea')?.value?.trim() || '';
      const targetLang = document.querySelector('.metadata-editor-translated .language-header')?.textContent?.trim() || '';

      if (!originalTitle && !originalDesc) {
        alert('Tidak ada konten yang bisa diterjemahkan');
        return;
      }

      translateButton.disabled = true;
      const originalButtonContent = translateButton.innerHTML;
      translateButton.classList.add('loading');
      translateButton.innerHTML = `
        <svg class="loading-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 3a9 9 0 0 1 9 9" />
        </svg>
        <span>Translating...</span>
      `;

      if (originalTitle) {
        const titlePrompt = `Translatekan judul video ini "${originalTitle}" ke bahasa ${targetLang} sesuai penulisan yang benar, langsung berikan hasil translate tanpa penjelasan apapun.`;
        const titleData = await sendPromptToGemini(titlePrompt, geminiApiKey);
        const translatedTitle = titleData.candidates[0].content.parts[0].text.trim();

        const translatedTitleInput = document.querySelector('#translated-title textarea');
        if (translatedTitleInput) {
          translatedTitleInput.value = translatedTitle;
          translatedTitleInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }

      if (originalDesc) {
        const descPrompt = `Translate deskripsi video ini "${originalDesc}" ke bahasa ${targetLang} sesuai penulisan yang benar dan struktur penulisan yang sama, langsung berikan hasil translate tanpa penjelasan apapun.`;
        const descData = await sendPromptToGemini(descPrompt, geminiApiKey);
        const translatedDesc = descData.candidates[0].content.parts[0].text.trim();

        const translatedDescInput = document.querySelector('#translated-description textarea');
        if (translatedDescInput) {
          translatedDescInput.value = translatedDesc;
          translatedDescInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }

      translateButton.classList.remove('loading');
      translateButton.disabled = false;
      translateButton.innerHTML = originalButtonContent;

    } catch (error) {
      console.error('Translation error:', error);
      alert('Terjemahan gagal. Silakan coba lagi.');
      
      translateButton.classList.remove('loading');
      translateButton.disabled = false; 
      translateButton.innerHTML = originalButtonContent;
    }
  });
}

var replyButtonObserver = new MutationObserver(() => {
  const replyButtons = document.querySelectorAll('ytcp-comment-button#reply-button');
  replyButtons.forEach(addAIReplyButton);

  const publicReplyButtons = document.querySelectorAll('ytd-button-renderer#reply-button-end');
  publicReplyButtons.forEach(addAIReplyPublicButton);
});

var navigationObserver = new MutationObserver(() => {
  if (navigationObserver.previousUrl !== window.location.href) {
    clearSuspiciousWords();
    navigationObserver.previousUrl = window.location.href;
  }
});

var spamDetectionObserver = new MutationObserver(() => {
  if (!spamDetectorEnabled) return;

  const comments = document.querySelectorAll('#content-text');
  let newSuspiciousWords = [];

  for (const comment of comments) {
    const text = comment.textContent;
    if (hasSpamCharacters(text)) {
      const wordsFound = extractSuspiciousWords(text);
      newSuspiciousWords.push(...wordsFound);
      createSpamAlert();
    }
  }

  if (newSuspiciousWords.length > 0) {
    chrome.storage.local.get(['suspiciousWords'], (result) => {
      const existingWords = result.suspiciousWords || [];
      const combinedWords = [...new Set([...existingWords, ...newSuspiciousWords])];
      chrome.storage.local.set({ suspiciousWords: combinedWords });
    });
  }
});

var titleObserver = new MutationObserver(() => {
  addGenerateTitleButton();
});

var descriptionObserver = new MutationObserver(() => {
  addGenerateDescriptionButton();
});

var tagsObserver = new MutationObserver(() => {
  addGenerateTagsButton();
});

var playlistDescriptionObserver = new MutationObserver(() => {
  addGeneratePlaylistDescriptionButton();
});

var publishButtonObserver = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.addedNodes.length) {
      const publishButton = document.querySelector('#footer-row #publish-button');
      if (publishButton && !publishButton.hasAttribute('publish-listener')) {
        publishButton.setAttribute('publish-listener', 'true');
        
        publishButton.addEventListener('click', () => {
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        });
      }
    }
  });
});
async function fetchTrainingData() {
  try {
    const response = await fetch('https://youtube101.id/v1/api/extension/youtube101/data', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      mode: 'cors',
      credentials: 'omit'
    });
    
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    return null;
  }
}

function addVideoTrainingContainer() {
  let isProcessing = false;
  let hasFetched = false; 
  const observer = new MutationObserver(async (mutations) => {
    if (isProcessing || document.querySelector('.bt-video-training-container') || hasFetched) {
      return;
    }

    const eligibilityBasics = document.querySelector('ytpp-eligibility-basics.style-scope.ytpp-signup-overview');
    const firstCard = eligibilityBasics?.querySelector('ytcp-card.style-scope.ytpp-eligibility-basics');

    if (eligibilityBasics && firstCard) {
      isProcessing = true;
      hasFetched = true;
      try {
        const data = await fetchTrainingData();
      
        if (!data || data.status !== 'success' || !data.data.monetization.isActive) {
          observer.disconnect();
          return;
        }

        if (!document.querySelector('.bt-video-training-container')) {
          const { monetization } = data.data;
          const trainingContainer = document.createElement('ytcp-card');
          trainingContainer.className = 'style-scope ytpp-eligibility-basics bt-video-training-container';
          trainingContainer.setAttribute('modern', '');

          trainingContainer.innerHTML = `
          <tp-yt-paper-card elevation="0" class="style-scope ytcp-card">
            <div id="container" class="style-scope ytcp-card">
              <div id="content" class="style-scope ytcp-card">
                <div class="channel-review-header style-scope ytpp-eligibility-basics" style="display: flex; justify-content: space-between; align-items: center;">
                  <div class="channel-review-section-header-text style-scope ytpp-eligibility-basics">
                    Tips YouTube
                  </div>
                  <a href="${monetization.creator_url}" target="_blank" class="bt-badge-training">by ${monetization.creator_name}</a>
                </div>
                <div class="channel-review-body style-scope ytpp-eligibility-basics" style="margin-bottom: 0px;">
                  <style>.bt-video-link-training::before {
                      height: 96%;
                  }</style>
                  <a href="${monetization.videoUrl}" target="_blank" class="bt-video-link-training">
                    <img src="${monetization.thumbnailUrl}" alt="Video Tutorial" class="bt-video-thumbnail-training">
                  </a>
                  <div class="bt-video-desc-training title">
                    ${monetization.title}
                  </div>
                  <div class="bt-video-desc-training">
                    ${monetization.description}
                  </div>
                </div>
              </div>
            </div>
          </tp-yt-paper-card>
          `;

          firstCard.insertAdjacentElement('afterend', trainingContainer);
        }
      } catch {
        observer.disconnect();
      } finally {
        isProcessing = false;
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  return () => {
    observer.disconnect();
  };
}

function addDashboardTrainingContainer() {
  let isProcessing = false;
  let hasFetched = false;

  const observer = new MutationObserver(async (mutations) => {
    if (isProcessing || document.querySelector('.bt-dashboard-training-container') || hasFetched) {
      return;
    }

    const dashboardColumns = document.querySelectorAll('ytcd-card-column.column.style-scope.ytcd-channel-dashboard');
    const targetColumn = dashboardColumns[2];
    
    if (!targetColumn) return;

    const ideasCards = targetColumn.querySelectorAll('ytcd-card[test-id="channel-dashboard-ideas-card"]');
    if (!ideasCards.length) return;

    const lastIdeasCard = ideasCards[ideasCards.length - 1];
    
    isProcessing = true;
    hasFetched = true;

    setTimeout(async () => {
      try {
        const data = await fetchTrainingData();
        
        if (!data || data.status !== 'success' || !data.data.dashboard.isActive) {
          observer.disconnect();
          return;
        }

        const { dashboard } = data.data;

        const trainingCard = document.createElement('ytcd-card');
        trainingCard.className = 'card style-scope ytcd-card-column bt-dashboard-training-container';
        trainingCard.setAttribute('modern', '');

        trainingCard.innerHTML = `
          <div id="card-content" class="card style-scope ytcd-card" style="padding: 10px 0px !important;">
            <div class="header style-scope ytcd-basic-card" style="padding: 16px 24px 5px 24px;">
              <div class="title-text style-scope ytcd-basic-card">Creator Academy</div>
              <a href="${dashboard.creator_url}" target="_blank" class="bt-badge-training" style="margin-bottom: 0px !important;">by ${dashboard.creator_name}</a>
            </div>
            <div class="body style-scope ytcd-basic-card">
              <a href="${dashboard.videoUrl}" target="_blank" class="bt-video-link-training">
                <img src="${dashboard.thumbnailUrl}" alt="Video Tutorial" class="bt-video-thumbnail-training" style="max-width: 500px;">
              </a>
              <div class="bt-video-desc-training title">
                ${dashboard.title}
              </div>
              <div class="bt-video-desc-training">
                ${dashboard.description}
              </div>
            </div>
          </div>
        `;

        lastIdeasCard.insertAdjacentElement('afterend', trainingCard);
      } catch {
        observer.disconnect();
      } finally {
        setTimeout(() => {
          isProcessing = false;
        }, 1000);
      }
    }, 2000);
  });

  const dashboardContainer = document.querySelector('ytcd-channel-dashboard');
  if (dashboardContainer) {
    observer.observe(dashboardContainer, {
      childList: true,
      subtree: true
    });
  }
}

function initContentRecommendation(accordionContainer) {
  const similarContentBtn = accordionContainer.querySelector('.bt-generate-recommendation');
  const statusMessage = accordionContainer.querySelector('.bt-status-message');
  const panelContent = accordionContainer.querySelector('.bt-panel-content');

  async function sendPromptToGemini(prompt, apiKey, retryCount = 0, maxRetries = 3) {
    try {
      if (retryCount > 0) {
        statusMessage.textContent = `Mencoba ulang... (${retryCount}/${maxRetries})`;
        statusMessage.className = 'bt-status-message';
      }

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.9,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1000
          }
        })
      });

      if (!response.ok) {
        if (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
          return sendPromptToGemini(prompt, apiKey, retryCount + 1, maxRetries);
        }
        throw new Error('Failed after max retries');
      }

      return response.json();
    } catch (error) {
      if (retryCount < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return sendPromptToGemini(prompt, apiKey, retryCount + 1, maxRetries);
      }
      throw error;
    }
  }

  similarContentBtn.addEventListener('click', async () => {
    try {
      const { geminiApiKey } = await chrome.storage.sync.get('geminiApiKey');
      if (!geminiApiKey) {
        alert('Please set your Gemini API key first');
        return;
      }

      similarContentBtn.classList.add('loading');
      similarContentBtn.disabled = true;
      const originalContent = similarContentBtn.innerHTML;
      similarContentBtn.innerHTML = `
        <svg class="loading-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 3a9 9 0 0 1 9 9" />
        </svg>
        <span>Generating...</span>
      `;

      const titleElement = document.querySelector('#title h1 yt-formatted-string');
      const descriptionElement = document.querySelector('#description yt-formatted-string');
      
      const videoTitle = titleElement?.textContent?.trim() || '';
      const videoDescription = descriptionElement?.textContent?.trim() || '';

      if (!videoTitle) {
        statusMessage.textContent = '× Tidak dapat membaca judul video';
        statusMessage.className = 'bt-status-message error';
        setTimeout(() => {
          statusMessage.textContent = '';
        }, 3000);
        return;
      }

      const recommendationPrompt = `As a YouTube Content Strategist, suggest 5 video ideas based on this content:

      Video Title: "${videoTitle}"
      Video Description: "${videoDescription}"

      For each suggestion:
      1. Give me engaging title (max 60 chars) with casual language style
      2. Give an konsep of ​​what kind of video should be made based on this title (2-3 lines)
      3. Focus on similar topics but with unique angles
      4. Use the same language as the video Title

      Output Format:
      {
        "recommendations": [
          {
            "title": "Video title here",
            "description": "Video konsep here"
          }
        ]
      }`;

      const data = await sendPromptToGemini(recommendationPrompt, geminiApiKey);
      
      let cleanResponse = data.candidates[0].content.parts[0].text
        .replace(/```json\n|\n```/g, '')
        .replace(/,(\s*})/g, '$1');

      const recommendations = JSON.parse(cleanResponse);
      panelContent.innerHTML = '';
      recommendations.recommendations.forEach((item, index) => {
        const recommendationItem = document.createElement('div');
        recommendationItem.className = 'bt-recommendation-item';
        recommendationItem.innerHTML = `
          <div class="bt-recommendation-number">${index + 1}</div>
          <div class="bt-recommendation-content">
            <div class="bt-recommendation-title">${item.title}</div>
            <div class="bt-recommendation-description">${item.description}</div>
          </div>
        `;
        panelContent.appendChild(recommendationItem);
      });

      const panel = accordionContainer.querySelector('.bt-panel');
      const suggestionsToggle = accordionContainer.querySelector('.bt-suggestions-toggle');
      panel.style.maxHeight = panel.scrollHeight + "px";
      suggestionsToggle.classList.add('expanded');

      statusMessage.textContent = '✓ Sukses';
      statusMessage.className = 'bt-status-message success';
      setTimeout(() => {
        statusMessage.textContent = '';
      }, 3000);

      similarContentBtn.classList.remove('loading');
      similarContentBtn.disabled = false;
      similarContentBtn.innerHTML = originalContent;

    } catch (error) {

      statusMessage.textContent = '× Gagal, coba lagi!';
      statusMessage.className = 'bt-status-message error';
      setTimeout(() => {
        statusMessage.textContent = '';
      }, 3000);

      similarContentBtn.classList.remove('loading');
      similarContentBtn.disabled = false;
      similarContentBtn.innerHTML = originalContent;
    }
  });
}

function addContentRecommendationAccordion() {
  const secondaryInner = document.querySelector('#secondary-inner');
  const relatedChipCloud = document.querySelector('yt-related-chip-cloud-renderer');
  
  if (!secondaryInner || document.querySelector('.bt-content-recommendation-wrapper')) return;

  const accordionContainer = document.createElement('div');
  accordionContainer.className = 'bt-content-recommendation-wrapper';
  
  accordionContainer.innerHTML = `
    <div class="bt-accordion-container">
      <div class="bt-generate-header">
        <div class="bt-generate-wrapper">
          <button class="bt-generate-recommendation">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 18a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm0 -12a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm-7 12a6 6 0 0 1 6 -6a6 6 0 0 1 -6 -6a6 6 0 0 1 -6 6a6 6 0 0 1 6 6z"/>
            </svg>
            <span>Similar Content</span>
          </button>
          <span class="bt-status-message"></span>
        </div>
        <div class="bt-header-controls">
          <div class="bt-suggestions-toggle">
            
            <svg class="bt-arrow-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </div>
        </div>
      </div>
      <div class="bt-panel">
        <div class="bt-panel-content">
          <div class="bt-empty-state">
            <div class="bt-empty-message">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="background: #7d7d7d21; padding: 10px; border-radius: 20px; width: 20px; height: 20px;">
                <path stroke="none" d="M0 0h24H0z" fill="none"/>
                <path d="M9 5h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2h-2"/>
                <path d="M9 3m0 2a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v0a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2z"/>
                <path d="M9 12h6"/>
                <path d="M9 16h6"/>
              </svg>
              <span style="font-size:12px;">Klik tombol <b>Similar Content</b> untuk melihat rekomendasi konten.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  if (relatedChipCloud && relatedChipCloud.parentNode) {
    relatedChipCloud.parentNode.insertBefore(accordionContainer, relatedChipCloud);
  }

  const suggestionsToggle = accordionContainer.querySelector('.bt-suggestions-toggle');
  const panel = accordionContainer.querySelector('.bt-panel');
  const similarContentBtn = accordionContainer.querySelector('.bt-generate-recommendation');

  suggestionsToggle.addEventListener('click', () => {
    const isExpanded = panel.style.maxHeight;
    if (isExpanded) {
      panel.style.maxHeight = null;
      suggestionsToggle.classList.remove('expanded');
    } else {
      panel.style.maxHeight = panel.scrollHeight + "px";
      suggestionsToggle.classList.add('expanded');
    }
  });

  initContentRecommendation(accordionContainer);
}

var contentRecommendationObserver = new MutationObserver((mutations) => {
  const secondaryInner = document.querySelector('#secondary-inner');
  const relatedChipCloud = document.querySelector('yt-related-chip-cloud-renderer');
  
  if (secondaryInner && relatedChipCloud && !document.querySelector('.bt-content-recommendation-wrapper')) {
    addContentRecommendationAccordion();
  }
});

if (!window.observersInitialized) {
  replyButtonObserver.observe(document.body, {
    childList: true,
    subtree: true
  });

  navigationObserver.observe(document.querySelector('body'), {
    childList: true,
    subtree: true
  });

  spamDetectionObserver.observe(document.body, {
    childList: true,
    subtree: true
  });

  titleObserver.observe(document.body, {
    childList: true,
    subtree: true
  });

  descriptionObserver.observe(document.body, {
    childList: true,
    subtree: true
  });

  tagsObserver.observe(document.body, {
    childList: true,
    subtree: true
  });

  playlistDescriptionObserver.observe(document.body, {
    childList: true,
    subtree: true
  });

  publishButtonObserver.observe(document.body, {
    childList: true,
    subtree: true
  });

  addVideoTrainingContainer();
  addDashboardTrainingContainer();
  addContentRecommendationAccordion();

  navigationObserver.previousUrl = window.location.href;
  window.observersInitialized = true;
}
checkSpamDetectorStatus();
setTimeout(() => {
  const replyButtons = document.querySelectorAll('ytcp-comment-button#reply-button');
  replyButtons.forEach(addAIReplyButton);

  const publicReplyButtons = document.querySelectorAll('ytd-button-renderer#reply-button-end');
  publicReplyButtons.forEach(addAIReplyPublicButton);
  
  addGenerateTitleButton();
  addGenerateDescriptionButton();
  addGenerateTagsButton();
  addGeneratePlaylistDescriptionButton();
  addTranslateButton();
  addContentRecommendationAccordion();
}, 1000);

chrome.storage.onChanged.addListener((changes) => {
  if (changes.spamDetectorEnabled) {
    spamDetectorEnabled = changes.spamDetectorEnabled.newValue;
    
    if (!spamDetectorEnabled) {
      const existingAlert = document.querySelector('.spam-alert-tab');
      if (existingAlert) {
        existingAlert.remove();
      }
    }
  }
});