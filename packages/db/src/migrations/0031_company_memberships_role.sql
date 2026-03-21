-- Add invited_by_user_id to company_memberships for multi-user collaboration
ALTER TABLE "company_memberships" ADD COLUMN "invited_by_user_id" text;
