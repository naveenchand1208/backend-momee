const AdminChat = require('../models/adminChat')
const moment = require('moment');

exports.add = async (req, res) => {
    try {
        const { userId, message, chatType } = req.bodyParams;

        if (!userId || !message || !chatType) {
            return res.apiResponse(false, 'Chat params are missing', {}, 400);
        }

        const newMessage = {
            chatType,
            message,
            dateTime: new Date()
        };

        let chat = await AdminChat.findOne({ userId });
        if (!chat) {
            chat = new AdminChat({ userId, chats: [newMessage] });
        } else {
            chat.chats.push(newMessage);
        }

        await chat.save();

        const io = req.app.get('socketio');
        const emitData = {
            userId,
            message,
            chatType,
            dateTime: newMessage.dateTime.toISOString()
        };

        if (chatType === 'user') {
            console.log('📡 Emitting socket message:', emitData); // 🔍 LOG THIS
            io.emit('chat message', emitData);
        }

        return res.apiResponse(true, 'Chat Added Successfully', chat, 200);
    } catch (err) {
        console.error('❌ Error adding chat:', err);
        return res.apiResponse(false, 'Chat Error', {}, 500);
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

        if (requests.userId && requests.userId !== '') {
            match['userId'] = requests.userId;
        }
        if (requests.id && requests.id !== '') {
            match['id'] = requests.id;
        }

        const options = {
            page,
            limit: per_page,
            skip,
            sort: { [sortField]: sortOrder },
            lean: true
        };

        if (pagination === "true") {
            // Ensure lean is enabled in paginate options
            options.lean = true;

            AdminChat.paginate(match, options, async function (err, data) {
                if (err) {
                    console.error("Pagination Error:", err);
                    return res.apiResponse(false, "Error while fetching lists", {}, 500);
                }

                const cleanedDocs = data.docs.map(item => ({
                    ...item,
                    chats: []
                }));

                const populatedDocs = await AdminChat.populate(cleanedDocs, {
                    path: 'user',
                    select: 'userName id profile'
                });

                data.docs = populatedDocs;

                return res.apiResponse(true, "Success", data, 200);
            });
        } else {
            const chats = await AdminChat.find(match)
                .sort({ createdAt: -1 })
                .lean();

            const cleanedDocs = chats.map(item => ({
                ...item,
                chats: []
            }));

            const populatedDocs = await AdminChat.populate(cleanedDocs, {
                path: 'user',
                select: 'userName id profile'
            });

            return res.apiResponse(true, "Success", { docs: populatedDocs }, 200);
        }


    } catch (error) {
        console.error("List API Error:", error);
        return res.apiResponse(false, 'Get list error', {}, 500);
    }
};


exports.view = async (req, res, next) => {
    try {
        const { userId } = req.bodyParams;

        if (!userId) {
            return res.apiResponse(false, 'User ID is missing', {}, 400);
        }

        const chat = await AdminChat.findOne({ userId }).populate({
            path: 'user',
            select: 'userName id profile'
        }).lean(); // Optional: use lean() if you only need read-only plain object

        if (!chat) {
            return res.apiResponse(true, 'Chat not found', {}, 200);
        }

        return res.apiResponse(true, 'Success', chat, 200);
    } catch (error) {
        console.error('Error in AdminChat.view:', error);
        return res.apiResponse(false, 'Get Chat error', { message: error.message }, 500);
    }
};
