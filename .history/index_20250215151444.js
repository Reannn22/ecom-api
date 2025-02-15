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
    res.render('auth/register');
});

app.post('/register', wrapAsync(async (req, res) => {
    const { username, password, role } = req.body;
    const user = new User({ username, password, role });
    await user.save();
    req.session.user_id = user._id;
    res.redirect('/');
}));

app.get('/login', (req, res) => {
    res.render('auth/login');
});

app.post('/login', wrapAsync(async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findAndValidate(username, password);
    if (user) {
        req.session.user_id = user._id;
        res.redirect('/');
    } else {
        res.redirect('/login');
    }
}));

app.post('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

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