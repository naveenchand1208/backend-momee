const { formatDate } = require('../helpers/util');
const BumbCount = require('../models/bumbCount')
const moment = require('moment');

exports.add = async (req, res, next) => {
    try {
        const { count, userId } = req.bodyParams;
        if (!count || !userId) {
            return res.apiResponse(false, 'Count or userId is missing', {}, 400);
        }
        const now = moment().format('DDMMYYYYHHmmss');
        const date = moment().format('DD-MM-YYYY');
        const time = moment().format('HH:mm');
        const uniqueId = `BumbCount-${now}`;
        const newCount = new BumbCount({
            count,
            id: uniqueId,
            userId: userId,
            date,
            time,
        });
        await newCount.save()
        const data = newCount.toObject();
        const totalCounts = await logTodayTotalCount();
        data.totalCounts = totalCounts;
        return res.apiResponse(true, "Count added Success", data, 200);
    } catch (error) {
        return res.apiResponse(false, 'Count Add error', {}, 500);
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

        // match['userId'] = req.userDetails.id;
        match['userId'] = userId;
        if (requests.id && requests.id !== '') {
            match['id'] = requests.id;
        }
        // if (requests.searchKey !== undefined && requests.searchKey.trim() !== '') {
        //     const searchTerm = requests.searchKey.trim();
        //     match['name'] = { $regex: searchTerm, $options: 'i' };
        // }
        const options = {
            page: page,
            limit: per_page,
            skip: skip,
            sort: { [sortField]: sortOrder },
        };
        if (pagination === "true") {
            options.sort = { createdAt: -1 };
            BumbCount.paginate(match, options, function (err, data) {
                if (err) {
                    return res.apiResponse(false, "Error while fetching lists", {}, 404);
                }
                // const groupedByDate = {};
                // for (const doc of data.docs) {
                //     const dateKey = doc.createdAt.toISOString().split('T')[0];

                //     if (!groupedByDate[dateKey]) {
                //         groupedByDate[dateKey] = {
                //             date: dateKey,
                //             count: 0,
                //             startTime: formatDate(doc.createdAt, 'DD-MM-YYYY HH:mm'),
                //             endTime: formatDate(doc.updatedAt, 'DD-MM-YYYY HH:mm'),
                //         };
                //     }

                //     groupedByDate[dateKey].count += doc.count || 0;

                //     if (doc.createdAt < groupedByDate[dateKey].startTime) {
                //         groupedByDate[dateKey].startTime = formatDate(doc.createdAt, 'DD-MM-YYYY HH:mm');
                //     }

                //     if (doc.createdAt > groupedByDate[dateKey].endTime) {
                //         groupedByDate[dateKey].endTime = formatDate(doc.updatedAt, 'DD-MM-YYYY HH:mm');
                //     }
                // }
                const groupedByDate = {};

                // Step 1: Group docs by dateKey
                for (const doc of data.docs) {
                    const dateKey = doc.createdAt.toISOString().split('T')[0];

                    if (!groupedByDate[dateKey]) {
                        groupedByDate[dateKey] = {
                            date: dateKey,
                            count: 0,
                            docs: []
                        };
                    }

                    groupedByDate[dateKey].count += doc.count || 0;
                    groupedByDate[dateKey].docs.push(doc);
                }

                // Step 2: Sort each date's docs and set startTime and endTime
                for (const dateKey in groupedByDate) {
                    const group = groupedByDate[dateKey];

                    // Sort docs ascending by createdAt
                    group.docs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

                    // Set startTime (first doc's createdAt) and endTime (last doc's updatedAt)
                    group.startTime = formatDate(group.docs[0].createdAt, 'DD-MM-YYYY HH:mm');
                    group.endTime = formatDate(group.docs[group.docs.length - 1].updatedAt, 'DD-MM-YYYY HH:mm');
                    group.docs = [];
                }

                console.log(Object.values(groupedByDate));

                const groupedDocs = Object.values(groupedByDate).sort((a, b) => new Date(b.date) - new Date(a.date));
                const totalDocs = groupedDocs.length;
                const limit = Number(per_page)
                const totalPages = Math.ceil(totalDocs / limit);
                const startIndex = (page - 1) * limit;
                const endIndex = page * limit;
                const paginatedDocs = groupedDocs.slice(startIndex, endIndex);
                return res.apiResponse(true, "Success", {
                    docs: paginatedDocs,
                    totalDocs: totalDocs,
                    limit: limit,
                    page: page,
                    totalPages: totalPages,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1,
                    nextPage: page < totalPages ? page + 1 : null,
                    prevPage: page > 1 ? page - 1 : null,
                    pagingCounter: startIndex + 1,
                }, 200);
            });
        } else {
            let Counts = [];
            const query = Object.keys(match).length === 0
                ? BumbCount.find({})
                : BumbCount.find(match);
            Counts = await query.sort({ createdAt: -1 });
            const groupedByDate = {};
            for (const doc of Counts) {
                const dateKey = doc.createdAt.toISOString().split('T')[0];
                if (!groupedByDate[dateKey]) {
                    groupedByDate[dateKey] = {
                        date: dateKey,
                        count: 0,
                        startTime: doc.createdAt,
                        endTime: doc.updatedAt,
                    };
                }
                groupedByDate[dateKey].count += doc.count || 0;
                if (doc.createdAt < groupedByDate[dateKey].startTime) {
                    groupedByDate[dateKey].startTime = doc.createdAt;
                }
                if (doc.createdAt > groupedByDate[dateKey].endTime) {
                    groupedByDate[dateKey].endTime = doc.updatedAt;
                }
            }
            const result = Object.values(groupedByDate);
            return res.apiResponse(true, "Success", { docs: result }, 200);
        }
    } catch (error) {
        return res.apiResponse(false, 'Get list error', { error }, 500);
    }
}

