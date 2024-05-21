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
const locationCheckbox = document.querySelector('#locationCheckbox');
const latitudeInput = document.querySelector('#latitudeInput');
const longitudeInput = document.querySelector('#longitudeInput');
const roadConditionCheckbox = document.querySelector('#roadConditionCheckbox');
const roadConditionType = document.querySelector('#roadConditionType');
const chatContainer = document.querySelector('#chatContainer');


// Initialize the map
const map = L.map('map').setView([-29.8522845, 30.8551468], 20); // Set the initial view to a specific location and zoom level

// Add a tile layer (you can use any tile provider)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

function sendMessage(e) {
    e.preventDefault();
    if (nameInput && msgInput.value) {
        const messageType = 'text';
        let messageData = {
            name: nameInput,
            recipientId: recipientUserId,
            text: msgInput.value,
            messageType: messageType,
        };

        // Check if location is enabled
        if (locationCheckbox.checked) {
            const latitude = parseFloat(latitudeInput.value);
            const longitude = parseFloat(longitudeInput.value);
            if (!isNaN(latitude) && !isNaN(longitude)) {
                messageData.location = [latitude, longitude];
                messageData.messageType = 'location';
            } else {
                console.error('Invalid latitude or longitude input');
            }
        }

        // Check if road condition is enabled
        if (roadConditionCheckbox.checked) {
            const roadCondition = roadConditionType.value;
            messageData.roadCondition = roadCondition;
            socket.emit('reportRoadCondition', messageData.roadCondition, messageData.text, messageData.location);
        } else {
            socket.emit('message', messageData);
        }
        msgInput.value = "";
    }
    msgInput.focus();
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

document.querySelector('#locationCheckbox').addEventListener('change', function() {
    const locationInputs = document.querySelector('#locationInputs');
    if (this.checked) {
        locationInputs.style.display = 'block';
    } else {
        locationInputs.style.display = 'none';
    }
});

document.querySelector('#roadConditionCheckbox').addEventListener('change', function() {
    const roadConditionInputs = document.querySelector('#roadConditionInputs');
    if (this.checked) {
        roadConditionInputs.style.display = 'block';
    } else {
        roadConditionInputs.style.display = 'none';
    }
});

userConnectionsDropdown.addEventListener('change', (event) => {
    const selectedUserId = event.target.value;
    socket.emit('getChatHistory', { recipientId: selectedUserId });
    recipientUserId = selectedUserId;
});

// Listen for messages
socket.on("message", (data) => {
    activity.textContent = ""
    const { name, text, time, possibleCommonSpots } = data
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

    if (possibleCommonSpots && possibleCommonSpots.length > 0) {
        possibleCommonSpots.forEach(commonSpot => {
            const li = document.createElement('li');
            li.className = 'post';
            if (name === nameInput) {
                li.classList.add('post--right');
            } else {
                li.classList.add('post--left');
            }
            li.innerHTML = `<div class="post__header post__header--reply-spot">
                <span class="post__header--name">Common Spot</span>
                </div>
                <div class="post__text">${commonSpot?.name}</div>`
            chatDisplay.appendChild(li);
            // Extract latitude and longitude from the road condition object
            const { location, name: placeName, description } = commonSpot;
            console.log(location, placeName, description);

            // Create a marker for the road condition
            const marker = L.marker([location.coordinates[1], location.coordinates[0]]).addTo(map);

            // Add a popup with road condition details
            marker.bindPopup(`<b>${placeName}</b><br>${description}`).openPopup();
        });
    }

    chatDisplay.scrollTop = chatDisplay.scrollHeight
});

socket.on("chatHistory", (history) => {
    // Clear previous chat messages
    chatDisplay.innerHTML = '';

    // Display chat history in the UI
    history.forEach(chat => {
        const { sender, content, createdAt, senderName, possibleCommonSpots } = chat;
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
        if (possibleCommonSpots && possibleCommonSpots.length > 0){
            possibleCommonSpots.forEach(commonSpot => {
                const li = document.createElement('li');
                li.className = 'post';
                if (sender === currentUserId) {
                    li.classList.add('post--right');
                } else {
                    li.classList.add('post--left');
                }                li.innerHTML = `<div class="post__header post__header--reply-spot">
                <span class="post__header--name">Common Spot</span>
                </div>
                <div class="post__text">${commonSpot?.name}</div>`

                // console.log(commonSpot?.name);
                chatDisplay.appendChild(li);
                // Extract latitude and longitude from the road condition object
                const { location, name, description } = commonSpot;
                console.log(location, name, description);

                // Create a marker for the road condition
                const marker = L.marker([location.coordinates[1], location.coordinates[0]]).addTo(map);

                // Add a popup with road condition details
                marker.bindPopup(`<b>${name}</b><br>${description}`).openPopup();
            });
        }
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
    chatContainer.style.display = 'block'; // Show chat screen
});


function showLoginError(message) {
    roomList.textContent = ''
    if (message) {
        roomList.innerHTML = '<em>Errors:</em>'
        roomList.textContent += ` ${message}`
    }
}
