const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

// Models
const Admin = require('../models/Admin');
const Setting = require('../models/Setting');
const ContactDetail = require('../models/ContactDetail');
const Feature = require('../models/Feature');
const Facility = require('../models/Facility');
const Room = require('../models/Room');
const User = require('../models/User');
const UserQuery = require('../models/UserQuery');
const Booking = require('../models/Booking');

// Multer Upload Configuration for Facilities Icons (SVG only)
const facilityStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/facilities/');
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});
const uploadFacility = multer({
    storage: facilityStorage,
    limits: { fileSize: 1 * 1024 * 1024 }, // 1MB limit
    fileFilter: (req, file, cb) => {
        if (path.extname(file.originalname).toLowerCase() === '.svg') {
            return cb(null, true);
        }
        cb(new Error('Only SVG icons are allowed for facilities!'));
    }
});

// Multer Upload Configuration for Room Images (JPG, JPEG, PNG)
const roomStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/rooms/');
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});
const uploadRoom = multer({
    storage: roomStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png/;
        const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mime = allowedTypes.test(file.mimetype);
        if (ext && mime) return cb(null, true);
        cb(new Error('Only JPG, JPEG, and PNG images are allowed for rooms!'));
    }
});

// Middleware: Authenticate Admin Session
const isAdminLoggedIn = (req, res, next) => {
    if (req.session.admin) return next();
    res.redirect('/admin');
};

// ==========================================
// ADMIN LOGIN & VIEW ROUTES
// ==========================================

// Login Page
router.get('/', (req, res) => {
    if (req.session.admin) return res.redirect('/admin/dashboard');
    res.render('admin/login');
});

// Login Post
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Please enter all details.' });
        }

        const admin = await Admin.findOne({ username });
        if (!admin) {
            return res.status(400).json({ success: false, message: 'Invalid Username or Password.' });
        }

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Invalid Username or Password.' });
        }

        // Set session
        req.session.admin = admin.username;
        res.json({ success: true, message: 'Login successful!' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Login failed.' });
    }
});

// Logout Admin
router.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/admin');
    });
});

