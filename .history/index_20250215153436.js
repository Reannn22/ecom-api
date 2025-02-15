const path = require('path');
const express = require('express')
const methodOverride = require('method-override')
const mongoose = require('mongoose')
const multer = require('multer')
const fs = require('fs')
const session = require('express-session');
const User = require('./models/user');
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

// Add session middleware after other middleware
app.use(session({
    secret: 'rahasia',
    resave: false,
    saveUninitialized: false
}));

// Add authentication middleware
const requireLogin = (req, res, next) => {
    if (!req.session.user_id) {
        return res.redirect('/login');
    }
    next();
};

const requireAdmin = async (req, res, next) => {
    if (!req.session.user_id) {
        return res.redirect('/login');
    }
    const user = await User.findById(req.session.user_id);
    if (user.role !== 'admin') {
        return res.send('Not authorized');
    }
    next();
};

function wrapAsync(fn) {
    return function (req, res, next) {
        fn(req, res, next).catch(err => next(err))
    }
}

app.get('/', (req, res) => {
    res.send('Hello World')
})

app.get('/register', (req, res) => {
    res.render('users/register', { error: null });
});

app.post('/register', wrapAsync(async (req, res) => {
    try {
        const { username, email, password, role } = req.body;
        const user = new User({ username, email, password, role });
        await user.save();
        req.session.user_id = user._id;
        res.redirect('/products');
    } catch (e) {
        res.render('users/register', { error: 'Username atau email sudah terdaftar' });
    }
}));

app.get('/login', (req, res) => {
    res.render('users/login', { error: null });
});

app.post('/login', wrapAsync(async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (user && await user.verifyPassword(password)) {
        req.session.user_id = user._id;
        res.redirect('/products');
    } else {
        res.render('users/login', { error: 'Email atau password salah' });
    }
}));

app.post('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// Middleware untuk menyediakan data user ke semua views - pastikan ini ada sebelum routes
app.use(async (req, res, next) => {
    res.locals.currentUser = req.session.user_id ? await User.findById(req.session.user_id) : null;
    next();
});

app.get('/products', async (req, res) => {
    const { category } = req.query
    if (category) {

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

app.use('/products/create', requireLogin);
app.get('/products/create', requireLogin, (req, res) => {
    res.render('products/create')
})

app.post('/products', requireLogin, upload.single('image'), wrapAsync(async (req, res) => {
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

app.use('/products/:id/edit', requireLogin);
app.get('/products/:id/edit', requireLogin, wrapAsync(async (req, res) => {
    const { id } = req.params
    const product = await Product.findById(id)
    res.render('products/edit', { product })
}))

// Update PUT route to handle image upload
app.put('/products/:id', requireLogin, upload.single('image'), wrapAsync(async (req, res) => {
    const { id } = req.params
    const product = await Product.findById(id);
    
    if (req.file) {
        // Delete old image if exists
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
        // Keep existing image if no new image uploaded
        const updatedProduct = await Product.findByIdAndUpdate(id, {
            ...req.body,
            image: product.image // keep existing image path
        }, { runValidators: true, new: true });
        res.redirect(`/products/${updatedProduct._id}`);
    }
}));

app.delete('/products/:id', requireLogin, wrapAsync(async (req, res) => {
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