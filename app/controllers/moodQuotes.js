const MoodQuotes = require('../models/moodQuotes')
const Auth = require('../models/auth')
const moment = require('moment');
const { newFormatDate, formatDate } = require('../helpers/util')

exports.add = async (req, res, next) => {
    try {

        const requests = req.bodyParams;

        const quotes = requests.quotes;
        const quotesTa = requests.quotesTa;
        const date = requests.date;

        console.log(
            '========== MOOD QUOTES ADD =========='
        );

        console.log(
            'English quotes:',
            quotes
        );

        console.log(
            'Tamil quotes:',
            quotesTa
        );

        console.log(
            'Date:',
            date
        );


        // ==========================================
        // DATE VALIDATION
        // ==========================================

        if (!date) {

            return res.apiResponse(
                false,
                'Date is missing',
                {},
                400
            );

        }


        // ==========================================
        // ENGLISH QUOTES
        // ==========================================

        if (
            !quotes ||
            typeof quotes !== 'object'
        ) {

            return res.apiResponse(
                false,
                'English quotes is missing or invalid',
                {},
                400
            );

        }


        // ==========================================
        // TAMIL QUOTES
        // ==========================================

        if (
            !quotesTa ||
            typeof quotesTa !== 'object'
        ) {

            return res.apiResponse(
                false,
                'Tamil quotes is missing or invalid',
                {},
                400
            );

        }


        // ==========================================
        // DATE
        // ==========================================

        const Date = newFormatDate(
            date,
            'DD-MM-YYYY'
        );


        console.log(
            'Formatted Date:',
            Date
        );


        // ==========================================
        // CHECK DUPLICATE
        // ==========================================

        const checkQuotes =
            await MoodQuotes.findOne({
                date: Date
            });


        if (checkQuotes) {

            return res.apiResponse(
                false,
                'Already Quotes Available the day',
                {},
                400
            );

        }


        // ==========================================
        // UNIQUE ID
        // ==========================================

        const uniqueId =
            `MoodQuotes-${moment().format(
                'DDMMYYYYHHmmss'
            )}`;


        // ==========================================
        // CREATE
        // ==========================================

        const moodQuotes =
            new MoodQuotes({

                id: uniqueId,

                date: Date,

                // Existing English field
                quotes: quotes,

                // English + Tamil
                translations: {

                    en: {
                        quotes: quotes
                    },

                    ta: {
                        quotes: quotesTa
                    }

                }

            });


        // ==========================================
        // DEBUG BEFORE SAVE
        // ==========================================

        console.log(
            '========== BEFORE SAVE =========='
        );

        console.log(
            JSON.stringify(
                moodQuotes.toObject(),
                null,
                2
            )
        );


        await moodQuotes.save();


        // ==========================================
        // DEBUG AFTER SAVE
        // ==========================================

        console.log(
            '========== AFTER SAVE =========='
        );

        console.log(
            JSON.stringify(
                moodQuotes.toObject(),
                null,
                2
            )
        );


        return res.apiResponse(
            true,
            "Quotes added Success",
            moodQuotes,
            200
        );


    } catch (error) {

        console.error(
            "Add Quotes Error:",
            error
        );

        return res.apiResponse(
            false,
            'Quotes Add error',
            {
                error: error.message
            },
            500
        );

    }
};

// exports.add = async (req, res, next) => {
//     try {
//         const { quotes, date } = req.bodyParams;
//         if (
//             !quotes ||
//             typeof quotes !== 'object' ||
//             Object.keys(quotes).length !== 16 ||
//             !date
//         ) {
//             return res.apiResponse(false, 'Quotes params is missing or invalid', {}, 400);
//         }
//         const Date = newFormatDate(date, 'DD-MM-YYYY');
//         console.log('Date', Date)
//         const checkQuotes = await MoodQuotes.findOne({ date: Date });
//         if (checkQuotes) {
//             return res.apiResponse(false, 'Already Quotes Available the day', {}, 400);
//         }
//         const uniqueId = `MoodQuotes-${moment().format('DDMMYYYYHHmmss')}`;
//         const moodQuotes = new MoodQuotes({
//             date: Date,
//             id: uniqueId,
//             quotes,
//         });
//         await moodQuotes.save();
//         return res.apiResponse(true, "Quotes added Success", moodQuotes, 200);
//     } catch (error) {
//         console.error("Add Quotes Error:", error);
//         return res.apiResponse(false, 'Quotes Add error', { error }, 500);
//     }
// }
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
        if (req.userDetails && req.userDetails.momType) {
            match['momType'] = req.userDetails.momType;
        }
        if (requests.date && requests.date !== '') {
            const date = newFormatDate(requests.date)
            match['date'] = date;
        }
        // const inputDate = moment(requests.date, 'YYYY-MM-DD HH:mm:ss.SSSSSS');
        // if (inputDate.isValid()) {
        //     const day = inputDate.format('YYYY-MM-DD');
        //     console.log('coming');
        //     match.dateAndTime = { $regex: `^${day}` };
        // }
        const options = {
            page: page,
            limit: per_page,
            skip: skip,
            sort: { [sortField]: sortOrder },
            // populate: { path: 'user', select: 'userName email' }
        };
        if (pagination === "true") {
            MoodQuotes.paginate(match, options, async function (err, data) {
                if (err) {
                    return res.apiResponse(false, "Error while fetching lists", {}, 404);
                }
                return res.apiResponse(true, "Success", data, 200);
            });
        } else {
            const quotes = await MoodQuotes.find(match)
            // .populate({ path: 'user', select: 'userName email' });
            return res.apiResponse(true, "Success", { quotes }, 200);
        }
    } catch (error) {
        return res.apiResponse(false, 'Get list error', {}, 500);
    }
}
exports.view = async (req, res, next) => {
    try {
        var { date, id } = req.bodyParams;
        if (!date && !id) {
            return res.apiResponse(false, 'Params is missing', {}, 400);
        }
        date = formatDate(date)
        // const quotes = await MoodQuotes.findOne({ date })
        const quotes = await MoodQuotes.findOne({
            $or: [
                { date: date },     // match by date
                { id: id }         // match by id
            ]
        });
        if (!quotes) {
            return res.apiResponse(false, 'MoodQuotes not found', {}, 404);
        }
        return res.apiResponse(true, 'Success', quotes, 200);
    } catch (error) {
        return res.apiResponse(false, 'get MoodQuotes error', {}, 500)
    }
}

