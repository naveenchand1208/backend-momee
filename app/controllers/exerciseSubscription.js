const ExercisePlan = require('../models/exerciseSubscription')
const UserExercisePlan = require('../models/userExerciseSubscription')
const Auth = require('../models/auth')
const PaymentLogs = require('../models/paymentLogs')
const moment = require('moment')
const { exportToExcel } = require('../helpers/excel')
const Razorpay = require("razorpay")
const crypto = require("crypto")
const cron = require('node-cron');
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

async function getPaymentMethod(userId) {
    if (!userId) return null;

    const user = await Auth.findOne({ id: userId }).select('paymentMethod');
    return user?.paymentMethod || null;
}

exports.add = async (req, res, next) => {
    try {
        const { planName, planAmount, durationMonths, deviceType } = req.bodyParams;
        if (!planName || !planAmount || !durationMonths) {
            console.log('coming')
            return res.apiResponse(false, 'Plan details are missing', {}, 400);
        }
        // features.length === 0
        const checkTitle = await ExercisePlan.findOne({ planName: planName, deviceType: deviceType });
        if (checkTitle) {
            return res.apiResponse(false, 'Plan Name already exists', {}, 400);
        }
        const uniqueId = `ExercisePlan_${moment().format('DDMMYYYYHHmmss')}`;
        const newPlan = new ExercisePlan({
            planName,
            planAmount,
            durationMonths,
            deviceType,
            // features,
            id: uniqueId,
        })
        await newPlan.save();
        return res.apiResponse(true, "Plans added successfully", newPlan, 200);
    } catch (error) {
        console.error(error);
        return res.apiResponse(false, 'Add subscription error', {}, 500);
    }

}