// Dashboard Overview Home
router.get('/dashboard', isAdminLoggedIn, async (req, res) => {
    try {
        const stats = {};
        
        // Count users, rooms, unread queries
        stats.users = await User.countDocuments();
        stats.rooms = await Room.countDocuments();
        stats.queries = await UserQuery.countDocuments({ seen: false });

        // Calculate bookings stats
        stats.newBookings = await Booking.countDocuments({ booking_status: 'booked' });
        stats.activeGuests = await Booking.countDocuments({ booking_status: 'arrived' });
        stats.cancelledBookings = await Booking.countDocuments({ booking_status: 'cancelled' });

        // Calculate total earnings
        const revenueResult = await Booking.aggregate([
            { $match: { booking_status: { $in: ['booked', 'arrived'] } } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        stats.revenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

        // Fetch top 5 recent bookings
        stats.recentBookings = await Booking.find()
            .populate('room')
            .sort({ createdAt: -1 })
            .limit(5);

        res.render('admin/dashboard', { stats });
    } catch (err) {
        res.status(500).send('Internal Server Error');
    }
});

// General Settings
router.get('/settings', isAdminLoggedIn, async (req, res) => {
    try {
        const settings = await Setting.findOne();
        const contact = await ContactDetail.findOne();
        res.render('admin/settings', { settings, contact });
    } catch (err) {
        res.status(500).send('Internal Server Error');
    }
});

// Features & Facilities
router.get('/features-facilities', isAdminLoggedIn, async (req, res) => {
    try {
        const features = await Feature.find().sort({ createdAt: -1 });
        const facilities = await Facility.find().sort({ createdAt: -1 });
        res.render('admin/facilities', { features, facilities });
    } catch (err) {
        res.status(500).send('Internal Server Error');
    }
});

// Rooms Management
router.get('/rooms', isAdminLoggedIn, async (req, res) => {
    try {
        const features = await Feature.find().sort({ name: 1 });
        const facilities = await Facility.find().sort({ name: 1 });
        res.render('admin/rooms', { features, facilities });
    } catch (err) {
        res.status(500).send('Internal Server Error');
    }
});

// Users Management
router.get('/users', isAdminLoggedIn, (req, res) => {
    res.render('admin/users');
});

// Queries Messages Panel
router.get('/queries', isAdminLoggedIn, (req, res) => {
    res.render('admin/queries');
});

// Booking check-in management
router.get('/new-bookings', isAdminLoggedIn, (req, res) => {
    res.render('admin/new_bookings');
});

// Booking records logs
router.get('/booking-records', isAdminLoggedIn, (req, res) => {
    res.render('admin/booking_records');
});

// Refund cancelled bookings management
router.get('/refund-bookings', isAdminLoggedIn, (req, res) => {
    res.render('admin/refund_bookings');
});

// ==========================================
// SETTINGS AJAX API
// ==========================================

// Save General Settings
router.post('/settings/general', isAdminLoggedIn, async (req, res) => {
    try {
        const { site_title, site_about } = req.body;
        const settings = await Setting.findOne();
        settings.site_title = site_title || settings.site_title;
        settings.site_about = site_about || settings.site_about;
        await settings.save();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// Shutdown toggle
router.post('/settings/shutdown', isAdminLoggedIn, async (req, res) => {
    try {
        const { shutdown } = req.body;
        const settings = await Setting.findOne();
        settings.shutdown = shutdown;
        await settings.save();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// Save Contact details
router.post('/settings/contact', isAdminLoggedIn, async (req, res) => {
    try {
        const { address, gmap, pn1, pn2, email, fb, insta, tw, iframe } = req.body;
        const contact = await ContactDetail.findOne();
        contact.address = address;
        contact.gmap = gmap;
        contact.pn1 = pn1;
        contact.pn2 = pn2;
        contact.email = email;
        contact.fb = fb;
        contact.insta = insta;
        contact.tw = tw;
        contact.iframe = iframe;
        await contact.save();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// ==========================================
// FEATURES & FACILITIES AJAX API
// ==========================================

// Features List JSON
router.get('/features/list', isAdminLoggedIn, async (req, res) => {
    const list = await Feature.find().sort({ createdAt: -1 });
    res.json(list);
});

// Add Feature
router.post('/features/add', isAdminLoggedIn, async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ success: false, message: 'Feature name required.' });
        
        const exists = await Feature.findOne({ name });
        if (exists) return res.status(400).json({ success: false, message: 'Feature already exists.' });

        await Feature.create({ name });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// Delete Feature
router.delete('/features/delete/:id', isAdminLoggedIn, async (req, res) => {
    try {
        await Feature.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// Facilities List JSON
router.get('/facilities/list', isAdminLoggedIn, async (req, res) => {
    const list = await Facility.find().sort({ createdAt: -1 });
    res.json(list);
});

// Add Facility (with SVG icon upload)
router.post('/facilities/add', isAdminLoggedIn, uploadFacility.single('icon'), async (req, res) => {
    try {
        const { facility_name, description } = req.body;
        if (!facility_name || !description || !req.file) {
            return res.status(400).json({ success: false, message: 'Please fill in all details and select an SVG icon.' });
        }

        const exists = await Facility.findOne({ name: facility_name });
        if (exists) {
            // Delete uploaded file if duplicate
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ success: false, message: 'Facility already exists.' });
        }

        await Facility.create({
            name: facility_name,
            icon: req.file.filename,
            description
        });
        res.json({ success: true });
    } catch (err) {
        if (req.file) fs.unlinkSync(req.file.path);
        res.status(500).json({ success: false, message: err.message });
    }
});

// Delete Facility
router.delete('/facilities/delete/:id', isAdminLoggedIn, async (req, res) => {
    try {
        const facility = await Facility.findById(req.params.id);
        if (!facility) return res.status(404).json({ success: false });

        // Delete icon file
        const filepath = path.join(__dirname, '../public/uploads/facilities/', facility.icon);
        if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
        }

        await Facility.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// ==========================================
// ROOMS CRUD AJAX API
// ==========================================

// Rooms List JSON
router.get('/rooms/list', isAdminLoggedIn, async (req, res) => {
    const list = await Room.find().sort({ createdAt: -1 });
    res.json(list);
});

// Get single Room details
router.get('/rooms/get/:id', isAdminLoggedIn, async (req, res) => {
    const room = await Room.findById(req.params.id);
    res.json(room);
});

// Add Room
router.post('/rooms/add', isAdminLoggedIn, async (req, res) => {
    try {
        const { name, area, price, quantity, adult, children, description, features, facilities } = req.body;
        await Room.create({
            name,
            area,
            price,
            quantity,
            adult,
            children,
            description,
            features,
            facilities
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// Update Room
router.post('/rooms/update/:id', isAdminLoggedIn, async (req, res) => {
    try {
        const { name, area, price, quantity, adult, children, description, features, facilities } = req.body;
        await Room.findByIdAndUpdate(req.params.id, {
            name,
            area,
            price,
            quantity,
            adult,
            children,
            description,
            features,
            facilities
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// Toggle Status Active / Inactive
router.post('/rooms/status/:id', isAdminLoggedIn, async (req, res) => {
    try {
        const { status } = req.body;
        await Room.findByIdAndUpdate(req.params.id, { status });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// Delete Room
router.delete('/rooms/delete/:id', isAdminLoggedIn, async (req, res) => {
    try {
        const room = await Room.findById(req.params.id);
        if (!room) return res.status(404).json({ success: false });

        // Delete associated files
        room.images.forEach(img => {
            const filepath = path.join(__dirname, '../public/uploads/rooms/', img);
            if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
        });

        await Room.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// Get Room Images
router.get('/rooms/images/:id', isAdminLoggedIn, async (req, res) => {
    try {
        const room = await Room.findById(req.params.id);
        res.json({ images: room.images, thumbImage: room.thumbImage });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// Upload Room Image
router.post('/rooms/add-image/:id', isAdminLoggedIn, uploadRoom.single('room_img'), async (req, res) => {
    try {
        const room = await Room.findById(req.params.id);
        if (!room) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(404).json({ success: false, message: 'Room not found.' });
        }

        if (!req.file) return res.status(400).json({ success: false, message: 'Please select an image.' });

        room.images.push(req.file.filename);
        if (!room.thumbImage) {
            room.thumbImage = req.file.filename; // set first image as default thumb
        }
        await room.save();

        res.json({ success: true });
    } catch (err) {
        if (req.file) fs.unlinkSync(req.file.path);
        res.status(500).json({ success: false, message: err.message });
    }
});

// Set Thumbnail
router.post('/rooms/thumbnail/:roomId', isAdminLoggedIn, async (req, res) => {
    try {
        const { thumb } = req.body;
        await Room.findByIdAndUpdate(req.params.roomId, { thumbImage: thumb });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// Delete Room Image
router.post('/rooms/delete-image/:roomId', isAdminLoggedIn, async (req, res) => {
    try {
        const { image } = req.body;
        const room = await Room.findById(req.params.roomId);
        if (!room) return res.status(404).json({ success: false });

        // Filter images array
        room.images = room.images.filter(img => img !== image);

        // Reset thumbnail if deleted image was thumb
        if (room.thumbImage === image) {
            room.thumbImage = room.images.length > 0 ? room.images[0] : '';
        }

        // Delete file
        const filepath = path.join(__dirname, '../public/uploads/rooms/', image);
        if (fs.existsSync(filepath)) fs.unlinkSync(filepath);

        await room.save();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// ==========================================
// USERS CRUD AJAX API
// ==========================================

// Users List JSON
router.get('/users/list', isAdminLoggedIn, async (req, res) => {
    const list = await User.find().sort({ createdAt: -1 });
    res.json(list);
});

// Block / Unblock User
router.post('/users/status/:id', isAdminLoggedIn, async (req, res) => {
    try {
        const { status } = req.body;
        await User.findByIdAndUpdate(req.params.id, { status });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// ==========================================
// USER QUERIES AJAX API
// ==========================================

// Queries List JSON
router.get('/queries/list', isAdminLoggedIn, async (req, res) => {
    const list = await UserQuery.find().sort({ createdAt: -1 });
    res.json(list);
});

// Mark query as read (seen)
router.post('/queries/seen/:id', isAdminLoggedIn, async (req, res) => {
    try {
        await UserQuery.findByIdAndUpdate(req.params.id, { seen: true });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// Delete query
router.delete('/queries/delete/:id', isAdminLoggedIn, async (req, res) => {
    try {
        await UserQuery.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// Clear all queries
router.delete('/queries/delete-all', isAdminLoggedIn, async (req, res) => {
    try {
        await UserQuery.deleteMany({});
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// ==========================================
// BOOKINGS MANAGEMENT AJAX API
// ==========================================

// New Bookings (not arrived, booked status)
router.get('/bookings/new/list', isAdminLoggedIn, async (req, res) => {
    try {
        const list = await Booking.find({ booking_status: 'booked' })
            .populate('room')
            .sort({ createdAt: -1 });
        res.json(list);
    } catch (err) {
        res.status(500).json([]);
    }
});

// All Bookings Log
router.get('/bookings/records/list', isAdminLoggedIn, async (req, res) => {
    try {
        const list = await Booking.find()
            .populate('room')
            .sort({ createdAt: -1 });
        res.json(list);
    } catch (err) {
        res.status(500).json([]);
    }
});

// Cancelled Bookings Pending Refund (refund is false)
router.get('/bookings/refund/list', isAdminLoggedIn, async (req, res) => {
    try {
        const list = await Booking.find({ booking_status: 'cancelled', refund: false })
            .populate('room')
            .sort({ updatedAt: -1 });
        res.json(list);
    } catch (err) {
        res.status(500).json([]);
    }
});

// Check-in arrival confirm (Assign Room Number)
router.post('/bookings/check-in/:id', isAdminLoggedIn, async (req, res) => {
    try {
        const { room_number } = req.body;
        if (!room_number) return res.status(400).json({ success: false, message: 'Room number required.' });

        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

        booking.room_number = room_number;
        booking.booking_status = 'arrived';
        await booking.save();

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// Cancel Booking by Admin
router.post('/bookings/cancel/:id', isAdminLoggedIn, async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

        booking.booking_status = 'cancelled';
        booking.refund = false; // Pending refund approval
        await booking.save();

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// Approve & Process Refund
router.post('/bookings/refund/approve/:id', isAdminLoggedIn, async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

        booking.refund = true;
        await booking.save();

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

module.exports = router;
