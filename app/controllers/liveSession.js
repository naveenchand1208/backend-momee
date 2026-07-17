const LiveSession = require('../models/liveSession')
const PaymentLogs = require('../models/paymentLogs')
const UserClassSubscription = require('../models/userLiveSessionSubscription')
const Auth = require('../models/auth')
const moment = require('moment');
const { uploadToCloudinary, deleteFromCloudinary } = require('../helpers/cloudinary');
const { uploadImageToImageKit } = require('../helpers/imagekit');
const Razorpay = require("razorpay")
const crypto = require("crypto")
const ApplePaymentHistory = require('../models/applePaymentHistory')
const {
    AppStoreServerAPIClient,
    Environment
} = require('@apple/app-store-server-library');
const fs = require('fs');
const path = require("path");
const axios = require("axios");

const env =
    process.env.APPLE_ENV === "production"
        ? Environment.PRODUCTION
        : Environment.SANDBOX;

const client = new AppStoreServerAPIClient(
    fs.readFileSync("./keys/AuthKey_5Q3579F973.p8", "utf8"), //  your .p8 file
    process.env.ASC_KEY_ID,        //  Key ID
    process.env.ASC_ISSUER_ID,     //  Issuer ID
    "com.bhive.momee",             //  Bundle ID
    // Environment.SANDBOX            // or PRODUCTION
    env
);

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_SECRET,
});

