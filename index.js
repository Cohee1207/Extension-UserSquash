const { eventSource, event_types } = SillyTavern.getContext();

const localStorageKey = 'user_squash_enabled';
let isEnabled = localStorage.getItem(localStorageKey) === 'true';

let lastChatSnapshot = null;
const wordsCache = new Map();
const nullify = () => {
    lastChatSnapshot = null;
};
const getAllWords = x => {
    if (wordsCache.has(x)) {
        return wordsCache.get(x);
    }
    const value = x.split(/\s/).map(x => x.trim().toLowerCase().normalize().replace(/[^\p{L}\p{N}]/gu, '')).filter(x => x.length > 0).join(' ');
    wordsCache.set(x, value);
    return value;
}

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

function saveChatSnapshot(chat) {
    if (!isEnabled || !Array.isArray(chat)) {
        return nullify();
    }

    lastChatSnapshot = chat.map(x => x.mes);
}


function areRoughlySame(a, b) {
    // Split by word boundaries, remove non-alphanumeric characters, and normalize
    const aWords = getAllWords(a);
    const bWords = getAllWords(b);

    return aWords.includes(bWords) || bWords.includes(aWords);
}

function squashChatMessages({ chat, dryRun }) {
    if (dryRun || !isEnabled || !Array.isArray(chat) || !Array.isArray(lastChatSnapshot)) {
        return nullify();
    }

    const toSquash = [];

    // Find all memoized chat messages in the prompt manager completion prompt
    let lastProcessedIndex = 0;

    while (lastChatSnapshot.length > 0) {
        const currentMessage = lastChatSnapshot.shift();

        // Start iterating from the last processed index
        for (let i = lastProcessedIndex; i < chat.length; i++) {
            const promptMessage = chat[i];
            if (promptMessage.role === 'system' || typeof promptMessage.content !== 'string' || !areRoughlySame(promptMessage.content, currentMessage)) {
                continue;
            }
            toSquash.push(promptMessage);
            lastProcessedIndex = i + 1;
            break;
        }
    }

    // Not enough messages to squash
    if (toSquash.length < 2) {
        return nullify();
    }

    const squashedMessage = {
        role: 'user',
        content: toSquash.map(x => x.content).join('\n\n'),
    };

    // Should insert after the last message to squash
    const squashPosition = chat.indexOf(toSquash[toSquash.length - 1]) + 1;
    chat.splice(squashPosition, 0, squashedMessage);

    // Mutate the completion by removing the squashed messages
    toSquash.forEach(x => chat.splice(chat.indexOf(x), 1));

    return nullify();
}

updateButton();
window['extension_userSquash'] = saveChatSnapshot;

eventSource.makeFirst(event_types.CHAT_COMPLETION_PROMPT_READY, squashChatMessages);
eventSource.on(event_types.CHAT_CHANGED, () => { nullify(); wordsCache.clear(); });
eventSource.on(event_types.ONLINE_STATUS_CHANGED, nullify);
eventSource.on(event_types.GENERATION_ENDED, nullify);
eventSource.on(event_types.GENERATION_STOPPED, nullify);
