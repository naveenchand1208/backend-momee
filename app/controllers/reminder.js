const moment = require('moment');
const cron = require('node-cron');
const Reminder = require('../models/reminder')
const Auth = require('../models/auth')
const Product = require('../models/product')
const Journey = require('../models/journey')
const Banner = require('../models/banner')
const Subscription = require('../models/userSubscription')
const UserDietSubscription = require('../models/userDietSubscription')
const UserExercisePlan = require('../models/userExerciseSubscription')
const fireBaseNotification = require('../helpers/pushNotification');
const { formatDate } = require('../helpers/util');
const NotificationLogs = require('../models/notificationLogs');

const scheduledUserReminderJobs = new Set();

// exports.add = async (req, res, next) => {
//     try {
//         const { name, date, time } = req.bodyParams;
//         if (!name || !date || !time) {
//             return res.apiResponse(false, 'Reminder params is missing', {}, 400);
//         }
//         const now = moment().format('DDMMYYYYHHmmss');
//         const uniqueId = `Reminder-${now}`;
//         const newReminder = new Reminder({
//             name,
//             date,
//             time,
//             id: uniqueId
//         });
//         await newReminder.save()
//         return res.apiResponse(true, "Reminder added Success", newReminder, 200);
//     } catch (error) {
//         return res.apiResponse(false, 'Reminder Add error', {}, 500);
//     }
// }

