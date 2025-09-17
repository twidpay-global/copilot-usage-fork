"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dateFormat = void 0;
const dateFormat = (date, options = {
    month: 'numeric', day: 'numeric'
}) => {
    options.timeZone = process.env.TZ || 'UTC';
    return new Date(date).toLocaleDateString('en-US', options);
};
exports.dateFormat = dateFormat;