exports.list = async (req, res, next) => {
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
        if (requests.status && requests.status !== '') {
            match['status'] = requests.status;
        }
        if (requests.deviceType && requests.deviceType !== '') {
            match['deviceType'] = requests.deviceType;
        }
        if (requests.searchKey !== undefined && requests.searchKey.trim() !== '') {
            const searchTerm = requests.searchKey.trim();
            match['planName'] = { $regex: searchTerm, $options: 'i' };
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
        const options = {
            page: page,
            limit: per_page,
            skip: skip,
            sort: { [sortField]: sortOrder },
        };
        if (pagination === "true") {
            // options.sort = { createdAt: -1 };
            ExercisePlan.paginate(match, options, function (err, data) {
                if (err) {
                    return res.apiResponse(false, "Error while fetching lists", {}, 404);
                }
                return res.apiResponse(true, "Success", data, 200);
            });
        } else {
            let plans = [];
            const query = Object.keys(match).length === 0
                ? ExercisePlan.find({})
                : ExercisePlan.find(match);
            plans = await query.sort({ createdAt: -1 });
            return res.apiResponse(true, "Success", { docs: plans }, 200);
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
        const plan = await ExercisePlan.findOne({ id: requests.id })
        if (!plan) {
            return res.apiResponse(false, 'plan not found', {}, 404);
        }
        return res.apiResponse(true, 'Success', plan, 200);
    } catch (error) {
        return res.apiResponse(false, 'get plan error', {}, 500)
    }
}

exports.update = async (req, res, next) => {
    try {
        const requests = req.bodyParams;
        console.log('requests', requests)
        if (!requests.id) {
            return res.apiResponse(false, 'Id is missing', {}, 400);
        }
        // console.log('coming')
        const checkTitle = await ExercisePlan.findOne({ planName: requests.planName, deviceType: requests.deviceType })
        if (checkTitle && checkTitle.id !== requests.id) {
            return res.apiResponse(false, 'Plan Name already exists', {}, 400);
        }
        // console.log('coming-1')
        const updateFields = { ...requests };
        // console.log('Update Fields:', updateFields);

        const plan = await ExercisePlan.findOneAndUpdate(
            { id: requests.id },
            updateFields,
            { new: true }
        );
        if (!plan) {
            return res.apiResponse(false, 'Plan not found', {}, 404);
        }
        return res.apiResponse(true, 'Plan updated successfully', plan, 200);

    } catch (error) {
        return res.apiResponse(false, 'Error updating  Plan', {}, 500);
    }
};

exports.delete = async (req, res, next) => {
    try {
        var requests = req.bodyParams;
        if (!requests.id) {
            return res.apiResponse(false, 'Id is missing', {}, 400);
        }
        const result = await ExercisePlan.deleteOne({ id: requests.id });

        if (result.deletedCount === 0) {
            return res.apiResponse(false, 'Plan not found', {}, 404)
        }
        return res.apiResponse(true, 'Plan deleted successfully', result, 200)
    } catch (error) {
        return res.apiResponse(false, 'delete plan error', {}, 500)
    }
}

exports.userSubscription = async (req, res, next) => {
    try {
        var requests = req.bodyParams;
        if (!requests.userId || !requests.subscriptionId) {
            return res.apiResponse(false, 'Id is missing', {}, 400);
        }
        const orderId = (requests.razorpay_order_id || '').trim();
        const paymentId = (requests.razorpay_payment_id || '').trim();
        const signature = (requests.razorpay_signature || '').trim();
        const sign = crypto
            .createHmac("sha256", process.env.RAZORPAY_SECRET)
            .update(orderId + "|" + paymentId)
            .digest("hex");
        console.log('sign', sign)
        console.log('razorpay_signature', signature)
        const method = await getPaymentMethod(requests.userId)
        if (sign === signature) {
            const response = await razorpay.payments.fetch(requests.razorpay_payment_id);
            const obj = {
                userId: requests.userId,
                orderId: orderId,
                method,
                amount: Number(response?.amount) / 100 || 0,
                paymentId: paymentId || "",
                subscriptionId: requests?.subscriptionId || "",
                paymentStatus: response?.status || "Signature Verfied",
                logStatus: "signature_verification_success",
            }
            await addPaymentLog(obj)
            // console.log('coming-after-log')
            const subscribedPlan = await ExercisePlan.findOne({ id: requests.subscriptionId });
            // console.log('coming-after-subscribedPlan')
            if (!subscribedPlan) {
                return res.apiResponse(false, 'Plan not found', {}, 404);
            }
            // console.log('coming-inside-subscribedPlan', subscribedPlan)
            requests.id = `UserExercisePlan-${moment().format('DDMMYYYYHHmmss')}`;
            requests.planName = subscribedPlan.planName;
            requests.planAmount = subscribedPlan.planAmount;
            // console.log('requests-1', requests)
            requests.activePlan = false;
            requests.validityStartDate = "";
            requests.validityEndDate = "";
            // console.log('requests-2', requests)
            requests.paymentId = paymentId;
            // console.log('requests-3', paymentId)
            requests.userId = requests.userId;
            requests.subscriptionId = requests.subscriptionId;
            // console.log('requests', requests)
            const newUserPlan = new UserExercisePlan(requests)
            await newUserPlan.save()
            const updatedUser = await Auth.findOneAndUpdate(
                { id: requests.userId },
                { exerciseOverview: true },
                { new: true }
            );
            if (!updatedUser) {
                return res.apiResponse(false, 'User not found', {}, 404);
            }
            return res.apiResponse(true, 'Plan Subscribed successfully', newUserPlan, 200)
        } else {
            const response = await razorpay.payments.fetch(requests.razorpay_payment_id);
            const obj = {
                userId: requests.userId,
                orderId: orderId,
                method,
                amount: Number(response?.amount) / 100 || 0,
                paymentId: paymentId || "",
                subscriptionId: requests?.subscriptionId || "",
                paymentStatus: response?.status || "Invalid signature",
                logStatus: "signature_verification_failed",
            }
            await addPaymentLog(obj)
            // console.log('razorPay-res-invalid-sigh:', response)
            return res.apiResponse(true, "Invalid signature", {}, 200);
        }
        return res.apiResponse(true, 'Plan Subscribed successfully', newUserPlan, 200)
    } catch (error) {
        return res.apiResponse(false, 'Plan Subscription error', { error }, 500)
    }
}

async function addPaymentLog(req) {
    const newLog = new PaymentLogs({
        userId: req?.userId,
        amount: Number(req.amount) || 0,
        method: req.method || "",
        orderId: req?.orderId || "",
        subscriptionId: req?.subscriptionId || "",
        module: "exerciseSubscription",
        paymentId: req?.paymentId || "",
        paymentStatus: req?.paymentStatus || "",
        logStatus: req?.logStatus || "",
    })
    await newLog.save();
}

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
        if (requests.planQuery === "futurePlan") {
            match.activePlan = false;
            match.expired = false;
            match.validityStartDate = "";
            match.validityEndDate = "";
        } else if (requests.planQuery === "currentPlan") {
            match.activePlan = true;
            match.expired = false;
            match.validityStartDate = { $ne: "" };
            match.validityEndDate = { $ne: "" };
        } else if (requests.planQuery === "expiredPlan") {
            match.activePlan = false;
            match.expired = true;
            match.validityStartDate = { $ne: "" };
            match.validityEndDate = { $ne: "" };
        }
        // if (requests.status && requests.status !== '') {
        //     match['status'] = requests.status;
        // }
        if (requests.searchKey !== undefined && requests.searchKey.trim() !== '') {
            // console.log('searchKey', searchKey)
            const searchTerm = requests.searchKey.trim();
            // console.log('searchTerm', searchTerm)
            match['planName'] = { $regex: searchTerm, $options: 'i' };
        }
        // if (requests.searchKey !== undefined && requests.searchKey.trim() !== '') {
        //     const searchTerm = requests.searchKey.trim();
        //     match.planName = { $regex: searchTerm, $options: 'i' };
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
                {
                    path: 'subscribedPlan',
                    select: 'planName planAmount id'
                }
            ],
        };

        if (pagination === "true") {
            UserExercisePlan.paginate(match, options, async function (err, data) {
                if (err) {
                    return res.apiResponse(false, "Error while fetching lists", {}, 404);
                }
                if (requests.planQuery === "currentPlan") {
                    data.docs = await addExpiresInDays(data.docs)
                    // console.log('data.docs', data.docs)
                }
                const planAmounts = await calculatePlanAmounts(requests.fromDate, requests.toDate, requests.planQuery);
                // console.log('planAmounts', planAmounts)
                return res.apiResponse(true, "Success", { data, planAmounts }, 200);
            });
        } else {
            let plans = [];
            if (Object.keys(match).length === 0) {
                plans = await UserExercisePlan.find({});
            } else {
                plans = await UserExercisePlan.find(match);
            }

            await UserExercisePlan.populate(plans, [
                {
                    path: 'user',
                    select: 'userName id'
                },
                {
                    path: 'subscribedPlan',
                    select: 'planName planAmount id'
                }
            ]);

            if (requests.planQuery === "currentPlan") {
                plans = await addExpiresInDays(plans)
            }
            const planAmounts = await calculatePlanAmounts(requests.fromDate, requests.toDate, requests.planQuery);
            // console.log('planAmounts', planAmounts)
            return res.apiResponse(true, "Success", { docs: { plans, planAmounts } }, 200);
        }

    } catch (error) {
        return res.apiResponse(false, 'Get list error', {}, 500);
    }
}

