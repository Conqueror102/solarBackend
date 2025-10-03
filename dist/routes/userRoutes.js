import { Router } from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { requireRole, requireRoles } from '../middlewares/roleMiddleware.js';
import { getUsers, getUserById, createUser, updateUser, deleteUser, getUserSettings, updateUserSettings, getAddresses, addAddress, updateAddress, deleteAddress, setDefaultAddress, deactivateUser, reactivateUser, getCustomerAnalytics, sendEmailToCustomer, getCustomerProfile, getAllCustomers, bulkDeactivateUsers, getUserOrders } from '../controllers/userController.js';
const router = Router();
// Only superadmin can create/update/delete admins, but admin/superadmin can manage users
router.route('/')
    .get(protect, requireRoles(['admin', 'superadmin']), getUsers)
    .post(protect, requireRole('superadmin'), createUser);
// Customer-specific routes must come BEFORE the /:id route to avoid conflicts
router.get('/customers', protect, requireRoles(['admin', 'superadmin']), getAllCustomers);
router.get('/customers/analytics', protect, requireRoles(['admin', 'superadmin']), getCustomerAnalytics);
router.post('/customers/send-email', protect, requireRoles(['admin', 'superadmin']), sendEmailToCustomer);
router.get('/customers/:id/profile', protect, requireRoles(['admin', 'superadmin']), getCustomerProfile);
router.patch('/customers/:id/deactivate', protect, requireRoles(['admin', 'superadmin']), deactivateUser);
router.patch('/customers/:id/reactivate', protect, requireRoles(['admin', 'superadmin']), reactivateUser);
// Route for bulk deactivating customers
router.patch('/customers/bulk-deactivate', protect, requireRoles(['admin', 'superadmin']), bulkDeactivateUsers);
router.route('/settings')
    .get(protect, getUserSettings)
    .put(protect, updateUserSettings);
router.route('/addresses')
    .get(protect, getAddresses)
    .post(protect, addAddress);
router.route('/addresses/:addressId')
    .put(protect, updateAddress)
    .delete(protect, deleteAddress);
router.route('/addresses/:addressId/default')
    .put(protect, setDefaultAddress);
router.route('/:id')
    .get(protect, requireRoles(['admin', 'superadmin']), getUserById)
    .put(protect, requireRole('superadmin'), updateUser)
    .delete(protect, requireRole('superadmin'), deleteUser);
router.get('/:id/orders', protect, requireRoles(['admin', 'superadmin']), getUserOrders);
export default router;
