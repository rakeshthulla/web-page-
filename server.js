const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/app')
    .then(() => console.log('MongoDB connected successfully'))
    .catch(err => console.error('MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    phone: String,
    dob: Date,
    username: { type: String, unique: true },
    password: String, // Storing password in plain text for this example
});

const User = mongoose.model('User', userSchema);

// Image Metadata Schema
const imageSchema = new mongoose.Schema({
    name: String,
    contentType: String,
    path: String // Path to the image file in local storage
});

const Image = mongoose.model('Image', imageSchema);

// Setting up multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './uploads'; // Directory to save uploaded images
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname); // Create unique file name
    }
});
const upload = multer({ storage: storage });

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/create.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'create.html'));
});

// Login Handler
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    console.log(`Login attempt: Username: ${username}, Password: ${password}`);

    try {
        const user = await User.findOne({ username });

        if (!user) {
            console.log("Username not found!");
            return res.json({ success: false, message: "Username not found! Please try again." });
        }

        console.log("User found:", user);

        if (password === user.password) {
            console.log("Login successful!");
            return res.json({ success: true, message: "Successfully logged in!", redirectUrl: '/home.html', userId: user._id });
        } else {
            console.log("Incorrect password!");
            return res.json({ success: false, message: "Incorrect password! Please try again." });
        }
    } catch (error) {
        console.error("Login Error:", error);
        res.json({ success: false, message: "Error during login! Please try again." });
    }
});

// Signup Handler
app.post('/create', async (req, res) => {
    const { name, email, phone, dob, username, password } = req.body;

    try {
        const existingUser = await User.findOne({ username });

        if (existingUser) {
            return res.json({ success: false, message: "Username already exists! Please choose another." });
        }

        const newUser = new User({
            name,
            email,
            phone,
            dob,
            username,
            password,
        });

        await newUser.save();
        res.json({ success: true, message: "Account created successfully! Please log in." });
    } catch (error) {
        console.error("Error creating user:", error);
        res.json({ success: false, message: "Error creating account! Please try again." });
    }
});

// Image Upload Handler to save image locally and metadata in MongoDB
app.post('/upload-image', upload.single('imageInput'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: "No file uploaded." });
    }

    try {
        console.log(`File Name: ${req.file.originalname}`);

        // Save image metadata in MongoDB
        const newImage = new Image({
            name: req.file.originalname,
            contentType: req.file.mimetype,
            path: req.file.path // Path to the saved image in local storage
        });

        await newImage.save();
        res.json({ success: true, message: "Image uploaded and metadata saved in MongoDB." });
    } catch (error) {
        console.error("Error saving image metadata to MongoDB:", error);
        res.status(500).json({ success: false, message: "Failed to save image metadata in MongoDB." });
    }
});

// Route to get image metadata
app.get('/images', async (req, res) => {
    try {
        const images = await Image.find(); // Get all image metadata from MongoDB
        res.json(images);
    } catch (error) {
        console.error("Error retrieving images:", error);
        res.status(500).send("Failed to retrieve image metadata.");
    }
});

// Start server
app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});