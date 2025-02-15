const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Username tidak boleh kosong'],
        unique: true
    },
    password: {
        type: String,
        required: [true, 'Password tidak boleh kosong']
    }
}, { timestamps: true })

const User = mongoose.model('User', userSchema)

module.exports = User
