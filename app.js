const chatRoute = require('./routes/chatRoutes')
const userConnectionsRoute = require('./routes/userConnectionsRoute')
const AppError = require('./utils/appError')
const errorController = require('./controllers/errorController')

const express = require('express')
const rateLimit = require('express-rate-limit')
const helmet = require('helmet')
const mongoSanitize = require('express-mongo-sanitize')
const xss = require('xss-clean')
const hpp = require('hpp')
const path = require('path');

const app = express();

// 1) MIDDLEWARES
// if (process.env.NODE_ENV === 'development') {
//   app.use(morgan('dev'));
// }

app.use(helmet())

const limiter = rateLimit({
    max: 100,
    windows: 60 * 60 * 1000,
    message: 'Too many request from this IP/User, please try again in an hour.'
})

app.use('/api', limiter)

app.use(express.json({ limit: '10kb'}));

app.use(express.static(path.join(__dirname, "public")))

// Data sanitization against NoSQL query injection
app.use(mongoSanitize())

// Data sanitization against XSS
app.use(xss())

// Prevent parameter pollution
app.use(hpp())

// 3) ROUTES
app.use('/api/v1/chats', chatRoute);
app.use('/api/v1/users', userConnectionsRoute);

app.all('*', (req, res, next) => {
    err = new AppError(`Can't find ${req.originalUrl} in this server`, 404)
    next(err);
})

app.use(errorController)

console.log("Done");

module.exports = app;
