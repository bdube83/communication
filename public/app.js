const socket = io('ws://localhost:3200')

const msgInput = document.querySelector('#message')
let nameInput;
let currentUserId;
let recipientUserId;
const emailInput = document.querySelector('#email')
const passwordInput = document.querySelector('#password')
const activity = document.querySelector('.activity')
const roomList = document.querySelector('.room-list')
const chatDisplay = document.querySelector('.chat-display')
const formMsgDisplay = document.querySelector('.form-msg');
const formLoginDisplay = document.querySelector('.form-login');
const userConnectionsDropdown = document.querySelector('#userConnections'); // Select the user connections dropdown

function sendMessage(e) {
    e.preventDefault()
    if (nameInput && msgInput.value) {
        socket.emit('message', {
            name: nameInput,
            recipientId: recipientUserId,
            text: msgInput.value

        })
        msgInput.value = ""
    }
    msgInput.focus()
}

function enterRoom(e) {
    e.preventDefault()
    if (emailInput.value && passwordInput.value) {
        socket.emit('enterRoom', {
            email: emailInput.value,
            password: passwordInput.value
        })
    }
}

document.querySelector('.form-msg')
    .addEventListener('submit', sendMessage)

document.querySelector('.form-login')
    .addEventListener('submit', enterRoom)

msgInput.addEventListener('keypress', () => {
    socket.emit('activity', nameInput)
})

userConnectionsDropdown.addEventListener('change', (event) => {
    const selectedUserId = event.target.value;
    socket.emit('getChatHistory', { recipientId: selectedUserId });
    recipientUserId = selectedUserId;
});

// Listen for messages
socket.on("message", (data) => {
    activity.textContent = ""
    const { name, text, time } = data
    const li = document.createElement('li')
    li.className = 'post'
    if (name === nameInput) li.className = 'post post--right'
    if (name !== nameInput && name !== 'Admin') li.className = 'post post--left'
    if (name !== 'Admin') {
        li.innerHTML = `<div class="post__header ${name === nameInput
            ? 'post__header--user'
            : 'post__header--reply'
        }">
        <span class="post__header--name">${name}</span>
        <span class="post__header--time">${time}</span>
        </div>
        <div class="post__text">${text}</div>`
    } else {
        li.innerHTML = `<div class="post__text">${text}</div>`
    }
    document.querySelector('.chat-display').appendChild(li)

    chatDisplay.scrollTop = chatDisplay.scrollHeight
});

socket.on("chatHistory", (history) => {
    // Clear previous chat messages
    chatDisplay.innerHTML = '';

    // Display chat history in the UI
    history.forEach(chat => {
        const { sender, content, createdAt, senderName, recipientName } = chat;
        const li = document.createElement('li');
        li.className = 'post';
        const name = senderName

        // Determine the message alignment based on sender
        if (sender === currentUserId) {
            li.classList.add('post--right');
        } else {
            li.classList.add('post--left');
        }

        li.innerHTML = `<div class="post__header ${sender === currentUserId
            ? 'post__header--user'
            : 'post__header--reply'
        }">
        <span class="post__header--name">${name}</span> 
        <span class="post__header--time">${createdAt}</span> 
        </div>
        <div class="post__text">${content}</div>`

        // Append the message to the chat display
        chatDisplay.appendChild(li);
    });

    // Scroll to the bottom of the chat display
    chatDisplay.scrollTop = chatDisplay.scrollHeight;
});


socket.on("updateUserName", (data) => {
    const { name, userId } = data;
    currentUserId = userId;
    console.log(`Update User ${currentUserId}`)
    nameInput = name;
    formMsgDisplay.style = '';
    formLoginDisplay.style.display = 'none';
    roomList.innerHTML = '';
    socket.emit('getConnectedUsers', { userId });
})

let activityTimer
socket.on("activity", (name) => {
    activity.textContent = `${name} is typing...`

    // Clear after 3 seconds
    clearTimeout(activityTimer)
    activityTimer = setTimeout(() => {
        activity.textContent = ""
    }, 3000)
})

socket.on('loginError', ({ message }) => {
    showLoginError(message)
})

socket.on('connectedUsers', (connections) => {
    userConnectionsDropdown.innerHTML = ''; // Clear previous options
    connections.forEach(connection => {
        const option = document.createElement('option');
        option.value = connection._id; // Assuming connection has an 'id' property
        option.textContent = connection.name; // Assuming connection has a 'name' property
        userConnectionsDropdown.appendChild(option);
    });
    socket.emit('getChatHistory', { recipientId: connections[0]?._id });
    recipientUserId = connections[0]?._id;

    userConnectionsDropdown.style.display = 'block'; // Show the drop-down after populating options
});


function showLoginError(message) {
    roomList.textContent = ''
    if (message) {
        roomList.innerHTML = '<em>Errors:</em>'
        roomList.textContent += ` ${message}`
    }
}
