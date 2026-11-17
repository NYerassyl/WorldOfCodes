-- One row per direct message. "readAt" is set when the recipient opens the
-- conversation, which is what the unread badge counts.
CREATE TABLE "DirectMessage" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "DirectMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DirectMessage_senderId_recipientId_createdAt_idx" ON "DirectMessage"("senderId", "recipientId", "createdAt");
CREATE INDEX "DirectMessage_recipientId_readAt_idx" ON "DirectMessage"("recipientId", "readAt");

ALTER TABLE "DirectMessage" ADD CONSTRAINT "DirectMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DirectMessage" ADD CONSTRAINT "DirectMessage_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
