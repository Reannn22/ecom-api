const express = require('express');
const session = require('express-session');
const app = express();

// Make sure these are added before your routes
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));
