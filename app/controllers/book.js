const Book = require('../models/book')
const moment = require('moment');
const { uploadToCloudinary, deleteFromCloudinary } = require('../helpers/cloudinary');
const { uploadImageToImageKit, deleteImageFromImageKit } = require('../helpers/imagekit');
const fs = require("fs").promises;

// exports.add = async (req, res, next) => {
//     try {
//         const { title, status, momType, link } = req.body;
//         const { file, book } = req.files || {};
//         if (!link && !book) {
//             return res.apiResponse(false, 'Book or Link i required', {}, 400);
//         }
//         const checkTitle = await Book.findOne({ title: title })
//         if (checkTitle) {
//             return res.apiResponse(false, 'Title already exists', {}, 400);
//         }
//         const fileUpload = await uploadToCloudinary(file[0], 'books');
//         if (book[0]?.mimetype !== 'application/pdf') {
//             return res.apiResponse(false, 'Only PDF files are allowed', { error }, 400);
//         }
//         const bookUpload = await uploadToCloudinary(book[0], 'books');
//         const uniqueId = `Book-${moment().format('DDMMYYYYHHmmss')}`;
//         const newBook = new Book({
//             title,
//             link,
//             status,
//             file: fileUpload.secure_url,
//             public_id: fileUpload.public_id,
//             book: bookUpload.secure_url,
//             book_public_id: bookUpload.public_id,
//             id: uniqueId,
//             momType
//         })
//         await newBook.save()
//         return res.apiResponse(true, "Book added Success", newBook, 200);
//     } catch (error) {
//         console.error("Add Book Error:", error);
//         return res.apiResponse(false, 'Book Add error', { error }, 500);
//     }
// }

exports.add = async (req, res, next) => {
    try {
        const { title, status, momType, link } = req.body;
        const { file, book } = req.files || {};

        // Link or book is required
        if (!link && !book) {
            return res.apiResponse(false, 'Book or Link is required', {}, 400);
        }

        // Title already exists
        const checkTitle = await Book.findOne({ title });
        if (checkTitle) {
            return res.apiResponse(false, 'Title already exists', {}, 400);
        }

        let fileUpload = null;
        let bookUpload = null;

        // Upload file only if uploaded
        if (file && file[0]) {
            fileUpload = await uploadToCloudinary(file[0], 'books');
        }

        // Upload book only if uploaded
        if (book && book[0]) {
            if (book[0].mimetype !== 'application/pdf') {
                return res.apiResponse(false, 'Only PDF files are allowed', {}, 400);
            }
            bookUpload = await uploadToCloudinary(book[0], 'books');
        }

        const uniqueId = `Book-${moment().format('DDMMYYYYHHmmss')}`;

        const newBook = new Book({
            title,
            link,
            status,
            file: fileUpload?.secure_url || null,
            public_id: fileUpload?.public_id || null,

            book: bookUpload?.secure_url || null,
            book_public_id: bookUpload?.public_id || null,

            id: uniqueId,
            momType
        });

        await newBook.save();

        return res.apiResponse(true, "Book added successfully", newBook, 200);
    } catch (error) {
        console.error("Add Book Error:", error);
        return res.apiResponse(false, 'Book Add error', { error }, 500);
    }
};

