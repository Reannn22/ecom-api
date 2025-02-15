const express = require('express');
const session = require('express-session');
const app = express();

// Make sure these are added before your routes
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    saveUninitialized: false,
    cookie: { 
        secure: false, // set to true if using https
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));
