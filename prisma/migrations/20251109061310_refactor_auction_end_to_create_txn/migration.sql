-- Xóa function cũ hoàn toàn
DROP FUNCTION IF EXISTS process_ended_auctions() CASCADE;

-- Tạo lại function với logic mới hoàn toàn
CREATE FUNCTION process_ended_auctions()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    auction_record RECORD;
    winner_record RECORD;
    listing_type_text TEXT;
BEGIN
    FOR auction_record IN
        SELECT 'VEHICLE' as type, v.id FROM "Vehicle" v
        WHERE v.status = 'AUCTION_LIVE' AND v."auctionEndsAt" <= now()
        UNION ALL
        SELECT 'BATTERY' as type, b.id FROM "Battery" b
        WHERE b.status = 'AUCTION_LIVE' AND b."auctionEndsAt" <= now()
    LOOP
        listing_type_text := auction_record.type;

        SELECT "bidderId", amount INTO winner_record
        FROM "Bid"
        WHERE
            (CASE
                WHEN listing_type_text = 'VEHICLE' THEN "vehicleId" = auction_record.id
                ELSE "batteryId" = auction_record.id
            END)
        ORDER BY amount DESC, "createdAt" ASC
        LIMIT 1;

        IF FOUND THEN
            IF listing_type_text = 'VEHICLE' THEN
                UPDATE "Vehicle" SET status = 'AUCTION_PAYMENT_PENDING' WHERE id = auction_record.id;
            ELSE
                UPDATE "Battery" SET status = 'AUCTION_PAYMENT_PENDING' WHERE id = auction_record.id;
            END IF;

            INSERT INTO "Transaction" (
                "buyerId", "vehicleId", "batteryId", "finalPrice", "status", "type", "paymentDeadline"
            )
            VALUES (
                winner_record."bidderId",
                CASE WHEN listing_type_text = 'VEHICLE' THEN auction_record.id ELSE NULL END,
                CASE WHEN listing_type_text = 'BATTERY' THEN auction_record.id ELSE NULL END,
                winner_record.amount,
                'PENDING',
                'AUCTION',
                NOW() + INTERVAL '24 hours'
            );

            UPDATE "Wallet" w
            SET "availableBalance" = "availableBalance" + ad.amount
            FROM "AuctionDeposit" ad
            WHERE ad."userId" = w."userId"
              AND ad."status" = 'PAID'
              AND ad."userId" != winner_record."bidderId"
              AND (
                (listing_type_text = 'VEHICLE' AND ad."vehicleId" = auction_record.id) OR
                (listing_type_text = 'BATTERY' AND ad."batteryId" = auction_record.id)
              );

            UPDATE "AuctionDeposit"
            SET "status" = 'REFUNDED'
            WHERE "status" = 'PAID'
              AND "userId" != winner_record."bidderId"
              AND (
                (listing_type_text = 'VEHICLE' AND "vehicleId" = auction_record.id) OR
                (listing_type_text = 'BATTERY' AND "batteryId" = auction_record.id)
              );

        ELSE
            IF listing_type_text = 'VEHICLE' THEN
                UPDATE "Vehicle" SET status = 'AVAILABLE', "isAuction" = false WHERE id = auction_record.id;
            ELSE
                UPDATE "Battery" SET status = 'AVAILABLE', "isAuction" = false WHERE id = auction_record.id;
            END IF;

            UPDATE "Wallet" w
            SET "availableBalance" = "availableBalance" + ad.amount
            FROM "AuctionDeposit" ad
            WHERE ad."userId" = w."userId"
              AND ad."status" = 'PAID'
              AND (
                (listing_type_text = 'VEHICLE' AND ad."vehicleId" = auction_record.id) OR
                (listing_type_text = 'BATTERY' AND ad."batteryId" = auction_record.id)
              );

            UPDATE "AuctionDeposit"
            SET "status" = 'REFUNDED'
            WHERE "status" = 'PAID'
              AND (
                (listing_type_text = 'VEHICLE' AND "vehicleId" = auction_record.id) OR
                (listing_type_text = 'BATTERY' AND "batteryId" = auction_record.id)
              );
        END IF;
    END LOOP;
END;
$$;