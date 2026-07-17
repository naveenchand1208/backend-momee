const { formatDate } = require('../helpers/util');
const Consumption = require('../models/waterCunsumption')
const moment = require('moment');

exports.add = async (req, res, next) => {
    try {
        const { volume } = req.bodyParams;
        if (!volume) {
            return res.apiResponse(false, 'Volume is missing', {}, 400);
        }
        const now = moment().format('DDMMYYYYHHmmss');
        const uniqueId = `Consumption-${now}`;
        const newConsumption = new Consumption({
            volume,
            id: uniqueId,
            userId: req.userDetails.id
        });
        await newConsumption.save()
        const data = newConsumption.toObject();
        const totalVolume = await logTodayTotalCount();
        // data.totalVolume = totalVolume;
        data.totalVolume = (totalVolume / 1000).toFixed(2)
        data.volume = (data.volume / 1000).toFixed(2)
        return res.apiResponse(true, "Consumption added Success", data, 200);
    } catch (error) {
        return res.apiResponse(false, 'Consumption Add error', {}, 500);
    }
}

exports.timeBasedlist = async (req, res, next) => {
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
        if (requests.userId && requests.userId !== '') {
            match['userId'] = requests.userId;
        }
        // if (req.userDetails && req.userDetails.momType) {
        //     match['momType'] = req.userDetails.momType;
        //     match['momType'] = "";
        // }
        // if (requests.momType && requests.momType !== '') {
        //     match['momType'] = requests.momType;
        //     match['momType'] = "";
        // }
        // const momType = requests.momType;

        // if (momType === 'pregMom' || momType === 'newMom') {
        //     match['momType'] = { $in: [momType, ''] }; // 🔍 filter: both specific + shared
        // } else if (momType === '') {
        //     match['momType'] = { $in: ['pregMom', 'newMom', ''] }; // 🔍 all types
        // } else if (momType === 'both') {
        //     match['momType'] = { $in: [''] }; // 🔍 all types
        // }
        if (requests.status && requests.status !== '') {
            match['status'] = requests.status;
        }
        if (requests.fromDate && requests.toDate) {
            let startDate = moment(requests.fromDate);
            let endDate = moment(requests.toDate);
            if (startDate.isValid() && endDate.isValid()) {
                match.createdAt = {
                    $gte: startDate.startOf('day').toDate(),
                    $lte: endDate.endOf('day').toDate()
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
            Consumption.paginate(match, options, function (err, data) {
                if (err) {
                    return res.apiResponse(false, "Error while fetching lists", {}, 404);
                }
                return res.apiResponse(true, "Success", data, 200);
            });
        } else {
            let consumptions = [];
            if (Object.keys(match).length === 0) {
                consumptions = await Consumption.find({});
            } else {
                consumptions = await Consumption.find(match);
            }
            return res.apiResponse(true, "Success", { docs: consumptions }, 200);
        }

    } catch (error) {
        return res.apiResponse(false, 'Get list error', {}, 500);
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
        if (requests.id && requests.id !== '') {
            match['id'] = requests.id;
        }
        if (requests.userId && requests.userId !== '') {
            match['userId'] = requests.userId;
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
        // if (pagination === "true") {
        //     options.sort = { createdAt: -1 };
        //     Consumption.paginate(match, options, function (err, data) {
        //         if (err) {
        //             return res.apiResponse(false, "Error while fetching lists", {}, 404);
        //         }
        //         const groupedByDate = {};
        //         for (const doc of data.docs) {
        //             const dateKey = doc.createdAt.toISOString().split('T')[0];

        //             if (!groupedByDate[dateKey]) {
        //                 groupedByDate[dateKey] = {
        //                     date: dateKey,
        //                     volume: 0,
        //                     startTime: doc.createdAt,
        //                     endTime: doc.updatedAt,
        //                 };
        //             }

        //             groupedByDate[dateKey].volume += doc.volume || 0;

        //             if (doc.createdAt < groupedByDate[dateKey].startTime) {
        //                 groupedByDate[dateKey].startTime = doc.createdAt;
        //             }

        //             if (doc.createdAt > groupedByDate[dateKey].endTime) {
        //                 groupedByDate[dateKey].endTime = doc.updatedAt;
        //             }
        //         }
        //         let groupedDocs = Object.values(groupedByDate)
        //             .map(group => ({
        //                 ...group,
        //                 volume: +(group.volume / 1000).toFixed(2), // Convert to liters
        //             }))
        //             .sort((a, b) => new Date(b.date) - new Date(a.date));

        //         console.log("Grouped in liters:", groupedDocs);

        //         groupedDocs = groupedDocs.map(group => ({
        //             ...group,
        //             startTime: formatDate(group.startTime, 'DD-MM-YYYY HH:mm'),
        //             endTime: formatDate(group.endTime, 'DD-MM-YYYY HH:mm')
        //         }));


        //         const totalDocs = groupedDocs.length;
        //         const limit = Number(per_page)
        //         const totalPages = Math.ceil(totalDocs / limit);
        //         const startIndex = (page - 1) * limit;
        //         const endIndex = page * limit;
        //         const paginatedDocs = groupedDocs.slice(startIndex, endIndex);
        //         return res.apiResponse(true, "Success", {
        //             docs: paginatedDocs,
        //             totalDocs: totalDocs,
        //             limit: limit,
        //             page: page,
        //             totalPages: totalPages,
        //             hasNextPage: page < totalPages,
        //             hasPrevPage: page > 1,
        //             nextPage: page < totalPages ? page + 1 : null,
        //             prevPage: page > 1 ? page - 1 : null,
        //             pagingCounter: startIndex + 1,
        //         }, 200);
        //     });
        // } 

        if (pagination === "true") {
            options.sort = { createdAt: -1 };

            const docs = await Consumption.find(match).sort(options.sort);

            const groupedByDate = {};

            for (const doc of docs) {
                const dateKey = doc.createdAt.toISOString().split('T')[0];

                if (!groupedByDate[dateKey]) {
                    groupedByDate[dateKey] = {
                        date: dateKey,
                        volume: 0,
                        startTime: doc.createdAt,
                        endTime: doc.updatedAt,
                    };
                }

                groupedByDate[dateKey].volume += doc.volume || 0;

                if (doc.createdAt < groupedByDate[dateKey].startTime) {
                    groupedByDate[dateKey].startTime = doc.createdAt;
                }

                if (doc.createdAt > groupedByDate[dateKey].endTime) {
                    groupedByDate[dateKey].endTime = doc.updatedAt;
                }
            }

            let groupedDocs = Object.values(groupedByDate)
                .map(group => ({
                    ...group,
                    volume: +(group.volume / 1000).toFixed(2), // Convert to liters
                }))
                .sort((a, b) => new Date(b.date) - new Date(a.date));

            groupedDocs = groupedDocs.map(group => ({
                ...group,
                startTime: formatDate(group.startTime, 'DD-MM-YYYY HH:mm'),
                endTime: formatDate(group.endTime, 'DD-MM-YYYY HH:mm'),
            }));

            // Manual pagination
            const totalDocs = groupedDocs.length;
            const limit = Number(per_page);
            const currentPage = Number(page);
            const totalPages = Math.ceil(totalDocs / limit);
            const startIndex = (currentPage - 1) * limit;
            const endIndex = currentPage * limit;
            const paginatedDocs = groupedDocs.slice(startIndex, endIndex);

            return res.apiResponse(true, "Success", {
                docs: paginatedDocs,
                totalDocs,
                limit,
                page: currentPage,
                totalPages,
                hasNextPage: currentPage < totalPages,
                hasPrevPage: currentPage > 1,
                nextPage: currentPage < totalPages ? currentPage + 1 : null,
                prevPage: currentPage > 1 ? currentPage - 1 : null,
                pagingCounter: startIndex + 1,
            }, 200);
        } else {
            let Counts = [];
            const query = Object.keys(match).length === 0
                ? Consumption.find({})
                : Consumption.find(match);
            Counts = await query.sort({ createdAt: -1 });
            const groupedByDate = {};
            for (const doc of Counts) {
                const dateKey = doc.createdAt.toISOString().split('T')[0];
                if (!groupedByDate[dateKey]) {
                    groupedByDate[dateKey] = {
                        date: dateKey,
                        volume: 0,
                        startTime: doc.createdAt,
                        endTime: doc.updatedAt,
                    };
                }
                groupedByDate[dateKey].volume += doc.volume || 0;
                if (doc.createdAt < groupedByDate[dateKey].startTime) {
                    groupedByDate[dateKey].startTime = doc.createdAt;
                }
                if (doc.createdAt > groupedByDate[dateKey].endTime) {
                    groupedByDate[dateKey].endTime = doc.updatedAt;
                }
            }
            let result = Object.values(groupedByDate)
                .map(group => ({
                    ...group,
                    volume: +(group.volume / 1000).toFixed(2), // Convert to liters
                }))
                .sort((a, b) => new Date(b.date) - new Date(a.date));
            // const result = Object.values(groupedByDate).sort((a, b) => new Date(b.date) - new Date(a.date));
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
        const count = await Consumption.findOne({ id: requests.id })
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
        if (req.bodyParams.volume) updateFields.volume = req.bodyParams.volume;
        const updatedCouont = await Consumption.findOneAndUpdate(
            { id },
            { $set: updateFields },
            { new: true }
        );
        if (!updatedCouont) {
            return res.apiResponse(false, 'Consumption not found', {}, 404);
        }
        return res.apiResponse(true, 'Consumption updated successfully', updatedCouont, 200);
    } catch (error) {
        console.error('Update Error:', error);
        return res.apiResponse(false, 'Error updating Consumption', {}, 500);
    }

};

exports.delete = async (req, res, next) => {
    try {
        const requests = req.bodyParams;

        if (!requests.id) {
            return res.apiResponse(false, 'Id is missing', {}, 400);
        }

        const result = await Consumption.deleteOne({ id: requests.id });

        if (result.deletedCount === 0) {
            return res.apiResponse(false, 'Consumption not found', {}, 404);
        }

        return res.apiResponse(true, 'Consumption deleted successfully', result, 200);
    } catch (error) {
        return res.apiResponse(false, 'Delete Consumption error', { error }, 500);
    }
};

async function logTodayTotalCount() {
    const startOfDay = moment().startOf('day').toDate();
    const endOfDay = moment().endOf('day').toDate();

    const todayDocs = await Consumption.find({
        createdAt: {
            $gte: startOfDay,
            $lte: endOfDay
        }
    });
    const total = todayDocs.reduce((sum, doc) => sum + Number(doc.volume || 0), 0);
    return total;
}