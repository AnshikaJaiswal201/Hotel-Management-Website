const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcryptjs');

// Models
const Setting = require('../models/Setting');
const ContactDetail = require('../models/ContactDetail');
const Feature = require('../models/Feature');
const Facility = require('../models/Facility');
const Room = require('../models/Room');
const User = require('../models/User');
const Booking = require('../models/Booking');
const UserQuery = require('../models/UserQuery');

// Multer Upload Configuration for User Avatars
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/users/');
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});
const upload = multer({
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png/;
        const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mime = allowedTypes.test(file.mimetype);
        if (ext && mime) return cb(null, true);
        cb(new Error('Only JPG, JPEG, and PNG images are allowed!'));
    }
});

// Middleware: Global layout data injector
router.use(async (req, res, next) => {
    try {
        res.locals.settings = await Setting.findOne();
        res.locals.contact = await ContactDetail.findOne();
        res.locals.user = req.session.user || null;
        next();
    } catch (err) {
        next(err);
    }
});

// Middleware: Auth check
const isUserLoggedIn = (req, res, next) => {
    if (req.session.user) return next();
    res.redirect('/');
};

// ==========================================
// FRONT-END VIEW ROUTES
// ==========================================

// Homepage
router.get('/', async (req, res) => {
    try {
        const rooms = await Room.find({ status: true }).populate('features').populate('facilities').limit(3);
        const facilities = await Facility.find();
        res.render('index', { rooms, facilities, carousel: null });
    } catch (err) {
        res.status(500).send('Internal Server Error');
    }
});

// Rooms List
router.get('/rooms', async (req, res) => {
    try {
        const facilities = await Facility.find();
        res.render('rooms', { facilities });
    } catch (err) {
        res.status(500).send('Internal Server Error');
    }
});

// Facilities Page
router.get('/facilities', async (req, res) => {
    try {
        const facilities = await Facility.find();
        res.render('facilities', { facilities });
    } catch (err) {
        res.status(500).send('Internal Server Error');
    }
});

// Contact Us Page
router.get('/contact', (req, res) => {
    res.render('contact');
});

// About Us Page
router.get('/about', async (req, res) => {
    try {
        res.render('about', { team: null });
    } catch (err) {
        res.status(500).send('Internal Server Error');
    }
});

// Confirm Booking Page
router.get('/confirm-booking/:room_id', isUserLoggedIn, async (req, res) => {
    try {
        const room = await Room.findById(req.params.room_id).populate('features').populate('facilities');
        if (!room || !room.status) {
            return res.redirect('/rooms');
        }
        res.render('confirm_booking', { room });
    } catch (err) {
        res.redirect('/rooms');
    }
});

// User Bookings History Log
router.get('/bookings', isUserLoggedIn, async (req, res) => {
    try {
        const bookings = await Booking.find({ user: req.session.user._id })
            .populate('room')
            .sort({ createdAt: -1 });
        res.render('bookings', { bookings });
    } catch (err) {
        res.status(500).send('Internal Server Error');
    }
});

// User Profile settings
router.get('/profile', isUserLoggedIn, (req, res) => {
    res.render('profile');
});

// Logout User
router.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

// ==========================================
// frontend ajax API endpoints
// ==========================================

