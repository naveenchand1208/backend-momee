const DietPlan = require('../models/dietSubscription')
const Auth = require('../models/auth')
const UserDietPlan = require('../models/userDietSubscription')
const PaymentLogs = require('../models/paymentLogs')
const ApplePaymentHistory = require('../models/applePaymentHistory')
const moment = require('moment');
const Razorpay = require("razorpay")
const crypto = require("crypto")
const cron = require('node-cron');
const { verifyAndDecode } = require('../helpers/util');
const jwt = require("jsonwebtoken");
const axios = require("axios");
const {
    AppStoreServerAPIClient,
    Environment
} = require('@apple/app-store-server-library');
const fs = require('fs');
const path = require("path");

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
        console.log('req.bodyParams', req.bodyParams)
        const { planName, planAmount, durationMonths, deviceType } = req.bodyParams;
        if (!planName || !planAmount || !durationMonths) {
            return res.apiResponse(false, 'Plan details are missing', {}, 400);
        }
        const checkName = await DietPlan.findOne({ planName: planName, deviceType: deviceType });
        console.log('checkName', checkName)
        if (checkName) {
            return res.apiResponse(false, 'Plan with this name already exists', {}, 400);
        }
        const uniqueId = `DietPlan_${moment().format('DDMMYYYYHHmmss')}`;
        const newDietPlan = new DietPlan({
            id: uniqueId,
            planName,
            planAmount,
            durationMonths,
            deviceType: req.bodyParams.deviceType || 'android',
        })
        await newDietPlan.save();
        return res.apiResponse(true, "Plans added successfully", newDietPlan, 200);
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

        // if (requests.searchKey !== undefined && requests.searchKey.trim() !== '') {
        //     const searchTerm = requests.searchKey.trim();
        //     match['planName'] = { $regex: searchTerm, $options: 'i' };
        // }
        // if (requests.fromDate && requests.toDate) {
        //     let startDate = moment(requests.fromDate);
        //     let endDate = moment(requests.toDate);
        //     if (startDate.isValid() && endDate.isValid()) {
        //         match.createdAt = {
        //             $gte: startDate.startOf('day').toDate(),
        //             $lte: endDate.endOf('day').toDate()
        //         };
        //     }
        // }
        const options = {
            page: page,
            limit: per_page,
            skip: skip,
            sort: { [sortField]: sortOrder },
        };
        if (pagination === "true") {
            DietPlan.paginate(match, options, function (err, data) {
                if (err) {
                    return res.apiResponse(false, "Error while fetching lists", {}, 404);
                }
                return res.apiResponse(true, "Success", data, 200);
            });
        } else {
            let plans = [];
            if (Object.keys(match).length === 0) {
                plans = await DietPlan.find({});
            } else {
                plans = await DietPlan.find(match);
            }
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
        const plan = await DietPlan.findOne({ id: requests.id })
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
        if (!requests.id) {
            return res.apiResponse(false, 'Id is missing', {}, 400);
        }
        const updateFields = { ...requests };
        console.log('Update Fields:', updateFields);

        const plan = await DietPlan.findOneAndUpdate(
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
        const result = await DietPlan.deleteOne({ id: requests.id });

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
        let requests = req.bodyParams;
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
        // console.log('sign', sign)
        // console.log('razorpay_signature', signature)
        const method = await getPaymentMethod(requests.userId)
        if (sign === signature) {
            const response = await razorpay.payments.fetch(requests.razorpay_payment_id);
            // console.log('response', response)
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
            const subscribedPlan = await DietPlan.findOne({ id: requests.subscriptionId });
            // console.log('subscribedPlan', subscribedPlan)
            if (subscribedPlan) {
                requests.id = `UserDietPlan-${moment().format('DDMMYYYYHHmmss')}`;
                requests.planName = subscribedPlan?.planName;
                requests.planAmount = subscribedPlan?.planAmount;
                requests.activePlan = false;
                requests.validityStartDate = "";
                requests.validityEndDate = "";
                requests.paymentId = paymentId;
                // requests.userId = userId;
                // requests.subscriptionId = subscriptionId;
            }
            // console.log('requests', requests)
            const newUserPlan = new UserDietPlan(requests)
            // console.log('newUserPlan', newUserPlan)
            await newUserPlan.save()
            // console.log('added', newUserPlan)
            const updatedUser = await Auth.findOneAndUpdate(
                { id: requests.userId },
                { $set: { dietOverview: true } },
                { new: true }
            );
            if (!updatedUser) {
                return res.apiResponse(false, 'User not found', {}, 404);
            }
            return res.apiResponse(true, 'Plan Subscribed successfully', newUserPlan, 200)
        } else {
            console.log('coming-else')
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
    } catch (error) {
        return res.apiResponse(false, 'Plan Subscription error', { error }, 500)
    }
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
        if (requests.searchKey !== undefined && requests.searchKey.trim() !== '') {
            const searchTerm = requests.searchKey.trim();
            match.planName = { $regex: searchTerm, $options: 'i' };
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
                {
                    path: 'subscribedPlan',
                    select: 'planName planAmount id'
                }
            ],
        };

        if (pagination === "true") {
            UserDietPlan.paginate(match, options, async function (err, data) {
                if (err) {
                    return res.apiResponse(false, "Error while fetching lists", {}, 404);
                }
                if (requests.planQuery === "currentPlan") {
                    data.docs = await addExpiresInDays(data.docs)
                    // console.log('data.docs', data.docs)
                }
                const planAmounts = await calculatePlanAmounts(requests.fromDate, requests.toDate);
                // console.log('planAmounts', planAmounts)
                return res.apiResponse(true, "Success", { data, planAmounts }, 200);
            });
        } else {
            let plans = [];
            if (Object.keys(match).length === 0) {
                plans = await UserDietPlan.find({});
            } else {
                plans = await UserDietPlan.find(match);
            }

            await UserDietPlan.populate(plans, [
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
            const planAmounts = await calculatePlanAmounts(requests.fromDate, requests.toDate);
            // console.log('planAmounts', planAmounts)
            return res.apiResponse(true, "Success", { docs: { plans, planAmounts } }, 200);
        }

    } catch (error) {
        return res.apiResponse(false, 'Get list error', {}, 500);
    }
}

exports.activateUserPlan = async (req, res, next) => {
    try {
        const { userId, startDate, planId } = req.bodyParams;
        if (!userId || !startDate || !planId) {
            return res.apiResponse(false, 'Activate parsms is missing', {}, 400);
        }
        const userPlan = await UserDietPlan.findOne({ userId, activePlan: false, expired: false, validityStartDate: "", validityEndDate: "" });
        if (!userPlan) {
            return res.apiResponse(false, 'User Plan Not Found', {}, 404);
        }

        const plan = await DietPlan.findOne({ id: planId });
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

        const activateUserDietPlan = await Auth.findOneAndUpdate(
            { id: userId },
            { $set: { dietSubscribed: true } },
            { new: true }
        );

        if (!activateUserDietPlan) {
            return res.apiResponse(false, 'User not found', {}, 404);
        }

        return res.apiResponse(true, 'Plan Activated successfully', userPlan, 200);

    } catch (error) {
        return res.apiResponse(false, 'Plan Activation error', { error }, 500);
    }
};

function calculatePlanAmountssss(plans) {
    const now = moment();
    const thirtyDaysAgo = moment().subtract(30, 'days');

    let totalPlanAmount = 0;
    let totalLast30Days = 0;

    for (const doc of plans) {
        const amount = parseFloat(doc?.subscribedPlan?.planAmount || '0');
        totalPlanAmount += amount;

        const createdAt = moment(doc.createdAt);
        if (createdAt.isBetween(thirtyDaysAgo, now, null, '[]')) {
            totalLast30Days += amount;
        }
    }

    return {
        totalPlanAmount,
        totalLast30Days
    };
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

    const userPlans = await UserDietPlan.find(query);
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

exports.createOrder = async (req, res, next) => {
    const { amount, subscriptionId } = req.bodyParams;
    if (!amount || !subscriptionId) {
        return res.apiResponse(false, "Amount Or subscription Id is Missing", {}, 400);
    }
    const options = {
        amount: amount * 100, // in paisa
        currency: "INR",
        receipt: "diet_subscription",
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
        if (!amount || !orderId || !subscriptionId) {
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

async function addPaymentLog(req) {
    const newLog = new PaymentLogs({
        userId: req?.userId,
        amount: Number(req.amount) || 0,
        method: req.method || "",
        orderId: req?.orderId || "",
        subscriptionId: req?.subscriptionId || "",
        module: "dietSubscription",
        paymentId: req?.paymentId || "",
        paymentStatus: req?.paymentStatus || "",
        logStatus: req?.logStatus || "",
    })
    await newLog.save();
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
        const plans = await UserDietPlan.find({ activePlan: true });
        for (let plan of plans) {
            const endDate = moment(plan.validityEndDate, "DD-MM-YYYY").startOf("day");
            if (endDate.isBefore(today)) {
                // await UserPlan.findByIdAndUpdate(plan._id, {
                //     activePlan: false,
                //     expired: true
                // });
                await UserDietPlan.findOneAndUpdate({ id: plan.id },
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
            const active = await UserDietPlan.findOne({
                userId: userId,
                activePlan: true
            });
            if (!active) {
                // No active plan → mark unsubscribed
                await Auth.findOneAndUpdate({ id: userId },
                    {
                        $set: {
                            dietSubscribed: false
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

        const existing = await UserDietPlan.findOne({ paymentId: txId });

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

        const plan = await DietPlan.findOne({ id: productId });

        if (!plan) {
            console.log("❌ Plan not found for productId:", productId);
            return res.apiResponse(false, "Plan not found", {}, 400);
        }

        console.log(" Plan found:", plan.planName);

        // 💾 Save subscription
        console.log("💾 Creating subscription...");

        const subscription = await UserDietPlan.create({
            userId,
            id: `UserDietPlan_${moment().format('DDMMYYYYHHmmss')}`,
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
            { $set: { dietOverview: true } },
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
        module: "dietSubscription",
        paymentStatus: req?.paymentStatus || "",
        logStatus: req?.logStatus || "",
    })
    await newLog.save();
}



//not used functions right now, keeping for future reference
const verifyAppleTransactions = async (transactionId) => {
    try {
        const response = await client.getTransactionInfo(transactionId);

        console.log(" Apple Verified:", response);

        return response;

    } catch (error) {
        console.error("❌ Verification failed:", error);
        throw error;
    }
};

//not used api's right now, keeping for future reference
exports.verifyPaymentAndSubscribesss = async (req, res) => {
    try {
        const { userId, transactions } = req.bodyParams;

        if (!userId || !transactions?.length) {
            return res.apiResponse(false, "Required Params is Missing", {}, 400);
        }

        let latest = null;

        for (let token of transactions) {
            const data = await verifyAndDecode(token);

            if (!data) continue;
            console.log('Decoded data-in apiii:', data);
            //  Payment success check
            if (
                data.transactionReason !== "PURCHASE" ||
                data.inAppOwnershipType !== "PURCHASED"
            ) continue;

            //  App validation
            if (data.bundleId !== "com.bhive.momee") continue;
            // if (data.bundleId !== "com.hiv.mee") continue;
            console.log('data.transactionId', data.transactionId)

            // if (!latest || data.purchaseDate > latest.purchaseDate) {
            //     console.log('latest.purchaseDate', latest.purchaseDate)
            //     latest = data;
            // }

            if (
                data.purchaseDate &&
                (!latest || Number(data.purchaseDate) > Number(latest.purchaseDate))
            ) {
                latest = data;
            }
            //  Duplicate check
            const existing = await UserDietPlan.findOne({
                paymentId: latest.transactionId,
            });

            if (existing) {
                // ❗ Prevent cross-user fraud
                if (existing.userId !== userId) {
                    return res.apiResponse(false, "Transaction already used by another user", {}, 403);
                }

                // return res.json({
                //     success: true,
                //     message: "Already processed",
                //     data: existing,
                // });
            }

            // 👉 pick latest transaction
        }

        if (!latest) {
            return res.apiResponse(false, "No valid purchase found", {}, 400);
        }

        //  Get plan
        const subscribedPlan = await DietPlan.findOne({ id: latest.productId });
        if (!subscribedPlan) {
            return res.apiResponse(false, "Plan not found", {}, 400);
        }

        const purchaseDate = new Date(latest.purchaseDate);

        // ❗ Non-renewing → manual expiry
        const expiryDate = new Date(purchaseDate);
        expiryDate.setDate(expiryDate.getDate() + subscribedPlan.durationDays);

        //  Save subscription
        const subscription = await UserDietPlan.create({
            userId,
            id: `UserDietPlan_${moment().format('DDMMYYYYHHmmss')}`,
            subscriptionId: subscribedPlan.id,
            planName: subscribedPlan?.planName,
            planAmount: subscribedPlan?.planAmount,
            activePlan: false,
            purchasedDate: purchaseDate,
            validityStartDate: "",
            validityEndDate: "",
            paymentId: latest.transactionId,
            environment: latest.environment,
        });
        return res.apiResponse(true, "Payment verified", {}, 200);

    } catch (err) {
        console.error("❌ Error:", err);
        return res.apiResponse(false, "Payment verification failed", {}, 500);
    }
};

//not used functions right now, keeping for future reference
const getTransactionFromApple = async (transactionId) => {
    const token = generateAppleToken();

    if (!validateAppleJWT(token)) {
        throw new Error("Invalid Apple JWT before API call");
    }

    const decoded = jwt.decode(token, { complete: true });

    console.log("🔍 JWT HEADER:", decoded?.header);
    console.log("🔍 JWT PAYLOAD:", decoded?.payload);

    if (!decoded) {
        console.log("❌ Token decode failed");
    }

    const baseUrl = process.env.APPLE_STOREKIT_2_BASE_URL;
    const apiUrl = `${baseUrl}/inApps/v1/transactions/${transactionId}`;

    console.log("📡 Fetching Apple Transaction:", apiUrl);

    try {
        const res = await axios.get(apiUrl, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        console.log(" Apple Response:", res.data);
        return res.data;

    } catch (err) {
        console.log("❌ Apple API Error:", err.response?.status);
        console.log("❌ Apple API Body:", err.response?.data);

        // 🔁 fallback to sandbox
        if (
            err.response?.status === 404 &&
            !baseUrl.includes("sandbox")
        ) {
            const sandboxUrl = `https://api.storekit-sandbox.itunes.apple.com/inApps/v1/transactions/${transactionId}`;

            console.log("🔁 Trying Sandbox:", sandboxUrl);

            const res = await axios.get(sandboxUrl, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            console.log(" Sandbox Response:", res.data);
            return res.data;
        }

        throw new Error("Apple StoreKit2 verification failed");
    }
};

//not used functions right now, keeping for future reference
const generateAppleToken = () => {
    // const keyPath = path.join(__dirname, "../../keys/AuthKey_5Q3579F973.p8");

    // console.log("📂 KEY PATH:", keyPath);

    // if (!fs.existsSync(keyPath)) {
    //     console.log("❌ File NOT found");
    //     return;
    // }

    // const privateKey = fs.readFileSync(keyPath, "utf8");

    let rawKey = process.env.ASC_PRIVATE_KEY || '';
    const privateKey = rawKey
        .replace(/\\n/g, '\n')      // Convert literal \n
        .replace(/\r/g, '')         // Remove carriage returns
        .split('\n')
        .map(line => line.trim())   // Trim each line
        .filter(line => line.length > 0)
        .join('\n');

    if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
        privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`;
    }

    console.log("🔑 KEY LENGTH:", privateKey?.length);
    console.log("🔑 KEY START:", privateKey?.slice(0, 30));

    // if (!privateKey) {
    //     throw new Error("Private key empty");
    // }

    // const token = jwt.sign(
    //     { iss: process.env.ASC_ISSUER_ID },
    //     privateKey,
    //     {
    //         algorithm: "ES256",
    //         expiresIn: "5m",
    //         header: {
    //             kid: process.env.ASC_KEY_ID,
    //         },
    //     }
    // );

    // return token;
    const payload = {
        iss: process.env.ASC_ISSUER_ID,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 300,
        aud: "appstoreconnect-v1", //  FIX
    };

    const header = {
        alg: 'ES256',
        kid: process.env.ASC_KEY_ID,
        typ: 'JWT'
    };

    return jwt.sign(payload, privateKey, { header: header });
};

//not used functions right now, keeping for future reference
const generateAppleTokenOld = () => {
    let privateKey = process.env.ASC_PRIVATE_KEY;

    if (!privateKey) {
        throw new Error("ASC_PRIVATE_KEY missing");
    }

    //  Fix newline issue
    privateKey = privateKey.replace(/\\n/g, '\n');

    if (!privateKey.includes("BEGIN PRIVATE KEY")) {
        throw new Error("Invalid private key format");
    }

    const token = jwt.sign(
        {
            iss: process.env.ASC_ISSUER_ID,
        },
        privateKey,
        {
            algorithm: "ES256",
            expiresIn: "5m",
            header: {
                kid: process.env.ASC_KEY_ID,
            },
        }
    );

    return token;
};

//not used functions right now, keeping for future reference
const validateAppleJWT = (token) => {
    const decoded = require("jsonwebtoken").decode(token, { complete: true });

    if (!decoded) {
        console.log("❌ Invalid JWT format");
        return false;
    }

    const { header, payload } = decoded;

    console.log("🔍 HEADER:", header);
    console.log("🔍 PAYLOAD:", payload);

    //  Check required fields
    if (!header?.kid) {
        console.log("❌ Missing kid");
        return false;
    }

    if (!payload?.iss) {
        console.log("❌ Missing iss");
        return false;
    }

    const now = Math.floor(Date.now() / 1000);

    if (payload.exp < now) {
        console.log("❌ Token expired");
        return false;
    }

    if (payload.iat > now) {
        console.log("❌ Token issued in future");
        return false;
    }

    console.log(" JWT structure looks OK");
    return true;
};


// exports.userSubscription = async (req, res, next) => {
//     await UserPlan.deleteMany({})
//     res.apiResponse(true, 'Plan Subscribed successfully', {}, 200)
// }


// exports.userPlanScript = async (req, res) => {
//     try {
//         const plans = await UserPlan.find({});

//         console.log(`Found ${plans.length} plans`);

//         const bulkOps = plans.map(plan => {
//             const timestamp = moment(plan.createdAt).format('DDMMYYYYHHmmss');
//             const uniqueId = `UserPlan-${timestamp}`;

//             return {
//                 updateOne: {
//                     filter: { _id: plan._id },
//                     update: {
//                         // $unset: { subscribedPlan: "" },
//                         $set: { id: uniqueId }
//                     }
//                 }
//             };
//         });

//         if (bulkOps.length > 0) {
//             const result = await UserPlan.bulkWrite(bulkOps);
//             console.log("BulkWrite result:", result);
//         }

//         const updatedPlans = await UserPlan.find({});
//         return res.apiResponse(true, "Updated successfully", { docs: updatedPlans }, 200);
//     } catch (error) {
//         console.error("Error updating UserPlans:", error);
//         return res.apiResponse(false, "Failed to update UserPlans", {}, 500);
//     }
// };

// exports.userSubscription = async (req, res, next) => {
//     try {
//         const requests = req.bodyParams;

//         if (!requests.userId || !requests.subscriptionId) {
//             return res.apiResponse(false, 'Id is missing', {}, 400);
//         }

//         const subscribedPlan = await Plan.findOne({ id: requests.subscriptionId });
//         if (!subscribedPlan) {
//             return res.apiResponse(false, 'Plan not found', {}, 404);
//         }

//         const latestPlan = await UserPlan.findOne({ userId: requests.userId })
//             .sort({ createdAt: -1 }); // get latest plan

//         const now = moment();
//         let canStartNew = true;

//         if (latestPlan && latestPlan.validityEndDate) {
//             const endDate = moment(latestPlan.validityEndDate, 'DD-MM-YYYY');
//             if (now.isBefore(endDate)) {
//                 // Previous plan still active
//                 canStartNew = false;
//             } else {
//                 // Previous plan expired, update it
//                 await UserPlan.updateOne({ id: latestPlan.id }, { expired: true });
//             }
//         }

//         // Prepare new user plan
//         requests.id = `UserPlan-${moment().format('DDMMYYYYHHmmss')}`;
//         requests.planName = subscribedPlan.planName;
//         requests.planAmount = subscribedPlan.planAmount;

//         if (canStartNew) {
//             const months = parseInt(subscribedPlan.durationMonths || 0, 10);
//             requests.validityStartDate = now.format('DD-MM-YYYY');
//             requests.validityEndDate = now.clone().add(months, 'months').format('DD-MM-YYYY');
//             requests.activePlan = true;
//             requests.expired = false;
//         } else {
//             requests.activePlan = false;
//             requests.expired = false;
//         }

//         const newUserPlan = new UserPlan(requests);
//         await newUserPlan.save();

//         await Auth.findOneAndUpdate(
//             { id: requests.userId },
//             { subscribed: true },
//             { new: true }
//         );

//         return res.apiResponse(true, 'Plan subscribed successfully', newUserPlan, 200);
//     } catch (error) {
//         console.error('Subscription Error:', error);
//         return res.apiResponse(false, 'Plan Subscription error', { error }, 500);
//     }
// };


// const generateAppleToken = () => {
//     const token = jwt.sign({}, process.env.ASC_PRIVATE_KEY, {
//         algorithm: "ES256",
//         expiresIn: "5m",
//         issuer: process.env.ASC_ISSUER_ID,
//         header: {
//             alg: "ES256",
//             kid: process.env.ASC_KEY_ID,
//         },
//     });
//     console.log('Generated Apple token:', token);
//     return token;
// };

// const getTransactionFromApple = async (transactionId) => {
//     const token = generateAppleToken();

//     const url = `https://api.storekit-sandbox.itunes.apple.com/inApps/v1/transactions/${transactionId}`;

//     for (let attempt = 1; attempt <= 5; attempt++) {
//         try {
//             console.log(`Attempt ${attempt}: ${url}`);

//             const response = await axios.get(url, {
//                 headers: {
//                     Authorization: `Bearer ${token}`,
//                 },
//             });

//             if (response?.data?.signedTransactionInfo) {
//                 return response.data;
//             }

//         } catch (err) {
//             console.log("Apple API retry error:", err.response?.status);
//         }

//         await delay(3000); // wait 3 sec
//     }

//     throw new Error("Transaction not found after retries");
// };


// const generateAppleToken = () => {
//     const privateKey = process.env.ASC_PRIVATE_KEY.replace(/\\n/g, '\n');

//     const token = jwt.sign({}, privateKey, {
//         algorithm: "ES256",
//         expiresIn: "5m",
//         issuer: process.env.ASC_ISSUER_ID,
//         header: {
//             kid: process.env.ASC_KEY_ID,
//         },
//     });

//     return token;
// };

// const getTransactionFromApple = async (transactionId) => {
//     const token = generateAppleToken();
//     const baseUrl = process.env.APPLE_STOREKIT_2_BASE_URL;
//     // Use production API
//     const apiUrl = `${baseUrl}/inApps/v1/transactions/${transactionId}`;
//     console.log('Fetching transaction from Apple API:', apiUrl);
//     try {
//         const res = await axios.get(apiUrl, {
//             headers: {
//                 Authorization: `Bearer ${token}`,
//             },
//         });
//         console.log('Apple API response:', res);
//         return res.data;

//     } catch (err) {
//         // 🔁 fallback to sandbox
//         if (err.response?.status === 404) {
//             const sandboxUrl = `https://api.storekit-sandbox.itunes.apple.com/inApps/v1/transactions/${transactionId}`;

//             const res = await axios.get(apiUrl, {
//                 headers: {
//                     Authorization: `Bearer ${token}`,
//                 },
//             });

//             return res.data;
//         }

//         return null;
//     }
// };

// const decodeTransaction = (signedTransactionInfo) => {
//     if (!signedTransactionInfo) {
//         throw new Error("signedTransactionInfo is missing from Apple response");
//     }
//     const parts = signedTransactionInfo.split(".");
//     const payload = JSON.parse(
//         Buffer.from(parts[1], "base64").toString()
//     );

//     return payload;
// };

// exports.verifyPaymentAndSubscribe = async (req, res) => {
//     try {
//         const { userId, token, tokenType, bundleId, transactionId, purchaseDate, environment, productId
//         } = req.bodyParams;

//         if (!userId || !token || !tokenType || !bundleId || !transactionId || !purchaseDate || !environment || !productId) {
//             return res.apiResponse(false, "Required Params is Missing", {}, 400);
//         }

//         let signedTransactionInfo;

//         if (tokenType === 'JWS') {
//             signedTransactionInfo = await getTransactionFromApple(transactionId);
//         } else if (tokenType === 'LEGACY') {
//             signedTransactionInfo = await verifyAppleReceipt(token);
//         } else {
//             signedTransactionInfo = await verifyAppleReceipt(token);
//         }

//         console.log('Apple response:', signedTransactionInfo);
//         if (tokenType === 'LEGACY' && signedTransactionInfo?.status !== 0) {
//             return res.apiResponse(false, "Invalid receipt", {}, 400);
//         }
//         let data;
//         if (tokenType === 'LEGACY') {
//             data = decodeTransaction(signedTransactionInfo.signedTransactionInfo);
//             data = getLatestTransaction(signedTransactionInfo);
//         } else if (tokenType === 'JWS') {
//             data = decodeTransaction(signedTransactionInfo);
//         }
//         console.log('Decoded payload:', data);

//         if (!data) {
//             return res.apiResponse(false, "Invalid transaction data", {}, 400);
//         }

//         if (
//             data.transactionReason !== "PURCHASE" ||
//             data.inAppOwnershipType !== "PURCHASED"
//         ) {
//             return res.apiResponse(false, "Transaction not a valid purchase", {}, 400);
//         }

//         //  App validation
//         if (data.bundleId !== "com.bhive.momee") {
//             return res.apiResponse(false, "Invalid app for this transaction", {}, 400);
//         }

//         const existing = await UserDietPlan.findOne({
//             paymentId: data.transactionId,
//         });

//         if (existing) {
//             // ❗ Prevent cross-user fraud
//             if (existing.userId !== userId) {
//                 return res.apiResponse(false, "Transaction already used by another user", {}, 403);
//             }
//         }

//         const subscribedPlan = await DietPlan.findOne({ id: productId });
//         if (!subscribedPlan) {
//             return res.apiResponse(false, "Plan not found", {}, 400);
//         }

//         const subscription = await UserDietPlan.create({
//             userId,
//             id: `UserDietPlan_${moment().format('DDMMYYYYHHmmss')}`,
//             subscriptionId: subscribedPlan.id,
//             planName: subscribedPlan?.planName,
//             planAmount: subscribedPlan?.planAmount,
//             activePlan: false,
//             purchasedDate: purchaseDate,
//             validityStartDate: "",
//             validityEndDate: "",
//             paymentId: data.transactionId,
//             environment: data.environment,
//         });
//         return res.apiResponse(true, "Payment verified", subscription, 200);
//     } catch (err) {
//         console.error("❌ Error:", err);
//         return res.apiResponse(false, "Payment verification failed", {}, 500);
//     }
// };