const AppError = require("../utils/appError");

const handleCastErrorDB = (err) => {
    const message = `${err.path}`.includes('_id') ? `Invalid ID Tour: ${err.value}.` :`Invalid ${err.path}: ${err.value}.`;
    return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
    const value = err.errmsg.match(/(["'])(?:(?=(\\?))\2.)*?\1/)[0].split('"')[1];
    const message = `Duplicate field value: ${value}. Please use another value!`
    return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
    const errors = Object.values(err.errors).map(el => el.message); // first will separate all objects into err.errors array and after will iterate over each array element to check if el.message is true, if it's true will return their value, so just if el.message exists.
    const message = `Invalid input data. ${errors.join('. ')}`;
    return new AppError(message, 400);
};

const handleJWTError = () => {
    const message = 'Invalid token. Please log in again!';
    return new AppError(message, 401);
};

const handleJWTExpiredError = () => {
    const message = 'Token expired. Please log in again';
    return new AppError(message, 401);
}

const sendErrorDev = (err,res) => {
    res.status(err.statusCode)
    .json({
        status: err.status,
        error: err,
        message: err.message,
        stack: err.stack
    });
};

const sendErrorProd = (err, res) => {
    //Operational, trusted error: send message to client
    if(err.isOperational) {
        res.status(err.statusCode)
        .json({
         status: err.status,
         message: err.message
     })

    // Programming or other unknown error: don't leak error details
    } else {
        // 1) Log err
        console.error('ERROR ', err);

        // 2) Send generic message
        res.status(500)
           .json({
               status: 'error',
               message: 'Something went very wrong :('
           })
    }
}


module.exports = (err, req, res, next) => { //specifying four parameters (err, req, res, next) Express will know it is a error handling middleware
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    if(process.env.NODE_ENV === 'development') {
        sendErrorDev(err,res);

    } else if(process.env.NODE_ENV === 'production') {
        let error = {...err};
        error.message = err.message;
        error.name = err.name;
        error.errmsg = err.errmsg;

        if(error.name === 'CastError') {
            error = handleCastErrorDB(error);
        }

        if(error.code === 11000) {
            error = handleDuplicateFieldsDB(error);
        }

        if(error.name === 'ValidationError') {
            error = handleValidationErrorDB(error);
        }

        if(error.name === 'JsonWebTokenError') {
            error = handleJWTError();
        }

        if(error.name === 'TokenExpiredError') {
            error = handleJWTExpiredError();
        }

        sendErrorProd(error,res);

    }
};