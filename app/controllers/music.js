const Music = require('../models/music')
const { uploadToCloudinary, deleteFromCloudinary } = require('../helpers/cloudinary');
const moment = require('moment');

exports.add = async (req, res, next) => {
    try {
        const { name, momType, status } = req.body;
        if (!name || !momType) {
            return res.apiResponse(false, 'name, or momType is missing', {}, 400);
        }

        // if (momType === 'pregMom' && !week) {
        //     return res.apiResponse(false, 'Week is required', {}, 400);
        // }

        // if (momType === 'newMom' && !month) {
        //     return res.apiResponse(false, 'Month is required', {}, 400);
        // }
        let secure_url, public_id;
        if (req.file) {
            ({ secure_url, public_id } = await uploadToCloudinary(req.file, 'musics'));
        }

        const id = `Music-${moment().format('DDMMYYYYHHmmss')}`;
        const newMusic = new Music({
            id,
            name,
            momType,
            status: status || 'Active',
            file: secure_url,
            public_id: public_id,
        });
        await newMusic.save();
        return res.apiResponse(true, 'Music added successfully', newMusic, 200);
    } catch (error) {
        return res.apiResponse(false, 'Music Add error', { error }, 500);
    }
}
exports.addPlayList = async (req, res, next) => {
    try {
        const { musicId, name, duration } = req.body;
        if (!musicId || !name || !duration) {
            return res.apiResponse(false, 'Music details are missing', {}, 400);
        }
        if (!req.file) {
            return res.apiResponse(false, 'Audio file is required', {}, 400);
        }
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
        if (!allowedAudioTypes.includes(req.file.mimetype)) {
            return res.apiResponse(false, 'Only Audio files are allowed', { error }, 400);
        } else {
            console.log('audio-allowed')
        }
        const music = await Music.findOne({ id: musicId })
        if (!music) {
            return res.apiResponse(false, 'Music not found', {}, 404);
        }
        const { secure_url, public_id } = await uploadToCloudinary(req.file, 'musics');
        const playListId = `PlayList-${moment().format('DDMMYYYYHHmmss')}`;
        const audioList = {
            name,
            playListId,
            duration,
            file: secure_url,
            public_id
        }
        music.playLists.push(audioList)
        music.markModified('playLists');
        await music.save()
        return res.apiResponse(true, 'Music added successfully', music, 200);
    } catch (error) {
        return res.apiResponse(false, 'Music Add error', { error }, 500);
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
            match['name'] = { $regex: searchTerm, $options: 'i' };
        }
        const options = {
            page: page,
            limit: per_page,
            skip: skip,
            sort: { [sortField]: sortOrder },
        };
        if (pagination === "true") {
            Music.paginate(match, options, function (err, data) {
                if (err) {
                    return res.apiResponse(false, "Error while fetching lists", {}, 404);
                }
                const cleanedDocs = data.docs.map(item => {
                    const obj = item.toObject();
                    obj.playLists = [];
                    return obj;
                });
                data.docs = cleanedDocs;
                return res.apiResponse(true, "Success", data, 200);
            });
        } else {
            let musics = [];
            if (Object.keys(match).length === 0) {
                musics = await Music.find({});
            } else {
                musics = await Music.find(match);
            }
            const cleanedMusic = musics.map(item => {
                const obj = item.toObject();
                obj.playLists = [];
                return obj;
            });
            return res.apiResponse(true, "Success", { docs: cleanedMusic }, 200);
        }

    } catch (error) {
        return res.apiResponse(false, 'Get list error', {}, 500);
    }
}
exports.view = async (req, res, next) => {
    try {
        var requests = req.bodyParams;
        console.log('requests', requests)
        if (!requests.id) {
            return res.apiResponse(false, 'Id is missing', {}, 400);
        }
        const music = await Music.findOne({ id: requests.id })
        console.log('music', music)
        if (!music) {
            return res.apiResponse(false, 'music not found', {}, 404);
        }
        return res.apiResponse(true, 'Success', music, 200);
    } catch (error) {
        return res.apiResponse(false, 'get music error', {}, 500)
    }
}
exports.viewPlayList = async (req, res, next) => {
    try {
        var { id, playListId } = req.bodyParams;
        if (!id || !playListId) {
            return res.apiResponse(false, 'Id or playListId is missing', {}, 400);
        }
        const music = await Music.findOne({ id })
        if (!music) {
            return res.apiResponse(false, 'Music not found', {}, 404);
        }
        const playList = music.playLists.find(add => add.playListId === playListId)
        if (!playList) {
            return res.apiResponse(false, 'Play List not found', {}, 404);
        }
        return res.apiResponse(true, 'Success', playList, 200);
    } catch (error) {
        return res.apiResponse(false, 'get Music error', { error }, 500)
    }
}
exports.update = async (req, res, next) => {
    try {
        if (req.body) {
            console.log('req.body', req.body)
            const { id, public_id, fileChanged } = req.body;
            if (id === undefined || id === null) {
                return res.apiResponse(false, 'Id is missing', {}, 400);
            }
            const updateFields = {};
            if (req.body.name) updateFields.name = req.body.name;
            if (req.body.momType) updateFields.momType = req.body.momType;
            // if (!!req.body.week) updateFields.week = req.body.week;
            // if (!!req.body.month) updateFields.month = req.body.month;
            if (req.body.status) updateFields.status = req.body.status;
            // let changed;
            // if (typeof fileChanged === 'String') {
            //     changed = JSON.parse(fileChanged)
            // }
            if (fileChanged && public_id) {
                await deleteFromCloudinary(public_id);
                const result = await uploadToCloudinary(req.file, 'musics');
                updateFields.file = result.secure_url;
                updateFields.public_id = result.public_id;
            }
            const updatedMusic = await Music.findOneAndUpdate(
                { id },
                { $set: updateFields },
                { new: true }
            );
            if (!updatedMusic) {
                return res.apiResponse(false, 'Music not found', {}, 404);
            }
            return res.apiResponse(true, 'Music updated successfully', updatedMusic, 200);
        } else {
            return res.apiResponse(false, 'Payload is missing', {}, 400);
        }
    } catch (error) {
        console.error('Update Error:', error);
        return res.apiResponse(false, 'Error updating Music', { error }, 500);
    }

};
exports.updatePlayList = async (req, res, next) => {
    try {
        const { musicId, playListId, public_id, fileChanged } = req.body;
        if (!musicId || !playListId) {
            return res.apiResponse(false, 'musicId or playListId is missing', {}, 400);
        }
        const music = await Music.findOne({ id: musicId });
        if (!music) {
            return res.apiResponse(false, 'Music not found', {}, 404);
        }
        const playList = music.playLists.find(ex => ex.playListId === playListId);
        if (!playList) {
            return res.apiResponse(false, 'Play List not found', {}, 404);
        }
        // Update fields
        if (req.body.name) playList.name = req.body.name;
        if (req.body.duration) playList.duration = req.body.duration;

        // Handle file change
        if (fileChanged && public_id && req.file) {
            await deleteFromCloudinary(public_id, 'video');
            const { secure_url, public_id: newId } = await uploadToCloudinary(req.file, 'musics');
            playList.file = secure_url;
            playList.public_id = newId;
        }

        music.markModified('playLists');
        await music.save();

        return res.apiResponse(true, 'PlayList updated successfully', music, 200);

    } catch (error) {
        console.error('Update PlayList Error:', error);
        return res.apiResponse(false, 'Error updating PlayList', {}, 500);
    }
};
exports.delete = async (req, res, next) => {
    try {
        var requests = req.bodyParams;
        if (!requests.id) {
            return res.apiResponse(false, 'Id is missing', {}, 400);
        }
        const music = await Music.findOne({ id: requests.id });
        if (!music) {
            return res.apiResponse(false, 'Music Not Found', { error }, 404)
        }
        if (music && music.public_id) {
            console.log('coming', music.public_id)
            await deleteFromCloudinary(music.public_id);
        }
        for (let mus of music.playLists) {
            await deleteFromCloudinary(mus.public_id, 'video');
        }
        const result = await Music.deleteOne({ id: requests.id });
        return res.apiResponse(true, 'Music deleted successfully', result, 200)
    } catch (error) {
        return res.apiResponse(false, 'Delete Music error', { error }, 500)
    }
}
exports.deletePlayList = async (req, res) => {
    try {
        const { id, playListId } = req.bodyParams;
        if (!id || !playListId) {
            return res.apiResponse(false, 'id or playListId is missing', {}, 400);
        }
        const music = await Music.findOne({ id });
        if (!music) {
            return res.apiResponse(false, 'Music not found', {}, 404);
        }
        const index = music.playLists.findIndex(ex => ex.playListId === playListId);
        if (index === -1) {
            return res.apiResponse(false, 'PlayList not found', {}, 404);
        }
        const playlistEntry = music.playLists[index];
        const publicId = playlistEntry.public_id;
        if (publicId) {
            await deleteFromCloudinary(publicId, 'video');
        }
        music.playLists.splice(index, 1);
        music.markModified('playLists');
        await music.save();
        return res.apiResponse(true, 'Music deleted successfully', {}, 200);
    } catch (error) {
        return res.apiResponse(false, 'Delete Music error', { error: error.message }, 500);
    }
};

