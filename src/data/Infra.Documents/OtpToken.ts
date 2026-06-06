import { Schema, model, Document } from "mongoose";
import { IOtpToken } from "../../external/whatsapp/interfaces/IWhatsApp";

export interface IOtpTokenDocument extends IOtpToken, Document {}

const OtpTokenSchema = new Schema<IOtpTokenDocument>(
  {
    phoneNumber: { type: String, required: true, index: true },
    userSlug:    { type: String, required: true },
    code:        { type: String, required: true },
    attempts:    { type: Number, default: 0 },
    expiresAt:   { type: Date, required: true },
    verified:    { type: Boolean, default: false },
  },
  { timestamps: true }
);

OtpTokenSchema.index({ phoneNumber: 1, verified: 1 });
OtpTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OtpToken = model<IOtpTokenDocument>("OtpToken", OtpTokenSchema);
