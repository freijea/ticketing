const crypto = require('crypto');
const { promisify, isRegExp } = require('util');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

const factory = require('./handlerFactory');

const User = require('../models/userModel');
const incFields = () => {
    return ['name', 'nickname', 'email', 'photo', 'password', 'passwordConfirm', 'origin'];
}

const verify = async(client, idToken, audience) => {
        const ticket = await client.verifyIdToken({
            idToken,
            audience
        });
        const payload = ticket.getPayload();
        return payload;
};

const signToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    });
}

const createSendToken = (req, user, statusCode, res) => {
    const token = signToken(user._id);

    const cookieOptions = {
        expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 *60 * 1000),
        httpOnly: true
    };

    if(process.env.NODE_ENV === 'production') {
        cookieOptions.secure = true;
    }

    res.cookie('jwt', token, cookieOptions);

    if(req.url === '/registrar-google') {
        return res.status(statusCode)
        .json({
            status: 'success',
            token,
            data: {
                user
            }
        });
    }

    return res.status(statusCode)
    .json({
        status: 'success',
        token
    });
};

exports.logout = (req, res) => {
    const cookieOptions = {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true
    };

    res.cookie('jwt', '', cookieOptions)

    res.status(200)
       .json({
           status: 'success'
       });
}

exports.getAll = factory.getAll(User);
exports.getUser = factory.getOne(User);
exports.getUserByEmail = factory.getOneByField(User);

exports.signupGoogle = catchAsync(async (req, res, next) => {
    const includedFields = incFields();
    const requestBodyChanged = {};
    req.body.password = crypto.randomBytes(32).toString('hex');
    req.body.passwordConfirm = req.body.password;

    includedFields.forEach((el) => {
        requestBodyChanged[el] = req.body[el]
    });

    let newUser = await User.create(requestBodyChanged);

    res.status(200)
       .json({
           status: 'success'
       })

    //return createSendToken(req,newUser,201,res)

});


exports.loginGoogle = catchAsync(async (req, res, next) => {
    const client = new OAuth2Client(process.env.CLIENT_ID_GOOGLE);
    const verification = await verify(client, req.body.idToken, process.env.CLIENT_ID_GOOGLE);

    if(!verification.email) {
        return next(new AppError('Por favor realize o login com o seu email do Google.', 400));
    }

    const dataObjct = await axios.get(`${req.protocol}://${req.get('host')}/api/v1/usuarios/${verification.email}`)
    let user = dataObjct.data.data.usuarios

    if(!user) {
        user = await axios({
            method: 'post',
            url: `${req.protocol}://${req.get('host')}/api/v1/usuarios/registrar-google`,
            data: {
                name: verification.name,
                nickname: verification.given_name,
                email: verification.email,
                photo: verification.picture,
                origin: 'google'
            }
          });

    };

    return createSendToken(req,user,200,res);

});

exports.isLoggedIn = catchAsync(async (req, res, next) => {
    //1) Getting token and check of it's there
    if(req.cookies.jwt) {
        // Verify token
        const decoded = await promisify(jwt.verify)(req.cookies.jwt, process.env.JWT_SECRET);

        //3) Check if user still exists
        const user = await User.findById(decoded.id);
        if(!user) {
            return next();
        }

        //4) Check if user change password after the token was issues
        if(user.changedPasswordAfter(decoded.iat)) {
            return next();
        };

        //5) There is a lopgged in use
        res.locals.user = user;

    }

    next();
});
