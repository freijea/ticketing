const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');
const catchAsync = require('../utils/catchAsync');

const urlName = (url, archive) => {
    const urlName = [
        '/api/v1/usuarios'
    ]

    const docName = {
        '/api/v1/usuarios': 'usuarios'
    }

    doc = {};

    urlName.forEach((element,i) => {
        if(url.includes(element)) {
            doc[docName[element]] = archive
        }
    });

    if(Object.keys(doc).length === 0) {
        console.log(Object.keys(doc));
        doc['doc'] = archive
    }

    return doc;
};


exports.deleteOne = Model => 
    catchAsync(async (req,res,next) => {

        const doc = await Model.findByIdAndDelete(req.params.id);
    
        if(!doc) {
            return next(new AppError('No document found with that ID', 404))
        }
    
        res.status(204)
        .json({
            status: 'success',
            data: null
        })
});

exports.updateOne = Model => 
    catchAsync(async (req, res, next) => {

        const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.status(202)
        .json({
            status: 'success',
            data: urlName(req.originalUrl, doc)
        })
});

exports.deleteOneByMe = Model => 
    catchAsync(async (req,res,next) => {

        let doc = await Model.findById(req.params.id);

        if(!doc) {
            return next(new AppError('No document found with that ID', 404))
        }

        if(doc.user[0]._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return next(new AppError('You do not have permission to perform this action', 403))
        }

        doc = await Model.findByIdAndDelete(req.params.id);

        res.status(204)
        .json({
            status: 'success',
            data: null
        })
});

exports.updateOneByMe = Model => 
    catchAsync(async (req, res, next) => {

        let doc = await Model.findById(req.params.id);

        if(!doc) {
            return next(new AppError('No document found with that ID', 404))
        }

        if(doc.user[0]._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return next(new AppError('You do not have permission to perform this action', 403))
        }

        doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.status(202)
        .json({
            status: 'success',
            data: urlName(req.originalUrl, doc)
        })
});

exports.deleteOneDocumentAndOtherDocRelated = (Model, ModelsRelated, KeysRelated) => 
    catchAsync(async (req, res, next) => {
        
        let doc = await Model.findById(req.params.id);

        if(!doc) {
            return next(new AppError('No document found with that ID', 404))
        }

        doc = await Model.findByIdAndDelete(req.params.id);
        
        let count = 0;
        ModelsRelated.forEach(async (Models) => {
            let obj = {};
            obj[KeysRelated[count]] = req.params.id
            count = count + 1;
            await Models.deleteMany(obj);
        });

        res.status(204)
        .json({
            status: 'success',
            data: null
        })
    })


let Models = {
    Review: 'tour',
    User: 'user'
}

exports.createOne = Model => 
    catchAsync(async (req,res,next) => {

        const newDoc  = await Model.create(req.body);

        res.status(201)
        .json({
            status: 'success',
            data: urlName(req.originalUrl, newDoc)
        })
});

exports.getOne = (Model, popOptions) => 

    catchAsync(async (req,res,next) => {

        let query = Model.findById(req.params.id)
        if(popOptions) {
            query.populate(popOptions);
        }

        const doc = await query;

        if(!doc) {
            return next(new AppError('Documento não localizado com este ID', 404))
        }

        res.status(201)
           .json({
               status: 'success',
               data: urlName(req.originalUrl, doc)
           });
});

exports.getOneByField = (Model, popOptions) => 

    catchAsync(async (req,res,next) => {

        const consult = {};
        if(Object.keys(req.params)[0] === 'id') {
            consult['_id'] = req.params[Object.keys(req.params)[0]];
        } else {
            consult[Object.keys(req.params)[0]] = req.params[Object.keys(req.params)[0]];
        }

        let query = Model.find(consult);
        if(popOptions) {
            query.populate(popOptions);
        }

        const doc = await query;

        if(!doc) {
            return next(new AppError('No document found with that ID', 404))
        }

        res.status(201)
           .json({
               status: 'success',
               data: urlName(req.originalUrl, doc[0])
           });
});

exports.getAll = Model => 
    catchAsync(async (req,res,next) => {
        let filterOptions;

        if(req.filter) {
            filterOptions = req.filter;
        }
        
        //EXECUTE QUERY
        const features = new APIFeatures(Model.find(filterOptions), req.query)
        .filter()
        .sort()
        .limitFields()
        .paginate()

        //const docs = await features.query.explain(); it is to analyse our query
        const docs = await features.query;
        
        res.status(200)
        .json({
            status: 'success',
            requestedAt: req.requestTime,
            results: docs.length,
            data: urlName(req.originalUrl, docs)
});

});
