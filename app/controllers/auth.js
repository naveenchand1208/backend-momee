const Auth = require('../models/auth')
const UserPlan = require('../models/userSubscription')
const Plan = require('../models/subscription')
const jwt = require('jsonwebtoken')
const secret = process.env.JWT_SECRET
const expired = process.env.JWT_TOKEN_EXPIRATION
const sendEmail = require('../helpers/mailer')
const generateToken = require('../helpers/jwt')
const moment = require('moment');
const { cloudinary, uploadToCloudinary, deleteFromCloudinary } = require('../helpers/cloudinary');
const { formatDate, parsedDate, decodeTransaction } = require('../helpers/util')
const admin = require("../config/firebase");
const fireBaseNotification = require('../helpers/pushNotification')
const Article = require('../models/article')
const FoodEat = require('../models/foodEat')
const FoodAvoid = require('../models/foodAvoid')
const Community = require('../models/community')
const Book = require('../models/book')
const Batch = require('../models/batch')
const Hospital = require('../models/hospitals')
const Product = require('../models/product')
const Order = require('../models/order')
const Music = require('../models/music')
const PodCasts = require('../models/podcasts')
const Exercise = require('../models/exercise')
const ArticleSearch = require('../models/articleSearch')
const CommunitySearch = require('../models/communitySearch')
const twilio = require('twilio');
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;
const client = new twilio(accountSid, authToken);
const { exportToExcel } = require('../helpers/excel')
const cron = require('node-cron');
const { sendMobileOtp } = require('../helpers/nettyfish')
const { verifyAndDecode } = require('../helpers/util')
const DietPlan = require('../models/dietSubscription')


// exports.register = async (req, res, next) => {
//     try {
//         const requests = req.bodyParams;
//         console.log('requests', requests)
//         if(requests.authToken){
//              const decoded = await admin.auth().verifyIdToken(requests.authToken);
//         }
//         if (!requests.userName || !requests.password || !requests.email) {
//             return res.apiResponse(false, 'UserName, Password, or Email is missing', {}, 400);
//         }
//         const existingUser = await Auth.findOne({ email: requests.email });
//         if (existingUser) {
//             return res.apiResponse(false, 'User already exists with this email or username', {
//                 user: existingUser
//             }, 409);
//         } else {
//             const otp = Math.floor(100000 + Math.random() * 900000);
//             await sendEmail(requests.email, otp);
//             requests.otp = otp;
//         }
//         const last = await Auth.findOne().sort({ id: -1 }).select('id').lean();
//         requests.id = last && last.id ? last.id + 1 : 1;
//         const newUser = new Auth(requests);
//         newUser.steps.step1 = true;

//         await newUser.save();
//         if (newUser.id) {
//             newUser.token = generateToken({ userid: newUser.id });
//             await newUser.save();
//             return res.apiResponse(true, 'User registered successfully', { user: newUser }, 201);
//         }
//     } catch (error) {
//         return res.apiResponse(false, "Register Error: Something went wrong", { error }, 500);
//     }
// };

exports.getToken = async (req, res, next) => {
    try {
        const { userId, deviceInfo } = req.bodyParams;
        if (!userId || !deviceInfo) {
            return res.apiResponse(false, "User Id or DeviceInfo is Missing", { error }, 400)
        }
        const existingUser = await Auth.findOne({ id: userId });
        if (!existingUser) {
            return res.apiResponse(false, "User Not Found", { error }, 400)
        }
        const deviceId = deviceInfo.deviceId;
        console.log('deviceId', deviceId)
        const existingDeviceIndex = existingUser.deviceInfos.findIndex(
            (item) => item.deviceId === deviceId
        );
        if (existingDeviceIndex !== -1) {
            // console.log('coming-1', existingUser.deviceInfos[existingDeviceIndex].fcmToken)
            // console.log('coming-1', deviceInfo.fcmToken)
            existingUser.deviceInfos[existingDeviceIndex].fcmToken = deviceInfo.fcmToken;
            existingUser.deviceInfos[existingDeviceIndex].logout = deviceInfo.logout;
            existingUser.markModified('deviceInfos');
        } else {
            const checkLoginDevice = existingUser.deviceInfos.some(dev => dev.logout === false)
            if (checkLoginDevice && deviceInfo.device !== 'web') {
                return res.apiResponse(false, 'Already this user logged in another device', {}, 404)
            }
            existingUser.deviceInfos.push(deviceInfo);
        }

        // existingUser.token = generateToken({ userid: existingUser.id });
        // existingUser.logout = false;
        // existingUser.latitude = latitude;
        // existingUser.longitude = longitude;
        await existingUser.save();
        return res.apiResponse(true, 'User Token Get successfully', { token: existingUser.token }, 201);
    } catch (error) {
        return res.apiResponse(false, "get Token Error", { error }, 500)
    }
}

exports.DeeplinkGenerate = async (req, res, next) => {
    try {
        const { userId } = req.bodyParams;
        if (!userId) {
            return res.apiResponse(false, "UserId is missing", {}, 400)
        }
        const deepLink = `bhivemomee://sucess`;
        return res.apiResponse(true, "Deeplink Success", { deepLink: deepLink }, 200)
    } catch (error) {
        return res.apiResponse(false, "Deeplink Error", { error }, 500)
    }
}

exports.register = async (req, res, next) => {
    try {
        const { userName, email, deviceInfo, profile, latitude, longitude, ios } = req.bodyParams;
        console.log('deviceInfo', deviceInfo)
        const existingUser = await Auth.findOne({ email: email });
        console.log('existingUser', existingUser)
        if (!existingUser) {
            const last = await Auth.findOne().sort({ id: -1 }).select('id').lean();
            const id = last && last.id ? last.id + 1 : 1;
            const deviceInfos = [];
            deviceInfo.logout = false;
            deviceInfos.push(deviceInfo)
            let subscription = ios === true ? true : false;
            const newUser = new Auth({
                id,
                userName,
                email,
                emailVerified: true,
                // steps: {
                //     step1: true
                // },
                profile,
                deviceInfos,
                latitude,
                longitude,
                ios,
                subscribed: true,
            });
            await newUser.save();
            if (newUser.id) {
                newUser.steps.step1 = true;
                newUser.token = generateToken({ userid: newUser.id });
                await newUser.save();
                return res.apiResponse(true, 'User registered successfully', { user: newUser }, 201);
            }
        }

        else if (existingUser.id) {
            const deviceId = deviceInfo.deviceId;
            console.log('deviceId', deviceId)
            const existingDeviceIndex = existingUser.deviceInfos.findIndex(
                (item) => item.deviceId === deviceId
            );
            console.log('existingDeviceIndex', existingDeviceIndex)

            if (existingDeviceIndex !== -1 && deviceInfo.deviceName === 'web') {
                console.log('web-true')
            } else if (existingDeviceIndex !== -1) {
                console.log('coming-1', existingUser.deviceInfos[existingDeviceIndex].fcmToken)
                console.log('coming-1', deviceInfo.fcmToken)
                existingUser.deviceInfos[existingDeviceIndex].fcmToken = deviceInfo.fcmToken;
                existingUser.deviceInfos[existingDeviceIndex].logout = deviceInfo.logout;
                existingUser.markModified('deviceInfos');
            } else {
                console.log('coming-2')
                const checkLoginDevice = existingUser.deviceInfos.some(dev => dev?.logout === false && dev?.deviceName !== 'web')
                console.log('checkLoginDevice', checkLoginDevice)
                if (checkLoginDevice && deviceInfo.deviceName !== 'web') {
                    return res.apiResponse(false, 'Already this user logged in another device', {}, 404)
                }
                existingUser.deviceInfos.push(deviceInfo);
            }

            existingUser.token = generateToken({ userid: existingUser.id });
            existingUser.logout = false;
            existingUser.latitude = latitude;
            existingUser.longitude = longitude;
            await existingUser.save();
            return res.apiResponse(true, 'User registered successfully', { user: existingUser }, 201);
        }
    } catch (error) {
        console.error("🔴 Firebase Token Error:", {
            name: error.name,
            code: error.code,
            message: error.message,
            stack: error.stack
        });

        return res.apiResponse(false, "Register Error: Token verification failed", {
            code: error.code,
            message: error.message,
            name: error.name,
            stack: error.stack
        }, 500);
    }
};