async function calculatePlanAmounts(fromDate = '', toDate = '', planQuery = '') {
    const query = {};
    console.log('planQuery', planQuery)
    // if (planQuery === "futurePlan") {
    //         match.activePlan = false;
    //         match.expired = false;
    //         match.validityStartDate = "";
    //         match.validityEndDate = "";
    //     } else if (planQuery === "currentPlan") {
    //         match.activePlan = true;
    //         match.expired = false;
    //         match.validityStartDate = { $ne: "" };
    //         match.validityEndDate = { $ne: "" };
    //     } else if (planQuery === "expiredPlan") {
    //         match.activePlan = false;
    //         match.expired = true;
    //         match.validityStartDate = { $ne: "" };
    //         match.validityEndDate = { $ne: "" };
    //     }

    if (planQuery === "futurePlan") {
        query.activePlan = false;
        query.expired = false;
        query.validityStartDate = "";
        query.validityEndDate = "";
    } else if (planQuery === "currentPlan") {
        query.activePlan = true;
        query.expired = false;
        query.validityStartDate = { $ne: "" };
        query.validityEndDate = { $ne: "" };
    } else if (planQuery === "expiredPlan") {
        query.activePlan = false;
        query.expired = true;
        query.validityStartDate = { $ne: "" };
        query.validityEndDate = { $ne: "" };
    }

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

    const userPlans = await UserExercisePlan.find(query);
    // console.log('userPlans', userPlans)
    let totalPlanAmount = 0;

    for (const doc of userPlans) {
        const amount = parseFloat(doc?.planAmount || '0');
        // console.log('amount', amount)
        totalPlanAmount += amount;
        // console.log('totalPlanAmount', totalPlanAmount)
    }
    // console.log('totalPlanAmount-1', totalPlanAmount)
    return {
        totalPlanAmount,
    };
}

function addExpiresInDays(plans) {
    const today = moment();

    return plans.map(plan => {
        const plain = plan.toObject ? plan.toObject() : plan; // support both cases
        const endDate = moment(plain.validityEndDate, 'DD-MM-YYYY');
        const expiresInDays = endDate.diff(today, 'days');
        plain.expiresInDays = expiresInDays >= 0 ? expiresInDays : 0;
        return plain;
    });
}

