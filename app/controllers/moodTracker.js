const Tracker = require('../models/moodTracker')
const Auth = require('../models/auth')
const moment = require('moment');
const { populate } = require('../models/sessionNotification');

exports.add = async (req, res, next) => {
    try {
        const { score, dateAndTime } = req.bodyParams;
        if (!score || !dateAndTime) {
            return res.apiResponse(false, 'Tracker params is missing', {}, 400);
        }
        const userId = req.userDetails.id;
        const uniqueId = `MoodTracker-${moment().format('DDMMYYYYHHmmss')}`;
        const newTracker = new Tracker({
            dateAndTime,
            id: uniqueId,
            score,
            userId,
        });
        await newTracker.save();
        return res.apiResponse(true, "Tracker added Success", newTracker, 200);
    } catch (error) {
        console.error("Add Tracker Error:", error);
        return res.apiResponse(false, 'Tracker Add error', { error }, 500);
    }
}

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
        if (requests.userId && requests.userId !== '') {
            match['userId'] = requests.userId;
        } 
        // else {
        //     match['userId'] = req.userDetails.id;
        // }
        const inputDate = moment(requests.date, 'YYYY-MM-DD HH:mm:ss.SSSSSS');
        if (inputDate.isValid()) {
            const day = inputDate.format('YYYY-MM-DD');
            console.log('coming');
            match.dateAndTime = { $regex: `^${day}` };
        }
        const options = {
            page: page,
            limit: per_page,
            skip: skip,
            sort: { [sortField]: sortOrder },
            populate: { path: 'user', select: 'userName email' }
        };
        if (pagination === "true") {
            Tracker.paginate(match, options, async function (err, data) {
                if (err) {
                    return res.apiResponse(false, "Error while fetching lists", {}, 404);
                }
                return res.apiResponse(true, "Success", data, 200);
            });
        } else {
            const trackers = await Tracker.find(match).populate({ path: 'user', select: 'userName email' });
            return res.apiResponse(true, "Success", { trackers }, 200);
        }
    } catch (error) {
        return res.apiResponse(false, 'Get list error', {}, 500);
    }
}
