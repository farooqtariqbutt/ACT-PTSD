// controllers/notificationController.js
import { User, Notification } from '../db/schema.js'; // Ensure Notification is imported
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * 1. Send Reminder (Triggered by Therapist)
 * Sends an email AND creates an in-app notification for the client.
 */
export const sendClientReminder = async (req, res) => {
  try {
    const { clientId, taskName, taskDetail } = req.body;

    // 1. Fetch the client's profile
    const client = await User.findById(clientId).lean();

    if (!client || !client.email) {
      return res.status(404).json({ success: false, message: 'Client or client email not found.' });
    }

    // 2. Fire the email off via Resend
    const { data, error } = await resend.emails.send({
      from: 'ACT Path <bot@act-ptsd.com>', 
      to: [client.email],
      subject: `Action Required: ${taskName}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2>Hello ${client.name || 'there'},</h2>
          <p>This is a gentle reminder from your therapist regarding an upcoming task or session.</p>
          <div style="background-color: #f8fafc; padding: 15px; border-left: 4px solid #4f46e5; margin: 20px 0;">
            <strong>Task:</strong> ${taskName}<br/>
            <strong>Details:</strong> ${taskDetail}
          </div>
          <p>Please log in to your portal to complete this action.</p>
          <br/>
          <p>Warmly,<br/>Your Care Team</p>
        </div>
      `
    });

    if (error) {
      console.error('[Resend Error]:', error);
      return res.status(400).json({ success: false, message: error.message });
    }

    // 3. ✨ NEW: Save in-app notification so the Bell Icon updates!
    await Notification.create({
      userId: clientId,
      title: `Reminder: ${taskName}`,
      message: taskDetail,
      isRead: false
    });

    res.status(200).json({ success: true, message: 'Reminder email and notification sent successfully.', data });

  } catch (error) {
    console.error('[Server Error]:', error);
    res.status(500).json({ success: false, message: 'Failed to process reminder request.' });
  }
};

/**
 * 2. Get Notifications (Triggered by Client/User's Bell Icon)
 * Fetches all notifications for the currently logged-in user.
 */
export const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.id; // Assuming you are using an authMiddleware that sets req.user

    // Fetch notifications sorted by newest first
    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50); // Limit to the 50 most recent to keep the payload light

    res.status(200).json({ notifications });
  } catch (error) {
    console.error('[Fetch Notifications Error]:', error);
    res.status(500).json({ message: 'Failed to fetch notifications.' });
  }
};

/**
 * 3. Mark as Read (Triggered when user clicks a notification)
 */
export const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId: userId }, // Ensure the user actually owns this notification
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.status(200).json({ success: true, notification });
  } catch (error) {
    console.error('[Mark Read Error]:', error);
    res.status(500).json({ message: 'Failed to mark notification as read.' });
  }
};