exports.view = async (req, res, next) => {
    try {
        var requests = req.bodyParams;
        if (!requests.id) {
            return res.apiResponse(false, 'Id is missing', {}, 400);
        }
        const count = await BumbCount.findOne({ id: requests.id })
        if (!count) {
            return res.apiResponse(false, 'Count not found', {}, 404);
        }
        return res.apiResponse(true, 'Success', count, 200);
    } catch (error) {
        return res.apiResponse(false, 'get Count error', {}, 500)
    }
}

exports.update = async (req, res, next) => {
    try {
        const { id } = req.bodyParams;
        if (id === undefined || id === null) {
            return res.apiResponse(false, 'Id is missing', {}, 400);
        }
        const updateFields = {};
        if (req.bodyParams.count) updateFields.count = req.bodyParams.count;
        const updatedCouont = await BumbCount.findOneAndUpdate(
            { id },
            { $set: updateFields },
            { new: true }
        );
        if (!updatedCouont) {
            return res.apiResponse(false, 'Count not found', {}, 404);
        }
        return res.apiResponse(true, 'Count updated successfully', updatedCouont, 200);
    } catch (error) {
        console.error('Update Error:', error);
        return res.apiResponse(false, 'Error updating Count', {}, 500);
    }

};

exports.delete = async (req, res, next) => {
    try {
        const requests = req.bodyParams;

        if (!requests.id) {
            return res.apiResponse(false, 'Id is missing', {}, 400);
        }

        const result = await BumbCount.deleteOne({ id: requests.id });

        if (result.deletedCount === 0) {
            return res.apiResponse(false, 'Count not found', {}, 404);
        }

        return res.apiResponse(true, 'Count deleted successfully', result, 200);
    } catch (error) {
        return res.apiResponse(false, 'Delete Count error', { error }, 500);
    }
};

async function logTodayTotalCount() {
    const startOfDay = moment().startOf('day').toDate();
    const endOfDay = moment().endOf('day').toDate();

    const todayDocs = await BumbCount.find({
        createdAt: {
            $gte: startOfDay,
            $lte: endOfDay
        }
    });

    const total = todayDocs.reduce((sum, doc) => sum + Number(doc.count || 0), 0);
    return total;
}