exports.login = async (req, res, next) => {
    try {
        var requests = req.bodyParams;
        //to check all params
        if (!requests.userName || !requests.password) {
            return res.apiResponse(false, 'UserName or password is missing', {}, 400)
        }
        //to check register user
        if (requests.userName != '') {
            var loginUser = await Auth.findOne({
                $or: [
                    { "email": requests.userName },
                    { "userName": requests.userName }
                ]
            });
            if (!loginUser) {
                return res.apiResponse(false, 'User not found', {}, 404)
            }
        }
        //to compare password
        if (loginUser.password !== requests.password) {
            return res.apiResponse(false, 'Password is wrong', loginUser, 400)
        }
        if (loginUser.emailVerified) {
            // jwt_authentication
            const token = generateToken({ userid: loginUser.id })
            loginUser.token = token;
            await loginUser.save();
            return res.apiResponse(true, 'Logged in success', loginUser, 200)
        } else {
            const otp = await sendOtpMail(requests.email)
            loginUser.otp = otp;
            await loginUser.save();
            return res.apiResponse(false, 'Please Verify Your Email', { otp: otp }, 404)
        }
    } catch (error) {
        return res.apiResponse(false, "Login Error", { error }, 500)
    }
}

// exports.getMobileOtp = async (req, res, next) => {
//     try {
//         const { } = req.bodyParams;
//         // if (!id) {
//         //     return res.apiResponse(false, "Id is missing", {}, 400)
//         // }
//         const userId = req.userDetails.id;
//         const user = await Auth.findOne({ id: userId })
//         if (!user) {
//             return res.apiResponse(false, "User Not Found", {}, 400)
//         }
//         if (user && !user.mobile) {
//             return res.apiResponse(false, "User Mobile Missing", {}, 400)
//         }
//         const otp = Math.floor(100000 + Math.random() * 900000);
//         user.otp = otp;
//         await user.save();
//         await sendMobileOtp(user.mobile, otp)
//             .then(() => console.log(`OTP sent to ${user.mobile}`))
//             .catch(err => console.error('Email send error:', err.message));
//         return res.apiResponse(true, 'Mobile Otp is success', { user }, 200)
//     } catch (error) {
//         return res.apiResponse(false, "Mobile Otp Error", {}, 500)
//     }
// }

exports.requestOtpForMobile = async (req, res, next) => {
    try {
        const { id, mobile } = req.bodyParams;
        if (!id || !mobile) {
            return res.apiResponse(false, "UserId or mobile is missing", {}, 400)
        }
        const user = await Auth.findOne({ id: id })
        if (!user) {
            return res.apiResponse(false, "User Not Found", {}, 400)
        }
        if (user && !user.mobile) {
            return res.apiResponse(false, "User Mobile Missing", {}, 400)
        }
        if (user?.mobile !== mobile) {
            return res.apiResponse(false, "Mobile number does not match", {}, 400)
        }
        const otp = Math.floor(100000 + Math.random() * 900000);
        user.otp = otp;
        await user.save();
        await sendMobileOtp(user.mobile, otp)
            .then(() => console.log(`OTP sent to ${user.mobile}`))
            .catch(err => console.error('Email send error:', err.message));
        return res.apiResponse(true, 'Mobile Otp is success', { user }, 200)
    } catch (error) {
        return res.apiResponse(false, "Mobile Otp Error", {}, 500)
    }
}

exports.verifyOtpForMobile = async (req, res, next) => {
    try {
        const { otp, id } = req.bodyParams;
        if (!otp || !id) {
            return res.apiResponse(false, "OTP or UserId is missing", {}, 400)
        }
        const checkUser = await Auth.findOne({ id: id })
        if (!checkUser) {
            return res.apiResponse(false, "User Not Found", {}, 400)
        } else {
            if (checkUser.otp !== otp) {
                return res.apiResponse(false, "Invalid OTP", {}, 400)
            } else {
                checkUser.mobileVerified = true;
                await checkUser.save();
                return res.apiResponse(true, 'Mobile Verification is success', { data: checkUser }, 200)
            }
        }
    } catch (error) {
        return res.apiResponse(false, "Verfication Error", {}, 500)
    }
}

// exports.mobileUpdateAndRequestOtp = async (req, res, next) => {
//     try {
//         const { id, mobile } = req.bodyParams;
//         if (!id || !mobile) {
//             return res.apiResponse(false, "Id is missing", {}, 400)
//         }
//         const userId = id || req.userDetails.id;
//         const user = await Auth.findOne({ id: userId })
//         if (!user) {
//             return res.apiResponse(false, "User Not Found", {}, 400)
//         }
//         const checkMobile = await Auth.findOne({ mobile })
//         if (checkMobile && checkMobile.id === userId) {
//             return res.apiResponse(false, "Mobile No Already Exists", {}, 404)
//         }
//         user.mobile = mobile;
//         const otp = Math.floor(100000 + Math.random() * 900000);
//         user.otp = otp;
//         await user.save();
//         await sendMobileOtp(user.mobile, otp)
//             .then(() => console.log(`OTP sent to ${user.mobile}`))
//             .catch(err => console.error('Email send error:', err.message));
//         return res.apiResponse(true, 'Mobile Otp is success', { user }, 200)
//     } catch (error) {
//         return res.apiResponse(false, "Mobile Otp Error", {}, 500)
//     }
// }

exports.verifyMobileOtp = async (req, res, next) => {
    try {
        const { otp } = req.bodyParams;
        if (!otp) {
            return res.apiResponse(false, "OTP is missing", {}, 400)
        }
        const userId = req.userDetails.id;
        const checkUser = await Auth.findOne({ id: userId })
        if (!checkUser) {
            return res.apiResponse(false, "User Not Found", {}, 400)
        } else {
            if (checkUser.otp !== otp) {
                return res.apiResponse(false, "Invalid OTP", {}, 400)
            } else {
                checkUser.mobileVerified = true;
                await checkUser.save();
                return res.apiResponse(true, 'Mobile Verification is success', { data: checkUser }, 200)
            }
        }
    } catch (error) {
        return res.apiResponse(false, "Verfication Error", {}, 500)
    }
}

exports.verifyEmail = async (req, res, next) => {
    try {
        var requests = req.bodyParams;
        if (!requests.email || !requests.otp) {
            return res.apiResponse(false, "Email or OTP is missing", {}, 400)
        }
        const checkUser = await Auth.findOne({ email: requests.email })
        if (!checkUser) {
            return res.apiResponse(false, "Invalid Email", {}, 400)
        } else {
            if (checkUser.otp !== requests.otp) {
                return res.apiResponse(false, "Invalid OTP", {
                    emailVerified: checkUser.emailVerified
                }, 400)
            } else {
                checkUser.emailVerified = true;
                await checkUser.save();
                return res.apiResponse(true, 'Email Verification is success', { data: checkUser }, 200)
            }
        }
    } catch (error) {
        return res.apiResponse(false, "Verfication Error", {}, 500)
    }
}