exports.update = async (req, res, next) => {
    try {

        const requests = req.bodyParams;

        const id = requests.id;

        const quotes = requests.quotes;

        const quotesTa = requests.quotesTa;


        if (!id) {

            return res.apiResponse(
                false,
                'Id is missing',
                {},
                400
            );

        }


        if (
            !quotes ||
            typeof quotes !== 'object'
        ) {

            return res.apiResponse(
                false,
                'English quotes is missing or invalid',
                {},
                400
            );

        }


        if (
            !quotesTa ||
            typeof quotesTa !== 'object'
        ) {

            return res.apiResponse(
                false,
                'Tamil quotes is missing or invalid',
                {},
                400
            );

        }


        console.log(
            '========== MOOD QUOTES UPDATE =========='
        );

        console.log(
            'ID:',
            id
        );

        console.log(
            'English:',
            quotes
        );

        console.log(
            'Tamil:',
            quotesTa
        );


        const moodQuotes =
            await MoodQuotes.findOne({
                id: id
            });


        if (!moodQuotes) {

            return res.apiResponse(
                false,
                'MoodQuotes not found',
                {},
                404
            );

        }


        // Existing English
        moodQuotes.quotes = quotes;


        // English + Tamil
        moodQuotes.translations = {

            en: {
                quotes: quotes
            },

            ta: {
                quotes: quotesTa
            }

        };


        moodQuotes.markModified(
            'quotes'
        );

        moodQuotes.markModified(
            'translations'
        );


        await moodQuotes.save();


        return res.apiResponse(
            true,
            'MoodQuotes updated successfully',
            moodQuotes,
            200
        );


    } catch (error) {

        console.error(
            'Error updating MoodQuotes:',
            error
        );

        return res.apiResponse(
            false,
            'Error updating MoodQuotes',
            {
                error: error.message
            },
            500
        );

    }
};
// exports.update = async (req, res, next) => {
//     try {
//         const requests = req.bodyParams;
//         if (!requests.id) {
//             return res.apiResponse(false, 'Id is missing', {}, 400);
//         }
//         if (Object.keys(requests.quotes).length !== 16) {
//             return res.apiResponse(false, 'Quotes params is missing or invalid', {}, 400);
//         }
//         // const updateFields = { ...requests };
//         const quotes = await MoodQuotes.findOneAndUpdate(
//             { id: requests.id },
//             {$set : {quotes: requests.quotes}},
//             { new: true }
//         );
//         if (!quotes) {
//             return res.apiResponse(false, 'MoodQuotes not found', {}, 404);
//         }
//         return res.apiResponse(true, 'MoodQuotes updated successfully', quotes, 200);

//     } catch (error) {
//         return res.apiResponse(false, 'Error updating  MoodQuotes', {}, 500);
//     }
// };
exports.delete = async (req, res, next) => {
    try {
        var requests = req.bodyParams;
        if (!requests.id) {
            return res.apiResponse(false, 'Id is missing', {}, 400);
        }
        const result = await MoodQuotes.deleteOne({ id: requests.id });
        if (result.deletedCount === 0) {
            return res.apiResponse(false, 'MoodQuotes not found', {}, 404)
        }
        return res.apiResponse(true, 'MoodQuotes deleted successfully', result, 200)
    } catch (error) {
        return res.apiResponse(false, 'Delete MoodQuotes error', { error }, 500)
    }
}