exports.add = async (req, res, next) => {
    try {
        const { name, fromDate, toDate, momType, status, startTime, endTime, performedBy, description, amount, MeetingLink, deviceType } = req.body;
        if (!name || !fromDate || !toDate || !momType || !status || !startTime || !endTime || !performedBy || !description || !amount || !MeetingLink || !req.file
        ) {
            return res.apiResponse(false, 'Session params are missing', {}, 400);
        }
        // const checkTitle = await LiveSession.findOne({ name: name, momType: momType })
        // if (checkTitle) {
        //     return res.apiResponse(false, 'Title already exists', {}, 400);
        // }
        // console.log('req.body', req.body)
        // console.log('req.file', req.file)
        // const buffer = await fs.readFile(req.file.path);
        // const fileUpload = await uploadImageToImageKit(buffer, req.file.originalname);
        const fileUpload = await uploadToCloudinary(req.file, 'liveSessions');
        // console.log('fileUpload', fileUpload)
        const uniqueId = `LiveSessions_${moment().format('DDMMYYYYHHmmss')}`;
        const newSession = new LiveSession({
            name,
            fromDate,
            toDate,
            startTime,
            endTime,
            momType,
            status,
            file: fileUpload.secure_url,
            public_id: fileUpload.public_id,
            id: uniqueId,
            performedBy,
            description,
            amount,
            MeetingLink,
            deviceType,
        });
        await newSession.save()
        return res.apiResponse(true, "Session added Success", newSession, 200);
    } catch (error) {
        return res.apiResponse(false, 'Session Add error', { error }, 500);
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
        // if (req.userDetails && req.userDetails.momType) {
        //     match['momType'] = req.userDetails.momType;
        // }
        if (requests.momType && requests.momType !== '') {
            match['momType'] = requests.momType;
        }
        if (requests.deviceType && requests.deviceType !== '') {
            match['deviceType'] = requests.deviceType;
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
            match['name'] = { $regex: searchTerm, $options: 'i' };
        }
        const now = moment(); // Current date & time
        const todayStart = now.startOf('day').format('YYYY-MM-DD');
        const currentTime = moment().format('H:mm');

        match.$or = [
            { toDate: { $gt: todayStart } }, // Future dates are allowed
            {
                toDate: todayStart,            // For today, check endTime
                endTime: { $gte: currentTime }
            }
        ];

        const options = {
            page: page,
            limit: per_page,
            skip: skip,
            sort: { [sortField]: sortOrder },
        };
        // if (pagination === "true") {
        //     // const todayStart = moment().startOf('day').format('YYYY-MM-DD');
        //     // match.toDate = { $gte: todayStart };
        //     LiveSession.paginate(match, options, async function (err, data) {
        //         if (err) {
        //             return res.apiResponse(false, "Error while fetching lists", {}, 404);
        //         }
        //         const cleanedDocs = data.docs.map((item) => {
        //             const obj = item.toObject();
        //             if (requests.userId) {
        //                 obj.saved = obj.users?.some(user => String(user.id) === String(requests.userId));
        //             }
        //             obj.users = [];
        //             return obj;
        //         });

        //         let finalDocs = cleanedDocs;
        //         if (requests.userId && requests.saved) {
        //             finalDocs = finalDocs.filter(item => item.saved === true);
        //         }
        //         data.docs = finalDocs;
        //         data.totalDocs = finalDocs.length;
        //         data.totalPages = Math.ceil(finalDocs.length / data.limit);
        //         data.hasNextPage = data.page < data.totalPages;
        //         data.hasPrevPage = data.page > 1;
        //         return res.apiResponse(true, "Success", data, 200);
        //     });
        // }
        if (pagination === "true") {
            // Fetch all matching docs first
            const allDocs = await LiveSession.find(match).sort({ [sortField]: sortOrder });

            const cleanedDocs = allDocs.map((item) => {
                const obj = item.toObject();
                if (requests.userId) {
                    obj.saved = obj.users?.some(user => String(user.id) === String(requests.userId));
                }
                obj.users = [];
                return obj;
            });

            let finalDocs = cleanedDocs;
            if (requests.userId && requests.saved) {
                finalDocs = finalDocs.filter(item => item.saved === true);
            }

            // Manual pagination
            const pageInt = parseInt(page);
            const limitInt = parseInt(per_page);
            const paginatedDocs = finalDocs.slice((pageInt - 1) * limitInt, pageInt * limitInt);

            const data = {
                docs: paginatedDocs,
                totalDocs: finalDocs.length,
                limit: limitInt,
                page: pageInt,
                totalPages: Math.ceil(finalDocs.length / limitInt),
                hasNextPage: pageInt < Math.ceil(finalDocs.length / limitInt),
                hasPrevPage: pageInt > 1,
            };

            return res.apiResponse(true, "Success", data, 200);
        }
        else {
            let sessions = [];
            const query = Object.keys(match).length === 0
                ? LiveSession.find({})
                : LiveSession.find(match);
            sessions = await query.sort({ createdAt: 1 });
            const cleanedDocs = sessions
                // .filter(isUpcomingSession) //  Filter future sessions
                .map((item) => {
                    const obj = item.toObject();
                    if (requests.userId) {
                        obj.saved = obj.users?.some(user => user.id === requests.userId);
                    }
                    return obj;
                });
            if (requests.userId && requests.saved) {
                cleanedDocs = cleanedDocs.filter(item => item.saved === true);
            }
            return res.apiResponse(true, "Success", { docs: cleanedDocs }, 200);
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
        const session = await LiveSession.findOne({ id: requests.id })
        if (!session) {
            return res.apiResponse(false, 'Session not found', {}, 404);
        }
        return res.apiResponse(true, 'Success', session, 200);
    } catch (error) {
        return res.apiResponse(false, 'get Session error', {}, 500)
    }
}

exports.update = async (req, res, next) => {
    try {
        if (req.body) {
            const { id, public_id, fileChanged } = req.body;
            if (id === undefined || id === null) {
                return res.apiResponse(false, 'Id is missing', {}, 400);
            }
            const updateFields = {};
            if (req.body.name) updateFields.name = req.body.name;
            if (req.body.fromDate) updateFields.fromDate = req.body.fromDate;
            if (req.body.toDate) updateFields.toDate = req.body.toDate;
            if (req.body.startTime) updateFields.startTime = req.body.startTime;
            if (req.body.endTime) updateFields.endTime = req.body.endTime;
            if (req.body.momType) updateFields.momType = req.body.momType;
            if (req.body.description) updateFields.description = req.body.description;
            if (req.body.status) updateFields.status = req.body.status;
            if (req.body.performedBy) updateFields.performedBy = req.body.performedBy;
            if (!!req.body.amount) updateFields.amount = req.body.amount;
            if (!!req.body.MeetingLink) updateFields.MeetingLink = req.body.MeetingLink;
            if (!!req.body.deviceType) updateFields.deviceType = req.body.deviceType;
            if (fileChanged && public_id && req.file) {
                await deleteFromCloudinary(public_id);
                const result = await uploadToCloudinary(req.file, 'sessions');
                updateFields.file = result.secure_url;
                updateFields.public_id = result.public_id;
            }
            const updatedSession = await LiveSession.findOneAndUpdate(
                { id: id },
                { $set: updateFields },
                { new: true }
            );
            if (!updatedSession) {
                return res.apiResponse(false, 'Session not found', {}, 404);
            }
            return res.apiResponse(true, 'Session updated successfully', updatedSession, 200);
        } else {
            return res.apiResponse(false, 'Payload is missing', {}, 400);
        }
    } catch (error) {
        console.error('Update Error:', error);
        return res.apiResponse(false, 'Error updating Session', {}, 500);
    }
};

exports.delete = async (req, res, next) => {
    try {
        var requests = req.bodyParams;
        if (!requests.id) {
            return res.apiResponse(false, 'Id is missing', {}, 400);
        }
        const session = await LiveSession.findOne({ id: requests.id });
        if (!session) {
            return res.apiResponse(false, 'Session not found', {}, 404)
        }
        if (session && session.public_id) {
            await deleteFromCloudinary(session?.public_id);
        }
        const result = await LiveSession.deleteOne({ id: requests.id });
        return res.apiResponse(true, 'Session deleted successfully', result, 200)
    } catch (error) {
        return res.apiResponse(false, 'Delete Session error', { error }, 500)
    }
}
async function getPaymentMethod(userId) {
    if (!userId) return null;

    const user = await Auth.findOne({ id: userId }).select('paymentMethod');
    return user?.paymentMethod || null;
}
exports.subscribeClass = async (req, res, next) => {
    try {
        const { userId, classId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.bodyParams;
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !userId || !classId) {
            return res.apiResponse(false, 'Class params is missing', {}, 400);
        }
        const user = await Auth.findOne({ id: userId });
        if (!user) {
            return res.apiResponse(false, 'User not found', {}, 404);
        }
        const liveSession = await LiveSession.findOne({ id: classId });
        if (!liveSession) {
            return res.apiResponse(false, 'Class not found', {}, 404);
        }

        const orderId = (razorpay_order_id || '').trim();
        const paymentId = (razorpay_payment_id || '').trim();
        const signature = (razorpay_signature || '').trim();
        const sign = crypto
            .createHmac("sha256", process.env.RAZORPAY_SECRET)
            .update(orderId + "|" + paymentId)
            .digest("hex");
        console.log('sign', sign)
        console.log('razorpay_signature', signature)
        const method = await getPaymentMethod(userId)
        if (sign === signature) {
            const response = await razorpay.payments.fetch(razorpay_payment_id);
            const obj = {
                userId: userId,
                method,
                classId,
                orderId: razorpay_order_id || "",
                amount: Number(response?.amount) / 100 || 0,
                paymentId: paymentId || "",
                paymentStatus: response?.status || "Signature Verfied",
                logStatus: "signature_verification_success",
            }
            await addPaymentLog(obj)

            const isAlreadySubscribed = liveSession.users.some(
                (u) => String(u.id) === String(userId)
            );

            if (!isAlreadySubscribed) {
                const userData = {
                    id: user.id,
                    name: user.name || '',
                    email: user.email || '',
                    mobile: user.mobile || '',
                    paymentDateAndTime: moment().format('YYYY-MM-DD HH:mm'),
                };

                if (user.momType === 'pregMom') {
                    userData.Week = user.Week && typeof user.Week === 'number' ? user.Week : 0;
                } else if (user.momType === 'newMom') {
                    userData.month = user.month && typeof user.month === 'number' ? user.month : 0;
                }
                liveSession.users.push(userData);
                await liveSession.save();
                const newUserSubscription = new UserClassSubscription({
                    userId,
                    classId,
                    paymentId,
                    name: liveSession.name,
                    amount: liveSession.amount,
                })
                await newUserSubscription.save();
                await Auth.findOneAndUpdate(
                    { id: req.userDetails.id },
                    { method: "" },
                    { new: true }
                );
                return res.apiResponse(true, 'Class subscribed successfully', {}, 200);
            } else {
                return res.apiResponse(true, 'User already subscribed to this class', {}, 200);
            }
        } else {
            const response = await razorpay.payments.fetch(razorpay_payment_id);
            const obj = {
                userId: userId,
                method,
                classId,
                orderId: razorpay_order_id || "",
                amount: Number(response?.amount) / 100 || 0,
                paymentId: paymentId || "",
                paymentStatus: response?.status || "Invalid signature",
                logStatus: "signature_verification_failed",
            }
            await addPaymentLog(obj)
            await Auth.findOneAndUpdate(
                { id: req.userDetails.id },
                { method: "" },
                { new: true }
            );
            return res.apiResponse(true, "Invalid signature", {}, 200);
        }
    } catch (error) {
        return res.apiResponse(false, 'Subscribe Class error', { error: error.message }, 500);
    }
};

exports.userPlanlist = async (req, res, next) => {
    try {
        const requests = req.bodyParams;
        const page = parseInt(requests.page, 10) || 1;
        const per_page = parseInt(requests.limit, 10) || 10;
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
        if (requests.searchKey !== undefined && requests.searchKey.trim() !== '') {
            const searchTerm = requests.searchKey.trim();
            match.name = { $regex: searchTerm, $options: 'i' };
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
            populate: [
                {
                    path: 'user',
                    select: 'userName id'
                },
                // {
                //     path: 'subscribedPlan',
                //     select: 'planName planAmount id'
                // }
            ],
        };

        if (pagination === "true") {
            UserClassSubscription.paginate(match, options, async function (err, data) {
                if (err) {
                    return res.apiResponse(false, "Error while fetching lists", {}, 404);
                }
                const planAmounts = await calculatePlanAmounts(requests.fromDate, requests.toDate);
                // console.log('planAmounts', planAmounts)
                return res.apiResponse(true, "Success", { data, planAmounts }, 200);
            });
        } else {
            let plans = [];
            if (Object.keys(match).length === 0) {
                plans = await UserClassSubscription.find({});
            } else {
                plans = await UserClassSubscription.find(match);
            }
            await Auth.populate(plans, [
                {
                    path: 'user',
                    select: 'userName id'
                },
                // {
                //     path: 'subscribedPlan',
                //     select: 'planName planAmount id'
                // }
            ]);
            const planAmounts = await calculatePlanAmounts(requests.fromDate, requests.toDate);
            // console.log('planAmounts', planAmounts)
            return res.apiResponse(true, "Success", { docs: { plans, planAmounts } }, 200);
        }

    } catch (error) {
        return res.apiResponse(false, 'Get list error', {}, 500);
    }
}

async function calculatePlanAmounts(fromDate = '', toDate = '') {
    const query = {};

    // Parse and validate fromDate
    const from = fromDate ? moment(fromDate, [moment.ISO_8601, 'YYYY-MM-DD', 'DD-MM-YYYY'], true) : null;
    const to = toDate ? moment(toDate, [moment.ISO_8601, 'YYYY-MM-DD', 'DD-MM-YYYY'], true) : null;

    if (from && from.isValid() && to && to.isValid()) {
        query.createdAt = {
            $gte: from.startOf('day').toDate(),
            $lte: to.endOf('day').toDate(),
        };
    } else if (from && from.isValid() && !toDate) {
        query.createdAt = {
            $gte: from.startOf('day').toDate(),
            $lte: from.endOf('day').toDate(),
        };
    }

    const userPlans = await UserClassSubscription.find(query);
    // console.log('userPlans', userPlans)
    let totalPlanAmount = 0;

    for (const doc of userPlans) {
        const amount = parseFloat(doc?.amount || '0');
        // console.log('amount', amount)
        totalPlanAmount += amount;
        // console.log('totalPlanAmount', totalPlanAmount)
    }
    // console.log('totalPlanAmount-1', totalPlanAmount)
    return {
        totalPlanAmount,
    };
}

exports.createOrder = async (req, res, next) => {
    const { amount, userId, classId } = req.bodyParams;
    if (!amount || !classId) {
        return res.apiResponse(false, "Amount Or classId is Missing", {}, 400);
    } const options = {
        amount: amount * 100, // in paisa
        currency: "INR",
        receipt: "class_subscription",
        notes: {
            userId: req.userDetails.id,
        }
    };
    try {
        const order = await razorpay.orders.create(options);
        res.apiResponse(true, "Success", order, 200);
        const obj = {
            userId,
            method: "pending",
            classId,
            amount,
            orderId: order.id,
            paymentId: "",
            paymentStatus: "created",
            logStatus: "order_created"
        }
        await addPaymentLog(obj)
    } catch (err) {
        return res.apiResponse(false, err.message, {}, 500);
    }
}

exports.cancelCheckoutOrder = async (req, res, next) => {
    try {
        const { amount, paymentId, paymentStatus, orderId, classId } = req.bodyParams;
        if (!amount || !orderId || !classId) {
            return res.apiResponse(false, "Params is Missing", {}, 400);
        }
        const method = await getPaymentMethod(req.userDetails.id)
        const obj = {
            userId: req.userDetails.id,
            classId,
            method,
            amount: Number(amount) / 100 || 0,
            orderId: orderId || "",
            paymentId: paymentId || "",
            paymentStatus: paymentStatus || "Cancelled",
            logStatus: "user_cancelled_payment"
        }
        await addPaymentLog(obj)
        await Auth.findOneAndUpdate(
            { id: req.userDetails.id },
            { method: "" },
            { new: true }
        );
        return res.apiResponse(true, "Success", {}, 200);
    } catch (error) {
        return res.apiResponse(false, error.message, {}, 500);
    }
}

exports.paymentFailed = async (req, res, next) => {
    try {
        const { amount, paymentId, paymentStatus, orderId, classId } = req.bodyParams;
        if (!amount || !paymentId || !orderId || !classId) {
            return res.apiResponse(false, "Params is Missing", {}, 400);
        }
        const method = await getPaymentMethod(req.userDetails.id)
        const obj = {
            userId: req.userDetails.id,
            method,
            classId,
            amount: Number(amount) / 100 || 0,
            orderId: orderId || "",
            paymentId: paymentId || "",
            paymentStatus: paymentStatus || "Failed",
            logStatus: "payment_failed"
        }
        await addPaymentLog(obj)
        res.apiResponse(true, "Success", {}, 200);

        await Auth.findOneAndUpdate(
            { id: req.userDetails.id },
            { method: "" },
            { new: true }
        );
        return;
    } catch (error) {
        return res.apiResponse(false, error.message, {}, 500);
    }
}

async function addPaymentLog(req) {
    const newLog = new PaymentLogs({
        userId: req?.userId,
        method: req.method || "",
        classId: req.classId || "",
        amount: Number(req.amount) || 0,
        module: "liveClassSubscription",
        paymentId: req?.paymentId || "",
        orderId: req?.orderId || "",
        paymentStatus: req?.paymentStatus || "",
        logStatus: req?.logStatus || "",
    })
    await newLog.save();
}

exports.verify = async (req, res, next) => {
    console.log('req.bodyParams', req.bodyParams)
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId, classId } =
        req.bodyParams;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !userId || !classId) {
        return res.apiResponse(false, "Params is Missing", {}, 400);
    }
    const sign = crypto
        .createHmac("sha256", process.env.RAZORPAY_SECRET)
        .update(razorpay_order_id + "|" + razorpay_payment_id)
        .digest("hex");
    const method = await getPaymentMethod(userId)
    if (sign === razorpay_signature) {
        const response = await razorpay.payments.fetch(razorpay_payment_id);
        const obj = {
            userId: userId,
            method,
            classId,
            orderId: razorpay_order_id,
            amount: Number(response?.amount) / 100 || 0,
            paymentId: razorpay_payment_id || "",
            paymentStatus: response?.status || "Signature Verfied",
            logStatus: "signature_verification_success",
        }
        await addPaymentLog(obj)
        await Auth.findOneAndUpdate(
            { id: userId },
            { method: "" },
            { new: true }
        );
        return res.apiResponse(true, "Payment verified", {}, 200);
        // res.status(200).json({ success: true, message: "Payment verified" });
    } else {
        const response = await razorpay.payments.fetch(razorpay_payment_id);
        const obj = {
            userId: userId,
            method,
            classId,
            orderId: razorpay_order_id,
            amount: Number(response?.amount) / 100 || 0,
            paymentId: razorpay_payment_id || "",
            paymentStatus: response?.status || "Invalid signature",
            logStatus: "signature_verification_failed",
        }
        await addPaymentLog(obj)
        await Auth.findOneAndUpdate(
            { id: userId },
            { method: "" },
            { new: true }
        );
        return res.apiResponse(true, "Invalid signature", {}, 200);
        // res.status(400).json({ success: false, message: "Invalid signature" });
    }
}

