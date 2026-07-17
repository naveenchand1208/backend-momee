const jwt = require('jsonwebtoken')
const secret = process.env.JWT_SECRET
const options = {
    algorithms: ['HS256']
}
const Auth = require('../models/auth')
const moment = require('moment');

const authorization = async (req, res, next) => {
    console.log('req.path', req.path)
    //New user allow user api's 
    if (req.path == '/api/auth/register' || req.path == '/api/auth/login' ||
        req.path == '/api/auth/getToken' || req.path == '/api/auth/verifyEmail' || req.path == '/api/webhook/razorpay-webhook' || req.path == '/api/auth/decodeToken' || req.path == '/api/webhooks/revenuecat' ) {
        return next()
    }
    // to allow only regigstered user
    const authorizationHeader = req.headers.authorization;
    console.log('authorizationHeader', authorizationHeader)
    if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
        console.log('coming')
        return res.status(401).json({ message: 'Unauthorized' });
    }
    const token = authorizationHeader.slice(7);
    console.log('token', token)
    jwt.verify(token, secret, options, async (err, decoded) => {
        if (err) {
            console.log('err', err)
            return res.status(401).json({ message: 'Unauthorized' });
        }
        req.user = decoded;
        // console.log('req.user', req.user)
        const user = await Auth.findOne({ id: req.user.userid });
        // console.log('user', user)
        if (user && user.token !== "" && user.status === 'Active') {
            user.set('lastLogin', moment().format('DD-MM-YYYY HH:mm'));
            user.activeUser = true;
            user.subscribed = true;
            await user.save();
            req.userDetails = user;
            next();
        } else {
            console.log('coming-2')
            return res.status(401).json({ message: 'Unauthorized' });
        }
    });
}

module.exports = { authorization };