const express = require('express');
const router = express.Router();
const UserController = require('../controllers/UserController');
const { isLoggedIn } = require('../middlewares/auth');

// Login routes
router.get('/login', UserController.loginForm);
router.post('/login', UserController.login);

// Register routes
router.get('/register', UserController.registerChoice);
router.get('/register/:role', UserController.registerForm);
router.post('/register/:role', UserController.register);

// Logout route
router.get('/logout', UserController.logout);

module.exports = router;