exports.verifyPaymentStatus = async (req, res, next) => {
    try {
        const { razorpay_payment_id } = req.bodyParams;
        const response = await razorpay.payments.fetch(razorpay_payment_id);
        console.log('razorPay-res-invalid-sigh:', response)
        return res.apiResponse(true, "Success", order, 200);
    } catch (error) {
        return res.apiResponse(false, error.message, {}, 500);
    }
}

// const markSavedClass = async (classes, loginUserId) => {
//     if (!loginUserId || !Array.isArray(classes) || classes.length === 0) return classes;

//     return classes.map((cls) => {
//         const isSaved = cls.users?.filter(user => user.Id === loginUserId);
//         return {
//             ...cls,
//             saved: isSaved,
//         };
//     });
// };


// function isUpcomingSession(doc) {
//     if (!doc.toDate) return false;

//     console.log('doc.toDate', doc.toDate);

//     const toDate = moment(doc.toDate).startOf('day');
//     if (!toDate.isValid()) {
//         console.log('Invalid toDate:', doc.toDate);
//         return false;
//     }

//     const today = moment().startOf('day');

//     const isFuture = toDate.isSameOrAfter(today, 'day');
//     console.log(`Comparing ${toDate.format()} >= ${today.format()} =>`, isFuture);

//     return isFuture;
// }



