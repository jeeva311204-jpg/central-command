import mongoose, { Schema, Document } from 'mongoose';

export interface IRole extends Document {
  id: string;
  name: string; // Employee, HOD, Engineer, Maintenance, Finance, Procurement, Quality, Management, Admin
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RoleSchema = new Schema<IRole>(
  {
    name: { type: String, required: true, unique: true, trim: true, index: true },
    description: { type: String },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

export const Role = mongoose.models.Role || mongoose.model<IRole>('Role', RoleSchema);