exports.list = async (req, res, next) => {
    try {
        const requests = req.bodyParams;
        const page = requests.page || 1;
        const per_page = requests.limit || 10;
        const pagination = requests.pagination || "true";
        const skip = (page - 1) * per_page;
        const match = {};
        const sortField = requests.sortField || 'createdAt';
        const sortOrder = requests.sortOrder === 'asc' ? 1 : -1;

        if (requests.id && requests.id !== '') {
            match['id'] = requests.id;
        }
        // if (req.userDetails && req.userDetails.momType) {
        //     match['momType'] = req.userDetails.momType;
        //     match['momType'] = "";
        // }
        // if (requests.momType && requests.momType !== '') {
        //     match['momType'] = requests.momType;
        //     match['momType'] = "";
        // }
        const momType = requests.momType;

        if (momType === 'pregMom' || momType === 'newMom') {
            match['momType'] = { $in: [momType, ''] }; // 🔍 filter: both specific + shared
        } else if (momType === '') {
            match['momType'] = { $in: ['pregMom', 'newMom', ''] }; // 🔍 all types
        } else if (momType === 'both') {
            match['momType'] = { $in: [''] }; // 🔍 all types
        }
        if (requests.status && requests.status !== '') {
            match['status'] = requests.status;
        }
        if (requests.fromDate || requests.toDate) {
            let startDate = moment(requests.fromDate);
            let endDate = moment(requests.toDate);
            if (startDate.isValid() && endDate.isValid()) {
                match.createdAt = {
                    $gte: startDate.startOf('day').toDate(),
                    $lte: endDate.endOf('day').toDate()
                };
            } else if (startDate.isValid() && !endDate.isValid()) {
                match.createdAt = {
                    $gte: startDate.startOf('day').toDate(),
                    $lte: startDate.endOf('day').toDate()
                };
            }
        }
        if (requests.searchKey !== undefined && requests.searchKey.trim() !== '') {
            const searchTerm = requests.searchKey.trim();
            match['title'] = { $regex: searchTerm, $options: 'i' };
        }
        const options = {
            page: page,
            limit: per_page,
            skip: skip,
            sort: { [sortField]: sortOrder },
        };
        if (pagination === "true") {
            Book.paginate(match, options, function (err, data) {
                if (err) {
                    return res.apiResponse(false, "Error while fetching lists", {}, 404);
                }
                return res.apiResponse(true, "Success", data, 200);
            });
        } else {
            let books = [];
            if (Object.keys(match).length === 0) {
                books = await Book.find({});
            } else {
                books = await Book.find(match);
            }
            return res.apiResponse(true, "Success", { docs: books }, 200);
        }

    } catch (error) {
        return res.apiResponse(false, 'Get list error', {}, 500);
    }
}

exports.view = async (req, res, next) => {
    try {
        var requests = req.bodyParams;
        if (!requests.id) {
            return res.apiResponse(false, 'Id is missing', {}, 400);
        }
        const book = await Book.findOne({ id: requests.id })
        if (!book) {
            return res.apiResponse(false, 'Book not found', {}, 404);
        }
        return res.apiResponse(true, 'Success', book, 200);
    } catch (error) {
        return res.apiResponse(false, 'get Book error', {}, 500)
    }
}

exports.update = async (req, res, next) => {
    try {
        if (req.body) {
            console.log('req.body', req.body)
            const { id, public_id, book_public_id, fileChanged, bookChanged } = req.body;
            if (id === undefined || id === null) {
                return res.apiResponse(false, 'Id is missing', {}, 400);
            }
            const updateFields = {};
            if (req.body.title) updateFields.title = req.body.title;
            updateFields.momType = req.body.momType;
            if (req.body.status) updateFields.status = req.body.status;
            // if (req.body.link)
            updateFields.link = req.body.link;
            const fileArray = req.files?.file || [];
            const bookArray = req.files?.book || [];
            if (bookArray?.[0] && bookArray[0].mimetype !== 'application/pdf') {
                return res.apiResponse(false, 'Only PDF files are allowed', {}, 400);
            }

            if (fileChanged && public_id && fileArray[0]) {
                await deleteFromCloudinary(public_id);
                const result = await uploadToCloudinary(fileArray[0], 'books');
                updateFields.file = result.secure_url;
                updateFields.public_id = result.public_id;
            }

            if (bookChanged && book_public_id && bookArray[0]) {
                await deleteFromCloudinary(book_public_id);
                const result = await uploadToCloudinary(bookArray[0], 'books');
                updateFields.book = result.secure_url;
                updateFields.book_public_id = result.public_id;
            }
            console.log('coming')
            const updatedBook = await Book.findOneAndUpdate(
                { id },
                { $set: updateFields },
                { new: true }
            );
            if (!updatedBook) {
                return res.apiResponse(false, 'Book not found', {}, 404);
            }
            return res.apiResponse(true, 'Book updated successfully', updatedBook, 200);
        } else {
            return res.apiResponse(false, 'Payload is missing', {}, 400);
        }
    } catch (error) {
        console.error('Update Error:', error);
        return res.apiResponse(false, 'Error updating Book', { error }, 500);
    }

};

exports.delete = async (req, res, next) => {
    try {
        var requests = req.bodyParams;
        if (!requests.id) {
            return res.apiResponse(false, 'Id is missing', {}, 400);
        }
        const book = Book.findOne({ id: requests.id });
        if (!book) {
            return res.apiResponse(false, 'Book not found', {}, 404)
        }
        if (book && book.public_id) {
            await deleteFromCloudinary(book.public_id);
        }
        if (book && book.book_public_id) {
            await deleteFromCloudinary(book.book_public_id);
        }
        const result = await Book.deleteOne({ id: requests.id });
        return res.apiResponse(true, 'Book deleted successfully', result, 200)
    } catch (error) {
        return res.apiResponse(false, 'Delete Book error', { error }, 500)
    }
}