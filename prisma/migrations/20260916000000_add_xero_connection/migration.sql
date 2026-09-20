-- CreateTable
CREATE TABLE "XeroConnection" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "tenantId" TEXT,
    "tenantName" TEXT,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "connectedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "XeroConnection_pkey" PRIMARY KEY ("id")
);