// Register User
router.post('/api/register', upload.single('profile'), async (req, res) => {
    try {
        const { name, email, phone, address, pincode, dob, password } = req.body;

        // Validation
        if (!name || !email || !phone || !address || !pincode || !dob || !password || !req.file) {
            return res.status(400).json({ success: false, message: 'Please fill in all details and upload an avatar.' });
        }

        // Check duplicates
        const userExists = await User.findOne({ $or: [{ email }, { phone }] });
        if (userExists) {
            return res.status(400).json({ success: false, message: 'Email or phone number is already registered.' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create User
        await User.create({
            name,
            email,
            phone,
            address,
            pincode,
            dob: new Date(dob),
            profile: req.file.filename,
            password: hashedPassword
        });

        res.json({ success: true, message: 'Registration successful!' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message || 'Registration failed.' });
    }
});

// Login User
router.post('/api/login', async (req, res) => {
    try {
        const { email_phone, password } = req.body;

        if (!email_phone || !password) {
            return res.status(400).json({ success: false, message: 'Please provide credentials.' });
        }

        const user = await User.findOne({ $or: [{ email: email_phone }, { phone: email_phone }] });
        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid credentials.' });
        }

        if (user.status === 'blocked') {
            return res.status(403).json({ success: false, message: 'Your account is blocked! Please contact management.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Invalid credentials.' });
        }

        // Set session
        req.session.user = {
            _id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            profile: user.profile,
            address: user.address,
            pincode: user.pincode,
            dob: user.dob
        };

        res.json({ success: true, message: 'Logged in successfully!' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Login failed.' });
    }
});

// Mock forgot password
router.post('/api/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ success: false, message: 'Email not found.' });
        }
        res.json({ success: true, message: 'Mock link dispatched.' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error processing request.' });
    }
});

// Save Contact Query
router.post('/api/contact/query', async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;
        if (!name || !email || !subject || !message) {
            return res.status(400).json({ success: false, message: 'Please fill out all fields.' });
        }
        await UserQuery.create({ name, email, subject, message });
        res.json({ success: true, message: 'Query saved successfully.' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to submit query.' });
    }
});

// AJAX Rooms Filter with Check-In Availability Dates
router.post('/api/rooms/filter', async (req, res) => {
    try {
        const { checkin, checkout, adults, children, facilities } = req.body;

        const query = { status: true };

        // 1. Filter by capacity
        if (adults) query.adult = { $gte: parseInt(adults) };
        if (children) query.children = { $gte: parseInt(children) };

        // 2. Filter by facilities
        if (facilities && facilities.length > 0) {
            query.facilities = { $all: facilities };
        }

        // Fetch matched rooms based on features/facilities
        let matchedRooms = await Room.find(query).populate('features').populate('facilities');

        // 3. Filter by Date range availability
        if (checkin && checkout) {
            const checkinDate = new Date(checkin);
            const checkoutDate = new Date(checkout);

            if (checkinDate < checkoutDate) {
                // Find all active bookings overlapping with selected date range
                const overlappingBookings = await Booking.find({
                    booking_status: { $in: ['booked', 'arrived'] },
                    check_in: { $lt: checkoutDate },
                    check_out: { $gt: checkinDate }
                });

                // Count active bookings per room
                const bookingCounts = {};
                overlappingBookings.forEach(b => {
                    const rid = b.room.toString();
                    bookingCounts[rid] = (bookingCounts[rid] || 0) + 1;
                });

                // Exclude rooms where active bookings equal or exceed total quantity
                matchedRooms = matchedRooms.filter(room => {
                    const bookedQty = bookingCounts[room._id.toString()] || 0;
                    return room.quantity > bookedQty;
                });
            }
        }

        res.json(matchedRooms);
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to filter rooms.' });
    }
});

// simulated Payment and Booking checkout
router.post('/pay-now', isUserLoggedIn, async (req, res) => {
    try {
        const { room_id, price, name, phone, address, check_in, check_out } = req.body;

        if (!room_id || !price || !name || !phone || !address || !check_in || !check_out) {
            return res.status(400).send('Please fill in all details.');
        }

        const room = await Room.findById(room_id);
        if (!room) return res.status(404).send('Room not found.');

        const checkInDate = new Date(check_in);
        const checkOutDate = new Date(check_out);

        const timeDiff = checkOutDate.getTime() - checkInDate.getTime();
        const nights = Math.ceil(timeDiff / (1000 * 3600 * 24));
        const amount = nights * parseFloat(price);

        // Generate unique credentials
        const bookingId = 'BK_' + Date.now() + Math.floor(Math.random() * 100);
        const transId = 'TXN_' + Date.now() + Math.floor(Math.random() * 1000);

        // Save Booking
        await Booking.create({
            booking_id: bookingId,
            user: req.session.user._id,
            room: room_id,
            check_in: checkInDate,
            check_out: checkOutDate,
            amount: amount,
            trans_id: transId,
            user_name: name,
            user_phone: phone,
            user_address: address,
            booking_status: 'booked',
            trans_status: 'success'
        });

        res.redirect('/bookings');
    } catch (err) {
        res.status(500).send('Booking failed.');
    }
});

// Cancel User Booking
router.post('/api/bookings/cancel/:id', isUserLoggedIn, async (req, res) => {
    try {
        const booking = await Booking.findOne({ _id: req.params.id, user: req.session.user._id });
        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking record not found.' });
        }

        if (new Date(booking.check_in) <= new Date()) {
            return res.status(400).json({ success: false, message: 'Cannot cancel booking after check-in date has commenced.' });
        }

        booking.booking_status = 'cancelled';
        booking.refund = false; // Pending admin approval
        await booking.save();

        res.json({ success: true, message: 'Reservation cancelled successfully.' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to process cancellation.' });
    }
});

// AJAX profile update
router.post('/api/profile/update', isUserLoggedIn, upload.single('profile'), async (req, res) => {
    try {
        const { name, phone, dob, pincode, address } = req.body;
        const user = await User.findById(req.session.user._id);

        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

        // Check phone duplicate
        if (phone !== user.phone) {
            const phoneExists = await User.findOne({ phone, _id: { $ne: user._id } });
            if (phoneExists) {
                return res.status(400).json({ success: false, message: 'Phone number already linked to another account.' });
            }
        }

        user.name = name || user.name;
        user.phone = phone || user.phone;
        user.dob = dob ? new Date(dob) : user.dob;
        user.pincode = pincode || user.pincode;
        user.address = address || user.address;

        if (req.file) {
            user.profile = req.file.filename;
        }

        await user.save();

        // Update session
        req.session.user = {
            _id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            profile: user.profile,
            address: user.address,
            pincode: user.pincode,
            dob: user.dob
        };

        res.json({ success: true, message: 'Profile updated.' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to update profile.' });
    }
});

// AJAX change password
router.post('/api/profile/change-password', isUserLoggedIn, async (req, res) => {
    try {
        const { old_pass, new_pass } = req.body;
        const user = await User.findById(req.session.user._id);

        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

        const isMatch = await bcrypt.compare(old_pass, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Old password is incorrect.' });
        }

        user.password = await bcrypt.hash(new_pass, 10);
        await user.save();

        res.json({ success: true, message: 'Password updated successfully!' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to update password.' });
    }
});

module.exports = router;