// Utility to check if the session is still active (not completed)

function isUpcomingSession(doc) {
    if (!doc.toDate || !doc.endTime) return false;
    // const toDate = moment(doc.toDate).format('YYYY-MM-DD');
    const combinedEnd = `${doc.toDate} ${doc.endTime}`;
    const endMoment = moment(combinedEnd, 'YYYY-MM-DD HH:mm', true).utcOffset("+05:30");

    if (!endMoment.isValid()) return false;

    const nowIST = moment().utcOffset("+05:30");

    return endMoment.isAfter(nowIST);
}



// verification for old storekit 1 flow (legacy, not recommended by Apple but still supported for backward compatibility)
const verifyAppleReceipt = async (receiptData) => {
    const apiUrl = process.env.APPLE_STOREKIT_1_API_URL;
    const SANDBOX_URL = process.env.APPLE_STOREKIT_1_SANDBOX_URL;
    const PRODUCTION_URL = process.env.APPLE_STOREKIT_1_PRODUCTION_URL;
    const payload = {
        "receipt-data": receiptData,
        "password": process.env.APPLE_SHARED_SECRET,
        "exclude-old-transactions": true
    };

    let response = await axios.post(apiUrl, payload);

    //  MUST fallback
    if (response.data.status === 21007) {
        response = await axios.post(SANDBOX_URL, payload);
    }

    if (response.data.status === 21008) {
        response = await axios.post(PRODUCTION_URL, payload);
    }

    return response.data;
};

