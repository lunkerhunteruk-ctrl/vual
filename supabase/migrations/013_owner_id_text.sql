-- Change owner_id from UUID to TEXT to support Firebase Auth UIDs
ALTER TABLE stores ALTER COLUMN owner_id TYPE TEXT;
