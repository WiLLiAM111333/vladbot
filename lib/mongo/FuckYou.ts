import { Document, ObjectId } from 'mongoose';

// fuck mongoose typings
export type FuckYou<T extends object> = Document<ObjectId, unknown, T> & T;
