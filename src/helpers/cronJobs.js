"use strict";

const cron = require("node-cron");
const Event = require("../models/eventModel");
const {
  getReminderEmailHtml,
} = require("../utils/email/eventReminder/eventReminder");
const { sendEmail } = require("../utils/email/emailService");
const axios = require("axios");
const { BACKEND_URL } = require("../../setups");

module.exports = {
  reminderCronJob: cron.schedule("*/60 * * * *", async () => {
    console.log("Running cron job to check upcoming events...");

    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

    // console.log("Current time (UTC):", now.toISOString());
    // console.log("One hour later (UTC):", oneHourLater.toISOString());

    try {
      // First update: mark isDone as true for events in the next hour or those that have already passed
      await Event.updateMany(
        {
          $or: [
            {
              startDate: {
                $gte: now,
                $lte: oneHourLater,
              },
              isDone: false,
            },
            {
              startDate: {
                $lte: now,
              },
              isDone: false,
            },
          ],
        },
        { isDone: true }
      );

      // Second update: mark isDone as false for events that are later than 1 hour from now
      await Event.updateMany(
        {
          startDate: {
            $gt: oneHourLater, // Start date is more than 1 hour from now
          },
          isDone: true, // Only update if isDone is true
        },
        { isDone: false }
      );

      // Find them and populate
      const events = await Event.find({
        startDate: {
          $gte: now.toISOString(),
          $lte: oneHourLater.toISOString(),
        },
      }).populate([
        {
          path: "eventParticipantIds",
          populate: { path: "userId", select: "email fullName" },
        },
        {
          path: "addressId",
        },
      ]);

      // console.log("Found events:", events);

      for (const event of events) {
        for (const participant of event.eventParticipantIds) {
          if (participant) {
            if (participant.isApproved) {
              const reminderSubject = `Reminder: Upcoming Event "${event.title}"`;
              const reminderEmailHtml = getReminderEmailHtml(
                participant.userId.fullName.split(" ")[0],
                event
              );

              await sendEmail(
                participant.userId.email,
                reminderSubject,
                reminderEmailHtml
              );
            }
          }
        }
      }
    } catch (error) {
      console.error("Error finding events or sending emails:", error);
    }
  }),
  job: cron.schedule("*/14 * * * *", async function () {
    // This function will be executed every 14 minutes
    console.log(`server running on ${BACKEND_URL}`);

    // Perform an HTTPS GET request to hit any backend api.
    try {
      const response = await axios.get(BACKEND_URL);
      if (!response.status === 200) {
        console.error(
          `Failed to listen server with status code: ${response.status}`
        );
      }
    } catch (error) {
      console.error("Error during listening:", error.message);
    }
  }),
};
