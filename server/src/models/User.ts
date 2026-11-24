import mongoose, { Schema, Document } from 'mongoose';
import { IRole } from './Role';
import { IDepartment } from './Department';

export interface IUser extends Document {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  roleId: mongoose.Types.ObjectId;
  role?: IRole;
  departmentId?: mongoose.Types.ObjectId;
  department?: IDepartment;
  managerId?: mongoose.Types.ObjectId;
  manager?: IUser;
  phone?: string;
  isActive: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    roleId: { type: Schema.Types.ObjectId, ref: 'Role', required: true, index: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', index: true },
    managerId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    phone: { type: String, trim: true },
    isActive: { type: Boolean, default: true, index: true },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Populate helpers
UserSchema.virtual('role', {
  ref: 'Role',
  localField: 'roleId',
  foreignField: '_id',
  justOne: true,
});

UserSchema.virtual('department', {
  ref: 'Department',
  localField: 'departmentId',
  foreignField: '_id',
  justOne: true,
});

UserSchema.virtual('manager', {
  ref: 'User',
  localField: 'managerId',
  foreignField: '_id',
  justOne: true,
});

export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
