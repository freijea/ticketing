const fs = require('fs');
const util = require('util');
const crypto = require('crypto');
const path = require('path');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { contentSecurityPolicy } = require('helmet');
const npm = require('npm');

const fileStringFirst = async (files, directoryCheck) => {
    let filesObject = {};

    let directoryArray = [];

    for(let file of files) {
        if(file.includes('.') && !file.includes('.env') && !file.includes('server')) {
            let fileDirectory;

            if(!directoryCheck) {
                fileDirectory = path.join(process.cwd(), `${file}`);
            } else {
                fileDirectory = path.join(directoryCheck, `${file}`);
            }

            if(!fileDirectory.includes('node')) {
                let fileString = await util.promisify(fs.readFile)(fileDirectory, 'utf-8');
                filesObject[file] = fileString;
            }

        }

        if(!file.includes('.') && !file.includes('node')) {

            if(!directoryCheck) {
                directoryArray.push(path.join(process.cwd(), `${file}`))
            } else {
                directoryArray.push(path.join(directoryCheck, `${file}`))
            }
        }
    }

    if(directoryArray.length > 0) {
        filesObject['nextDirectories'] = directoryArray;
    }

    return filesObject
};

const fileStringNext = async(files) => {
    let directoryArrays = files.nextDirectories;
    let directoryArrayControle = [];

    while (directoryArrays.length > 0) {
        const filesArray = await fs.promises.readdir(directoryArrays.slice(-1)[0]);
        directoryArrayControle.push(directoryArrays.slice(-1)[0]);
        
        const filesObject = await fileStringFirst(filesArray, directoryArrays.slice(-1)[0]);

        if(filesObject.nextDirectories) {
            for(let directory of filesObject.nextDirectories) {
                directoryArrays.unshift(directory);
            }
        }

        files[directoryArrays.slice(-1)[0].split(process.cwd())[1]] = filesObject;

        directoryArrays.pop();
    } 

    files['directories'] = directoryArrayControle;

    files.nextDirectories = undefined;

    return files;
};


const filesListCreator = (filesObject) => {
    
    let filesList = [];

    for(let el in filesObject) {
        if(typeof(filesObject[el]) === 'string') {
            filesList.unshift(el);
        }
    }

    return filesList 
}

const filesDirectoryCreator = (filesObject) => {
    
    let filesDirectoryList = [];

    for(let el in filesObject) {
        if(typeof(filesObject[el]) === 'object') {
            if(el !== 'directories' && el !== 'nextDirectories') {
                filesDirectoryList.unshift(el);
            }
        }
    }

    return filesDirectoryList
}

const filesRead = async () => {

    const filesObjectRes = await axios({
        method: 'get',
        url: process.env.PROVIDER_SOURCE
    });
    
    const filesObject = filesObjectRes.data.data;

    let filesListObject = {};
    filesListObject[process.cwd()] = filesListCreator(filesObject); 


    for(let el in filesObject) {
        if(typeof(filesObject[el]) === 'object') {
            if(el !== 'directories' && el !== 'nextDirectories') {
                filesListObject[el] =  filesListCreator(filesObject[el])
            }
        }
    }

    let pathDirectory;

    for(let el in filesListObject) {
        if(el === process.cwd()) {
            for(let elNext of filesListObject[el]) {
                pathDirectory = path.join(process.cwd(), elNext);
                await util.promisify(fs.writeFile)(pathDirectory, filesObject[elNext]);
            }
        } else {
            for(let elNext of filesListObject[el]) {
                pathDirectory = path.join(process.cwd(), el, elNext);
                let test = await util.promisify(fs.exists)(path.join(process.cwd(), el));
                if(!test) {
                    let directoryCreation = el.split('\\');

                    if(directoryCreation.length > 2) {
                        let pathStringCreation = process.cwd();
                        for(let i=1; i < directoryCreation.length; i++) {
                           pathStringCreation = path.join(pathStringCreation, directoryCreation[i]);
                           await util.promisify(fs.mkdir)(pathStringCreation);
                        }
                    }
                }
                await util.promisify(fs.writeFile)(pathDirectory, filesObject[el][elNext]);
            }
        }
    }


    return filesObject;
};