exports.activateUserPlan = async (req, res, next) => {
    try {
        const { userId, startDate, planId, userPlanId } = req.bodyParams;
        if (!userId || !startDate || !planId || !userPlanId) {
            return res.apiResponse(false, 'Activate parsms is missing', {}, 400);
        }
        const userPlan = await UserExercisePlan.findOne({ userId, activePlan: false, expired: false, validityStartDate: "", validityEndDate: "", id: userPlanId });
        if (!userPlan) {
            return res.apiResponse(false, 'User Plan Not Found', {}, 404);
        }

        const plan = await ExercisePlan.findOne({ id: planId });
        if (!plan) {
            return res.apiResponse(false, 'Plan Not Found', {}, 404);
        }

        const now = moment(startDate);
        const months = parseInt(plan.durationMonths || 0, 10);

        userPlan.validityStartDate = now.format('DD-MM-YYYY');
        userPlan.validityEndDate = now.clone().add(months, 'months').format('DD-MM-YYYY');
        userPlan.activePlan = true;
        userPlan.expired = false;

        await userPlan.save();

        const activateUserExercisePlan = await Auth.findOneAndUpdate(
            { id: userId },
            { exerciseSubscribed: true },
            { new: true }
        );

        if (!activateUserExercisePlan) {
            return res.apiResponse(false, 'User not found', {}, 404);
        }

        return res.apiResponse(true, 'Plan Activated successfully', userPlan, 200);

    } catch (error) {
        return res.apiResponse(false, 'Plan Activation error', { error }, 500);
    }
};

