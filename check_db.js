const mongoose = require('mongoose');
require('dotenv').config({ path: 'C:/Users/VICTUS/Desktop/BEST/backend/.env' });
const User = require('C:/Users/anas-/OneDrive/Desktop/BEST/backend/models/User');

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log('Connected to DB');

        // Find a specialist
        const specialist = await User.findOne({ role: 'specialist' });
        if (!specialist) {
            console.log('No specialist found');
            process.exit();
        }
        console.log(`Checking specialist: ${specialist.name} (${specialist._id})`);

        // Check linked parents
        console.log(`Linked Parents Count (in array): ${specialist.linkedParents ? specialist.linkedParents.length : 0}`);

        if (specialist.linkedParents && specialist.linkedParents.length > 0) {
            // Populate
            await specialist.populate('linkedParents');
            console.log('Linked Parents Details:');
            specialist.linkedParents.forEach(p => {
                console.log(` - ${p.name} (${p._id})`);
            });
        } else {
            console.log('Specialist has no linked parents in the database.');

            // Let's find some parents and link them for testing
            const parents = await User.find({ role: 'parent' }).limit(3);
            if (parents.length > 0) {
                console.log(`Found ${parents.length} parents to link...`);
                specialist.linkedParents = parents.map(p => p._id);
                await specialist.save();
                console.log('Successfully linked parents to specialist. Please refresh the page.');
            } else {
                console.log('No parents found in database to link.');
            }
        }

        process.exit();
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