exports.familyRole = async (req, res, next) => {
    try {
        const requests = req.bodyParams;
        console.log('requests', requests)
        const userId = req.user.userid;
        const mom = await Auth.findOne({ id: userId });
        if (!mom) {
            return res.apiResponse(false, 'User not found', {}, 404);
        }
        if (!mom.emailVerified) {
            const otp = await sendOtpMail(mom.email);
            mom.otp = otp;
            await mom.save();
            return res.apiResponse(false, 'Please verify your email', { otp }, 401);
        }

        // if (requests.step === "step2" && requests.relationName && requests.relationType) {
        //     const updatedSosMembers = [
        //         ...mom.sosMembersDetails,
        //         {
        //             userName: requests.relationName,
        //             relationType: requests.relationType,
        //             phone: requests.relationMobile,
        //         },
        //     ];
        //     requests.sosMembersDetails = updatedSosMembers
        // }
        console.log('coming')
        // if (requests.step && requests.step === "step5" && requests.pregnancyDate) {
        //     const weeks = await calculatePregnancyWeeks(requests.pregnancyDate)
        //     // const weeks = await calculatedWeeksForMom(requests.pregnancyDate)
        //     // requests.pregnancyWeeks = weeks;
        //     requests.completedWeeks = weeks;
        //     requests.enteredWeeks = weeks + 1;
        // }
        if (requests.pregnancyDate) {
            const weeks = await calculatePregnancyWeeks(requests.pregnancyDate)
            // const weeks = await calculatedWeeksForMom(requests.pregnancyDate)
            // requests.pregnancyWeeks = weeks;
            requests.completedWeeks = weeks;
            requests.enteredWeeks = weeks + 1;
        }
        // if (requests.pregnancyDate) {
        //     const weeks = await calculatePregnancyWeeks(requests.pregnancyDate)
        //     // const weeks = await calculatedWeeksForMom(requests.pregnancyDate)
        //     // requests.pregnancyWeeks = weeks;
        //     requests.completedWeeks = weeks;
        //     requests.enteredWeeks = weeks + 1;
        // }
        console.log('coming-1')
        // if (requests.step && requests.step === "step3" && requests.childrensArray && requests.childrensArray.length > 0 && mom.momType === "newMom") {
        if (requests.childrensArray && requests.childrensArray.length > 0 && mom.momType === "newMom") {
            console.log('coming-child-month')
            const youngestChild = requests.childrensArray
                .filter(child => child.dob) // ensure dob exists
                .sort((a, b) => moment(b.dob).diff(moment(a.dob))) // latest dob first
            [0];
            console.log('coming-child-month-completed')
            const months = await calculateChildMonths(youngestChild?.dob)
            console.log('coming-child-month-calc-completed-month', months)
            // const months = await calculateChildMonths(requests.childrensArray[0]?.dob)
            requests.completedMonths = months;
            requests.enteredMonths = months + 1;
        }
        console.log('coming-2')
        if (requests.dob) {
            console.log('requests.dob', requests.dob)
            requests.age = await getAgeFromDOB(requests.dob)
            console.log('requests.age', requests.age)
        }
        console.log('coming-3')
        let stepField;
        if (requests.step) {
            stepField = `steps.${requests.step}`;
        }
        console.log('coming-4')
        const existingUser = await Auth.findOne({ id: userId });
        console.log('coming-5')
        const updatedUser = await Auth.findOneAndUpdate(
            { id: userId },
            {
                $set: {
                    ...requests,
                    ...(requests?.step && { [stepField]: true }),
                    ...(existingUser?.momType === 'newMom' && { 'steps.step5': true, 'steps.step6': true })
                }
            },
            { new: true }
        );
        console.log('coming-6')
        return res.apiResponse(true, 'User updated successfully', updatedUser, 200);
    } catch (error) {
        return res.apiResponse(false, "Family Role Error", { error }, 500);
    }
}

exports.getUserList = async (req, res, next) => {
    try {
        const requests = req.bodyParams;

        // if (requests.export) {
        //     await pregMomExcel(requests, res)
        //     return;
        // }
        const page = requests.page || 1; // Default to page 1
        const per_page = requests.limit || 10; // Default to 10 records per page
        const pagination = requests.pagination || "true"; // Default to 10 records per page
        // Calculate the skip value for pagination
        const sortField = requests.sortField || 'createdAt';
        const sortOrder = requests.sortOrder === 'asc' ? 1 : -1;
        const skip = (page - 1) * per_page; // Correct calculation for pagination
        const match = {}; // Filtering criteria for employee records
        // If an ID is provided in the request, apply filtering based on the ID


        if (requests.id && requests.id !== '') {
            match['id'] = requests.id;
        }
        if (requests.momType && requests.momType !== '') {
            match['momType'] = requests.momType;
        }
        if (requests.status && requests.status !== '') {
            match['status'] = requests.status;
        }
        if (requests.week && requests.week !== '') {
            match['completedWeeks'] = requests.week;
        }
        if (requests.month && requests.month !== '') {
            match['completedMonths'] = requests.month;
        }
        if (requests.subscribed && requests.subscribed !== '') {
            match['subscribed'] = requests.subscribed;
        }
        if (requests.plan && requests.plan !== '') {
            const plans = await UserPlan.find({ subscriptionId: requests.plan });
            console.log('plans', plans)
            if (!plans || plans.length === 0) {
                match['id'] = { $in: [] };
            } else {
                const userIds = plans.map(plan => plan.userId);
                match['id'] = { $in: userIds };
            }
        }

        if (requests.searchKey !== undefined && requests.searchKey.trim() !== '') {
            const searchTerm = requests.searchKey.trim();
            match['$or'] = [
                { userName: { $regex: searchTerm, $options: 'i' } },
                { email: { $regex: searchTerm, $options: 'i' } },
                { mobile: { $regex: searchTerm, $options: 'i' } },
            ];
        }
        match['roleName'] = "user";
        const options = {
            page: page,
            limit: per_page,
            skip: skip,
            sort: { [sortField]: sortOrder },
            populate: 'subscriptions',
        };


        // Fetch the paginated employee records
        if (pagination === "true") {
            Auth.paginate(match, options, async function (err, data) {
                if (err) {
                    return res.apiResponse(false, "Error while fetching lists", {}, 404);
                }

                // for (const docs of data.docs) {
                //     const plans = docs.subscriptions;
                //     const subscribedPlans = [];
                //     for (const plan of plans) {
                //         if (plan.subscriptionId) {
                //             const fullPlanDoc = await Plan.findOne({ id: plan.subscriptionId });
                //             if (fullPlanDoc) {
                //                 const fullPlan = fullPlanDoc.toObject();
                //                 fullPlan.userId = plan.userId;
                //                 fullPlan.subscriptionId = plan.subscriptionId;
                //                 fullPlan.validityStartDate = plan.validityStartDate;
                //                 fullPlan.validityEndDate = plan.validityEndDate;

                //                 subscribedPlans.push(fullPlan);
                //             }
                //         }
                //     }
                //     docs.subscriptions = subscribedPlans;
                // }
                await enrichSubscriptions(data.docs);
                return res.apiResponse(true, "Success", data, 200);
            });
        } else {
            let moms = [];
            if (Object.keys(match).length === 0) {
                moms = await Auth.find({}).populate('subscriptions');
            } else {
                moms = await Auth.find(match).populate('subscriptions');
            }
            await enrichSubscriptions(moms);
            return res.apiResponse(true, "Success", { docs: moms }, 200);
        }
    } catch (error) {
        return res.apiResponse(false, 'Get list error', {}, 500);
    }
}

