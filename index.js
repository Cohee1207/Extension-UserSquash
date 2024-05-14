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

    const allChatLines = chat.map(x => x.mes).filter(x => x).join('\n\n').split('\n').reverse();

    const linesToInclude = [];

    for (const line of allChatLines) {
        if (line) {
            const text = linesToInclude.join('\n') + '\n' + line;
            const count = getTokenCount(text);
            if (count >= maxContext) {
                break;
            }
        }
        linesToInclude.push(line);
    }

    const messageText = linesToInclude.reverse().join('\n');
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