exports.getBumpCountReport = async (req, res, next) => {
    try {
        const { type, fromDate, toDate, userId } = req.bodyParams;
        if (!userId) {
            return res.apiResponse(false, 'User not found', {}, 401);
        }

        if (!type) {
            return res.apiResponse(false, 'Type is Required', {}, 400);
        }

        if (type === 'custom' && (!fromDate || !toDate)) {
            return res.apiResponse(false, 'fromDate and toDate are required for custom type', {}, 400);
        }

        let startDate, endDate;
        const today = moment().startOf('day');

        if (type === 'daily') {
            startDate = today.clone().toDate();
            endDate = today.clone().endOf('day').toDate();
        } else if (type === 'weekly') {
            startDate = today.clone().startOf('isoWeek').toDate(); // Monday
            endDate = today.clone().endOf('isoWeek').toDate();     // Sunday
        } else if (type === 'monthly') {
            startDate = moment().startOf('month').toDate();
            endDate = moment().endOf('month').toDate();
        } else if (type === 'custom') {
            startDate = moment(fromDate, 'DD-MM-YYYY').startOf('day').toDate();
            endDate = moment(toDate, 'DD-MM-YYYY').endOf('day').toDate();
        } else {
            return res.apiResponse(false, 'Invalid type. Use daily, weekly, monthly, or custom.', {}, 400);
        }

        // const userId = String(req.userDetails?.id);
        // if (!userId) {
        //     return res.apiResponse(false, 'User not found', {}, 401);
        // }

        // Fetch all matching data
        const rawData = await BumbCount.find({
            userId: userId,
            createdAt: { $gte: startDate, $lte: endDate }
        });

        // Return raw data directly for daily type
        if (type === 'daily') {
            return res.apiResponse(true, 'Report fetched successfully', rawData, 200);
        }

        // Otherwise, group by date
        const grouped = {};

        rawData.forEach(entry => {
            const dateStr = moment(entry.createdAt).format('DD-MM-YYYY');
            if (!grouped[dateStr]) {
                grouped[dateStr] = 0;
            }
            grouped[dateStr] += entry.count;
        });

        // Fill in missing days with 0
        const result = [];
        let current = moment(startDate);
        const end = moment(endDate);

        while (current <= end) {
            const dateStr = current.format('DD-MM-YYYY');
            result.push({
                date: dateStr,
                count: grouped[dateStr] || 0
            });
            current.add(1, 'day');
        }

        return res.apiResponse(true, 'Report fetched successfully', result, 200);

    } catch (error) {
        console.error('Error generating report:', error);
        return res.apiResponse(false, 'Something went wrong', {}, 500);
    }
};

// exports.getBumpCountReport = async (req, res, next) => {
//     try {
//         const { type, fromDate, toDate } = req.bodyParams;

//         if (!type) {
//             return res.apiResponse(false, 'Type is Required', {}, 400);
//         }

//         if (type === 'custom' && (!fromDate || !toDate)) {
//             return res.apiResponse(false, 'fromDate and toDate are required for custom type', {}, 400);
//         }

//         let startDate, endDate;
//         const today = moment().startOf('day');

//         if (type === 'daily') {
//             startDate = today.toDate();
//             endDate = moment(today).endOf('day').toDate();
//         } else if (type === 'weekly') {
//             startDate = moment(today).subtract(6, 'days').startOf('day').toDate();
//             endDate = moment(today).endOf('day').toDate();
//         } else if (type === 'monthly') {
//             startDate = moment().startOf('month').toDate();
//             endDate = moment().endOf('month').toDate();
//         } else if (type === 'custom') {
//             startDate = moment(fromDate, 'DD-MM-YYYY').startOf('day').toDate();
//             endDate = moment(toDate, 'DD-MM-YYYY').endOf('day').toDate();
//         } else {
//             return res.apiResponse(false, 'Invalid type. Use daily, weekly, monthly, or custom.', {}, 400);
//         }

//         const userId = String(req.userDetails?.id); // Ensure userId is a string
//         if (!userId) {
//             return res.apiResponse(false, 'User not found', {}, 401);
//         }

//         const result = await BumbCount.find({
//             userId: userId,
//             createdAt: { $gte: startDate, $lte: endDate }
//         });

//         return res.apiResponse(true, 'Report fetched successfully', result, 200);
//     } catch (error) {
//         console.error('Error generating report:', error);
//         return res.apiResponse(false, 'Something went wrong', {}, 500);
//     }
// };