exports.getUserProfile = async (req, res, next) => {
    try {
        const Id = req.bodyParams.id || req.user.userid;
        const user = await Auth.findOne({ id: Id });
        if (!user) {
            return res.apiResponse(false, 'User not found', {}, 404);
        }
        let plans = await UserPlan.find({ userId: Id });
        if (plans.length > 0) {
            const enrichedPlans = [];
            for (const plan of plans) {
                if (plan.subscriptionId) {
                    const subscribedPlan = await Plan.findOne({ id: plan.subscriptionId });
                    const planObj = plan.toObject();
                    if (subscribedPlan) {
                        planObj.subscribedPlan = subscribedPlan;
                    }
                    enrichedPlans.push(planObj);
                } else {
                    enrichedPlans.push(plan.toObject());
                }
            }
            const userWithSubscription = {
                ...user.toObject(),
                subscribedPlans: enrichedPlans
            };
            return res.apiResponse(true, 'Success', userWithSubscription, 200);
        } else {
            return res.apiResponse(true, 'Success', user, 200);
        }
    } catch (error) {
        console.error('get user error:', error);
        return res.apiResponse(false, 'get user error', { error }, 500);
    }
}

exports.updateUserProfile = async (req, res, next) => {
    try {
        const requests = req.bodyParams;
        if (!requests.id) {
            return res.apiResponse(false, 'Id is missing', {}, 400);
        }
        const updateFields = { ...requests };
        if (requests.pregnancyDate) {
            const weeks = await calculatePregnancyWeeks(requests.pregnancyDate)
            updateFields.completedWeeks = weeks;
            updateFields.enteredWeeks = weeks + 1;
        }
        const mom = await Auth.findOneAndUpdate(
            { id: requests.id },
            updateFields,
            { new: true }
        );
        if (!mom) {
            return res.apiResponse(false, 'User not found', {}, 404);
        }
        return res.apiResponse(true, 'User updated successfully', mom, 200);

    } catch (error) {
        return res.apiResponse(false, 'Error updating  User', {}, 500);
    }
};

exports.profileImage = async (req, res, next) => {
    try {
        const { id } = req.body;
        if (!id || !req.file) {
            return res.status(400).json({
                success: false,
                message: 'User ID and image file are required.',
            });
        }

        const user = await Auth.findOne({ id });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found.',
            });
        }

        if (user?.public_id) {
            await deleteFromCloudinary(user?.public_id);
        } else {
            user.profile = "";
        }
        const result = await uploadToCloudinary(req.file, 'user_profiles');

        user.profile = result.secure_url;
        user.public_id = result.public_id;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Profile image updated successfully.',
            data: {
                id: user.id,
                imageUrl: user.profile,
                public_id: user.public_id,
            },
        });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Image upload failed.',
            error: error.message,
        });
    }
}

exports.logout = async (req, res, next) => {
    try {
        const requests = req.bodyParams;
        const userId = req.user.userid || requests.id;
        console.log('userId', userId)
        const user = await Auth.findOne({ id: userId });
        if (!user) {
            return res.apiResponse(false, 'User not found', {}, 404);
        }
        console.log('user', user)
        user.token = ""
        user.logout = true
        const device = user?.deviceInfos.find(dev => dev?.deviceId === requests?.deviceId);
        if (device) {
            device.logout = true;
            user?.markModified('deviceInfos');
        }
        user.save();
        return res.apiResponse(true, 'Logout Success', {}, 200);
    } catch (error) {
        return res.apiResponse(false, 'Logout api error', {}, 500);
    }
}

exports.sendMessage = async (req, res, next) => {
    try {
        const users = [
            {
                userName: 'Nila',
                mobile: '+919342854823'
            },
            {
                userName: 'Moni',
                mobile: '+916382838907'
            }
        ];

        const results = [];

        for (const user of users) {
            const response = await client.messages.create({
                body: `Hi ${user.userName}, this is from Online Class. Please start your workshop`,
                from: fromNumber,
                to: user.mobile
            });

            results.push({
                user: user.userName,
                to: user.mobile,
                sid: response.sid
            });
        }

        return res.status(200).json({
            message: 'Messages sent successfully',
            details: results
        });

    } catch (error) {
        console.error('Twilio Error:', error);
        return res.status(500).json({
            message: 'Failed to send messages',
            error: error.message
        });
    }
};

