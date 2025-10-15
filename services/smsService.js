
const africastalking = require("africastalking")({
  apiKey: process.env.AT_API_KEY,
  username: process.env.AT_USERNAME,
});

const sms = africastalking.SMS;


async function sendSMS(to, message) {
  try {
    const response = await sms.send({
      to, 
      message,
      from: process.env.AT_SHORTCODE || null, 
    });

    console.log("SMS Sent:", response);
    return response;
  } catch (error) {
    console.error("SMS Sending Error:", error);
    throw new Error("Failed to send SMS");
  }
}


async function sendBulkSMS(numbers, message) {
  try {
    const response = await sms.send({
      to: numbers,
      message,
      from: process.env.AT_SHORTCODE || null,
    });

    console.log("Bulk SMS Sent:", response);
    return response;
  } catch (error) {
    console.error("Bulk SMS Sending Error:", error);
    throw new Error("Failed to send bulk SMS");
  }
}

module.exports = {
  sendSMS,
  sendBulkSMS,
};