//  Helper to get the latest transaction from receipt response (for StoreKit 1 flow)
const getLatestTransaction = (appleRes) => {
    const list = appleRes.latest_receipt_info || [];

    let latest = null;

    for (let item of list) {
        if (
            !latest ||
            Number(item.purchase_date_ms) > Number(latest.purchase_date_ms)
        ) {
            latest = item;
        }
    }

    return latest;
};

//  Using official client for StoreKit 2 verification (recommended by Apple)
const getClient = (env) =>
    new AppStoreServerAPIClient(
        fs.readFileSync("./keys/AuthKey_5Q3579F973.p8", "utf8"),
        process.env.ASC_KEY_ID,
        process.env.ASC_ISSUER_ID,
        "com.bhive.momee",
        env
    );

//  Decoding JWS payload to extract transaction info
const decodeTransaction = (signedTransactionInfo) => {
    if (!signedTransactionInfo) {
        throw new Error("Missing signedTransactionInfo");
    }

    const parts = signedTransactionInfo.split(".");
    const payload = JSON.parse(
        Buffer.from(parts[1], "base64").toString()
    );

    return payload;
};

// for new storekit 2 flow
const verifyAppleTransaction = async (transactionId) => {
    try {
        console.log("🔵 Trying PRODUCTION...");
        const res = await getClient(Environment.PRODUCTION)
            .getTransactionInfo(transactionId);

        console.log(" PRODUCTION SUCCESS");
        return res;

    } catch (err) {
        console.log("❌ PRODUCTION FAILED:", err?.apiError, err?.errorMessage);

        try {
            console.log("🟡 Trying SANDBOX...");
            const res = await getClient(Environment.SANDBOX)
                .getTransactionInfo(transactionId);

            console.log(" SANDBOX SUCCESS");
            return res;

        } catch (err2) {
            console.log("❌ SANDBOX FAILED:", err2?.apiError, err2?.errorMessage);

            throw new Error("Apple verification failed in both environments");
        }
    }
};

