// controllers/webhook.controller.js

const express = require('express');
const crypto = require('crypto');
const router = express.Router();

const ApplePaymentLogs = require("../models/applePaymentLogs");
const HistoryLogs = require("../models/history");
const moment = require("moment");

const REVENUECAT_WEBHOOK_SECRET = process.env.REVENUECAT_WEBHOOK_SECRET;

// exports.revenuecat = async (req, res) => {
router.post(
  '/revenuecat',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    console.log("🔔 RevenueCat Webhook Received");

    try {
      const authHeader = req?.headers?.authorization;

      //  parse raw body
      const body = JSON.parse(req.body.toString());

      console.log("body:", body);

      if (authHeader !== REVENUECAT_WEBHOOK_SECRET) {

        await HistoryLogs.create({
          id: `HISTORY_${moment().format("DDMMYYYYHHmmssSSS")}`,
          type: "REVENUECAT_WEBHOOK_UNAUTHORIZED",
          // headers: req?.headers,
          options: body?.event,
        });

        return res.status(401).send("Unauthorized");
      }

      const event = body?.event;
      console.log("event In Webhook", event);

      await HistoryLogs.create({
        id: `HISTORY_${moment().format("DDMMYYYYHHmmssSSS")}`,
        type: event?.type || "REVENUECAT_WEBHOOK_RECEIVED",
        // headers: req?.headers,
        options: event,
      });

      if (!event) {
        return res.status(400).send("Bad Request");
      }

      const {
        type,
        app_user_id,
        product_id,
        original_transaction_id,
        purchased_at_ms,
        expiration_at_ms,
        environment,
      } = event;

      //  lowercase product id
      const lowerProductId = product_id?.toLowerCase() || "";
      console.log("lowerProductId", lowerProductId);

      let module = "UNKNOWN";

      if (lowerProductId.startsWith("diet")) {
        module = "DIET";
      } else if (lowerProductId.startsWith("exercise")) {
        module = "EXERCISE";
      } else if (lowerProductId.startsWith("class")) {
        module = "CLASS";
      }
      console.log("module", module);

      const log = await ApplePaymentLogs.create({
        id: `PAYLOG_${moment().format("DDMMYYYYHHmmssSSS")}`,
        userId: app_user_id,
        productId: product_id,
        transactionId: original_transaction_id,
        originalTransactionId: original_transaction_id,
        eventType: type,
        purchaseDate: purchased_at_ms
          ? new Date(Number(purchased_at_ms))
          : null,
        expiryDate: expiration_at_ms
          ? new Date(Number(expiration_at_ms))
          : null,
        environment: environment,
        // rawData: event,
        module,
        logStatus: "PROCESSED",
      });

      console.log(" Payment log saved:", log.id);

      return res.status(200).send("OK");

    } catch (err) {
      console.error("Webhook error:", err);

      return res.status(500).send("Error");
    }
  }
);

module.exports = router;



// exports.revenuecat = async (req, res) => {
//   try {
//     const authHeader = req.headers.authorization;

//     if (authHeader !== REVENUECAT_WEBHOOK_SECRET) {
//       return res.status(401).send("Unauthorized");
//     }

//     const event = req.body.event;

//     if (!event) {
//       console.log("❌ No event received");
//       return res.status(400).send("Bad Request");
//     }

//     //  Extract important fields
//     const {
//       type,
//       app_user_id,
//       product_id,
//       original_transaction_id,
//       purchased_at_ms,
//       expiration_at_ms,
//       environment,
//     } = event;

//     console.log(" Webhook Event Received");
//     console.log("Type:", type);
//     console.log("User ID:", app_user_id);
//     console.log("Product:", product_id);
//     console.log("Transaction ID:", original_transaction_id);
//     console.log("Purchase Date:", new Date(purchased_at_ms));
//     console.log("Expiry Date:", expiration_at_ms ? new Date(expiration_at_ms) : null);
//     console.log("Environment:", environment);

//     // 👉 Handle event types
//     switch (type) {
//       case "INITIAL_PURCHASE":
//         console.log(" New purchase");
//         break;

//       case "RENEWAL":
//         console.log("🔄 Subscription renewed");
//         break;

//       case "EXPIRATION":
//         console.log("⛔ Subscription expired");
//         break;

//       case "CANCELLATION":
//         console.log("❌ Subscription cancelled");
//         break;

//       case "UNCANCELLATION":
//         console.log("♻️ Subscription re-activated");
//         break;

//       default:
//         console.log("⚠️ Unknown event type:", type);
//     }

//     return res.status(200).send("OK");

//   } catch (err) {
//     console.error("Webhook error:", err);
//     res.status(500).send("Error");
//   }
// };