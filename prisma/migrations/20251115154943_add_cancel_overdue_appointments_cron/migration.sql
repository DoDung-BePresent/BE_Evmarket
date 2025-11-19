-- This function finds vehicle transactions where an appointment was not scheduled
-- within the 7-day deadline, cancels them, and refunds the deposit to the buyer.
CREATE OR REPLACE FUNCTION cancel_overdue_appointments()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    overdue_txn RECORD;
    seller_id_val TEXT;
    buyer_wallet_id TEXT;
    seller_wallet_id TEXT;
BEGIN
    -- Loop through transactions that are for vehicles, have a deposit paid,
    -- and the appointment deadline has passed.
    FOR overdue_txn IN
        SELECT id, "buyerId", "finalPrice", "vehicleId"
        FROM "Transaction"
        WHERE
            "listingType" = 'VEHICLE'
            AND "status" = 'DEPOSIT_PAID'
            AND "appointmentDeadline" < now()
    LOOP
        -- Find the sellerId from the associated vehicle
        SELECT "sellerId" INTO seller_id_val FROM "Vehicle" WHERE id = overdue_txn."vehicleId";

        -- Find wallet IDs for buyer and seller
        SELECT id INTO buyer_wallet_id FROM "Wallet" WHERE "userId" = overdue_txn."buyerId";
        SELECT id INTO seller_wallet_id FROM "Wallet" WHERE "userId" = seller_id_val;

        -- Proceed only if both wallets are found
        IF buyer_wallet_id IS NOT NULL AND seller_wallet_id IS NOT NULL THEN
            -- 1. Refund deposit: Move money from seller's locked balance to buyer's available balance
            UPDATE "Wallet"
            SET "availableBalance" = "availableBalance" + overdue_txn."finalPrice"
            WHERE id = buyer_wallet_id;

            UPDATE "Wallet"
            SET "lockedBalance" = "lockedBalance" - overdue_txn."finalPrice"
            WHERE id = seller_wallet_id;

            -- 2. Create a financial transaction record for the refund
            INSERT INTO "FinancialTransaction" (id, "walletId", amount, type, status, description, "createdAt", "updatedAt")
            VALUES (gen_random_uuid(), buyer_wallet_id, overdue_txn."finalPrice", 'REFUND', 'COMPLETED', 'Refund for failed appointment scheduling on transaction ' || overdue_txn.id, now(), now());

            -- 3. Update transaction and appointment status to CANCELLED
            UPDATE "Transaction" SET "status" = 'CANCELLED', "updatedAt" = now() WHERE id = overdue_txn.id;
            UPDATE "Appointment" SET "status" = 'CANCELLED', "updatedAt" = now() WHERE "transactionId" = overdue_txn.id;

            -- 4. Set the vehicle status back to AVAILABLE
            UPDATE "Vehicle" SET "status" = 'AVAILABLE' WHERE id = overdue_txn."vehicleId";
        END IF;
    END LOOP;
END;
$$;