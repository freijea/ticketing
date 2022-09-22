const axios = require('axios');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getInformation = catchAsync(async (req, res, next) => {
    const reqInfo = {
        url: req.url,
        googleAppID: process.env.CLIENT_ID_GOOGLE
    }

    req.info = reqInfo;

    next();
});

exports.getOverview = catchAsync(async (req, res, next) => {
    res.status(200)
       .set({
           'Content-Security-Policy': `connect-src https://apis.google.com/ ${req.protocol}://${req.get('host')}/`
        })
       .render('overview', {
           title: 'All Tours',
           info: req.info
       })
});

exports.getLoginForm = catchAsync(async (req,res,next) => {
    const title = 'Entre na sua conta';
    res.status(200)
        .set({
            'Content-Security-Policy': `connect-src https://apis.google.com/ ${req.protocol}://${req.get('host')}/`
        })
       .render('login', {
           title,
           info: req.info,
           jwt_secret: process.env.JWT_SECRET
       });
})