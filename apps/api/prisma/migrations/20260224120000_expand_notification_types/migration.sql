-- Expand NotificationType enum for developer-centric notification flows
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'BUG_CRITICAL_ASSIGNED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'BUG_REOPENED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'BUG_RETEST_REQUESTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'BUG_MENTIONED';