exports.createOrder = async (req, res, next) => {
    const { amount, subscriptionId } = req.bodyParams;
    if (!amount || !subscriptionId) {
        return res.apiResponse(false, "Amount Or subscription Id is Missing", {}, 400);
    }
    const options = {
        amount: amount * 100, // in paisa
        currency: "INR",
        receipt: "exercise_subscription",
        notes: {
            userId: req.userDetails.id,
        }
    };
    try {
        const order = await razorpay.orders.create(options);
        res.apiResponse(true, "Success", order, 200);
        const obj = {
            userId: req.userDetails.id,
            subscriptionId,
            amount,
            method: "pending",
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
        const { amount, paymentId, paymentStatus, orderId, subscriptionId } = req.bodyParams;
        if (!amount || !orderId || !subscriptionId) {
            return res.apiResponse(false, "Params is Missing", {}, 400);
        }
        const method = await getPaymentMethod(req.userDetails.id)
        const obj = {
            userId: req.userDetails.id,
            subscriptionId,
            method,
            amount: Number(amount) / 100 || 0,
            orderId: orderId || "",
            paymentId: paymentId || "",
            paymentStatus: paymentStatus || "Cancelled",
            logStatus: "user_cancelled_payment"
        }
        await addPaymentLog(obj)
        return res.apiResponse(true, "Success", {}, 200);
    } catch (error) {

    }
}

exports.paymentFailed = async (req, res, next) => {
    try {
        const { amount, paymentId, paymentStatus, orderId, subscriptionId } = req.bodyParams;
        if (!amount || !paymentId || !orderId || !subscriptionId) {
            return res.apiResponse(false, "Params is Missing", {}, 400);
        }
        const method = await getPaymentMethod(req.userDetails.id)
        const obj = {
            userId: req.userDetails.id,
            method,
            subscriptionId,
            amount: Number(amount) / 100 || 0,
            paymentId: paymentId || "",
            orderId: orderId || "",
            paymentStatus: paymentStatus || "Failed",
            logStatus: "payment_failed"
        }
        await addPaymentLog(obj)
        await Auth.findOneAndUpdate(
            { id: req.userDetails.id },
            { method: "" },
            { new: true }
        );
        return res.apiResponse(true, "Success", {}, 200);
    } catch (error) {

    }
}

exports.verify = async (req, res, next) => {
    console.log('req.bodyParams', req.bodyParams)
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId, subscriptionId } =
        req.bodyParams;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !userId || !subscriptionId) {
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
            subscriptionId,
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
            subscriptionId,
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

const checkExpiredPlans = async () => {
    try {
        const today = moment().startOf("day");
        const plans = await UserExercisePlan.find({ activePlan: true });
        for (let plan of plans) {
            const endDate = moment(plan.validityEndDate, "DD-MM-YYYY").startOf("day");
            if (endDate.isBefore(today)) {
                // await UserPlan.findByIdAndUpdate(plan._id, {
                //     activePlan: false,
                //     expired: true
                // });
                await UserExercisePlan.findOneAndUpdate({ id: plan.id },
                    {
                        $set: {
                            activePlan: false,
                            expired: true
                        }
                    },
                    { new: true }
                );
                console.log(`Plan expired updated: ${plan._id}`);
            }
        }
    } catch (err) {
        console.error("Cron error:", err);
    }
};

cron.schedule("1 0,12 * * *", checkExpiredPlans);
// cron.schedule("* * * * * *", checkExpiredPlans);

// RUNS EVERY SECOND
cron.schedule("10 0,12 * * *", async () => {
    try {
        // console.log("User subscription checker running...")
        // Get all users
        const users = await Auth.find({})
        for (let user of users) {
            const userId = user.id.toString();

            // Check if user has at least one active plan
            const active = await UserExercisePlan.findOne({
                userId: userId,
                activePlan: true
            });
            if (!active) {
                // No active plan → mark unsubscribed
                await Auth.findOneAndUpdate({ id: userId },
                    {
                        $set: {
                            exerciseSubscribed: false
                        }
                    },
                    { new: true }
                );
                // console.log(`User ${userId} marked as unsubscribed`);
            }
        }
    } catch (err) {
        console.error("Every second cron error:", err);
    }
});


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
        console.log("📥 Request Params:", req.bodyParams);

        const { userId, token, tokenType, transactionId } = req.bodyParams;

        if (!userId || !tokenType) {
            console.log("❌ Missing required params");
            return res.apiResponse(false, "Missing params", {}, 400);
        }

        const user = await Auth.findOne({ id: userId });

        if (!user) {
            console.log("❌ User not found for userId:", userId);
            return res.apiResponse(false, "User not found", {}, 404);
        }

        let appleResponse;
        let data;

        // 🔹 STOREKIT 2
        if (tokenType === 'JWS') {
            console.log("🟦 Flow: StoreKit 2 (JWS)");

            if (!transactionId) {
                console.log("❌ transactionId missing");
                return res.apiResponse(false, "transactionId required", {}, 400);
            }

            console.log("📡 Calling Apple API with transactionId:", transactionId);

            // appleResponse = await getTransactionFromApple(transactionId);
            appleResponse = await verifyAppleTransaction(transactionId);

            console.log("🍏 Apple Response:", appleResponse);

            if (!appleResponse?.signedTransactionInfo) {
                console.log("❌ Invalid Apple response (missing signedTransactionInfo)");
                return res.apiResponse(false, "Invalid Apple response", {}, 400);
            }

            data = decodeTransaction(appleResponse.signedTransactionInfo);
        }

        // 🔹 STOREKIT 1
        else if (tokenType === 'LEGACY') {
            console.log("🟨 Flow: StoreKit 1 (LEGACY)");

            if (!token) {
                console.log("❌ receiptData missing");
                return res.apiResponse(false, "receiptData required", {}, 400);
            }

            console.log("📡 Verifying receipt with Apple");

            appleResponse = await verifyAppleReceipt(token);

            console.log("🍏 Apple Response:", appleResponse);

            if (appleResponse?.status !== 0) {
                console.log("❌ Invalid receipt, status:", appleResponse?.status);
                return res.apiResponse(false, "Invalid receipt", {}, 400);
            }

            data = getLatestTransaction(appleResponse);
        }

        console.log("🔍 Decoded Payload:", data);

        if (!data) {
            console.log("❌ Decoding failed, no transaction data");
            return res.apiResponse(false, "Invalid transaction data", {}, 400);
        }

        const {
            productId,
            transactionId: txId,
            purchaseDate,
            bundleId,
            environment
        } = data;

        console.log("📦 Extracted Data:", {
            productId,
            txId,
            purchaseDate,
            bundleId,
            environment
        });

        // 🔒 App validation
        if (bundleId !== "com.bhive.momee") {
            console.log("❌ BundleId mismatch:", bundleId);
            return res.apiResponse(false, "Invalid app", {}, 400);
        }

        // 🔒 Duplicate check
        console.log("🔎 Checking duplicate for txId:", txId);

        const existing = await UserExercisePlan.findOne({ paymentId: txId });

        if (existing) {
            console.log("⚠️ Duplicate transaction found");

            if (existing.userId !== userId) {
                console.log("🚨 Fraud detected! Different user");
                return res.apiResponse(false, "Fraud detected", {}, 403);
            }

            console.log(" Already processed for same user");
            return res.apiResponse(true, "Already processed", existing, 200);
        }

        //  Plan lookup
        console.log("🔎 Finding plan for productId:", productId);

        const plan = await ExercisePlan.findOne({ id: productId });

        if (!plan) {
            console.log("❌ Plan not found for productId:", productId);
            return res.apiResponse(false, "Plan not found", {}, 400);
        }

        console.log(" Plan found:", plan.planName);

        // 💾 Save subscription
        console.log("💾 Creating subscription...");

        const subscription = await UserExercisePlan.create({
            userId,
            id: `UserExercisePlan_${moment().format('DDMMYYYYHHmmss')}`,
            subscriptionId: plan.id,
            planName: plan.planName,
            planAmount: plan.planAmount,
            purchasedDate: new Date(purchaseDate),
            paymentId: txId,
            environment,
            validityStartDate: "",
            validityEndDate: ""
        });

        const updatedUser = await Auth.findOneAndUpdate(
            { id: userId },
            { $set: { exerciseOverview: true } },
            { new: true }
        );

        const obj = {
            userId,
            subscriptionId: plan.id,
            amount: Number(plan.planAmount) || 0,
            environment: environment || "",
            paymentId: txId || "",
            paymentStatus: "Success",
            logStatus: "subscription_created"
        }
        await addApplePaymentHistory(obj)

        console.log("🎉 Subscription saved successfully:", subscription._id);

        return res.apiResponse(true, "Payment verified", subscription, 200);

    } catch (err) {
        console.error("❌ ERROR in verifyPaymentAndSubscribe:");
        console.error("👉 Message:", err.message);
        console.error("👉 Stack:", err.stack);

        return res.apiResponse(false, "Payment verification failed", {}, 500);
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
        module: "exerciseSubscription",
        paymentStatus: req?.paymentStatus || "",
        logStatus: req?.logStatus || "",
    })
    await newLog.save();
}

