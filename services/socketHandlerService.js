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

    socket.on('message', async ({name, text}) => {
        await handleMessage(socket, name, text, io);
    });

    socket.on('activity', (name) => {
        handleActivity(socket, name);
    });
}

/**
 * Welcomes the user upon connection.
 * @param {object} socket - The socket object representing the connection.
 */
function welcomeUser(socket) {
    socket.emit('message', buildMsg(ADMIN, "Welcome to Common Spots App!"));
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
        const room = 'default';
        const name = data.userName;
        const userID = data.userID;
        const user = activateUser(socket.id, name, room, token, userID);
        socket.join(user.room);
        notifyUserJoined(socket, user);
        updateUserName(socket, name);
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
 * @param {string} name - The username.
 */
function updateUserName(socket, name) {
    socket.emit('updateUserName', buildMsg(name, 'Update user name'));
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
        io.to(user.room).emit('message', buildMsg(ADMIN, `${user.name} has left the room`));
    }

    console.log(`User ${socket.id} disconnected`);
}

/**
 * Handles incoming messages from users.
 * @param {object} socket - The socket object representing the connection.
 * @param {string} name - The name of the user.
 * @param {string} text - The text of the message.
 * @param {object} io - The Socket.IO server instance.
 */
async function handleMessage(socket, name, text, io) {
    const room = getUser(socket.id)?.room;
    if (room) {
        io.to(room).emit('message', buildMsg(name, text));
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
 * @returns {object} - The message object.
 */
function buildMsg(name, text) {
    return {
        name,
        text,
        time: new Intl.DateTimeFormat('default', {
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric'
        }).format(new Date())
    };
}

// User functions

/**
 * Activates a user with provided id, name, and room.
 * @param {string} id - The unique identifier of the user from socket.
 * @param {string} name - The name of the user.
 * @param {string} room - The room the user is joining.
 * @param {string} token - The token of the user.
 * @param {string} userID - UserID from mongoDB.
 * @returns {object} - The activated user object.
 */
function activateUser(id, name, room, token, userID) {
    const user = { id, name, room, token, userID };
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
 * @returns {Array} - An array of connected user IDs.
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
        return data.connectedUsers.map(user => user._id);
    } catch (error) {
        console.error('Error retrieving connected users:', error.message);
        return [];
    }
}

/**
 * Saves a message to the database.
 * @param {object} messageBody - The name of the user sending the message.
 * @param {string} recipientId - The text of the message.
 * @param {object} socket - The socket object representing the connection.
 */
async function saveMessageToDatabase(messageBody, recipientId, socket) {
    const { token, userId: senderId } = getUser(socket.id);
    try {
        await fetch(`http://localhost:3200/api/v1/chats/${senderId}/${recipientId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
                messageBody,
            }),
        });
    } catch (error) {
        console.error('Error saving message to database:', error.message);
    }
}

// Export the functionality
module.exports = {
    handleSocketConnection
};
