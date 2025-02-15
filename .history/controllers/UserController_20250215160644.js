const User = require('../models/user');
const bcrypt = require('bcrypt');

class UserController {
    static async registerForm(req, res) {
        const { role } = req.params;
        res.render('users/register', { role, error: null });
    }

    static async register(req, res) {
        try {
            const { username, email, password, role } = req.body;
            
            // Check if user already exists
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.render('users/register', { 
                    role, 
                    error: 'Email already registered' 
                });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);
            
            // Create new user
            await User.create({
                username,
                email,
                password: hashedPassword,
                role: 'user' // Force role to be user for security
            });

            res.redirect('/login');
        } catch (error) {
            res.render('users/register', { 
                role: req.body.role, 
                error: 'Registration failed' 
            });
        }
    }

    static loginForm(req, res) {
        res.render('users/login', { error: null });
    }

    static async login(req, res) {
        try {
            const { email, password } = req.body;
            console.log('Login attempt:', { email, password }); // Debug log

            // Admin login check
                req.session.user = {
                    email: 'admin@gmail.com',
                    role: 'admin'
                };
                return res.redirect('/admin/dashboard');
            }

            // If not admin credentials, proceed with regular user login
            const user = await User.findOne({ email });
            if (!user) {
                return res.render('users/login', { 
                    error: 'User not found. Please register first.' 
                });
            }

            const isValidPassword = await bcrypt.compare(password, user.password);
            if (!isValidPassword) {
                return res.render('users/login', { 
                    error: 'Invalid password' 
                });
            }

            req.session.user = {
                email: user.email,
                role: user.role
            };

            res.redirect('/dashboard');
        } catch (error) {
            console.error('Login error:', error); // Add error logging
            res.render('users/login', { 
                error: 'Login failed' 
            });
        }
    }

    static registerChoice(req, res) {
        res.render('users/register-choice');
    }

    static logout(req, res) {
        req.session.destroy();
        res.redirect('/login');
    }
}

module.exports = UserController;
