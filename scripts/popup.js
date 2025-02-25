document.addEventListener('DOMContentLoaded', async () => {
    const apiInput = document.getElementById('gemini-api');
    const toggleApiBtn = document.getElementById('toggle-api');
    const saveApiBtn = document.getElementById('save-api');
    const languageStyle = document.getElementById('language-style');
    const autoLoveToggle = document.getElementById('auto-love');
    const spamDetectorToggle = document.getElementById('spam-detector');
    const textarea = document.getElementById('suspiciousWords');
    
    chrome.storage.sync.get(['geminiApiKey'], function(result) {
        if (result.geminiApiKey) {
            apiInput.value = result.geminiApiKey;
        }
    });
    chrome.storage.sync.get(['languageStyle'], function(result) {
        if (result.languageStyle) {
            languageStyle.value = result.languageStyle;
        } else {
            languageStyle.value = 'standar';
            chrome.storage.sync.set({ languageStyle: 'standar' });
        }
    });
    chrome.storage.sync.get(['autoLove'], function(result) {
        autoLoveToggle.checked = result.autoLove || false;
    });
    try {
        const result = await chrome.storage.sync.get('spamDetectorEnabled');
        spamDetectorToggle.checked = result.spamDetectorEnabled ?? false;
        if (!result.hasOwnProperty('spamDetectorEnabled')) {
            await chrome.storage.sync.set({ spamDetectorEnabled: false });
        }
    } catch (error) {
        console.error('Error loading spam detector setting:', error);
        spamDetectorToggle.checked = false;
    }
    setTimeout(() => {
        chrome.storage.local.get(['suspiciousWords'], (result) => {
            if (result.suspiciousWords && result.suspiciousWords.length > 0) {
                textarea.value = result.suspiciousWords.join(', ');
            } else {
                textarea.value = '';
            }
        });
    }, 100);
    toggleApiBtn.addEventListener('click', function() {
        if (apiInput.type === 'password') {
            apiInput.type = 'text';
            toggleApiBtn.innerHTML = '<i class="ti ti-eye-off"></i>';
        } else {
            apiInput.type = 'password';
            toggleApiBtn.innerHTML = '<i class="ti ti-eye"></i>';
        }
    });
    saveApiBtn.addEventListener('click', async function() {
        const apiKey = apiInput.value.trim();
        
        if (!apiKey) {
            showMessage('API Key tidak boleh kosong!', 'error');
            return;
        }
        saveApiBtn.disabled = true;
        const originalText = saveApiBtn.innerHTML;
        saveApiBtn.innerHTML = '<i class="ti ti-loader ti-spin"></i><span>Checking</span>';

        try {
            const isValid = await testGeminiAPI(apiKey);
            
            if (isValid) {
                chrome.storage.sync.set({ geminiApiKey: apiKey }, function() {
                    showMessage('API Key berhasil disimpan!', 'success');
                    saveApiBtn.innerHTML = '<span>Tersimpan!</span>';
                    setTimeout(() => {
                        saveApiBtn.innerHTML = originalText;
                        saveApiBtn.disabled = false;
                    }, 2000);
                });
            } else {
                throw new Error('Invalid API Key');
            }
        } catch (error) {
            showMessage('API Key tidak valid atau terjadi kesalahan!', 'error');
            saveApiBtn.innerHTML = originalText;
            saveApiBtn.disabled = false;
        }
    });
    languageStyle.addEventListener('change', function() {
        chrome.storage.sync.set({ languageStyle: this.value });
    });
    autoLoveToggle.addEventListener('change', function() {
        chrome.storage.sync.set({ autoLove: this.checked });
    });
    spamDetectorToggle.addEventListener('change', async () => {
        try {
            await chrome.storage.sync.set({
                spamDetectorEnabled: spamDetectorToggle.checked
            });
        } catch (error) {
            console.error('Error saving spam detector setting:', error);
        }
    });
    const clearBtn = document.getElementById('clearSuspiciousWords');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            chrome.storage.local.set({ suspiciousWords: [] });
            textarea.value = '';
        });
    }
    async function testGeminiAPI(apiKey) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.0-pro:generateContent?key=${apiKey}`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: "Hi" }]
                }]
            })
        });

        return response.ok;
    }
    function showMessage(message, type) {
        const existingMsg = document.querySelector('.message');
        if (existingMsg) {
            existingMsg.remove();
        }
        const messageEl = document.createElement('div');
        messageEl.className = `message ${type}`;
        messageEl.innerHTML = `
            <i class="ti ${type === 'success' ? 'ti-circle-check' : 'ti-alert-circle'}"></i>
            <span>${message}</span>
        `;
        const card = document.querySelector('.api-key-section');
        if (card) {
            card.appendChild(messageEl);
        }
        setTimeout(() => {
            messageEl.remove();
        }, 3000);
    }
    const checkbox = document.getElementById('spam-detector');
    const copyButton = document.getElementById('copyButton');
    textarea.style.display = checkbox.checked ? 'block' : 'none';
    copyButton.style.display = checkbox.checked ? 'block' : 'none';
    const updateContainer = document.getElementById('updateContainer');
    const updateWrapper = document.querySelector('.update-wrapper');
    
    try {
        const manifestData = chrome.runtime.getManifest();
        const currentVersion = manifestData.version;
        const response = await fetch('https://youtube101.id/v1/api/extension/youtube101/data');
        const data = await response.json();
        
        if (data?.updateInfo) {
            const { version, message, hasUpdate, updateUrl } = data.updateInfo;
            
            if (version !== currentVersion && hasUpdate) {
                updateContainer.style.display = 'flex';
                
                if (message.includes('<div')) {
                    updateWrapper.innerHTML = message;
                } else {
                    updateWrapper.innerHTML = `
                        <div class="update-content">
                            <i class="ti ti-progress-check"></i>
                            <span>${message || 'Versi baru tersedia'}</span>
                        </div>
                        <a href="${updateUrl}" target="_blank" class="update-button">
                            <span>Update</span>
                        </a>
                    `;
                }
            } else {
                updateContainer.style.display = 'none';
            }
        }
    } catch (error) {
        updateContainer.style.display = 'none';
    }
});

document.getElementById('spam-detector').addEventListener('change', function() {
    const textarea = document.getElementById('suspiciousWords');
    const copyButton = document.getElementById('copyButton');
    textarea.style.display = this.checked ? 'block' : 'none';
    copyButton.style.display = this.checked ? 'block' : 'none';
});
document.getElementById('copyButton').addEventListener('click', async function() {
    const textarea = document.getElementById('suspiciousWords');
    const tooltip = this.querySelector('.copy-tooltip');
    
    try {
        await navigator.clipboard.writeText(textarea.value);
        tooltip.textContent = 'Disalin';
        setTimeout(() => {
            tooltip.textContent = 'Salin Kata';
        }, 2000);
    } catch (err) {
        console.error('Failed to copy text: ', err);
    }
});

document.addEventListener('contextmenu', event => event.preventDefault());