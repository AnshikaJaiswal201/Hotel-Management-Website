const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Models
const Admin = require('./models/Admin');
const Setting = require('./models/Setting');
const ContactDetail = require('./models/ContactDetail');
const Feature = require('./models/Feature');
const Facility = require('./models/Facility');
const Room = require('./models/Room');
const UserQuery = require('./models/UserQuery');
const User = require('./models/User');
const Booking = require('./models/Booking');

// SVG Icon Data for Facilities
const svgs = {
    'wifi.svg': `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="currentColor" class="bi bi-wifi" viewBox="0 0 16 16">
  <path d="M15.384 6.115a.485.485 0 0 0-.047-.736A12.44 12.44 0 0 0 8 3 12.44 12.44 0 0 0 .663 5.379a.485.485 0 0 0-.048.736.518.518 0 0 0 .668.05A11.45 11.45 0 0 1 8 4c2.507 0 4.827.802 6.716 2.164.205.148.49.13.668-.049z"/>
  <path d="M13.229 8.271a.482.482 0 0 0-.063-.745A9.46 9.46 0 0 0 8 6c-1.905 0-3.68.56-5.166 1.526a.48.48 0 0 0-.063.745.525.525 0 0 0 .652.065A8.46 8.46 0 0 1 8 7a8.46 8.46 0 0 1 4.577 1.336c.205.132.48.108.652-.065zm-2.183 2.183c.226-.226.185-.605-.1-.75A6.47 6.47 0 0 0 8 9c-1.187 0-2.302.318-3.266.871-.285.166-.327.545-.1.75a.524.524 0 0 0 .706.024A5.47 5.47 0 0 1 8 10a5.47 5.47 0 0 1 2.66 1.079.524.524 0 0 0 .707-.025zM9.06 12.442a.497.497 0 0 0-.075-.745 3.5 3.5 0 0 0-1.97-.478c-.733.023-1.41.226-1.97.478a.497.497 0 0 0-.075.745.523.523 0 0 0 .72.034A2.5 2.5 0 0 1 8 12c.5 0 .964.146 1.34.408.2.13.488.11.72-.034z"/>
</svg>`,

    'ac.svg': `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="currentColor" viewBox="0 0 24 24">
  <path d="M19 2H5c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 12H5V4h14v10zm-7-2c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm0-4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm6.5 10c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5.67-1.5 1.5-1.5 1.5.67 1.5 1.5zm-11 0c0 .83-.67 1.5-1.5 1.5S5 22.83 5 22s.67-1.5 1.5-1.5 1.5.67 1.5 1.5z" />
</svg>`,

    'tv.svg': `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="currentColor" viewBox="0 0 24 24">
  <path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 1.99-.9 1.99-2L23 5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z"/>
</svg>`,

    'geyser.svg': `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="currentColor" viewBox="0 0 24 24">
  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 16h-2v-2h2v2zm0-4h-2V7h2v7z"/>
</svg>`,

    'spa.svg': `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="currentColor" viewBox="0 0 24 24">
  <path d="M12 3c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm8.5 7.5c-.83 0-1.5.67-1.5 1.5v5c0 1.66-1.34 3-3 3H8c-1.66 0-3-1.34-3-3v-5c0-.83-.67-1.5-1.5-1.5S2 11.17 2 12v5c0 3.31 2.69 6 6 6h8c3.31 0 6-2.69 6-6v-5c0-.83-.67-1.5-1.5-1.5zM12 9c-2.21 0-4 1.79-4 4v3h8v-3c0-2.21-1.79-4-4-4z"/>
</svg>`,

    'gym.svg': `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="currentColor" viewBox="0 0 24 24">
  <path d="M20.5 11H19V7c0-1.1-.9-2-2-2h-3V3.5c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5V5H8c-1.1 0-2 .9-2 2v4H3.5C2.67 11 2 11.67 2 12.5S2.67 14 3.5 14H6v4c0 1.1.9 2 2 2h3v1.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V20h3c1.1 0 2-.9 2-2v-4h1.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5zM8 7h8v4H8V7zm8 10H8v-4h8v4z"/>
</svg>`,

    'room_service.svg': `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="currentColor" viewBox="0 0 24 24">
  <path d="M22 19h-1.07c-.45-2.73-2.65-4.88-5.43-5.34V12h-3v1.66c-2.78.46-4.98 2.61-5.43 5.34H2c-.55 0-1 .45-1 1s.45 1 1 1h20c.55 0 1-.45 1-1s-.45-1-1-1zm-10-8c2.76 0 5-2.24 5-5S14.76 1 12 1 7 3.24 7 6s2.24 5 5 5z"/>
</svg>`,

    'pool.svg': `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="currentColor" viewBox="0 0 24 24">
  <path d="M20 2c0 1.1-.9 2-2 2h-1c-1.1 0-2-.9-2-2s-.9-2-2-2-2 .9-2 2h-1c-1.1 0-2-.9-2-2S7 0 6 0 4 .9 4 2H3c-1.1 0-2 .9-2 2s.9 2 2 2h14c1.1 0 2-.9 2-2s-.9-2-2-2zm-18 10c0-1.1.9-2 2-2h16c1.1 0 2 .9 2 2s-.9 2-2 2H4c-1.1 0-2-.9-2-2zm18 6H4c-1.1 0-2-.9-2-2s.9-2 2-2h16c1.1 0 2 .9 2 2s-.9 2-2 2z"/>
</svg>`
};

