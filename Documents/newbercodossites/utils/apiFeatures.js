class APIFeatures {
    constructor(query,queryString) {
        this.query = query;
        this.queryString = queryString;
    }

    filter() {
        //1A) Filtering
        const queryObject = {...this.queryString}; 
        const excludedFields = ['page','sort','limit','fields'];
        excludedFields.forEach(el => {
            delete queryObject[el]; 
        });

        //1B) Advanced Filtering
        let queryStr = JSON.stringify(queryObject);
        queryStr = queryStr.replace(/\b(gte|gt|lte|lt|ne|eq|exists|in|or|text)\b/g, match => `$${match}`); //has a callback which access the string
        this.query = this.query.find(JSON.parse(queryStr));
        return this; //to give access to other object to access the entire object
    }

    sort() {
        if(this.queryString.sort) {
            const sortBy = this.queryString.sort.split(',').join(' ');
            this.query = this.query.sort(sortBy); // to sort in descending order you should put query params - (minus) sign
        } else {
            this.query = this.query.sort('-_id');
        }
        return this;
    }

    limitFields() {
        //3) Field limiting
        if(this.queryString.fields) {
            const fields = this.queryString.fields.split(',').join(' ');
            this.query = this.query.select(fields);
        } else {
            this.query = this.query.select('-__v'); // don't return the field with minus sign
        }
        return this;
    }

    paginate() {
        const page = this.queryString.page * 1 || 1;
        const limit = this.queryString.limit * 1 || 100;
        const skip = (page - 1) * limit;

        this.query = this.query.skip(skip).limit(limit);
        return this;
    }
}

module.exports = APIFeatures;