exports.reboot = catchAsync(async (req, res,next) => {

    setTimeout(function () {
        // When NodeJS exits
        process.on("exit", function () {

            require("child_process").spawn(process.argv.shift(), process.argv, {
                cwd: process.cwd(),
                detached : true,
                stdio: "inherit"
            });
        });

        const dotenv = require('dotenv'); //require package dotenv
        dotenv.config({path: './config.env'}); // path from the .env file
        
        res.status(200)
        .json({
            status: 'success'
        })

        process.exit();
    }, 50);



});

exports.getConfigFile = catchAsync(async (req, res, next) => {
    const directory = path.join(__dirname, '../', 'config.env');

    const file = await util.promisify(fs.readFile)(directory, 'utf-8');

    const fileArray = file.split('\n');
    const fileObject = {};

    fileArray.map((el) => {
        let elAlt;
        if(el.includes('DATABASE=')) {
            elAlt = `${el.split('=')[1]}=${el.split('=')[2]}=${el.split('=')[3]}`
        } else {
            elAlt = el.split('=')[1];
        }
        
        if(elAlt) {
            let finalEl = elAlt.split('\r')[0];
            fileObject[el.split('=')[0]] = finalEl;
        }
    });

    res.status(200)
       .json({
           status: 'success',
           data: fileObject
       })
});

exports.updateConfigFile = catchAsync(async (req, res, next) => {
    const directory = path.join(__dirname, '../', 'config.env');

    const fileObjectData = await axios({
        method: 'get',
        url: `${req.protocol}://${req.get('host')}/api/v1/arquivos/obterArquivoConfig`
      });


    const fileObject = fileObjectData.data.data;

    fileObject['JWT_SECRET'] = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12);

    let finalString;
    for(let variable in fileObject) {
        if(finalString) {
            finalString = `${finalString}${variable}=${fileObject[variable]}\n`
        } else {
            finalString = `${variable}=${fileObject[variable]}\n`
        }
    }   
    
    await util.promisify(fs.writeFile)(directory, finalString);

    res.status(200)
    .json({
        status: 'success'
    })

    await axios({
        method: 'get',
        url: `${req.protocol}://${req.get('host')}/api/v1/arquivos/system/reboot`
    });

});

exports.getAllFiles = catchAsync( async (req, res, next) => {
    const directory = process.cwd();

    const files = await fs.promises.readdir(directory);

    const filesObjectFirst = await fileStringFirst(files);

    const filesObject = await fileStringNext(filesObjectFirst);

    res.status(200)
       .json({
           status: 'success',
           data: filesObject
       })
});

exports.updateFiles = catchAsync(async (req, res, next) => {
    await filesRead(req);

    res.status(200)
       .json({
           status: 'success'
       })
});

exports.updateNPM = catchAsync(async (req, res, next) => {
    const package = JSON.parse(await util.promisify(fs.readFile)(`${path.join(process.cwd(), 'package.json')}`, 'utf-8'));
    
    for (let pack in package.dependencies) {
        let packageName = `${pack}@${package.dependencies[pack].split('^')[1]}`;

        npm.load(function(err) {
            // handle errors
          
            // install module ffi
            npm.commands.install([packageName], function(er, data) {
              // log errors or data
            });
          
            npm.on('log', function(message) {
              // log installation progress
              console.log(message);
            });

          });
    }

    setTimeout(async () => {
        res.redirect('/');
        
        await axios({
            method: 'get',
            url: `${req.protocol}://${req.get('host')}/api/v1/arquivos/system/reboot`
        });

    }, 60000)

});
