import { makeWorker } from '../infra/bullmq.js';
import { sendCustomEmail, sendOrderPlacedEmail, sendOrderStatusUpdateEmail } from '../utils/email.js';
export const { worker: emailWorker } = makeWorker('email', async (job) => {
    switch (job.name) {
        case 'orderPlaced': {
            const d = job.data;
            await sendOrderPlacedEmail({ email: d.to, name: d.userName }, { _id: d.orderId, totalAmount: d.totalAmount, status: d.status });
            return { sent: true };
        }
        case 'orderStatus': {
            const d = job.data;
            await sendOrderStatusUpdateEmail({ email: d.to, name: d.userName }, { _id: d.orderId, totalAmount: d.totalAmount, status: d.status, paymentStatus: d.paymentStatus });
            return { sent: true };
        }
        case 'authEmailVerification': {
            const d = job.data;
            const verifyUrl = `${d.frontendUrl}/verify-email?token=${d.token}&email=${encodeURIComponent(d.to)}`;
            const html = `<p>Welcome${d.userName ? `, ${d.userName}` : ''}! Please <a href="${verifyUrl}">verify your email</a> to activate your account.</p>`;
            await sendCustomEmail(d.to, 'Verify Your Email', html);
            return { sent: true };
        }
        case 'authPasswordReset': {
            const d = job.data;
            const resetUrl = `${d.frontendUrl}/reset-password?token=${d.token}&email=${encodeURIComponent(d.to)}`;
            const html = `<p>${d.userName ? d.userName + ',' : ''} You requested a password reset. <a href="${resetUrl}">Click here to reset your password</a>. Link valid for 1 hour.</p>`;
            await sendCustomEmail(d.to, 'Password Reset Request', html);
            return { sent: true };
        }
        default:
            throw new Error(`Unknown email job: ${job.name}`);
    }
}, { concurrency: 20 });
