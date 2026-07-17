const { sendTextSMS } = require('../helpers/twilio');
const Auth = require('../models/auth')
const SOS = require('../models/sosRequests')
const moment = require('moment');

exports.addSosMember = async (req, res, next) => {
    try {
        const { sosMembersDetails, userId } = req.bodyParams;

        if (!userId || !Array.isArray(sosMembersDetails) || sosMembersDetails.length === 0) {
            return res.apiResponse(false, 'Sos params are missing', {}, 400);
        }
        const user = await Auth.findOne({ id: userId });
        if (!user) {
            return res.apiResponse(false, 'User Not Found', {}, 404);
        }
        const updatedSosMembers = [
            ...user.sosMembersDetails,
            ...sosMembersDetails
        ];
        const userUpdated = await Auth.findOneAndUpdate(
            { id: userId },
            { $set: { sosMembersDetails: updatedSosMembers } },
            { new: true }
        );
        return res.apiResponse(true, 'Sos Members updated successfully', userUpdated, 200);
    } catch (error) {
        return res.apiResponse(false, 'Internal Server Error', {}, 500);
    }
};

exports.addSosRequest = async (req, res, next) => {
    try {
        const { userId } = req.bodyParams;
        const user = await Auth.findOne({ id: userId })
        if (!user) {
            return res.apiResponse(false, 'User Not Found', {}, 404);
        }
        const sosMembersDetails = user.sosMembersDetails;
        const sosMembers = sosMembersDetails.map(member => member.userName)
        const messageTemplate = 'Hi ${userName}, This is emergency alert from your family Member ${user} ';
        // const results = await sendTextSMS(sosMembersDetails, messageTemplate, user.userName);
        const newSos = new SOS({
            id: `SOS-${moment().format('DDMMYYYYHHmmss')}`,
            count: sosMembersDetails.length,
            date: `${moment().format('DD-MMM-YYYY HH:mm')}`,
            userId,
            sosMembers,
            message: `Hi SOS members, This is emergency alert from your family Member ${user.userName}`,
            // result: results
        })
        await newSos.save();
        return res.apiResponse(true, 'SOS Requests Added', newSos, 200)
    } catch (error) {
        return res.apiResponse(false, 'SOS Requests error', { error }, 500);
    }
}

exports.sosRequestList = async (req, res, next) => {
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
        const options = {
            page: page,
            limit: per_page,
            skip: skip,
            sort: { [sortField]: sortOrder },
            populate: 'user',
        };
        if (requests.searchKey !== undefined && requests.searchKey.trim() !== '') {
            const searchTerm = requests.searchKey.trim();
            match['userId'] = { $regex: searchTerm, $options: 'i' };
        }
        if (pagination === "true") {
            options.sort = { createdAt: -1 };
            SOS.paginate(match, options, function (err, data) {
                if (err) {
                    return res.apiResponse(false, "Error while fetching lists", {}, 404);
                }
                return res.apiResponse(true, "Success", data, 200);
            });
        } else {
            let sosRequests = [];
            if (Object.keys(match).length === 0) {
                sosRequests = await SOS.find({}).populate('user')
                    .sort({ createdAt: -1 });
                ;
            } else {
                sosRequests = await SOS.find(match).populate('user')
                    .sort({ createdAt: -1 });
                ;
            }
            return res.apiResponse(true, "Success", { docs: sosRequests }, 200);
        }

    } catch (error) {
        return res.apiResponse(false, 'Get list error', {}, 500);
    }
}

exports.deleteSosMember = async (req, res, next) => {
    try {
        const { userName } = req.bodyParams;
        const userId = req.userDetails.id;

        if (typeof userName !== 'string' || userName.trim() === '') {
            return res.apiResponse(false, 'Invalid user name', {}, 400);
        }

        // Perform atomic pull
        const result = await Auth.updateOne(
            { id: userId },
            { $pull: { sosMembersDetails: { userName } } }
        );

        if (result.modifiedCount === 0) {
            return res.apiResponse(false, 'SOS Member not found', {}, 404);
        }

        return res.apiResponse(true, 'SOS Member deleted successfully', { result }, 200);
    } catch (error) {
        console.error('Delete SOS Error:', error);
        return res.apiResponse(false, 'Delete SOS Error', {}, 500);
    }
};
