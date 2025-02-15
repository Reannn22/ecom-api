const path = require('path');
const express = require('express')
const methodOverride = require('method-override')
const mongoose = require('mongoose')
const multer = require('multer')
const fs = require('fs')
const app = express()
const ErrorHandler = require('./ErrorHandler')

/* Models */
const Product = require('./models/product')

// create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// connect to mongodb
mongoose.connect('mongodb://127.0.0.1/shop_db')
    .then((result) => {
        console.log('connected to mongodb')
    }).catch((err) => {
        console.log(err)
    });

app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')
app.use(express.urlencoded({ extended: true }))
app.use(methodOverride('_method'))

// Multer configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Ensure the uploads directory exists
        if (!fs.existsSync('uploads')) {
            fs.mkdirSync('uploads');
        }
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname)
    }
})
const upload = multer({ storage: storage })

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'))

function wrapAsync(fn) {
    return function (req, res, next) {
        fn(req, res, next).catch(err => next(err))
    }
}

app.get('/', (req, res) => {
    res.send('Hello World')
})

app.get('/products', async (req, res) => {
    const { category } = req.query
    if (category) {
        const products = await Product.find({ category })
        res.render('products/index', { products, category })
    } else {
        const products = await Product.find({})
        res.render('products/index', { products, category: 'All' })
    }
})

app.get('/products/create', (req, res) => {
    res.render('products/create')
})

app.post('/products', upload.single('image'), wrapAsync(async (req, res) => {
    const product = new Product({
        ...req.body,
        image: req.file.path
    })
    await product.save()
    res.redirect(`/products/${product._id}`)
}))

app.get('/products/:id', wrapAsync(async (req, res) => {
    const { id } = req.params
    const product = await Product.findById(id)
    res.render('products/show', { product })
}))

app.get('/products/:id/edit', wrapAsync(async (req, res) => {
    const { id } = req.params
    const product = await Product.findById(id)
    res.render('products/edit', { product })
}))

// Update PUT route to handle image upload
app.put('/products/:id', upload.single('image'), wrapAsync(async (req, res) => {
    const { id } = req.params
    const product = await Product.findById(id);
    
    // If there's a new image uploaded
    if (req.file) {
        // Delete old image if it exists
        if (product.image && fs.existsSync(product.image)) {
            fs.unlinkSync(product.image);
        }
        // Update with new image
        const updatedProduct = await Product.findByIdAndUpdate(id, {
            ...req.body,
            image: req.file.path
        }, { runValidators: true, new: true });
        res.redirect(`/products/${updatedProduct._id}`);
    } else {
        // If no new image, just update other fields
        const updatedProduct = await Product.findByIdAndUpdate(id, req.body, 
            { runValidators: true, new: true });
        res.redirect(`/products/${updatedProduct._id}`);
    }
}));

app.delete('/products/:id', wrapAsync(async (req, res) => {
    const { id } = req.params
    await Product.findByIdAndDelete(id)
    res.redirect('/products')
}))

const validatorHandler = err => {
    err.status = 400
    err.message = Object.values(err.errors).map(item => item.message)
    return new ErrorHandler(err.message, err.status)
}

app.use((err, req, res, next) => {
    console.dir(err)
    if (err.name === 'ValidationError') err = validatorHandler(err)
    if (err.name === 'CastError') {
        err.status = 404
        err.message = 'Product not found'
    }
    next(err)
})

app.use((err, req, res, next) => {
    const { status = 500, message = 'Something went wrong' } = err
    res.status(status).send(message);
})


app.listen(3000, () => {
    console.log('shop app listening on http://127.0.0.1:3000')
})