exports.verifyPaymentAndSubscribe = async (req, res) => {
    try {
        console.log("🚀 API HIT: verifyPaymentAndSubscribe");

        const {
            userId,
            token,
            tokenType,
            transactionId,
            // productId
        } = req.bodyParams;

        if (!userId || !tokenType) {
            return res.apiResponse(false, "Missing params", {}, 400);
        }

        let appleResponse;
        let data;

        // =========================
        // STOREKIT 2
        // =========================
        if (tokenType === "JWS") {
            if (!transactionId) {
                return res.apiResponse(false, "transactionId required", {}, 400);
            }
            appleResponse = await verifyAppleTransaction(transactionId);
            if (!appleResponse?.signedTransactionInfo) {
                return res.apiResponse(false, "Invalid Apple response", {}, 400);
            }
            data = decodeTransaction(
                appleResponse.signedTransactionInfo
            );
        }
        // =========================
        // STOREKIT 1
        // =========================
        else if (tokenType === "LEGACY") {
            if (!token) {
                return res.apiResponse(false, "receiptData required", {}, 400);
            }
            appleResponse = await verifyAppleReceipt(token);
            if (appleResponse?.status !== 0) {
                return res.apiResponse(false, "Invalid receipt", {}, 400);
            }

            data = getLatestTransaction(appleResponse);
        }

        if (!data) {
            return res.apiResponse(false, "Invalid transaction data", {}, 400);
        }

        const {
            productId,
            transactionId: txId,
            purchaseDate,
            bundleId,
            environment
        } = data;

        console.log("📦 Apple Transaction:", {
            productId,
            txId,
            purchaseDate,
            bundleId,
            environment
        });

        // =========================
        // APP VALIDATION
        // =========================
        if (bundleId !== "com.bhive.momee") {
            return res.apiResponse(false, "Invalid app", {}, 400);
        }

        // =========================
        // DUPLICATE PAYMENT CHECK
        // =========================
        const existingPayment = await UserClassSubscription.findOne({
            paymentId: txId
        });

        if (existingPayment) {

            if (existingPayment.userId !== userId) {
                return res.apiResponse(false, "Fraud detected", {}, 403);
            }

            return res.apiResponse(
                true,
                "Already processed",
                existingPayment,
                200
            );
        }

        const user = await Auth.findOne({ id: userId });

        if (!user) {
            return res.apiResponse(false, "User not found", {}, 404);
        }

        const liveSession = await LiveSession.findOne({ id: productId });

        if (!liveSession) {
            return res.apiResponse(false, "Class not found", {}, 404);
        }

        // =========================
        // CHECK ALREADY SUBSCRIBED OR NOT
        // =========================
        const isAlreadySubscribed = liveSession.users.some(
            (u) => String(u.id) === String(userId)
        );

        if (isAlreadySubscribed) {
            return res.apiResponse(
                true,
                "User already subscribed to this class",
                {},
                200
            );
        }

        // =========================
        // ADD USER TO LIVE SESSION
        // =========================
        const userData = {
            id: user.id,
            name: user.name || "",
            email: user.email || "",
            mobile: user.mobile || "",
            paymentDateAndTime: moment().format("YYYY-MM-DD HH:mm"),
        };

        if (user.momType === "pregMom") {
            userData.Week =
                user.Week && typeof user.Week === "number"
                    ? user.Week
                    : 0;
        }
        else if (user.momType === "newMom") {
            userData.month =
                user.month && typeof user.month === "number"
                    ? user.month
                    : 0;
        }
        liveSession.users.push(userData);
        await liveSession.save();
        // =========================
        // CREATE SUBSCRIPTION
        // =========================
        const subscription = await UserClassSubscription.create({
            userId,
            classId: productId,
            paymentId: txId,
            name: liveSession.name,
            amount: liveSession.amount,
            purchasedDate: new Date(purchaseDate),
            environment,
        });
        // =========================
        // UPDATE USER
        // =========================
        await Auth.findOneAndUpdate(
            { id: userId },
            {
                $set: {
                    method: ""
                }
            },
            { new: true }
        );
        // =========================
        // PAYMENT LOG
        // =========================
        const paymentLogObj = {
            userId,
            subscriptionId: productId,
            paymentId: txId,
            environment,
            amount: Number(liveSession.amount) || 0,
            paymentStatus: "Success",
            logStatus: "live_class_subscription_success"
        };
        await addApplePaymentHistory(paymentLogObj);
        console.log("🎉 iOS Live Class Subscription Success");
        return res.apiResponse(
            true,
            "Class subscribed successfully",
            subscription,
            200
        );
    } catch (err) {
        console.log("❌ verifyPaymentAndSubscribe ERROR:", err);
        return res.apiResponse(
            false,
            "Payment verification failed",
            { error: err.message },
            500
        );
    }
};

