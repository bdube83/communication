// Define functions or classes related to Socket.IO handling

// Constant representing the admin user
const ADMIN = "Admin";

// State object managing users in the application
const UsersState = {
    users: [],
    /**
     * Sets the users array to a new array.
     * @param {Array} newUsersArray - The new array of users.
     */
    setUsers: function (newUsersArray) {
        this.users = newUsersArray
    }
}

/**
 * Handles the socket connection event.
 * @param {object} socket - The socket object representing the connection.
 * @param {object} io - The Socket.IO server instance.
 */
function handleSocketConnection(socket, io) {
    console.log(`User ${socket.id} connected`);

    welcomeUser(socket);



    socket.on('enterRoom', async ({email, password}) => {
        await handleRoomEntry(socket, io, email, password);
    });

    socket.on('disconnect', () => {
        handleDisconnect(socket, io);
    });

    socket.on('message', async ({name, recipientId, text, messageType, location}) => {
        await handleMessage(socket, name, recipientId, text, io, messageType, location);
    });

    socket.on('activity', (name) => {
        handleActivity(socket, name);
    });

    socket.on('getConnectedUsers', async ({userId}) => {
        const connectedUsers = await getConnectedUsers(userId, socket);
        socket.emit('connectedUsers', connectedUsers);
    });

    socket.on('getChatHistory', async ({recipientId}) => {
        const chatHistory = await getChatHistory(socket, recipientId);
        socket.emit('chatHistory', chatHistory);
    });

    socket.on('reportRoadCondition', async ({ type, description, location }) => {
        const roadCondition = await reportRoadCondition(socket, type, description, location);
        io.emit('roadConditions', roadCondition);
    });

    socket.on('getRoadConditions', async () => {
        const roadCondition = await getRoadConditions(socket);
        io.emit('roadConditions', roadCondition);
    });
}

/**
 * Welcomes the user upon connection.
 * @param {object} socket - The socket object representing the connection.
 */
function welcomeUser(socket) {
    // socket.emit('message', buildMsg(ADMIN, "Welcome to Common Spots App!"));
}

/**
 * Handles user entering a room.
 * @param {object} socket - The socket object representing the connection.
 * @param {object} io - The Socket.IO server instance.
 * @param {string} email - The name of the user.
 * @param {string} password - The name of the room.
 */
async function handleRoomEntry(socket, io, email, password) {
    try {
        // Make the login request
        const response = await fetch('http://localhost:3000/api/v1/users/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email,
                password
            }),
        });

        if (!response.ok) {
            throw new Error('Login failed');
        }

        const data = await response.json();

        // If login successful, proceed with entering the room
        const token = data.token;
        const room = data.userId;
        const name = data.userName;
        const userId = data.userId;
        const user = activateUser(socket.id, name, room, token, userId);
        socket.join(user.room);
        // notifyUserJoined(socket, user);
        updateUserName(socket, { name, userId });
    } catch (error) {
        console.error('Login error:', error.message);
        // Handle login error, e.g., emit an error event to the client
        socket.emit('loginError', { message: 'Login failed' });
    }
}

/**
 * Notifies user and broadcasts to room that user has joined.
 * @param {object} socket - The socket object representing the connection.
 * @param {object} user - The user object.
 */
function notifyUserJoined(socket, user) {
    socket.emit('message', buildMsg(ADMIN, `You have joined the ${user.room} chat room`));
    socket.broadcast.to(user.room).emit('message', buildMsg(ADMIN, `${user.name} has joined the room`));
}


/**
 * Update new username.
 * @param {object} socket - The socket object representing the connection.
 * @param {object} user - The username.
 */
function updateUserName(socket, user) {
    socket.emit('updateUserName', buildMsg(user.name, 'Update user name', user.userId));
}

/**
 * Handles user disconnection.
 * @param {object} socket - The socket object representing the connection.
 * @param {object} io - The Socket.IO server instance.
 */
function handleDisconnect(socket, io) {
    const user = getUser(socket.id);
    userLeavesApp(socket.id);

    if (user) {
        io.to(user.room).emit('message', buildMsg(ADMIN, `${user.name} is offline`));
    }

    console.log(`User ${socket.id} disconnected`);
}

/**
 * Handles incoming messages from users.
 * @param {object} socket - The socket object representing the connection.
 * @param {string} name - The name of the user.
 * @param {string} text - The text of the message.
 * @param {object} io - The Socket.IO server instance.
 * @param messageType
 * @param location
 * @param recipientId
 */
async function handleMessage(socket, name, recipientId, text, io, messageType, location) {
    const { room, userId: senderId } = getUser(socket.id);
    if (room) {
        const chat = buildChat(messageType, text, location)
        const response = await saveMessageToDatabase(chat, recipientId, socket);
        io.to(room).emit('message', buildMsg(name, text, senderId, response?.data?.chat?.possibleCommonSpots));
    }
}

/**
 * Handles user activity in a room.
 * @param {object} socket - The socket object representing the connection.
 * @param {string} name - The name of the user.
 */
function handleActivity(socket, name) {
    const room = getUser(socket.id)?.room;
    if (room) {
        socket.broadcast.to(room).emit('activity', name);
    }
}

/**
 * Builds a message object with provided name and text.
 * @param {string} name - The name of the user sending the message.
 * @param {string} text - The text of the message.
 * @param {string} userId - The text of the message.
 * @param {array} possibleCommonSpots - The common spot for a given location
 * @returns {object} - The message object.
 */
