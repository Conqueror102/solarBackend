import asyncHandler from 'express-async-handler';
import { Settings } from '../models/Settings.js';
const getSettings = asyncHandler(async (req, res) => {
    let settings = await Settings.findOne();
    if (!settings) {
        settings = await Settings.create({ businessName: '', businessEmail: '', preferences: {} });
    }
    res.json(settings);
});
const updateSettings = asyncHandler(async (req, res) => {
    let settings = await Settings.findOne();
    if (!settings) {
        settings = await Settings.create(req.body);
    }
    else {
        settings.businessName = req.body.businessName || settings.businessName;
        settings.businessEmail = req.body.businessEmail || settings.businessEmail;
        settings.preferences = req.body.preferences || settings.preferences;
        await settings.save();
    }
    res.json(settings);
});
export { getSettings, updateSettings };