exports.applePaymentFailed = async (req, res) => {
    try {
        const { userId, subscriptionId, paymentId, environment, amount, paymentStatus, logStatus } = req.bodyParams;

        if (!userId || !subscriptionId || !amount || !paymentStatus) {
            return res.apiResponse(false, "Required Params is Missing", {}, 400);
        }

        const obj = {
            userId,
            subscriptionId,
            paymentId,
            environment,
            amount: Number(amount) || 0,
            paymentStatus,
            logStatus: logStatus || "payment_failed"
        }
        await addApplePaymentHistory(obj)

        return res.apiResponse(true, "Payment history logged", {}, 200);
    } catch (error) {
        console.error("❌ Error in applePaymentFailed:", error);
        return res.apiResponse(false, "Failed to log payment history", {}, 500);
    }
}

exports.applePaymentCancelled = async (req, res) => {
    try {
        const { userId, subscriptionId, paymentId, environment, amount, paymentStatus, logStatus } = req.bodyParams;

        if (!userId || !subscriptionId || !amount || !paymentStatus) {
            return res.apiResponse(false, "Required Params is Missing", {}, 400);
        }
        const obj = {
            userId,
            subscriptionId,
            paymentId,
            environment,
            amount: Number(amount) || 0,
            paymentStatus,
            logStatus: logStatus || "payment_cancelled"
        }
        await addApplePaymentHistory(obj)

        return res.apiResponse(true, "Payment history logged", {}, 200);
    } catch (error) {
        console.error("❌ Error in applePaymentCancelled:", error);
        return res.apiResponse(false, "Failed to log payment history", {}, 500);
    }
}

//payment history for apple payments
async function addApplePaymentHistory(req) {
    const newLog = new ApplePaymentHistory({
        userId: req?.userId,
        subscriptionId: req?.subscriptionId,
        paymentId: req?.paymentId,
        environment: req?.environment,
        amount: Number(req?.amount) || 0,
        module: "liveClassSubscription",
        paymentStatus: req?.paymentStatus || "",
        logStatus: req?.logStatus || "",
    })
    await newLog.save();
}

// exports.verifyPaymentAndSubscribe = async (req, res) => {
//     try {
//         console.log("🚀 API HIT: verifyPaymentAndSubscribe");
//         console.log("📥 Request Params:", req.bodyParams);

//         const { userId, token, tokenType, transactionId } = req.bodyParams;