function buildMsg(name, text, userId = '', possibleCommonSpots = []) {
    return {
        name,
        userId,
        text,
        time: new Intl.DateTimeFormat('default', {
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric'
        }).format(new Date()),
        possibleCommonSpots,
    };
}

/**
 * Builds a message object with provided name and text.
 * @param {string} messageType - The text of the message.
 * @param {string} content - The text of the message.
 * @param {array} location - The location of the message.
 * @returns {object} - The message object.
 */
function buildChat(messageType = 'text', content, location = []) {
    const locationObj = { coordinates: [0,0] };
    if (messageType === 'location'){
        locationObj.coordinates = location;
    }
    return {
        content,
        location: locationObj,
        messageType,
    };
}

// User functions

/**
 * Activates a user with provided id, name, and room.
 * @param {string} id - The unique identifier of the user from socket.
 * @param {string} name - The name of the user.
 * @param {string} room - The room the user is joining.
 * @param {string} token - The token of the user.
 * @param {string} userId - UserId from mongoDB.
 * @returns {object} - The activated user object.
 */
function activateUser(id, name, room, token, userId) {
    const user = { id, name, room, token, userId };
    UsersState.setUsers([
        ...UsersState.users.filter(user => user.id !== id),
        user
    ]);
    return user;
}

/**
 * Removes a user with provided id from the app.
 * @param {string} id - The unique identifier of the user to be removed.
 */
function userLeavesApp(id) {
    UsersState.setUsers(
        UsersState.users.filter(user => user.id !== id)
    );
}

/**
 * Retrieves user with provided id.
 * @param {string} id - The unique identifier of the user.
 * @returns {object|undefined} - The user object, or undefined if not found.
 */
function getUser(id) {
    return UsersState.users.find(user => user.id === id);
}

/**
 * Retrieves connected users for a given user ID.
 * @param {string} userId - The ID of the user.
 * @param {object} socket - The socket object representing the connection.
 * @returns Promise<array[object]> - An array of connected user IDs.
 */
async function getConnectedUsers(userId, socket) {
    const { token, userId: senderId } = getUser(socket.id);
    try {
        const response = await fetch(`http://localhost:3200/api/v1/users/${senderId}/connections`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        });
        const data = await response.json();
        return data.connectedUsers;
    } catch (error) {
        console.error('Error retrieving connected users:', error.message);
        return [];
    }
}

/**
 * Saves a message to the database.
 * @param {object} chat - The messageBody of the message.
 * @param {string} recipientId - The recipient of the message.
 * @param {object} socket - The socket object representing the connection.
 */
async function saveMessageToDatabase(chat, recipientId, socket) {
    const { token, userId: senderId } = getUser(socket.id);
    console.log(chat);
    try {
        const response = await fetch(`http://localhost:3200/api/v1/chats/${senderId}/${recipientId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
                body: JSON.stringify({
                ...chat,
            }),
        });
        console.log(`chat create status ${response.status}`)
        return await response.json();
    } catch (error) {
        console.error('Error saving chat:', error.message);
    }
}

/**
 * Get chat history between users.
 * @param {object} socket - The socket object representing the connection.
 * @returns Promise<array[object]> - An array of chats between users.
 */
async function getChatHistory(socket, recipientId) {
    const { token, userId: senderId, name } = getUser(socket.id);
    const room = sortAndConcat(senderId, recipientId);
    const user = activateUser(socket.id, name, room, token, senderId);
    socket.join(user.room);
    try {
        const response = await fetch(`http://localhost:3200/api/v1/chats/${senderId}/${recipientId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        });

        const data = await response.json();
        return data.data.chats;
    } catch (error) {
        console.error('Error retrieving chats:', error.message);
        return [];
    }
}

/**
 * Reports a road condition to the backend API.
 * @param {object} socket - The socket object representing the connection.
 * @param {string} type - The type of road condition (e.g., pothole, gravel road).
 * @param {string} description - Additional details about the road condition.
 * @param {array} location - The location of the road condition (latitude and longitude coordinates).
 * @returns {object|string} - The reported road condition object if successful, or an error message if failed.
 */
async function reportRoadCondition(socket, type, description, location) {
    const { token } = getUser(socket.id);
    try {
        const response = await fetch('http://localhost:3000/api/v1/roadConditions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
                type,
                description,
                location,
            }),
        });

        if (!response.ok) {
            return 'Failed to report road condition';
        }

        const res = await response.json();
        return res.data.roadCondition;
    } catch (error) {
        return 'Failed to report road condition';
    }
}

/**
 * Retrieves road conditions from the backend API.
 * @param {object} socket - The socket object representing the connection.
 * @returns {object|string} - The retrieved road condition object if successful, or an error message if failed.
 */
async function getRoadConditions(socket) {
    const { token } = getUser(socket.id);
    try {
        const response = await fetch('http://localhost:3000/api/v1/roadConditions', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            return 'Failed to retrieve road condition';
        }

        const res = await response.json();
        return res.data.roadCondition;
    } catch (error) {
        return 'Failed to retrieve road condition';
    }
}

function sortAndConcat(senderId, recipientId) {
    let name = recipientId + senderId;
    const comparisonResult = senderId.localeCompare(recipientId);
    if (comparisonResult < 0) {
        name = senderId + recipientId;
    }
    return name
}

// Export the functionality
module.exports = {
    handleSocketConnection
};
