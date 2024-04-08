const socket = io('ws://localhost:3200')

const msgInput = document.querySelector('#message')
let nameInput;
const emailInput = document.querySelector('#email')
const passwordInput = document.querySelector('#password')
const activity = document.querySelector('.activity')
const roomList = document.querySelector('.room-list')
const chatDisplay = document.querySelector('.chat-display')
const formMsgDisplay = document.querySelector('.form-msg');
const formLoginDisplay = document.querySelector('.form-login');


function sendMessage(e) {
    e.preventDefault()
    if (nameInput && msgInput.value) {
        socket.emit('message', {
            name: nameInput,
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

// Listen for messages
socket.on("message", (data) => {
    activity.textContent = ""
    const { name, text, time } = data
    const li = document.createElement('li')
    li.className = 'post'
    if (name === nameInput) li.className = 'post post--left'
    if (name !== nameInput && name !== 'Admin') li.className = 'post post--right'
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
})

socket.on("updateUserName", (data) => {
    const { name } = data;
    nameInput = name;
    formMsgDisplay.style = '';
    formLoginDisplay.style.display = 'none';
    roomList.innerHTML = '';

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

function showLoginError(message) {
    roomList.textContent = ''
    if (message) {
        roomList.innerHTML = '<em>Errors:</em>'
        roomList.textContent += ` ${message}`
    }
}
