const mongoose = require('mongoose')

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'nama tidak boleh kosong']
    },
    brand: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    color: {
        type: String,
        required: true
    },
    category: {
        type: String,
        enum: ['Baju', 'Celana', 'Aksesoris', 'Jaket'],
    },
    image: {
        type: String,
        required: true
    }
}, { timestamps: true }) // Menambahkan timestamps: true di sini

const Product = mongoose.model('Product', productSchema)

module.exports = Product