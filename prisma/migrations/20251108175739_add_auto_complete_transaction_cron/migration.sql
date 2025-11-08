-- Function to automatically complete transactions that have passed their confirmation deadline.
CREATE OR REPLACE FUNCTION auto_complete_shipped_transactions()
RETURNS void AS $$
DECLARE
    txn RECORD;
    listing_price NUMERIC;
    listing_seller_id TEXT;
    listing_is_auction BOOLEAN;
    fee_percentage NUMERIC;
    commission_amount NUMERIC;
    seller_revenue NUMERIC;
    system_wallet_id TEXT;
BEGIN
    -- Find the system wallet ID once
    SELECT "id" INTO system_wallet_id FROM "Wallet" WHERE "userId" = (SELECT "id" FROM "User" WHERE "email" = 'system@evmarket.local' LIMIT 1);

    IF system_wallet_id IS NULL THEN
        RAISE WARNING 'System wallet not found. Auto-completion job skipped.';
        RETURN;
    END IF;

    -- Loop through all transactions that are 'SHIPPED' and past their deadline
    FOR txn IN
        SELECT * FROM "Transaction"
        WHERE "status" = 'SHIPPED' AND "confirmationDeadline" < NOW()
    LOOP
        -- Determine listing details (price, sellerId, isAuction)
        IF txn."vehicleId" IS NOT NULL THEN
            SELECT "price", "sellerId", "isAuction" INTO listing_price, listing_seller_id, listing_is_auction
            FROM "Vehicle" WHERE "id" = txn."vehicleId";
        ELSE
            SELECT "price", "sellerId", "isAuction" INTO listing_price, listing_seller_id, listing_is_auction
            FROM "Battery" WHERE "id" = txn."batteryId";
        END IF;

        -- Proceed only if listing details were found
        IF listing_price IS NOT NULL AND listing_seller_id IS NOT NULL THEN
            -- Determine the correct fee percentage
            SELECT "percentage" INTO fee_percentage
            FROM "Fee"
            WHERE "type" = (CASE WHEN listing_is_auction THEN 'AUCTION_SALE' ELSE 'REGULAR_SALE' END)
            LIMIT 1;

            -- Calculate commission (default to 0 if no fee rule found)
            commission_amount := (listing_price * COALESCE(fee_percentage, 0)) / 100;
            seller_revenue := listing_price - commission_amount;

            -- Update seller's wallet: move funds from locked to available
            UPDATE "Wallet"
            SET
                "lockedBalance" = "lockedBalance" - listing_price,
                "availableBalance" = "availableBalance" + seller_revenue
            WHERE "userId" = listing_seller_id;

            -- Add commission to system wallet
            UPDATE "Wallet"
            SET "availableBalance" = "availableBalance" + commission_amount
            WHERE "id" = system_wallet_id;

            -- Finally, update the transaction status to COMPLETED
            UPDATE "Transaction"
            SET "status" = 'COMPLETED'
            WHERE "id" = txn."id";

            RAISE NOTICE 'Auto-completed transaction % for seller %', txn."id", listing_seller_id;
        ELSE
            RAISE WARNING 'Could not find listing details for transaction %', txn."id";
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;