import { db } from '@/lib/db';

type NotificationType =
  | 'follow'
  | 'like'
  | 'comment'
  | 'response'
  | 'poll_vote'
  | 'mention'
  | 'invitation_accepted'
  | 'tip'
  | 'subscription';

interface CreateNotificationInput {
  userId: string;         // recipient
  fromUserId?: string;    // who triggered it
  type: NotificationType;
  title?: string;
  message?: string;
  videoId?: string;
  commentId?: string;
}

// Fire-and-forget notification creation (no await needed)
export function createNotification(input: CreateNotificationInput) {
  // Generate default title and message based on type if not provided
  const defaults = getNotificationDefaults(input.type);

  db.notification.create({
    data: {
      userId: input.userId,
      fromUserId: input.fromUserId,
      type: input.type,
      title: input.title || defaults.title,
      message: input.message || defaults.message,
      videoId: input.videoId,
      commentId: input.commentId,
    }
  }).catch((err) => {
    console.error('Failed to create notification:', err);
  });
}

function getNotificationDefaults(type: NotificationType): { title: string; message: string } {
  switch (type) {
    case 'follow':
      return { title: 'New Follower', message: 'Someone started following you' };
    case 'like':
      return { title: 'New Like', message: 'Someone liked your video' };
    case 'comment':
      return { title: 'New Comment', message: 'Someone commented on your video' };
    case 'response':
      return { title: 'New Response', message: 'Someone responded to your video' };
    case 'poll_vote':
      return { title: 'Poll Vote', message: 'Someone voted on your poll' };
    case 'tip':
      return { title: 'New Tip', message: 'You received a tip!' };
    case 'subscription':
      return { title: 'New Subscriber', message: 'Someone subscribed to your channel!' };
    case 'invitation_accepted':
      return { title: 'Invitation Accepted', message: 'Your invitation was accepted!' };
    case 'mention':
      return { title: 'Mention', message: 'You were mentioned' };
    default:
      return { title: 'Notification', message: 'You have a new notification' };
  }
}

// Get unread count for a user
export async function getUnreadCount(userId: string): Promise<number> {
  const count = await db.notification.count({
    where: { userId, isRead: false }
  });
  return count;
}
