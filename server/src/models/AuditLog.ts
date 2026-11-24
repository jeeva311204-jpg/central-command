import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  id: string;
  userId?: mongoose.Types.ObjectId;
  userName?: string;
  entityType: string;
  entityId: string;
  action: string;
  before?: Record<string, any>;
  beforeJson?: string;
  after?: Record<string, any>;
  afterJson?: string;
  ipAddress?: string;
  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    userName: { type: String },
    entityType: { type: String, required: true, index: true },
    entityId: { type: String, required: true, index: true },
    action: { type: String, required: true },
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
    ipAddress: { type: String },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound index for fast timeline lookups per entity
AuditLogSchema.index({ entityId: 1, timestamp: -1 });

// Backward compatibility virtuals for JSON strings
AuditLogSchema.virtual('beforeJson').get(function () {
  return this.before ? JSON.stringify(this.before) : null;
});

AuditLogSchema.virtual('afterJson').get(function () {
  return this.after ? JSON.stringify(this.after) : null;
});

// Append-only integrity: Block updates and deletions at model level via Mongoose hooks
const throwAuditImmutableError = function () {
  throw new Error('AuditLog is an immutable append-only ledger. Updates and deletions are strictly prohibited.');
};

AuditLogSchema.pre('updateOne', throwAuditImmutableError);
AuditLogSchema.pre('updateMany', throwAuditImmutableError);
AuditLogSchema.pre('findOneAndUpdate', throwAuditImmutableError);
AuditLogSchema.pre('replaceOne', throwAuditImmutableError);
AuditLogSchema.pre('deleteOne', throwAuditImmutableError);
AuditLogSchema.pre('deleteMany', throwAuditImmutableError);
AuditLogSchema.pre('findOneAndDelete', throwAuditImmutableError);

export const AuditLog =
  mongoose.models.AuditLog ||
  mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
