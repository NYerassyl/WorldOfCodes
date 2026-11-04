import { AppError } from '../lib/errors.js';
export const battleError = (status, code, message) => new AppError(status, code, message);
export const battleNotFound = () => battleError(404, 'BATTLE_NOT_FOUND', 'Battle not found');
