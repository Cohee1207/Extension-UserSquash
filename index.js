// import { getTokenCountAsync } from '../../../tokenizers.js';

const { eventSource, event_types, getTokenCount } = SillyTavern.getContext();

const localStorageKey = 'user_squash_enabled';
let isEnabled = localStorage.getItem(localStorageKey) === 'true';

const button = document.createElement('div');
const icon = document.createElement('i');
icon.className = 'fa-solid fa-comment';
const text = document.createElement('span');
text.textContent = 'Enable User Squash';
button.appendChild(icon);
button.appendChild(text);
button.addEventListener('click', () => {
    isEnabled = !isEnabled;
    updateButton();
});

const container = document.getElementById('extensionsMenu');
container.appendChild(button);

function updateButton() {
    localStorage.setItem(localStorageKey, isEnabled);
    text.textContent = isEnabled ? 'Disable User Squash' : 'Enable User Squash';
    icon.classList.toggle('fa-comments', isEnabled);
    icon.classList.toggle('fa-comment', !isEnabled);
}

async function squashChat(chat, maxContext) {
    if (!isEnabled) {
        return;
    }

    if (!Array.isArray(chat)) {
        return;
    }

    if (chat.length === 0) {
        return;
    }

    const { name1 } = SillyTavern.getContext();

    /*
    // The way this decides on what is the token limit is currently broken. It does not consider character description and other extensions. Only the raw full capacity of context minus response.
    // The easiest way would be to manually get all data card fields and extension prompts and combine it together to get a closer approximation of a biggest message that could fit your context.
    // That would not consider prompt manager extensions however. And world info entries; because, they are calculated after the interceptor runs.

    const linesToInclude = [];

    let totalTokens = 0;
    for (let i = chat.length - 1; i >= 0; i--) {
        const line = chat[i].mes;
        if (line) {
            const lineTokens = await getTokenCountAsync(i === 0 ? line : '\n\n' + line);
            if (totalTokens + lineTokens > maxContext) {
                break;
            }
            totalTokens += lineTokens;
            linesToInclude.unshift(line);
        }
    }

    const messageText = linesToInclude.join('\n\n');
    */

    let messageText = '', line;
    for (let i = 0; i < chat.length; i++) {
        if ((line = chat[i].mes).length === 0) continue;
        messageText.length !== 0 && (messageText += '\n\n');
        messageText += line;
    }

    const message = {
        name: name1,
        mes: messageText,
        is_user: true,
        is_system: false,
        extra: {},
        send_date: Date.now(),
    };

    chat.splice(0, chat.length);
    chat.push(message);
}

updateButton();
window['extension_userSquash'] = squashChat;
