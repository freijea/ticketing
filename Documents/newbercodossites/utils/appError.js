class AppError extends Error {
    constructor(message, statusCode) {
        super(message); //Here super() is called to avoid duplicating the constructor parts' that are common between Error and AppError

        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail': 'error' // is ternary
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor); // when new object is created and the constructor function is called and that function called will not appear in stackTrace abd will not polutated it.
    }
};

module.exports = AppError;