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
            const adminEmail = 'admin@gmail.com';
            const adminPassword = 'admin123';

            if (email === adminEmail && password === adminPassword) {
                req.session.user = {
                    email: adminEmail,
                    role: 'admin'
                };
                console.log('Admin login successful'); // Debug log
                return res.redirect('/admin/dashboard');
            }

            // Regular user login
            const user = await User.findOne({ email });
            if (!user) {
                return res.render('users/login', { 
                    error: 'Email tidak ditemukan' 
                });
            }

            const isValidPassword = await bcrypt.compare(password, user.password);
            if (!isValidPassword) {
                return res.render('users/login', { 
                    error: 'Password salah' 
                });
            }

            req.session.user = {
                email: user.email,
                role: user.role
            };
            console.log('User login successful:', user.email); // Debug log
            res.redirect('/dashboard');

        } catch (error) {
            console.error('Login error:', error);
            res.render('users/login', { 
                error: 'Gagal login' 
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
