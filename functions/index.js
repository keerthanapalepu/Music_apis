/* eslint-disable max-len */
/* eslint-disable camelcase */
/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

// const {onRequest} = require("firebase-functions/v2/https");
// const logger = require("firebase-functions/logger");

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
const admin = require("firebase-admin");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const functions = require("firebase-functions");
require("dotenv").config();

const serviceAccount = require("./serviceAccKeys.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://music-20588-default-rtdb.asia-southeast1.firebasedatabase.app",
});

// Enable CORS middleware
// const cors = require("cors")({origin: true});

exports.createOrder = functions.https.onCall(async (data, context) => {
  try {
    const {headers} = context.rawRequest;
    const token = headers.authorization;
    const tokenParts = token.split("Bearer ");
    const extractedToken = tokenParts[1];

    const decodedToken = await admin.auth().verifyIdToken(extractedToken);
    if (!decodedToken) {
      throw new functions.https.HttpsError("unauthenticated", "Unauthorized Request");
    }
    console.log(decodedToken);
    const instance = new Razorpay({
      key_id: process.env.KEY_ID,
      key_secret: process.env.KEY_SECRET,
    });

    const options = {
      amount: data.amount * 100,
      currency: "INR",
      receipt: crypto.randomBytes(10).toString("hex"),
    };

    const order = await instance.orders.create(options);
    return {data: order};
  } catch (error) {
    console.log(error);
    throw new functions.https.HttpsError("internal", "Internal Server Error");
  }
});


exports.paymentVerification = functions.https.onCall(async (data, context) => {
  try {
    // Verify the Firebase ID token in the request header
    const {headers} = context.rawRequest;
    const token = headers.authorization;
    const tokenParts = token.split("Bearer ");
    const extractedToken = tokenParts[1];

    const decodedToken = await admin.auth().verifyIdToken(extractedToken);
    if (!decodedToken) {
      throw new functions.https.HttpsError("unauthenticated", "Unauthorized Request");
    }
    const {razorpay_order_id, razorpay_payment_id, razorpay_signature} = data;
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
        .createHmac("sha256", process.env.KEY_SECRET)
        .update(sign.toString())
        .digest("hex");
    if (razorpay_signature === expectedSign) {
      return {message: "Payment verified successfully"};
    } else {
      throw new functions.https.HttpsError("invalid-argument", "Invalid signature sent!");
    }
  } catch (error) {
    console.log(error);
    throw new functions.https.HttpsError("internal", "Internal Server Error");
  }
});
