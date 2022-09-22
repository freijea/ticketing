const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');


const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'O usuário deve ter um nome'],
        trim: true, 
        lowercase: true
    },
    nickname: {
        type: String,
        trim: true,
        lowercase: true,
        trim: true
    },
    email: {
        type: String,
        required: [true, 'O usuário deve ter um e-mail.'],
        unique: true,
        trim: true,
        lowercase: true,
        validate: [validator.isEmail, 'Você deve preencher um e-mail válido.']
    },
    photo: String,
    origin: {
        type: String,
        enum: ['google', 'vanilla'],
        message: 'Perfil deve ser: google ou vanilla',
        default: 'vanilla'
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        message: 'Perfil deve ser: usuário ou administrador',
        default: 'user'
    },
    password: {
        type: String,
        required: [true, 'O usuário deve ter uma senha.'],
        trim: true,
        minlength: [8, 'A senha deve ter no mínimo 8 caracteres.'],
        select: false
    },
    passwordConfirm: {
        type: String,
        required: [true, 'Você deve confirmar a senha.'], // is required input not to persist in database
        validate: {
            //This only works on SAVE and CREATE !!!
            message: 'Senhas não conferem',
            validator: function(val) {
                return val === this.password;
            }
        }
    },
    changedPasswordAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    unsuccessfullyAttempts: {
        type: Number,
        default: 0
    },
    loginBlockExpires: Date,
    rateLimitWindown: Date,
    rateLimitAttempts: {
        type: Number,
        default: 0
    },
    confirmationToken: String,
    confirmationTokenSentToUser: String
});


//DOCUMENT MIDDLEWARE: runs before .save() and .create()
userSchema.pre('save', async function(next) {

    if(this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 12);

        this.passwordConfirm = undefined;
    }

    next();
});


//INSTANCE METHOD
userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
    return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
    if(this.changedPasswordAt) {
        const changedTimestamp = parseInt(this.changedPasswordAt.getTime()/1000);
        return JWTTimestamp < changedTimestamp;
    }

    return false;
}

const User = mongoose.model('User', userSchema);

module.exports = User;