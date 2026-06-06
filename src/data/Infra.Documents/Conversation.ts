import { Schema, model, Document } from "mongoose";
import { IConversation, ConversationStatus } from "../../external/whatsapp/interfaces/IWhatsApp";

export interface IConversationDocument extends IConversation, Document {}

const ConversationSchema = new Schema<IConversationDocument>(
  {
    phoneNumber:   { type: String, required: true, unique: true, index: true },
    userSlug:      { type: String, index: true },
    status:        {
      type: String,
      enum: ["pending_otp", "active", "closed"] as ConversationStatus[],
      default: "pending_otp",
    },
    lastMessageAt: { type: Date, default: Date.now },
    preferredName: { type: String },
    metadata:      { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export const Conversation = model<IConversationDocument>("Conversation", ConversationSchema);