// cron.schedule('* * * * * *', async () => {
//     try {

//         const exercisePlans = await ExercisePlan.find({});

//         for (const plan of exercisePlans) {

//             if (!plan.id) continue;

//             // exercise-plan-1  -> ExercisePlan_1
//             // const updatedId = plan.id
//             //     .replace('exercise-plan-', 'ExercisePlan_');

//             // console.log(plan.id, '=>', updatedId);

//             await ExercisePlan.findOneAndUpdate(
//                 { id: plan.id },
//                 {
//                     $set: {
//                         deviceType: 'andriod'
//                     }
//                 }
//             );
//         }

//     } catch (error) {
//         console.log(error);
//     }
// });



// cron.schedule('* * * * * *', async () => {
//     try {

//         const exercisePlans = await ExercisePlan.find({});

//         for (const plan of exercisePlans) {

//             if (!plan.id) continue;

//             // exercise-plan-1  -> ExercisePlan_1
//             const updatedId = plan.id
//                 .replace('exercise-plan-', 'ExercisePlan_');

//             console.log(plan.id, '=>', updatedId);

//             await ExercisePlan.findOneAndUpdate(
//                 { id: plan.id },
//                 {
//                     $set: {
//                         id: updatedId
//                     }
//                 }
//             );
//         }

//     } catch (error) {
//         console.log(error);
//     }
// });

// cron.schedule('* * * * * *', async () => {
//     try {
//         console.log('ExercisePlan ID update cron started');

//         const exercisePlans = await ExercisePlan.find({});

//         for (const plan of exercisePlans) {

//             if (!plan.id) continue;

//             const updatedId = String(plan.id).replace(/-/g, '_');

//             console.log('OLD:', plan.id);
//             console.log('NEW:', updatedId);

//             // Direct mongo update
//             const result = await ExercisePlan.findOneAndUpdate(
//                 { _id: plan._id },
//                 {
//                     $set: {
//                         id: updatedId
//                     }
//                 }
//             );

//             console.log(result);
//         }

//         console.log('ExercisePlan ID update cron completed');

//     } catch (error) {
//         console.error('ExercisePlan cron error:', error);
//     }
// });

// async function addPaymentLog(req) {
//     const newLog = new PaymentLogs({
//         userId: req?.userId,
//         amount: Number(req.amount) || 0,
//         module: "exerciseSubscription",
//         paymentId: req?.paymentId || "",
//         paymentStatus: req?.status || "",
//         logStatus: req?.logStatus || "",
//     })
//     await newLog.save();
// }