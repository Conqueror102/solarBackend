/**
 * contactController.ts - Contact Form Controller
 * ---------------------
 * Handles contact form submissions and admin management
 */
import asyncHandler from 'express-async-handler';
import { Request, Response } from 'express';
import { Contact } from '../models/Contact.js';
import { createContactSchema, updateContactStatusSchema } from '../validators/contact.js';
import { sendCustomEmail } from '../utils/email.js';
import { notifySystemAlert } from '../utils/adminNotificationService.js';

/**
 * Submit contact form (Public)
 * POST /api/contact
 */
export const submitContactForm = asyncHandler(async (req: Request, res: Response) => {
  const { error } = createContactSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  const { fullName, email, subject, message } = req.body;

  // Create contact message
  const contact = await Contact.create({
    fullName,
    email,
    subject,
    message,
    status: 'new'
  });

  // Notify admins about new contact message
  await notifySystemAlert(
    'New Contact Message',
    `New contact form submission from ${fullName} (${email}). Subject: ${subject}`,
    'medium',
    {
      contactId: contact._id.toString(),
      email,
      subject
    }
  );

  // Send confirmation email to user
  try {
    await sendCustomEmail(
      email,
      'We received your message',
      `
        <h2>Thank you for contacting us, ${fullName}!</h2>
        <p>We have received your message and will get back to you as soon as possible.</p>
        <p><strong>Your message:</strong></p>
        <p>${message}</p>
        <br>
        <p>Best regards,<br>Solar Store Team</p>
      `
    );
  } catch (emailError) {
    console.error('Failed to send confirmation email:', emailError);
    // Don't fail the request if email fails
  }

  res.status(201).json({
    success: true,
    message: 'Your message has been sent successfully. We will get back to you soon!',
    contact: {
      _id: contact._id,
      fullName: contact.fullName,
      email: contact.email,
      subject: contact.subject,
      createdAt: contact.createdAt
    }
  });
});

/**
 * Get all contact messages (Admin)
 * GET /api/contact
 */
export const getContactMessages = asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  const { status, search } = req.query;

  const filter: any = {};

  if (status && status !== 'all') {
    filter.status = status;
  }

  if (search) {
    filter.$or = [
      { fullName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { subject: { $regex: search, $options: 'i' } },
      { message: { $regex: search, $options: 'i' } }
    ];
  }

  const [contacts, total] = await Promise.all([
    Contact.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('repliedBy', 'name email'),
    Contact.countDocuments(filter)
  ]);

  // Get status counts
  const statusCounts = await Contact.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  const counts = statusCounts.reduce((acc, item) => {
    acc[item._id] = item.count;
    return acc;
  }, {} as Record<string, number>);

  res.json({
    success: true,
    contacts,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    },
    statusCounts: {
      new: counts.new || 0,
      read: counts.read || 0,
      replied: counts.replied || 0,
      archived: counts.archived || 0,
      total
    }
  });
});

/**
 * Get single contact message (Admin)
 * GET /api/contact/:id
 */
export const getContactMessage = asyncHandler(async (req: Request, res: Response) => {
  const contact = await Contact.findById(req.params.id).populate('repliedBy', 'name email');

  if (!contact) {
    res.status(404);
    throw new Error('Contact message not found');
  }

  // Mark as read if it's new
  if (contact.status === 'new') {
    contact.status = 'read';
    await contact.save();
  }

  res.json({
    success: true,
    contact
  });
});

/**
 * Update contact message status (Admin)
 * PATCH /api/contact/:id/status
 */
export const updateContactStatus = asyncHandler(async (req: Request, res: Response) => {
  const { error } = updateContactStatusSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  const contact = await Contact.findById(req.params.id);

  if (!contact) {
    res.status(404);
    throw new Error('Contact message not found');
  }

  const { status, adminNotes } = req.body;

  contact.status = status;
  if (adminNotes !== undefined) {
    contact.adminNotes = adminNotes;
  }

  if (status === 'replied') {
    contact.repliedAt = new Date();
    contact.repliedBy = (req as any).user._id;
  }

  await contact.save();

  res.json({
    success: true,
    message: 'Contact status updated successfully',
    contact
  });
});

/**
 * Reply to contact message (Admin)
 * POST /api/contact/:id/reply
 */
export const replyToContact = asyncHandler(async (req: Request, res: Response) => {
  const { replyMessage } = req.body;

  if (!replyMessage || replyMessage.trim().length < 10) {
    res.status(400);
    throw new Error('Reply message must be at least 10 characters');
  }

  const contact = await Contact.findById(req.params.id);

  if (!contact) {
    res.status(404);
    throw new Error('Contact message not found');
  }

  // Send reply email
  await sendCustomEmail(
    contact.email,
    `Re: ${contact.subject}`,
    `
      <h2>Hello ${contact.fullName},</h2>
      <p>Thank you for contacting us. Here is our response to your inquiry:</p>
      <div style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #007bff; margin: 20px 0;">
        ${replyMessage.replace(/\n/g, '<br>')}
      </div>
      <p><strong>Your original message:</strong></p>
      <p style="color: #666;">${contact.message}</p>
      <br>
      <p>Best regards,<br>Solar Store Team</p>
    `
  );

  // Update contact status
  contact.status = 'replied';
  contact.repliedAt = new Date();
  contact.repliedBy = (req as any).user._id;
  contact.adminNotes = replyMessage;
  await contact.save();

  res.json({
    success: true,
    message: 'Reply sent successfully',
    contact
  });
});

/**
 * Delete contact message (Admin)
 * DELETE /api/contact/:id
 */
export const deleteContactMessage = asyncHandler(async (req: Request, res: Response) => {
  const contact = await Contact.findById(req.params.id);

  if (!contact) {
    res.status(404);
    throw new Error('Contact message not found');
  }

  await contact.deleteOne();

  res.json({
    success: true,
    message: 'Contact message deleted successfully'
  });
});

/**
 * Get contact statistics (Admin)
 * GET /api/contact/stats
 */
export const getContactStats = asyncHandler(async (_req: Request, res: Response) => {
  const now = new Date();
  const lastMonth = new Date(now);
  lastMonth.setMonth(now.getMonth() - 1);

  const [total, newMessages, thisMonth] = await Promise.all([
    Contact.countDocuments(),
    Contact.countDocuments({ status: 'new' }),
    Contact.countDocuments({ createdAt: { $gte: lastMonth } })
  ]);

  res.json({
    success: true,
    stats: {
      total,
      newMessages,
      thisMonth
    }
  });
});