exports.add = async (req, res, next) => {
    try {
        const { name, date, time } = req.bodyParams;

        if (!name || !date || !time) {
            return res.apiResponse(false, 'Reminder params are missing', {}, 400);
        }
        // const reminder = getReminderDateTimeMinus15Mins(date, time);
        const railwayTime = moment(time, "hh:mm A").format("HH:mm");
        const now = moment().format('DDMMYYYYHHmmss');
        const uniqueId = `Reminder-${now}`;

        const newReminder = new Reminder({
            name,
            date,
            time,
            userId: req.userDetails.id,
            reminderDate: date || "",
            reminderTime: railwayTime || "",
            id: uniqueId
        });

        await newReminder.save();

        return res.apiResponse(true, "Reminder added successfully", newReminder, 200);
    } catch (error) {
        console.error('Reminder Add Error:', error);
        return res.apiResponse(false, 'Reminder Add error', {}, 500);
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

        if (requests.id && requests.id !== '') {
            match['id'] = requests.id;
        }
        if (requests.status && requests.status !== '') {
            match['status'] = requests.status;
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
            options.sort = { createdAt: -1 };

            Reminder.paginate(match, options, (err, data) => {
                if (err || !data) {
                    return res.apiResponse(false, "Error while fetching lists", {}, 404);
                }

                // Filter for future reminders
                const futureReminders = data.docs?.filter(isFutureReminder) || [];

                // Sort by date descending
                const groupedDocs = futureReminders.sort((a, b) => new Date(b.date) - new Date(a.date));

                // Manual pagination
                const totalDocs = groupedDocs.length;
                const limit = Number(per_page) || 10;
                const currentPage = Number(page) || 1;
                const totalPages = Math.ceil(totalDocs / limit);
                const startIndex = (currentPage - 1) * limit;
                const endIndex = startIndex + limit;
                const paginatedDocs = groupedDocs.slice(startIndex, endIndex);

                // Return structured paginated response
                return res.apiResponse(true, "Success", {
                    ...data,
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
            });
        }
        else {
            let reminders = await Reminder.find(match).sort({ createdAt: -1 });
            const futureReminders = reminders.filter(isFutureReminder);
            return res.apiResponse(true, "Success", futureReminders, 200);
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
        const reminder = await Reminder.findOne({ id: requests.id })
        if (!reminder) {
            return res.apiResponse(false, 'Reminder not found', {}, 404);
        }
        return res.apiResponse(true, 'Success', reminder, 200);
    } catch (error) {
        return res.apiResponse(false, 'get Reminder error', {}, 500)
    }
}

exports.update = async (req, res, next) => {
    try {
        if (req.bodyParams) {
            const { id, name, date, time, status } = req.bodyParams;
            if (id === undefined || id === null) {
                return res.apiResponse(false, 'Id is missing', {}, 400);
            }
            const updateFields = {};
            if (name) updateFields.name = name;
            if (date) updateFields.date = date;
            if (time) updateFields.time = time;
            if (status) updateFields.status = status;
            if (date || time) {
                const { reminderDate, reminderTime } = getReminderDateTimeMinus15Mins(date, time);
                updateFields.reminderDate = reminderDate;
                updateFields.reminderTime = reminderTime;
            }
            const updatedReminder = await Reminder.findOneAndUpdate(
                { id },
                { $set: updateFields },
                { new: true }
            );
            if (!updatedReminder) {
                return res.apiResponse(false, 'Reminder not found', {}, 404);
            }
            return res.apiResponse(true, 'Reminder updated successfully', updatedReminder, 200);
        } else {
            return res.apiResponse(false, 'Payload is missing', {}, 400);
        }
    } catch (error) {
        // console.error('Update Error:', error);
        return res.apiResponse(false, 'Error updating Reminder', {}, 500);
    }

};

exports.delete = async (req, res, next) => {
    try {
        var requests = req.bodyParams;
        if (!requests.id) {
            return res.apiResponse(false, 'Id is missing', {}, 400);
        }
        const result = await Reminder.deleteOne({ id: requests.id });

        if (result.deletedCount === 0) {
            return res.apiResponse(false, 'Reminder not found', {}, 404)
        }
        return res.apiResponse(true, 'Reminder deleted successfully', result, 200)
    } catch (error) {
        return res.apiResponse(false, 'Delete Reminder error', { error }, 500)
    }
}

// exports.dashboardDetails = async (req, res, next) => {
//     try {
//         var requests = req.bodyParams;
//         const user = await Auth.findOne({ id: req.userDetails.id })
//         const subscription = await Subscription.find({ userId: req.userDetails.id })
//         const dietSubscription = await UserDietSubscription.find({ userId: req.userDetails.id, activePlan: true })
//         const exerciseSubscription = await UserExercisePlan.find({ userId: req.userDetails.id, activePlan: true })
//         const products = await Product.find({})
//         let journey = {};
//         if (user.momType === 'pregMom') {
//             journey = await Journey.findOne({ week: user.week })
//         } else {
//             journey = await Journey.findOne({ month: user.month })
//         }

//         let journeyId = "";
//         let height = 0;
//         let weight = 0;
//         if (journey) {
//             journeyId = journey.id || "";
//             height = journey.height || 0;
//             weight = journey.weight || 0;
//         }
//         const allReminders = await Reminder.find({});
//         let futureReminders = [];
//         if (allReminders.length > 0) {
//             futureReminders = allReminders?.filter(isFutureReminder) || [];
//         }
//         let banners = [];
//         banners = await Banner.find({});
//         const response = {
//             user,
//             subscription,
//             dietSubscription,
//             exerciseSubscription,
//             products,
//             journeyId,
//             height,
//             weight,
//             reminders: futureReminders,
//             banners,
//         }
//         return res.apiResponse(true, "Success", response, 200);
//     } catch (error) {
//         return res.apiResponse(false, 'Dashboard Details error', { error }, 500)
//     }
// }
exports.dashboardDetails = async (req, res, next) => {
    try {
        const requests = req.bodyParams;

        const user = await Auth.findOne({
            id: req.userDetails.id
        });

        if (!user) {
            return res.apiResponse(
                false,
                "User not found",
                {},
                404
            );
        }

        const subscription = await Subscription.find({
            userId: req.userDetails.id
        });

        const dietSubscription = await UserDietSubscription.find({
            userId: req.userDetails.id,
            activePlan: true
        });

        const exerciseSubscription = await UserExercisePlan.find({
            userId: req.userDetails.id,
            activePlan: true
        });

        // const products = await Product.find({});
        // const products = await Product.find({
        //     status: "Active"
        // });
        const products = [];



        let journey = null;

        if (user.momType === 'pregMom') {
            if (user.week != null) {
                journey = await Journey.findOne({
                    week: user.week
                });
            }
        } else {
            if (user.month != null) {
                journey = await Journey.findOne({
                    month: user.month
                });
            }
        }

        let journeyId = "";
        let height = 0;
        let weight = 0;

        if (journey) {
            journeyId = journey.id ?? "";
            height = journey.height ?? 0;
            weight = journey.weight ?? 0;
        }

        const allReminders = await Reminder.find({});

        let futureReminders = [];

        if (allReminders && allReminders.length > 0) {
            futureReminders = allReminders.filter(isFutureReminder);
        }

        const banners = await Banner.find({});

        const response = {
            user: user,
            subscription: subscription || [],
            dietSubscription: dietSubscription || [],
            exerciseSubscription: exerciseSubscription || [],
            products: products || [],
            journeyId: journeyId,
            height: height,
            weight: weight,
            reminders: futureReminders || [],
            banners: banners || []
        };

        return res.apiResponse(
            true,
            "Success",
            response,
            200
        );

    } catch (error) {
        console.error("Dashboard Details error:", error);

        return res.apiResponse(
            false,
            "Dashboard Details error",
            {
                error: error.message
            },
            500
        );
    }
};

function getReminderDateTimeMinus15Mins(date, time) {
    const originalDateTime = moment(`${date} ${time}`, 'DD-MM-YYYY hh:mm A');

    if (!originalDateTime.isValid()) {
        return null;
    }

    const reminderDateTime = originalDateTime.subtract(15, 'minutes');

    return {
        reminderDate: reminderDateTime.format('DD-MM-YYYY'),
        reminderTime: reminderDateTime.format('HH:mm') // 24-hour format
    };
}

function isFutureReminder(reminder) {
    if (reminder) {
        const combined = `${reminder.date} ${reminder.time}`;

        let reminderDateTime = moment(combined, 'DD-MM-YYYY hh:mm A', true);
        if (!reminderDateTime.isValid()) {
            reminderDateTime = moment(combined, 'DD-MM-YYYY HH:mm', true);
        }
        return reminderDateTime.isValid() && reminderDateTime.isAfter(moment());
    }
}

const pregMomReminders = [
    { time: '7:30', message: "Good morning, mum! Start your day with a glass of water to wake up your body and baby 💧👶" },
    { time: '9:00', message: "Time for a hydration break! Your body and baby need it to stay healthy 💦" },
    { time: '11:00', message: "A gentle reminder to sip some water before lunch. Staying hydrated helps with digestion!" },
    { time: '13:00', message: "Post-lunch refresh! Drink a glass of water to keep your energy up 💙" },
    { time: '15:00', message: "Hydration check! Water helps prevent swelling and fatigue. Grab a glass now 🥤" },
    { time: '17:00', message: "You’re doing great! A little water now supports amniotic fluid and circulation 💧" },
    { time: '19:00', message: "Dinner time? Don’t forget your water! It helps with nutrient absorption 🍽️" },
    { time: '21:00', message: "Wind down with one last glass of water. Stay nourished overnight 🌙💙" },
];

const newMomReminders = [
    { time: '7:30', message: "Good morning, mama! A glass of water helps your body recover and energize 💧🌞" },
    { time: '9:00', message: "Breastfeeding? Staying hydrated supports milk production 💦👶" },
    { time: '11:00', message: "Take a sip, supermom! Hydration keeps you active and reduces fatigue 💙" },
    { time: '13:00', message: "After lunch boost! Water helps your body absorb nutrients and stay strong 🥗💧" },
    { time: '15:00', message: "Midday check-in: Drink water to support healing and energy 💪" },
    { time: '17:00', message: "You’ve made it this far today! Time to refuel with a glass of water 💦" },
    { time: '19:00', message: "Dinner time! Don’t forget your water – it helps digestion and energy 💧🍽️" },
    { time: '21:00', message: "Before bed, sip some water to stay nourished overnight 🌙🍼" },
];

function setupWaterReminderCron(reminders, momType) {
    reminders.forEach(({ time, message }) => {
        const [hour, minute] = time.split(':');

        cron.schedule(`${minute} ${hour} * * *`, async () => {
            console.log(`⏰ [${time}] Water reminder for ${momType} triggered at:`,
                new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));

            try {
                const users = await Auth.find({ momType, "deviceInfos.fcmToken": { $exists: true, $ne: null }, "deviceInfos.logout": false });
                // logout: false,
                const rName = momType === 'pregMom' ? "pm" : "nm";

                const now = moment().format('DDMMYYYYHHmmss');
                const uniqueId = `NotificationLog -${rName}-${now}`;
                const newClickCount = new NotificationLogs({
                    id: uniqueId,
                    title: 'Water Reminder',
                    message: message,
                })
                await newClickCount.save();
                console.log('newClickCount', newClickCount)
                for (const user of users) {
                    const { deviceInfos } = user;
                    await Promise.allSettled(
                        deviceInfos
                            .filter(info => !info.logout && info.fcmToken)
                            .map(info =>
                                fireBaseNotification(info.fcmToken, {
                                    title: 'Water Reminder 💧',
                                    body: message,
                                    data: {
                                        type: 'reminder',
                                        postId: uniqueId,
                                        communityTitle: '',
                                    }
                                }).catch(async err => {
                                    console.error(`❌ Error sending to ${info.fcmToken}:`, err.message);

                                    if (err.errorInfo?.code === 'messaging/registration-token-not-registered') {
                                        await Auth.updateMany(
                                            { "deviceInfos.fcmToken": info.fcmToken },
                                            { $pull: { deviceInfos: { fcmToken: info.fcmToken } } }
                                        );
                                    }
                                })
                            )
                    );
                }

            } catch (err) {
                console.error(` Cron job error for ${momType}:`, err);
            }
        }, {
            timezone: 'Asia/Kolkata'
        });
    });
}

// function setupWaterReminderCron(reminders, momType) {
//     reminders.forEach(({ time, message }) => {
//         const [hour, minute] = time.split(':');

//         cron.schedule(`${minute} ${hour} * * *`, async () => {
//             console.log(`⏰ [${time}] Water reminder for ${momType} triggered at:`,
//                 new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));

//             try {
//                 const users = await Auth.find({ momType, logout: false, "deviceInfos.fcmToken": { $exists: true, $ne: null } });
//                 const rName = momType === 'pregMom' ? "pm" : "nm";

//                 const now = moment().format('DDMMYYYYHHmmss');
//                 const uniqueId = `NotificationLog -${rName}-${now}`;
//                 const newClickCount = new NotificationLogs({
//                     id: uniqueId,
//                     title: 'Water Reminder',
//                     message: message,
//                 })
//                 await newClickCount.save();
//                 console.log('newClickCount', newClickCount)
//                 for (const user of users) {
//                     const { deviceInfos } = user;

//                     await Promise.allSettled(
//                         deviceInfos
//                             .filter(info => !info.logout && info.fcmToken)
//                             .map(info =>
//                                 fireBaseNotification(info.fcmToken, {
//                                     title: 'Water Reminder 💧',
//                                     body: message,
//                                     data: {
//                                         type: 'reminder',
//                                         postId: uniqueId,
//                                         communityTitle: '',
//                                     }
//                                 }).catch(async err => {
//                                     console.error(`❌ Error sending to ${info.fcmToken}:`, err.message);

//                                     if (err.errorInfo?.code === 'messaging/registration-token-not-registered') {
//                                         await Auth.updateMany(
//                                             { "deviceInfos.fcmToken": info.fcmToken },
//                                             { $pull: { deviceInfos: { fcmToken: info.fcmToken } } }
//                                         );
//                                     }
//                                 })
//                             )
//                     );


//                 }

//             } catch (err) {
//                 console.error(` Cron job error for ${momType}:`, err);
//             }
//         }, {
//             timezone: 'Asia/Kolkata'
//         });
//     });
// }

async function setupUserReminderCron(userId) {
    try {
        // console.log(`coming-cron-function ${userId}`)    
        // Step 1: Get user and deviceInfos
        const user = await Auth.findOne({ id: userId });
        if (!user || !user.deviceInfos?.length) {
            console.log(`⚠️ No devices found for user ${userId}`);
            return;
        }

        // Step 2: Get all ACTIVE reminders for the user
        const allReminders = await Reminder.find({ userId, status: 'Active' });
        // console.log(`allReminders`, allReminders.length, user.userName)

        // Step 3: Get current time in Asia/Kolkata
        const nowIST = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
        const now = moment(nowIST, 'DD/MM/YYYY, hh:mm:ss A');

        // Step 4: Filter only FUTURE reminders
        const futureReminders = allReminders.filter(reminder => {
            const reminderDateTime = moment(`${reminder.reminderDate} ${reminder.reminderTime}`, 'DD-MM-YYYY HH:mm');
            return reminderDateTime.isAfter(now);
        });
        // console.log(`futureReminders`, futureReminders.length, user.userName)

        // Step 5: Schedule a cron for each future reminder
        futureReminders.forEach(reminder => {
            if (scheduledUserReminderJobs.has(reminder.id)) {
                return;
            }

            const reminderDateTime = moment(`${reminder.reminderDate} ${reminder.reminderTime}`, 'DD-MM-YYYY HH:mm');

            const minute = reminderDateTime.minute();
            const hour = reminderDateTime.hour();
            const day = reminderDateTime.date();
            const month = reminderDateTime.month() + 1; // cron month is 1-based

            const cronExpression = `${minute} ${hour} ${day} ${month} *`; // No year support in node-cron

            console.log(`📅 Scheduling reminder "${reminder.name}" at cron: ${cronExpression}`);
            scheduledUserReminderJobs.add(reminder.id);

            const reminderJob = cron.schedule(cronExpression, async () => {
                console.log(`🔔 Triggering reminder: "${reminder.name}" for user ${userId}`);

                try {
                    const activeReminder = await Reminder.findOneAndUpdate(
                        { id: reminder.id, status: 'Active' },
                        { $set: { status: 'Avoidable' } },
                        { new: true }
                    );

                    if (!activeReminder) {
                        console.log(`⚠️ Reminder "${reminder.name}" already handled, skipping duplicate send`);
                        return;
                    }

                    await sendUserReminderNotification(user, activeReminder);
                } finally {
                    reminderJob.stop();
                    scheduledUserReminderJobs.delete(reminder.id);
                }
            }, {
                timezone: 'Asia/Kolkata' // Keep timezone here for cron to trigger correctly
            });
        });

    } catch (error) {
        console.error(` Error setting up cron for user ${userId}:`, error.message);
    }
}

async function sendUserReminderNotification(user, reminder) {
    await Promise.allSettled(
        user.deviceInfos
            .filter(info => info.fcmToken)
            .map(info =>
                fireBaseNotification(info.fcmToken, {
                    title: 'Reminder ⏰',
                    body: `Date: ${reminder.date} Time: ${reminder.time}\n${reminder.name}`,
                    data: {
                        type: 'reminder',
                        reminderId: reminder.id,
                    }
                }).catch(async err => {
                    console.error(`❌ Error sending to ${info.fcmToken}:`, err.message);
                    if (err.errorInfo?.code === 'messaging/registration-token-not-registered') {
                        await Auth.updateMany(
                            { "deviceInfos.fcmToken": info.fcmToken },
                            { $pull: { deviceInfos: { fcmToken: info.fcmToken } } }
                        );
                    }
                })
            )
    );
}

async function scheduleAllUserReminders() {
    // cron.schedule('* * * * *', async () => {
    // console.log('coming-cron before function')
    const users = await Auth.find({ "deviceInfos.fcmToken": { $exists: true, $ne: null } });
    // const users = await Auth.find({
    //     "deviceInfos.fcmToken": { $exists: true, $ne: null },
    //     "deviceInfos.logout": false
    // });
    // console.log(users.map(user => user.userName))
    for (const user of users) {
        // console.log(`coming-user-iteration ${user.userName}`)
        setupUserReminderCron(user.id); // or user._id if you're using Mongo's default _id
    }
    // })
}

cron.schedule('* * * * *', async () => {
    scheduleAllUserReminders()
});

setupWaterReminderCron(pregMomReminders, 'pregMom');
setupWaterReminderCron(newMomReminders, 'newMom');

// cron.schedule('*/1 * * * *', async () => {
//     console.log('⏳ Running weight reminder every minute');
//     try {
//         const pregMoms = await Auth.find({ momType: 'pregMom' });

//         for (const mom of pregMoms) {
//             const activeDevice = mom.deviceInfos?.find(d => d.logout === false && d.fcmToken);

//             // 1. Notify if weight is not updated (Weight is 0)
//             if (mom.Weight === 0 && activeDevice && !mom.weightNotifyUpdated) {
//                 // await fireBaseNotification(activeDevice.fcmToken, {
//                 //     title: 'Weight Updation Reminder ⏰',
//                 //     body: 'Please update your weight.',
//                 //     data: { type: 'reminder' }
//                 // });
//             }

//             // 2. Notify if last update > 1 month ago
//             if (mom.weightUpdated) {
//                 console.log('coming')
//                 const lastUpdate = moment(mom.weightUpdated, 'DD-MM-YYYY HH:mm');
//                 if (lastUpdate.isBefore(moment().subtract(1, 'months')) && activeDevice) {
//                     console.log('coming 1 month')
//                     await fireBaseNotification(activeDevice.fcmToken, {
//                         title: 'Weight Updation Reminder ⏰',
//                         body: 'Please update your weight.',
//                         data: { type: 'reminder' }
//                     });
//                     const currentDate = formatDate(new Date(), 'DD-MM-YYYY HH:mm');
//                     mom.weightNotifyUpdated = currentDate;
//                     await mom.save();
//                 }
//             }
//         }
//     } catch (error) {
//         console.error('❌ Cron job error:', error);
//     }
// });

// cron.schedule('*/1 * * * *', async () => {
//     console.log('⏳ Running weight reminder every minute');
//     try {
//         const pregMoms = await Auth.find({ momType: 'pregMom' });

//         const notifyDays = [30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 190];

//         for (const mom of pregMoms) {
//             const activeDevice = mom.deviceInfos?.find(d => d.logout === false && d.fcmToken);
//             if (!activeDevice) continue;

//             if (!mom.weightUpdated) continue;

//             const lastWeightUpdate = moment(mom.weightUpdated, 'DD-MM-YYYY HH:mm');
//             const daysSinceWeightUpdate = moment().diff(lastWeightUpdate, 'days');

//             const shouldNotify =
//                 notifyDays.includes(daysSinceWeightUpdate);

//             const lastNotify = mom.weightNotifyUpdated
//                 ? moment(mom.weightNotifyUpdated, 'DD-MM-YYYY HH:mm')
//                 : null;

//             const notifyCooldownPassed =
//                 !lastNotify || moment().diff(lastNotify, 'days') >= 15;

//             if (shouldNotify && notifyCooldownPassed) {
//                 console.log(`📢 Notifying mom ${mom._id} for day ${daysSinceWeightUpdate}`);

//                 await fireBaseNotification(activeDevice.fcmToken, {
//                     title: 'Weight Updation Reminder ⏰',
//                     body: 'Please update your weight.',
//                     data: {
//                         type: 'reminder',
//                         day: daysSinceWeightUpdate.toString(),
//                     }
//                 });

//                 mom.weightNotifyUpdated = formatDate(new Date(), 'DD-MM-YYYY HH:mm');
//                 await mom.save();
//             }
//         }
//     } catch (error) {
//         console.error('❌ Cron job error:', error);
//     }
// });

cron.schedule('0 10,20 * * *', async () => {
    // cron.schedule('*/1 * * * *', async () => {
    console.log('⏳ Running weight reminder every minute');
    try {
        const pregMoms = await Auth.find({ momType: 'pregMom' });

        const notifyStages = [30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 190];

        for (const mom of pregMoms) {
            const activeDevice = mom.deviceInfos?.find(d => d.logout === false && d.fcmToken);
            if (!activeDevice || !mom.weightUpdated) continue;

            const lastWeightUpdate = moment(mom.weightUpdated, 'DD-MM-YYYY HH:mm');
            const daysSinceWeightUpdate = moment().diff(lastWeightUpdate, 'days');

            // Find the last matching milestone stage crossed
            // const crossedStage = notifyStages.find(stage => daysSinceWeightUpdate >= stage);
            const crossedStages = notifyStages.filter(stage => daysSinceWeightUpdate >= stage);
            const crossedStage = crossedStages.length > 0 ? crossedStages[crossedStages.length - 1] : null;

            if (!crossedStage) continue;

            const lastNotify = mom.weightNotifyUpdated
                ? moment(mom.weightNotifyUpdated, 'DD-MM-YYYY HH:mm')
                : null;

            const notifyCooldownPassed =
                !lastNotify || moment().diff(lastNotify, 'days') >= 15;

            if (notifyCooldownPassed) {
                console.log(`📢 Notifying mom ${mom._id} (crossed ${crossedStage} days)`);

                const now = moment().format('DDMMYYYYHHmmss');
                const uniqueId = `NotificationLog-${now}`;
                const newClickCount = new NotificationLogs({
                    id: uniqueId,
                    title: 'Weight Updation Reminder',
                    message: 'It’s been a while! Please update your weight',
                })
                await newClickCount.save();

                await fireBaseNotification(activeDevice.fcmToken, {
                    title: 'Weight Updation Reminder ⏰',
                    body: 'It’s been a while! Please update your weight',
                    data: {
                        type: 'reminder',
                        crossedDays: crossedStage.toString(),
                        postId: uniqueId,
                    }
                });

                mom.weightNotifyUpdated = formatDate(new Date(), 'DD-MM-YYYY HH:mm');
                await mom.save();
            }
        }
    } catch (error) {
        console.error('❌ Cron job error:', error);
    }
});

exports.reminderClickCountUpdate = async (req, res, next) => {
    try {
        const { id } = req.bodyParams;
        if (!id) {
            return res.apiResponse(false, 'Id is required', {}, 400);
        }

        const log = await NotificationLogs.findOne({ id });
        if (!log) {
            return res.apiResponse(false, 'Notification Log Is Not Found', {}, 404);
        }

        await NotificationLogs.updateOne(
            { id },
            { $inc: { counts: 1 } }
        );

        //  Send success response (was missing)
        return res.apiResponse(true, 'Count incremented successfully', {}, 200);

    } catch (error) {
        console.error("Count Add error:", error);
        return res.apiResponse(false, 'Count Add error', {}, 500);
    }
};
