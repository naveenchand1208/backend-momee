const PodCasts = require('../models/podcasts')
const moment = require('moment');
const { uploadToCloudinary, deleteFromCloudinary } = require('../helpers/cloudinary');

exports.add = async (req, res, next) => {
    try {
        const { title, status, momType } = req.body;
        const { file, music } = req.files || {};
        if (!title || !file || !music || !momType) {
            return res.apiResponse(false, 'PodCasts params is missing', {}, 400);
        }
        // if (momType === 'pregMom' && !week) {
        //     return res.apiResponse(false, 'Week is required', {}, 400);
        // }
        // if (momType === 'newMom' && !month) {
        //     return res.apiResponse(false, 'Month is required', {}, 400);
        // }
        const allowedAudioTypes = [
            'audio/mpeg',     // .mp3
            'audio/mp3',      // .mp3 (alternative)
            'audio/wav',      // .wav
            'audio/x-wav',    // .wav (alternative)
            'audio/ogg',      // .ogg
            'audio/webm',     // .webm
            'audio/aac',      // .aac
            'audio/flac'      // .flac
        ];
        if (!allowedAudioTypes.includes(music[0].mimetype)) {
            return res.apiResponse(false, 'Only Audio files are allowed', { error }, 400);
        } else {
            console.log('audio-allowed')
        }
        const fileUpload = await uploadToCloudinary(file[0], 'podCasts');
        const musicUpload = await uploadToCloudinary(music[0], 'podCasts');
        const uniqueId = `PodCasts-${moment().format('DDMMYYYYHHmmss')}`;
        const newCasts = new PodCasts({
            title,
            status,
            file: fileUpload.secure_url,
            public_id: fileUpload.public_id,
            music: musicUpload.secure_url,
            music_public_id: musicUpload.public_id,
            id: uniqueId,
            momType,
        })
        await newCasts.save()
        return res.apiResponse(true, "PodCasts added Success", newCasts, 200);
    } catch (error) {
        console.error("Add PodCasts Error:", error);
        return res.apiResponse(false, 'PodCasts Add error', { error }, 500);
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
        if (requests.momType && requests.momType !== '') {
            match['momType'] = requests.momType;
        }
        if (requests.status && requests.status !== '') {
            match['status'] = requests.status;
        }
        // if (requests.week && requests.week !== '') {
        //     match['week'] = requests.week;
        // }
        // if (requests.month && requests.month !== '') {
        //     match['month'] = requests.month;
        // }
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
            PodCasts.paginate(match, options, function (err, data) {
                if (err) {
                    return res.apiResponse(false, "Error while fetching lists", {}, 404);
                }
                return res.apiResponse(true, "Success", data, 200);
            });
        } else {
            let podCasts = [];
            if (Object.keys(match).length === 0) {
                podCasts = await PodCasts.find({});
            } else {
                podCasts = await PodCasts.find(match);
            }
            return res.apiResponse(true, "Success", { docs: podCasts }, 200);
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
        const casts = await PodCasts.findOne({ id: requests.id })
        if (!casts) {
            return res.apiResponse(false, 'PodCasts not found', {}, 404);
        }
        return res.apiResponse(true, 'Success', casts, 200);
    } catch (error) {
        return res.apiResponse(false, 'get PodCasts error', {}, 500)
    }
}

exports.update = async (req, res, next) => {
    try {
        if (req.body) {
            const { id, public_id, music_public_id, fileChanged, musicChanged } = req.body;
            if (id === undefined || id === null) {
                return res.apiResponse(false, 'Id is missing', {}, 400);
            }
            const updateFields = {};
            if (req.body.title) updateFields.title = req.body.title;
            if (req.body.momType) updateFields.momType = req.body.momType;
            if (req.body.status) updateFields.status = req.body.status;
            // if (req.body.week) updateFields.week = req.body.week;
            // if (req.body.month) updateFields.month = req.body.month;
            const fileArray = req.files?.file || [];
            const musicArray = req.files?.music || [];

            if (fileChanged && public_id && fileArray[0]) {
                await deleteFromCloudinary(public_id);
                const result = await uploadToCloudinary(fileArray[0], 'podCasts');
                updateFields.file = result.secure_url;
                updateFields.public_id = result.public_id;
            }

            if (musicChanged && music_public_id && musicArray[0]) {
                const allowedAudioTypes = [
                    'audio/mpeg',     // .mp3
                    'audio/mp3',      // .mp3 (alternative)
                    'audio/wav',      // .wav
                    'audio/x-wav',    // .wav (alternative)
                    'audio/ogg',      // .ogg
                    'audio/webm',     // .webm
                    'audio/aac',      // .aac
                    'audio/flac'      // .flac
                ];
                if (!allowedAudioTypes.includes(musicArray[0].mimetype)) {
                    return res.apiResponse(false, 'Only audio files are allowed', {
                        error: `Invalid file type: ${musicArray[0].mimetype}`
                    }, 400);
                }
                await deleteFromCloudinary(music_public_id, 'video');
                const result = await uploadToCloudinary(musicArray[0], 'podCasts');
                updateFields.music = result.secure_url;
                updateFields.music_public_id = result.public_id;
            }
            const updatedCasts = await PodCasts.findOneAndUpdate(
                { id },
                { $set: updateFields },
                { new: true }
            );
            if (!updatedCasts) {
                return res.apiResponse(false, 'PodCasts not found', {}, 404);
            }
            return res.apiResponse(true, 'PodCasts updated successfully', updatedCasts, 200);
        } else {
            return res.apiResponse(false, 'Payload is missing', {}, 400);
        }
    } catch (error) {
        console.error('Update Error:', error);
        return res.apiResponse(false, 'Error updating PodCasts', { error }, 500);
    }

};

exports.delete = async (req, res, next) => {
    try {
        var requests = req.bodyParams;
        if (!requests.id) {
            return res.apiResponse(false, 'Id is missing', {}, 400);
        }
        const casts = await PodCasts.findOne({ id: requests.id });
        if (!casts) {
            return res.apiResponse(false, 'PodCasts not found', {}, 404)
        }
        if (casts && casts.public_id) {
            await deleteFromCloudinary(casts.public_id);
        }
        if (casts && casts.music_public_id) {
            await deleteFromCloudinary(casts.music_public_id, 'video');
        }
        const result = await PodCasts.deleteOne({ id: requests.id });
        return res.apiResponse(true, 'PodCasts deleted successfully', result, 200)
    } catch (error) {
        return res.apiResponse(false, 'Delete PodCasts error', { error }, 500)
    }
}