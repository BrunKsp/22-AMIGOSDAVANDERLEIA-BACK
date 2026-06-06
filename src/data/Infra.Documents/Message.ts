import { Schema, model, Document, Types } from "mongoose";
import { IMessage, MessageDirection, MessageType } from "../../external/whatsapp/interfaces/IWhatsApp";

export interface IMessageDocument extends Omit<IMessage, "conversationId">, Document {
  conversationId: Types.ObjectId;
}

const MessageSchema = new Schema<IMessageDocument>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
    messageId:      { type: String, sparse: true },
    phoneNumber:    { type: String, required: true },
    userSlug:       { type: String },
    direction:      { type: String, enum: ["inbound", "outbound"] as MessageDirection[], required: true },
    type:           { type: String, enum: ["text", "image", "audio", "document", "unknown"] as MessageType[], default: "text" },
    content:        { type: String, required: true },
    rawPayload:     { type: Schema.Types.Mixed },
    sentAt:         { type: Date, default: Date.now },
  },
  { timestamps: true }
);

MessageSchema.index({ conversationId: 1, sentAt: -1 });
MessageSchema.index({ messageId: 1 }, { unique: true, sparse: true });

export const Message = model<IMessageDocument>("Message", MessageSchema);
