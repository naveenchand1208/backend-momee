const UserFeedback = require('../models/userFeedback')
const moment = require('moment');
const { uploadToCloudinary, deleteFromCloudinary } = require('../helpers/cloudinary');

exports.add = async (req, res, next) => {
    try {
        const { title, description } = req.body;
        if (!title || !description || !req.files) {
            return res.apiResponse(false, 'Feedback params is missing', {}, 400);
        }
        // const checkTitle = await Batch.findOne({ title: title })
        // if (checkTitle) {
        //     return res.apiResponse(false, 'Title already exists', {}, 400);
        // }
        const uploadedFiles = [];
        for (const file of req.files) {
            const result = await uploadToCloudinary(file, 'userFeedback');
            uploadedFiles.push({
                public_id: result.public_id,
                url: result.secure_url,
                fileChanged: false
            });
        }
        const uniqueId = `UserFeedback-${moment().format('DDMMYYYYHHmmss')}`;
        const newFeedback = new UserFeedback({
            title,
            description,
            id: uniqueId,
            files: uploadedFiles,
        });
        await newFeedback.save();
        return res.apiResponse(true, "UserFeedback added Success", newFeedback, 200);
    } catch (error) {
        console.error("Add UserFeedback Error:", error);
        return res.apiResponse(false, 'UserFeedback Add error', { error }, 500);
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
            options.sort = { createdAt: 1 };
            UserFeedback.paginate(match, options, function (err, data) {
                if (err) {
                    return res.apiResponse(false, "Error while fetching lists", {}, 404);
                }
                return res.apiResponse(true, "Success", data, 200);
            });
        } else {
            let feedbacks = [];
            const query = Object.keys(match).length === 0
                ? UserFeedback.find({})
                : UserFeedback.find(match);
            feedbacks = await query.sort({ createdAt: 1 });
            return res.apiResponse(true, "Success", { docs: feedbacks }, 200);
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
        const feedback = await UserFeedback.findOne({ id: requests.id })
        if (!feedback) {
            return res.apiResponse(false, 'Feedback not found', {}, 404);
        }
        return res.apiResponse(true, 'Success', feedback, 200);
    } catch (error) {
        return res.apiResponse(false, 'get Feedback error', {}, 500)
    }
}

exports.update = async (req, res, next) => {
    try {
        if (req.body) {
            const body = Object(req.body);
            const { id } = body;
            if (id === undefined || id === null) {
                return res.apiResponse(false, 'Id is missing', {}, 400);
            }
            const feedback = await UserFeedback.findOne({ id })
            if (!feedback) {
                return res.apiResponse(false, 'Feedback Not Found', {}, 404);
            }
            let updateFields = {};
            if (req.body.title) updateFields.title = req.body.title;
            if (req.body.status) updateFields.status = req.body.status;
            const uploadedFiles = [];
            console.log('req.files', req.files)
            if (req.files) {
                for (const file of req.files) {
                    const result = await uploadToCloudinary(file, 'userFeedback');
                    console.log('result', result)
                    uploadedFiles.push({
                        public_id: result.public_id,
                        url: result.secure_url,
                        fileChanged: false
                    });
                }
            }
            console.log('uploadedFiles', uploadedFiles)
            let finalOldFiles = [];
            if (req.body.oldFiles) {
                for (const file of req.body.oldFiles) {
                    if (file.fileChanged === true || file.fileChanged === 'true') {
                        if (file.public_id) {
                            await deleteFromCloudinary(file.public_id);
                        }
                    } else {
                        finalOldFiles.push(file);
                    }
                }
            } else {
                finalOldFiles = finalOldFiles.concat(feedback.files);
            }
            console.log('finalOldFiles', finalOldFiles)
            const updatedFilesArray = finalOldFiles.concat(uploadedFiles);
            console.log('updatedFilesArray', updatedFilesArray)

            updateFields = {
                files: updatedFilesArray
            };
            const updatedFeedback = await UserFeedback.findOneAndUpdate(
                { id },
                { $set: updateFields },
                { new: true }
            );
            if (!updatedFeedback) {
                return res.apiResponse(false, 'Feebcak not found', {}, 404);
            }
            return res.apiResponse(true, 'Feebcak updated successfully', updatedFeedback, 200);
        } else {
            return res.apiResponse(false, 'Payload is missing', {}, 400);
        }
    } catch (error) {
        console.error('Update Error:', error);
        return res.apiResponse(false, 'Error updating Feebcak', {}, 500);
    }

};

exports.delete = async (req, res, next) => {
    try {
        var requests = req.bodyParams;
        if (!requests.id) {
            return res.apiResponse(false, 'Id is missing', {}, 400);
        }
        const feedback = await UserFeedback.findOne({ id: requests.id })
        if (!feedback) {
            return res.apiResponse(false, 'Feedback not found', {}, 404)
        }
        if (feedback.files) {
            for (const file of feedback.files) {
                await deleteFromCloudinary(file.public_id);
            }
        }
        const result = await UserFeedback.deleteOne({ id: requests.id });

        if (result.deletedCount === 0) {
            return res.apiResponse(false, 'Feedback not found', {}, 404)
        }
        return res.apiResponse(true, 'Feedback deleted successfully', result, 200)
    } catch (error) {
        return res.apiResponse(false, 'Delete Feedback error', { error }, 500)
    }
}