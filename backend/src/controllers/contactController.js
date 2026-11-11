import { getContactInbox } from '../config/contact.js';
import { sendContactMessageEmail } from '../services/emailService.js';

const httpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

// POST /api/contact  (open to everyone; signed-in status is only noted in the email)
export const sendContactMessage = async (req, res) => {
  const { name, email, orderNumber, message, website } = req.body;

  // Hidden field filled in: a bot. Pretend it worked and send nothing.
  if (website) return res.status(201).json({ message: 'Thanks, your message has been sent.' });

  const inbox = getContactInbox();
  if (!inbox) throw httpError(503, 'Messages cannot be sent right now. Please try again later.');

  try {
    await sendContactMessageEmail({
      to: inbox,
      name,
      email,
      orderNumber,
      message,
      signedIn: Boolean(req.session?.userId),
    });
  } catch (error) {
    console.error('Contact email failed:', error.message);
    throw httpError(502, 'We could not send your message right now. Please try again in a few minutes.');
  }

  return res.status(201).json({ message: 'Thanks, your message has been sent.' });
};