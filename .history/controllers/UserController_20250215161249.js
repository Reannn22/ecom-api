const User = require('../models/user');
const bcrypt = require('bcrypt');

class UserController {
    static async registerForm(req, res) {
        const { role } = req.params;
        res.render('users/register', { role, error: null });
    }

    static async register(req, res) {
        try {
            const { username, email, password } = req.body;
            
            // Check if user already exists
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.render('users/register', { 
                    role: req.body.role, 
                    error: 'Email sudah terdaftar' 
                });
            }

            // Create new user with hashed password
            const user = await User.create({
                username,
                email,
                password, // Password will be hashed by the mongoose pre-save hook
                role: 'user'
            });

            res.redirect('/login');
        } catch (error) {
            console.error('Registration error:', error);
            res.render('users/register', { 
                role: req.body.role, 
                error: 'Registrasi gagal' 
            });
        }
    }

    static loginForm(req, res) {
        res.render('users/login', { error: null });
    }

    static async login(req, res) {
        try {
            const { email, password } = req.body;

            // Find user by email
            const user = await User.findOne({ email });
            
            // If no user found with that email
            if (!user) {
                return res.render('users/login', { 
                    error: 'Email tidak terdaftar' 
                });
            }

            // Check if password matches
            const isValidPassword = await bcrypt.compare(password, user.password);
            if (!isValidPassword) {
                return res.render('users/login', { 
                    error: 'Password salah' 
                });
            }

            // Set session
            req.session.user = {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role
            };

            // Redirect based on role
            if (user.role === 'admin') {
                return res.redirect('/admin/dashboard');
            }
            return res.redirect('/dashboard');

        } catch (error) {
            console.error('Login error:', error);
            res.render('users/login', { 
                error: 'Terjadi kesalahan saat login' 
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