//         if (!userId || !tokenType) {
//             console.log("❌ Missing required params");
//             return res.apiResponse(false, "Missing params", {}, 400);
//         }

//         let appleResponse;
//         let data;

//         // 🔹 STOREKIT 2
//         if (tokenType === 'JWS') {
//             console.log("🟦 Flow: StoreKit 2 (JWS)");

//             if (!transactionId) {
//                 console.log("❌ transactionId missing");
//                 return res.apiResponse(false, "transactionId required", {}, 400);
//             }

//             console.log("📡 Calling Apple API with transactionId:", transactionId);

//             // appleResponse = await getTransactionFromApple(transactionId);
//             appleResponse = await verifyAppleTransaction(transactionId);

//             console.log("🍏 Apple Response:", appleResponse);

//             if (!appleResponse?.signedTransactionInfo) {
//                 console.log("❌ Invalid Apple response (missing signedTransactionInfo)");
//                 return res.apiResponse(false, "Invalid Apple response", {}, 400);
//             }

//             data = decodeTransaction(appleResponse.signedTransactionInfo);
//         }

//         // 🔹 STOREKIT 1
//         else if (tokenType === 'LEGACY') {
//             console.log("🟨 Flow: StoreKit 1 (LEGACY)");

//             if (!token) {
//                 console.log("❌ receiptData missing");
//                 return res.apiResponse(false, "receiptData required", {}, 400);
//             }

//             console.log("📡 Verifying receipt with Apple");

//             appleResponse = await verifyAppleReceipt(token);

//             console.log("🍏 Apple Response:", appleResponse);

//             if (appleResponse?.status !== 0) {
//                 console.log("❌ Invalid receipt, status:", appleResponse?.status);
//                 return res.apiResponse(false, "Invalid receipt", {}, 400);
//             }

//             data = getLatestTransaction(appleResponse);
//         }

//         console.log("🔍 Decoded Payload:", data);

//         if (!data) {
//             console.log("❌ Decoding failed, no transaction data");
//             return res.apiResponse(false, "Invalid transaction data", {}, 400);
//         }

//         const {
//             productId,
//             transactionId: txId,
//             purchaseDate,
//             bundleId,
//             environment
//         } = data;

//         console.log("📦 Extracted Data:", {
//             productId,
//             txId,
//             purchaseDate,
//             bundleId,
//             environment
//         });

//         // 🔒 App validation
//         if (bundleId !== "com.bhive.momee") {
//             console.log("❌ BundleId mismatch:", bundleId);
//             return res.apiResponse(false, "Invalid app", {}, 400);
//         }

//         // 🔒 Duplicate check
//         console.log("🔎 Checking duplicate for txId:", txId);

//         const existing = await UserClassSubscription.findOne({ paymentId: txId });

//         if (existing) {
//             console.log("⚠️ Duplicate transaction found");

//             if (existing.userId !== userId) {
//                 console.log("🚨 Fraud detected! Different user");
//                 return res.apiResponse(false, "Fraud detected", {}, 403);
//             }

//             console.log(" Already processed for same user");
//             return res.apiResponse(true, "Already processed", existing, 200);
//         }

//         //  Plan lookup
//         console.log("🔎 Finding plan for productId:", productId);

//         const plan = await LiveSession.findOne({ id: productId });

//         if (!plan) {
//             console.log("❌ Plan not found for productId:", productId);
//             return res.apiResponse(false, "Plan not found", {}, 400);
//         }

//         console.log(" Plan found:", plan.planName);

//         // 💾 Save subscription
//         console.log("💾 Creating subscription...");

//         const subscription = await UserClassSubscription.create({
//             userId,
//             id: `UserExercisePlan_${moment().format('DDMMYYYYHHmmss')}`,
//             subscriptionId: plan.id,
//             planName: plan.planName,
//             planAmount: plan.planAmount,
//             purchasedDate: new Date(purchaseDate),
//             paymentId: txId,
//             environment,
//         });

//         const updatedUser = await Auth.findOneAndUpdate(
//             { id: userId },
//             { $set: { exerciseOverview: true } },
//             { new: true }
//         );

//         const obj = {
//             userId,
//             subscriptionId: plan.id,
//             amount: Number(plan.planAmount) || 0,
//             environment: environment || "",
//             paymentId: txId || "",
//             paymentStatus: "Success",
//             logStatus: "subscription_created"
//         }
//         await addApplePaymentHistory(obj)

//         console.log("🎉 Subscription saved successfully:", subscription._id);

//         return res.apiResponse(true, "Payment verified", subscription, 200);

//     } catch (err) {
//         console.error("❌ ERROR in verifyPaymentAndSubscribe:");
//         console.error("👉 Message:", err.message);
//         console.error("👉 Stack:", err.stack);

//         return res.apiResponse(false, "Payment verification failed", {}, 500);
//     }
// };