exports.sendVerificationCode = async (req, res) => {
    const { phone } = req.bodyParams;

    try {
        const verification = await client.verify
            .services(verifySid)
            .verifications
            .create({ to: phone, channel: 'sms' });

        res.status(200).json({
            message: 'Verification code sent',
            sid: verification.sid,
            status: verification.status
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.verifyCode = async (req, res) => {
    const { phone, code } = req.bodyParams;

    try {
        const verification_check = await client.verify
            .services(verifySid)
            .verificationChecks
            .create({ to: phone, code });

        if (verification_check.status === 'approved') {
            res.status(200).json({ message: 'Phone verified successfully' });
        } else {
            res.status(400).json({ message: 'Invalid code' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

exports.userReport = async (req, res) => {
    try {
        const { type = 'day', fromDate, toDate } = req.bodyParams;
        let reportData;
        // if (type === 'day') {
        reportData = await getReport(type, fromDate, toDate)
        // }
        return res.apiResponse(true, 'Report Success', reportData, 200);
    } catch (error) {
        return res.apiResponse(false, 'Error get report User', {}, 500);
    }
}

exports.dashboardCount = async (req, res, next) => {
    try {
        const models = [
            { title: 'Preg Mom', model: Auth, query: { momType: 'pregMom' } },
            { title: 'New Mom', model: Auth, query: { momType: 'newMom' } },
            { title: 'Articles', model: Article },
            { title: 'Food To Eat', model: FoodEat },
            { title: 'Food To Avoid', model: FoodAvoid },
            { title: 'Community', model: Community },
            { title: 'Books', model: Book },
            { title: 'Badges', model: Batch },
            { title: 'Hospitals', model: Hospital },
            { title: 'Products', model: Product },
            { title: 'Orders', model: Order },
            { title: 'Musics', model: Music },
            { title: 'PodCasts', model: PodCasts },
            { title: 'Exercises', model: Exercise },
            { title: 'Article Searches', model: ArticleSearch },
            { title: 'Community Searches', model: CommunitySearch }
        ];

        const reports = await Promise.all(
            models.map(async ({ title, model, query = {} }) => ({
                title,
                count: await model.countDocuments(query)
            }))
        );

        const topArticles = await ArticleSearch.find({})
            .sort({ searchCount: -1 })
            .limit(10);
        const topCommunites = await CommunitySearch.find({})
            .sort({ searchCount: -1 })
            .limit(10);
        // const articleViews = (await Article.find({}, { viewsCount: 1 })).reduce((sum, a) => sum + (a.viewsCount || 0), 0);
        // reports.push({ title: 'Article Views', count: articleViews });

        const result = {
            reports,
            topArticles,
            topCommunites
        }

        return res.apiResponse(true, 'Report Success', { result }, 200);
    } catch (error) {
        return res.apiResponse(false, 'Report Error', { error }, 500);
    }
};

exports.userDownloadExcel = async (req, res) => {
    try {
        const requests = req.bodyParams;
        console.log('requests', requests)
        const isPregMom = requests.momType === 'pregMom';
        const query = {
            momType: requests.momType,
            ...(requests.status && { status: requests.status }),
            ...(requests.week && { completedWeeks: requests.week }),
            ...(requests.month && { completedMonths: requests.month }),
            ...(requests.subscribed && { subscribed: requests.subscribed === 'Subscribed' ? true : false })
        };
        if (requests.searchKey !== undefined && requests.searchKey.trim() !== '') {
            const searchTerm = requests.searchKey.trim();
            const regex = { $regex: searchTerm, $options: 'i' };

            query['$or'] = [
                { userName: regex },
                { email: regex },
            ];
        }

        await exportToExcel({
            model: Auth,
            headers: [
                'SNo',
                'Name',
                'Email',
                'Age',
                'Date Of Birth',
                'Blood Group',
                'Mom Type',
                isPregMom ? 'Week' : 'Month',
                'Subscribed',
                'Status',
                'Created At'
            ],
            fields: [
                'userName',
                'email',
                'age',
                'dob',
                'bloodGroup',
                'momType',
                isPregMom ? 'completedWeeks' : 'completedMonths',
                'subscribed',
                'status',
                'createdAt'
            ],
            query,
            fileName: isPregMom ? 'pregMom.xlsx' : 'newMom.xlsx',
            res //  send stream to browser
        });
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ message: 'Error exporting Excel' });
    }
};

exports.activeInactiveUserExcel = async (req, res) => {
    try {
        const { userIds } = req.bodyParams; // array of string IDs
        console.log('userIds', userIds)
        try {
            // 1. Fetch the users first
            const users = await Auth.find(
                { id: { $in: userIds } }
            )
            // .lean();
            console.log('user', users)

            if (!users.length) {
                return res.apiResponse(false, 'No users found', {}, 404);
            }

            // 2. Decide isPregMom dynamically (example: based on momType field)
            // let isPregMom = false;
            // for (const user of users) {
            //     isPregMom = user.momType === "pregMom";
            // }
            // ^ You can change logic as per your actual DB values

            // 3. Export only those fetched users
            await exportToExcel({
                model: Auth,
                headers: [
                    'SNo',
                    'Name',
                    'Email',
                    'Age',
                    'Date Of Birth',
                    'Blood Group',
                    'Mom Type',
                    'Week',
                    'Month',
                    'Subscribed',
                    'Status',
                    'Created At',
                    'Last Login'
                ],
                fields: [
                    'userName',
                    'email',
                    'age',
                    'dob',
                    'bloodGroup',
                    'momType',
                    'completedWeeks',
                    'completedMonths',
                    'subscribed',
                    'status',
                    'createdAt',
                    'lastLogin'
                ],
                query: { id: { $in: userIds } }, // only given IDs
                fileName: 'users.xlsx',
                res
            });
        } catch (error) {
            console.error('Export error:', error);
            return res.apiResponse(false, 'Error exporting Excel', {}, 500);
        }
    } catch (error) {

    }
}

exports.ageWiseUserExcel = async (req, res) => {
    try {
        const { userIds } = req.bodyParams; // array of string IDs
        // console.log('userIds', userIds)
        try {
            // 1. Fetch the users first
            const users = await Auth.find(
                { id: { $in: userIds } }
            )
            // .lean();
            // console.log('user', users)

            if (!users.length) {
                return res.apiResponse(false, 'No users found', {}, 404);
            }
            await exportToExcel({
                model: Auth,
                headers: [
                    'SNo',
                    'Name',
                    'Email',
                    'Age',
                    'Date Of Birth',
                    'Blood Group',
                    'Mom Type',
                    'Week',
                    'Month',
                    'Subscribed',
                    'Status',
                    'Created At',
                    'Last Login'
                ],
                fields: [
                    'userName',
                    'email',
                    'age',
                    'dob',
                    'bloodGroup',
                    'momType',
                    'completedWeeks',
                    'completedMonths',
                    'subscribed',
                    'status',
                    'createdAt',
                    'lastLogin'
                ],
                query: { id: { $in: userIds } }, // only given IDs
                fileName: 'users.xlsx',
                res
            });
        } catch (error) {
            // console.error('Export error:', error);
            return res.apiResponse(false, 'Error exporting Excel', {}, 500);
        }
    } catch (error) {

    }
}

// Helper function to build trimester query

const trimesterQuery = (trimester) => {
    let minWeek, maxWeek;
    switch (trimester) {
        case "1": minWeek = 1; maxWeek = 12; break;
        case "2": minWeek = 13; maxWeek = 27; break;
        case "3": minWeek = 28; maxWeek = 100; break; // adjust if needed
    }
    console.log('minWeek', minWeek)
    console.log('maxWeek', maxWeek)
    return {
        momType: 'pregMom',
        $expr: {
            $and: [
                {
                    $gte: [
                        { $convert: { input: "$completedWeeks", to: "int", onError: -1, onNull: -1 } },
                        minWeek
                    ]
                },
                {
                    $lte: [
                        { $convert: { input: "$completedWeeks", to: "int", onError: -1, onNull: -1 } },
                        maxWeek
                    ]
                }
            ]
        }
    };
};

exports.trimesterCounts = async (req, res, next) => {
    try {
        const { trimester } = req.bodyParams;

        if (!["1", "2", "3"].includes(trimester)) {
            return res.apiResponse(false, 'Trimester required (1, 2, or 3)', {}, 400);
        }
        const query = trimesterQuery(trimester);
        console.log('query', query)
        const users = await Auth.find(trimesterQuery(trimester));

        return res.apiResponse(true, 'Success', { trimesterCounts: users.length }, 200);

    } catch (err) {
        next(err);
    }
};

exports.trimesterExcel = async (req, res, next) => {
    try {
        const { trimester } = req.bodyParams;

        if (!trimester || ![1, 2, 3].includes(Number(trimester))) {
            return res.apiResponse(false, 'Trimester required', {}, 400);
        }

        let minWeek, maxWeek;
        switch (Number(trimester)) {
            case 1:
                minWeek = 1; maxWeek = 12;
                break;
            case 2:
                minWeek = 13; maxWeek = 27;
                break;
            case 3:
                minWeek = 28; maxWeek = 100; // adjust as needed
                break;
        }

        await exportToExcel({
            model: Auth,
            headers: [
                'SNo',
                'Name',
                'Email',
                'Age',
                'Date Of Birth',
                'Blood Group',
                'Mom Type',
                'Week',
                'Month',
                'Subscribed',
                'Status',
                'Created At',
                'Last Login'
            ],
            fields: [
                'userName',
                'email',
                'age',
                'dob',
                'bloodGroup',
                'momType',
                'completedWeeks',
                'completedMonths',
                'subscribed',
                'status',
                'createdAt',
                'lastLogin'
            ],
            query: {
                momType: 'pregMom',
                $expr: {
                    $and: [
                        {
                            $gte: [
                                {
                                    $convert: {
                                        input: "$completedWeeks",
                                        to: "int",
                                        onError: -1, // fallback for invalid
                                        onNull: -1   // fallback for null
                                    }
                                },
                                minWeek
                            ]
                        },
                        {
                            $lte: [
                                {
                                    $convert: {
                                        input: "$completedWeeks",
                                        to: "int",
                                        onError: -1,
                                        onNull: -1
                                    }
                                },
                                maxWeek
                            ]
                        }
                    ]
                }
            },
            fileName: `pregMom_trimester_${trimester}.xlsx`,
            res
        });

    } catch (err) {
        next(err);
    }
};

exports.weekExcel = async (req, res, next) => {
    try {
        const { week } = req.bodyParams;

        if (!week || isNaN(Number(week))) {
            return res.apiResponse(false, 'Week number is required', {}, 400);
        }

        const weekNumber = Number(week);

        await exportToExcel({
            model: Auth,
            headers: [
                'SNo',
                'Name',
                'Email',
                'Age',
                'Date Of Birth',
                'Blood Group',
                'Mom Type',
                'Week',
                'Month',
                'Subscribed',
                'Status',
                'Created At',
                'Last Login'
            ],
            fields: [
                'userName',
                'email',
                'age',
                'dob',
                'bloodGroup',
                'momType',
                'completedWeeks',
                'completedMonths',
                'subscribed',
                'status',
                'createdAt',
                'lastLogin'
            ],
            query: {
                momType: 'pregMom',
                $expr: {
                    $eq: [
                        {
                            $convert: {
                                input: "$completedWeeks",
                                to: "int",
                                onError: -1, // invalid = -1
                                onNull: -1
                            }
                        },
                        weekNumber
                    ]
                }
            },
            fileName: `pregMom_week_${weekNumber}.xlsx`,
            res
        });

    } catch (err) {
        next(err);
    }
};

exports.weekCounts = async (req, res, next) => {
    try {
        const { week } = req.bodyParams;

        if (!week) {
            return res.apiResponse(false, 'Week is required', {}, 400);
        }
        const users = await Auth.find({ completedWeeks: week });

        return res.apiResponse(true, 'Success', { weekCounts: users.length }, 200);

    } catch (err) {
        next(err);
    }
};

// async function pregMomExcel(req, res) {
//     try {
//         const isPregMom = req.momType === 'pregMom';

//         const headers = [
//             // 'SNo',
//             'Name',
//             'Email',
//             'Age',
//             'Date Of Birth',
//             'Blood Group',
//             'Mom Type',
//             isPregMom ? 'Week' : 'Month',
//             'Subscribed',
//             'Status',
//             'Created At',
//         ];

//         const fields = [
//             'userName',
//             'email',
//             'age',
//             'dob',
//             'bloodGroup',
//             'momType',
//             isPregMom ? 'enteredWeeks' : 'enteredMonths',
//             'subscribed',
//             'status',
//             'createdAt',
//         ];

//         // Build query
//         const query = {
//             momType: req.momType,
//             status: req.status,
//             subscribed: req.subscribed,
//         };

//         // if (req.week) {
//         //     query.completedWeeks = req.week;
//         // }

//         // if (req.month) {
//         //     query.completedMonths = req.month;
//         // }

//         // Date range filter
//         if (req.fromDate && req.toDate) {
//             const startDate = moment(req.fromDate);
//             const endDate = moment(req.toDate);
//             if (startDate.isValid() && endDate.isValid()) {
//                 query.createdAt = {
//                     $gte: startDate.startOf('day').toDate(),
//                     $lte: endDate.endOf('day').toDate(),
//                 };
//             }
//         }

//         // Search filter (optional)
//         if (req.searchKey && req.searchKey.trim() !== '') {
//             const searchTerm = req.searchKey.trim();
//             query.planName = { $regex: searchTerm, $options: 'i' };
//         }

//         await exportToExcel({
//             model: Auth,
//             headers,
//             fields,
//             query,
//             fileName: 'pregMom.xlsx',
//             res,
//         });
//     } catch (error) {
//         console.error('Export error:', error);
//         res.status(500).json({ message: 'Error exporting Excel' });
//     }
// }



// const ExcelJS = require('exceljs');

// exports.pregMomDownloadExcel = async (req, res) => {
//     try {
//         const workbook = new ExcelJS.Workbook();
//         const worksheet = workbook.addWorksheet('Preg Moms');

//         // Set headers
//         worksheet.addRow(['Name', 'Email', 'Created At']);

//         // Fetch data
//         const data = await Auth.find({ momType: 'pregMom' }).lean();

//         // Add rows
//         data.forEach(item => {
//             worksheet.addRow([
//                 item.userName || '',
//                 item.email || '',
//                 item.createdAt ? new Date(item.createdAt).toLocaleString() : ''
//             ]);
//         });

//         // Set response headers
//         res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
//         res.setHeader('Content-Disposition', 'attachment; filename="pregMom.xlsx"');

//         // Stream Excel to response
//         await workbook.xlsx.write(res);
//         res.end();

//     } catch (error) {
//         console.error('Excel export error:', error);
//         res.status(500).json({ message: 'Error generating Excel' });
//     }
// };

async function getReport(type = 'day', fromDate = null, toDate = null) {
    let start, end;

    if (type === 'day') {
        start = fromDate
            ? parsedDate(fromDate)?.startOf('day')
            : moment().subtract(1, 'month').startOf('month');
        end = toDate
            ? parsedDate(toDate)?.endOf('day')
            : moment().subtract(1, 'month').endOf('month');
    } else if (type === 'week') {
        if (fromDate && toDate) {
            start = parsedDate(fromDate)?.startOf('isoWeek');
            end = parsedDate(toDate)?.endOf('isoWeek');
        } else {
            end = moment().endOf('isoWeek');
            start = moment().subtract(4, 'weeks').startOf('isoWeek');
        }
    } else if (type === 'month') {
        if (fromDate && toDate) {
            start = parsedDate(fromDate)?.startOf('month');
            end = parsedDate(toDate)?.endOf('month');
        } else {
            end = moment().endOf('month');
            start = moment().startOf('month').subtract(3, 'months'); // Last 4 months
        }
    } else {
        throw new Error(`Unsupported report type: ${type}`);
    }

    if (!start || !end) {
        throw new Error('Invalid date input');
    }

    console.log(`Report Type: ${type}`);
    console.log('Date Range:', start.format(), 'to', end.format());

    // const groupStage = (type === 'day')
    //     ? {
    //           _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
    //           count: { $sum: 1 }
    //       }
    //     : (type === 'week')
    //     ? {
    //           _id: {
    //               $dateToString: { format: '%G-[W]%V', date: '$createdAt' } // ISO Week
    //           },
    //           count: { $sum: 1 }
    //       }
    //     : {
    //           _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, // Month
    //           count: { $sum: 1 }
    //       };

    const groupStage = (type === 'day')
        ? {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 }
        }
        : (type === 'week')
            ? {
                _id: {
                    $concat: [
                        { $toString: { $isoWeekYear: '$createdAt' } },
                        '-W',
                        {
                            $cond: [
                                { $lt: [{ $isoWeek: '$createdAt' }, 10] },
                                { $concat: ['0', { $toString: { $isoWeek: '$createdAt' } }] },
                                { $toString: { $isoWeek: '$createdAt' } }
                            ]
                        }
                    ]
                },
                count: { $sum: 1 }
            }
            : {
                _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
                count: { $sum: 1 }
            };


    const result = await Auth.aggregate([
        {
            $match: {
                createdAt: {
                    $gte: start.toDate(),
                    $lte: end.toDate(),
                }
            }
        },
        {
            $group: groupStage
        },
        {
            $sort: { '_id': 1 }
        }
    ]);

    const map = new Map(result.map(r => [r._id, r.count]));
    const filled = [];

    const current = moment(start);

    while (current.isSameOrBefore(end)) {
        let key;
        if (type === 'day') {
            key = current.format('YYYY-MM-DD');
            current.add(1, 'day');
        } else if (type === 'week') {
            key = current.format('GGGG-[W]WW');
            current.add(1, 'week');
        } else if (type === 'month') {
            key = current.format('YYYY-MM');
            current.add(1, 'month');
        }

        if (!filled.find(f => f._id === key)) {
            filled.push({
                _id: key,
                count: map.get(key) || 0
            });
        }
    }

    console.log('Filled:', filled);
    return filled;
}

async function sendOtpMail(email) {
    const otp = Math.floor(100000 + Math.random() * 900000);
    await sendEmail(email, otp);
    return otp;
}

async function calculatePregnancyWeeks(dateInput) {
    const lmpDate = parsedDate(dateInput, "DD-MM-YYYY");
    const today = moment();
    const weeks = today.diff(lmpDate, 'weeks');
    return weeks;
}

async function calculateChildMonths(dateInput) {
    console.log('dateInput', dateInput)
    console.log('coming-child-month-calc-completed')
    const lmpDate = parsedDate(dateInput, "DD-MM-YYYY");
    const today = moment();
    const months = today.diff(lmpDate, 'months');
    console.log('months', months)
    return months;
}

async function enrichSubscriptions(docs) {
    const currentDate = moment();
    for (const doc of docs) {
        const plans = doc.subscriptions;
        const subscribedPlans = [];
        for (const plan of plans) {
            if (plan.subscriptionId && plan.validityEndDate) {
                const endDate = moment(plan.validityEndDate, 'DD-MM-YYYY');
                if (endDate.isSameOrAfter(currentDate, 'day')) {
                    const fullPlanDoc = await Plan.findOne({ id: plan.subscriptionId });
                    if (fullPlanDoc) {
                        const fullPlan = fullPlanDoc.toObject();
                        fullPlan.userPlanId = plan.id;
                        fullPlan.userId = plan.userId;
                        fullPlan.subscriptionId = plan.subscriptionId;
                        fullPlan.validityStartDate = plan.validityStartDate;
                        fullPlan.validityEndDate = plan.validityEndDate;
                        subscribedPlans.push(fullPlan);
                    }
                }
            }
        }
        doc.subscriptions = subscribedPlans;
    }
}

async function getAgeFromDOB(dob) {
    const birthDate = moment(dob, 'DD-MM-YYYY'); //  specify format
    if (!birthDate.isValid()) return null;
    const age = moment().diff(birthDate, 'years');
    return age;
}

cron.schedule('1 0 * * *', calculatedWeeksForMom);
// cron.schedule('*/1 * * * *', calculatedMonthsForMom);
cron.schedule('1 0 * * *', calculatedMonthsForMom);

async function calculatedWeeksForMom() {
    try {
        const moms = await Auth.find({
            momType: 'pregMom',
            pregnancyDate: { $exists: true, $ne: null }
        });

        const today = moment();

        await Promise.all(moms.map(async (mom) => {
            const lmpDate = parsedDate(mom.pregnancyDate, "DD-MM-YYYY");
            const weeks = today.diff(lmpDate, 'weeks');

            mom.completedWeeks = weeks;
            mom.enteredWeeks = weeks + 1;
            mom.cronUpdatedDate = today;

            await mom.save();
        }));

        console.log(` Weeks pregnant updated for ${moms.length} moms.`);
        return { success: true, message: 'Weeks pregnant calculated and saved for all users.' };

    } catch (error) {
        console.error('❌ Cron error:', error);
        return { success: false, message: 'Error calculating weeks pregnant', error };
    }
}

async function calculatedMonthsForMom() {
    try {
        const moms = await Auth.find({
            momType: 'newMom',
            // pregnancyDate: { $exists: true, $ne: null }
        });

        const today = moment();
        await Promise.all(moms.map(async (mom) => {
            if (mom.childrensArray.length > 0) {
                const youngestChild = mom.childrensArray
                    .filter(child => child.dob) // ensure dob exists
                    .sort((a, b) => moment(b.dob).diff(moment(a.dob))) // latest dob first
                [0];
                // console.log('mom-name', mom.userName)
                // console.log('youngestChild', youngestChild)
                const lmpDate = parsedDate(youngestChild?.dob, "DD-MM-YYYY");
                const months = today.diff(lmpDate, 'months');
                mom.completedMonths = months;
                mom.enteredMonths = months + 1;
                mom.cronUpdatedDate = today;
                await mom.save();
            }
        }));

        console.log(` Months updated for ${moms.length} moms.`);
        return { success: true, message: 'New mom Weeks calculated and saved for all users.' };

    } catch (error) {
        console.error('❌ Cron error:', error);
        return { success: false, message: 'Error calculating weeks pregnant', error };
    }
}

// async function calculatedMonthsForMom() {
//     try {
//         const moms = await Auth.find({ momType: 'newMom', newMomDeliveryDate: { $exists: true, $ne: null } });
//         for (let mom of moms) {
//             const momObject = mom.toObject ? mom.toObject() : mom;
//             console.log(`newMomDeliveryDate before accessing for ${momObject.userName}:`, momObject.newMomDeliveryDate);
//             if (!momObject.newMomDeliveryDate) {
//                 console.error(`Missing or invalid delivery date for mom ${momObject.userName}`);
//                 continue;
//             }
//             const newMomDeliveryDate = moment(momObject.newMomDeliveryDate, 'DD-MM-YYYY');
//             console.log('Parsed moment date:', newMomDeliveryDate.format());
//             if (!newMomDeliveryDate.isValid()) {
//                 console.error(`Invalid date format for mom ${momObject.userName}: ${momObject.newMomDeliveryDate}`);
//                 continue;
//             }
//             const today = moment();
//             const completedMonths = today.diff(newMomDeliveryDate, 'months');
//             const enteredMonths = completedMonths + 1;
//             mom.completedMonths = completedMonths;
//             mom.enteredMonths = enteredMonths;
//             mom.cronUpdatedDate = moment();
//             await mom.save();
//             console.log(`Updated ${momObject.userName} with ${completedMonths} completed months and entered month ${enteredMonths}.`);
//         }
//         return {
//             success: true,
//             message: 'Months calculation saved for all users.'
//         };

//     } catch (error) {
//         console.error('Cron error:', error);
//         return {
//             success: false,
//             message: 'Error calculating months for new moms',
//             error
//         };
//     }
// }

// if (requests.authToken) {
//     // const decoded = await admin.auth().verifyIdToken(requests.authToken);
//     console.log('decoded', decoded);
// } else {
//     return res.apiResponse(false, 'No authToken provided', {}, 400);
// }

// Schedule to run every hour

cron.schedule('0 * * * *', async () => {
    console.log('Running hourly check for inactive users...');

    try {
        const allUsers = await Auth.find({});

        for (const user of allUsers) {
            if (user.lastLogin) {
                const lastLoginDate = moment(user.lastLogin, 'DD-MM-YYYY HH:mm');
                const diffDays = moment().diff(lastLoginDate, 'days');

                if (diffDays >= 1 && user.status === 'Active') {
                    // user.status = 'Inactive';
                    user.activeUser = false;
                    await user.save();
                    console.log(`User ${user.id || user._id} marked as Inactive`);
                }
            }
        }
    } catch (error) {
        console.error('Error running user status update cron:', error);
    }
});

exports.getInactiveUserCounts = async (req, res) => {
    try {
        const { momType, fromDate, toDate } = req.bodyParams;

        // Base query: has lastLogin and not today
        const query = {
            lastLogin: { $exists: true, $ne: '' },
            id: { $ne: "1" }
        };
        if (momType) query.momType = momType;

        const users = await Auth.find(query);

        const todayStart = moment().startOf('day');
        const todayEnd = moment().endOf('day');

        // Exclude users who logged in today
        const inactiveUsers = users.filter(user => {
            const loginTime = moment(user.lastLogin, 'DD-MM-YYYY HH:mm'); // change if Date
            return !loginTime.isBetween(todayStart, todayEnd, undefined, '[]');
        });

        const parsedUsers = inactiveUsers.map(user => ({
            id: String(user.id),
            loginAt: moment(user.lastLogin, 'DD-MM-YYYY HH:mm')
        }));

        // Custom range if given
        if (fromDate && toDate) {
            const from = moment(fromDate, 'DD-MM-YYYY');
            const to = moment(toDate, 'DD-MM-YYYY').endOf('day');

            const filtered = parsedUsers.filter(u => u.loginAt.isBetween(from, to, undefined, '[]'));

            return res.apiResponse(true, 'Success', {
                customRange: {
                    fromDate,
                    toDate,
                    userIds: filtered.map(u => u.id),
                    count: filtered.length
                }
            }, 200);
        }

        // Cumulative thresholds
        const now = moment();
        const result = {
            last7Days: [],
            last15Days: [],
            last1Month: [],
            last3Months: [],
            last6Months: [],
            last1Year: []
        };

        for (const user of parsedUsers) {
            const { id, loginAt } = user;

            if (loginAt.isBetween(now.clone().subtract(7, 'days'), todayStart, undefined, '[]')) {
                result.last7Days.push(id);
            }
            if (loginAt.isBetween(now.clone().subtract(15, 'days'), todayStart, undefined, '[]')) {
                result.last15Days.push(id);
            }
            if (loginAt.isBetween(now.clone().subtract(30, 'days'), todayStart, undefined, '[]')) {
                result.last1Month.push(id);
            }
            if (loginAt.isBetween(now.clone().subtract(90, 'days'), todayStart, undefined, '[]')) {
                result.last3Months.push(id);
            }
            if (loginAt.isBetween(now.clone().subtract(180, 'days'), todayStart, undefined, '[]')) {
                result.last6Months.push(id);
            }
            if (loginAt.isBetween(now.clone().subtract(365, 'days'), todayStart, undefined, '[]')) {
                result.last1Year.push(id);
            }
        }

        // Add count to each bucket
        const final = {};
        Object.entries(result).forEach(([key, ids]) => {
            final[key] = {
                userIds: ids,
                count: ids.length
            };
        });

        return res.apiResponse(true, 'Success', final, 200);
    } catch (err) {
        console.error('❌ Error fetching inactive users:', err);
        return res.apiResponse(false, 'Error', {}, 500);
    }
};

exports.getActiveUsersCount = async (req, res) => {
    try {
        const { momType } = req.bodyParams;
        const todayStart = moment().startOf('day');
        const todayEnd = moment().endOf('day');

        const query = {
            status: 'Active',
            lastLogin: { $exists: true, $ne: '' },
            id: { $ne: "1" }
        };

        if (momType && momType !== '') {
            query.momType = momType;
        }

        const users = await Auth.find(query);

        const todayActiveUsers = users.filter(user =>
            moment(user.lastLogin, 'DD-MM-YYYY HH:mm').isBetween(todayStart, todayEnd)
        );

        const userIds = todayActiveUsers.map(user => user.id.toString());

        return res.apiResponse(true, 'Success', {
            counts: userIds.length,
            userIds: userIds
        }, 200);
    } catch (err) {
        console.error('Error fetching active users:', err);
        return res.apiResponse(false, 'Error', {}, 500);
    }
};

exports.weightUpdatePregMom = async (req, res) => {
    try {
        const { weight } = req.bodyParams;
        if (!weight) {
            return res.apiResponse(false, 'Weight is required', {}, 400);
        }
        const userId = req.userDetails.id;
        const currentDate = formatDate(new Date(), 'DD-MM-YYYY HH:mm');
        const result = await Auth.findOneAndUpdate(
            { id: userId, momType: 'pregMom' },
            { $set: { Weight: weight, weightUpdated: currentDate, weightNotifyUpdated: currentDate } },
            { new: true }
        );
        if (!result) {
            return res.apiResponse(false, 'User not found', {}, 404);
        }
        return res.apiResponse(true, 'Weight updated successfully', result, 200);
    } catch (error) {
        console.error('Weight update error:', error);
        return res.apiResponse(false, 'Something went wrong', {}, 500);
    }
};

exports.updateWeightDateForPregMoms = async (req, res) => {
    try {
        const moms = await Auth.find({ momType: 'pregMom' });

        const updates = moms.map(async (mom) => {
            const formattedDate = formatDate(mom.createdAt, 'DD-MM-YYYY HH:mm');
            mom.weightUpdated = formattedDate;
            mom.weightNotifyUpdated = formattedDate;
            await mom.save(); // Saves to DB
            return mom;
        });

        const updatedMoms = await Promise.all(updates);

        res.status(200).json({
            success: true,
            message: 'Weight update date saved for all pregMom users',
            data: updatedMoms
        });
    } catch (error) {
        console.error('Error updating pregMom:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

exports.getUsersByAgeWiseReport = async (req, res) => {
    try {
        let { fromAge, toAge } = req.bodyParams;

        // Validate
        if (fromAge === undefined) {
            return res.apiResponse(false, 'FromAge is required', {}, 400);
        }

        // Convert to Number for proper comparison
        fromAge = Number(fromAge);
        toAge = toAge !== undefined ? Number(toAge) : undefined;

        // Build MongoDB match query
        let matchQuery = {
            $expr: {}
        };

        if (toAge !== undefined) {
            matchQuery.$expr = {
                $and: [
                    { $gte: [{ $toInt: "$age" }, fromAge] },
                    { $lte: [{ $toInt: "$age" }, toAge] }
                ]
            };
        } else {
            matchQuery.$expr = {
                $eq: [{ $toInt: "$age" }, fromAge]
            };
        }

        const users = await Auth.find(matchQuery, { id: 1 });
        const userIds = users.map(user => user.id.toString());

        const result = {
            count: userIds.length,
            userIds
        };

        return res.apiResponse(true, 'Success', result, 200);

    } catch (error) {
        console.error('Error fetching users by age:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
        });
    }
};

exports.delete = async (req, res, next) => {
    try {
        var requests = req.bodyParams;
        if (!requests.id) {
            return res.apiResponse(false, 'Id is missing', {}, 400);
        }
        // const user = Auth.findOne({ id: requests.id });
        // if (!user) {
        //     return res.apiResponse(false, 'User not found', {}, 404)
        // }
        // if (user && user.public_id) {
        //     await deleteFromCloudinary(user.public_id);
        // }
        const result = await Auth.deleteOne({ id: requests.id });
        if (result.deletedCount === 0) {
            return res.apiResponse(false, 'User not found', {}, 404)
        }
        return res.apiResponse(true, 'User deleted successfully', result, 200)
    } catch (error) {
        return res.apiResponse(false, 'Delete User error', { error }, 500)
    }
}

exports.decodeToken = async (req, res) => {
    try {
        const transactions = req.bodyParams.transactions;
        let decodedPayloads = [];
        transactions.forEach((t) => {
            decodedPayloads = decodeTransaction(t);

            console.log("Product:", decodedPayloads.productId);
            console.log("Purchase Date:", new Date(decodedPayloads.purchaseDate));
            console.log("Original Purchase:", new Date(decodedPayloads.originalPurchaseDate));
        });

        return res.apiResponse(true, 'Token decoded successfully', decodedPayloads, 200);
    } catch (error) {
        console.error('Token decode error:', error);
        return res.apiResponse(false, 'Invalid token', {}, 400);
    }
}


