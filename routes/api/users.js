const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('config');

const User = require('../../models/User');


router.post('/', 
async (req, res) => {
    try {
        console.log("hello");
        const { email, username, password } = req.body;

        let user = await User.findOne({ email });

        if (user) {
            console.log("User already exists", user.email);
            return res.status(400).json({ msg: 'User already exists' });
        }
        
        user = new User({
            email,
            username,
            password
        });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();

        const payload = {
            user: {
                id: user.id
            }
        };

        jwt.sign(
            payload,
            config.get('jwtSecret'),
            { expiresIn: '5 days' },
            (err, token) => {
                if(err) throw err;
                res.json({token});
            }
        );
    }
    catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;