const seed = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/bellona_hotel');
        console.log('Successfully connected to MongoDB.');

        // 1. Clean Collections
        console.log('Cleaning existing data...');
        await Admin.deleteMany({});
        await Setting.deleteMany({});
        await ContactDetail.deleteMany({});
        await Feature.deleteMany({});
        await Facility.deleteMany({});
        await Room.deleteMany({});
        await UserQuery.deleteMany({});
        await User.deleteMany({});
        await Booking.deleteMany({});
        console.log('Database cleaned.');

        // 2. Create Uploads Folders
        const uploadsDir = path.join(__dirname, 'public', 'uploads');
        const usersDir = path.join(uploadsDir, 'users');
        const roomsDir = path.join(uploadsDir, 'rooms');
        const facilitiesDir = path.join(uploadsDir, 'facilities');

        fs.mkdirSync(usersDir, { recursive: true });
        fs.mkdirSync(roomsDir, { recursive: true });
        fs.mkdirSync(facilitiesDir, { recursive: true });
        console.log('Upload directories created.');

        // 3. Write Facility SVG Icons
        console.log('Writing facility SVG icons to disk...');
        for (const [filename, content] of Object.entries(svgs)) {
            const filepath = path.join(facilitiesDir, filename);
            fs.writeFileSync(filepath, content);
        }
        console.log('Facility icons written.');

        // 4. Seed Admin
        console.log('Seeding default Admin...');
        const adminPassHashed = await bcrypt.hash('admin123', 10);
        const admin = await Admin.create({
            username: 'admin',
            password: adminPassHashed
        });
        console.log('Admin seeded (username: admin, password: admin123).');

        // 5. Seed Settings
        console.log('Seeding default Settings...');
        await Setting.create({
            site_title: 'Bellona Luxury Hotel',
            site_about: 'Bellona Luxury Hotel stands as an oasis of premium elegance and elite hospitality. Nested in Prayagraj, we curate experiences that combine luxury, comfort, and personalized details to make every stay unforgettable. Indulge in world-class amenities, gourmet dining, and our state-of-the-art facilities.',
            shutdown: false
        });
        console.log('Settings seeded.');

        // 6. Seed ContactDetails
        console.log('Seeding default Contact Details...');
        await ContactDetail.create({
            address: 'XYZ, Prayagraj Uttar Pradesh, India',
            gmap: 'https://maps.app.goo.gl/2WkzEWY9Rvkr8vq98',
            pn1: '+915678943288',
            pn2: '+915678943281',
            email: 'ask.aanshikajaiswal2005@gmail.com',
            fb: 'https://facebook.com',
            insta: 'https://instagram.com',
            tw: 'https://twitter.com',
            iframe: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d230660.8692412711!2d81.80158454999999!3d25.402263750000024!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x398534c9b20bd49f%3A0xa2237856ad4041a!2sPrayagraj%2C%20Uttar%20Pradesh!5e0!3m2!1sen!2sin!4v1739418266973!5m2!1sen!2sin'
        });
        console.log('Contact Details seeded.');

        // 7. Seed Features
        console.log('Seeding default Features...');
        const f1 = await Feature.create({ name: '1 Bathroom' });
        const f2 = await Feature.create({ name: '1 Balcony' });
        const f3 = await Feature.create({ name: '1 Sofa' });
        const f4 = await Feature.create({ name: '2 Bathrooms' });
        const f5 = await Feature.create({ name: 'Kitchenette' });
        console.log('Features seeded.');

        // 8. Seed Facilities
        console.log('Seeding default Facilities...');
        const fac1 = await Facility.create({
            name: 'WiFi',
            icon: 'wifi.svg',
            description: 'Enjoy high-speed, secure, and complimentary wireless internet access across all rooms and common areas.'
        });
        const fac2 = await Facility.create({
            name: 'Air Conditioner',
            icon: 'ac.svg',
            description: 'Indulge in absolute comfort with premium in-room cooling and heating climate control systems.'
        });
        const fac3 = await Facility.create({
            name: 'Television',
            icon: 'tv.svg',
            description: 'Smart flat-screen television with satellite channels, Netflix connection, and screen mirroring support.'
        });
        const fac4 = await Facility.create({
            name: 'Geyser',
            icon: 'geyser.svg',
            description: '24/7 instant hot water running systems for your baths and washroom amenities.'
        });
        const fac5 = await Facility.create({
            name: 'Spa & Wellness',
            icon: 'spa.svg',
            description: 'Rejuvenate your body and soul at our wellness center offering deep massage therapies and premium care.'
        });
        const fac6 = await Facility.create({
            name: 'Cardio Gym',
            icon: 'gym.svg',
            description: 'Access top-tier cardiovascular and strength training gym equipment open 24 hours for fitness enthusiasts.'
        });
        const fac7 = await Facility.create({
            name: 'Room Service',
            icon: 'room_service.svg',
            description: 'Chef-crafted in-room dining, continental breakfast, and refreshments delivered directly to your bed.'
        });
        const fac8 = await Facility.create({
            name: 'Swimming Pool',
            icon: 'pool.svg',
            description: 'Unwind at our large outdoor temperature-regulated pool with sun loungers and pool-side refreshments.'
        });
        console.log('Facilities seeded.');

        // Copy room placeholders from images to uploads/rooms
        const imagesDir = path.join(__dirname, 'public', 'images');
        const room1Src = path.join(imagesDir, 'room1.jpeg');
        const room2Src = path.join(imagesDir, 'room2.jpeg');
        const room1Dest = path.join(roomsDir, 'room1.jpeg');
        const room2Dest = path.join(roomsDir, 'room2.jpeg');

        if (fs.existsSync(room1Src)) {
            fs.copyFileSync(room1Src, room1Dest);
        }
        if (fs.existsSync(room2Src)) {
            fs.copyFileSync(room2Src, room2Dest);
        }
        console.log('Room image assets copied to uploads/rooms.');

        // 9. Seed Rooms
        console.log('Seeding default Rooms...');
        
        await Room.create({
            name: 'Simple Room',
            area: 250,
            price: 15000,
            quantity: 5,
            adult: 2,
            children: 1,
            description: 'Our Simple Room offers cozy accommodation designed for budget-conscious business or leisure travelers. Features modern minimalist furniture, single bathroom, high-speed WiFi, and air conditioning.',
            features: [f1._id, f3._id],
            facilities: [fac1._id, fac2._id, fac3._id, fac4._id],
            images: ['room1.jpeg'],
            thumbImage: 'room1.jpeg',
            status: true
        });

        await Room.create({
            name: 'Deluxe Suite',
            area: 450,
            price: 25000,
            quantity: 8,
            adult: 3,
            children: 2,
            description: 'Experience elevated comfort in our Deluxe Suite. Boasting a spacious room plan, private balcony with views, premium furnishings, double bathrooms, smart TV, WiFi, and dedicated room service.',
            features: [f2._id, f3._id, f4._id],
            facilities: [fac1._id, fac2._id, fac3._id, fac4._id, fac7._id],
            images: ['room2.jpeg'],
            thumbImage: 'room2.jpeg',
            status: true
        });

        await Room.create({
            name: 'Presidential Suite',
            area: 800,
            price: 50000,
            quantity: 3,
            adult: 4,
            children: 3,
            description: 'Indulge in absolute luxury with our Presidential Suite. Spanning a vast area, this suite features a fully equipped kitchenette, luxury seating areas, premium panoramic views, private balcony, all high-tier amenities, and complimentary access to the private gym, pool, and spa.',
            features: [f2._id, f3._id, f4._id, f5._id],
            facilities: [fac1._id, fac2._id, fac3._id, fac4._id, fac5._id, fac6._id, fac7._id, fac8._id],
            images: ['room1.jpeg', 'room2.jpeg'],
            thumbImage: 'room1.jpeg',
            status: true
        });

        console.log('Rooms seeded successfully.');
        console.log('Database Seeding Completed Successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
};

seed();
