-- File: prisma/migrations/20251109075508_fix_missing_id_in_auction_cron/migration.sql

-- Cập nhật lại function để nó tự tạo ID cho Transaction
CREATE OR REPLACE FUNCTION process_ended_auctions()
RETURNS void AS $$ -- <-- Đã xóa 'LANGUAGE plpgsql' ở đây
DECLARE
    auction_record RECORD;
    winner_record RECORD;
    listing_type_text TEXT;
BEGIN
    -- Xử lý cho cả Vehicle và Battery
    FOR auction_record IN
        SELECT 'VEHICLE' as type, v.id, v."sellerId" FROM "Vehicle" v
        WHERE v.status = 'AUCTION_LIVE' AND v."auctionEndsAt" <= now()
        UNION ALL
        SELECT 'BATTERY' as type, b.id, b."sellerId" FROM "Battery" b
        WHERE b.status = 'AUCTION_LIVE' AND b."auctionEndsAt" <= now()
    LOOP
        listing_type_text := auction_record.type;

        -- Tìm người thắng cuộc
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
            -- CÓ NGƯỜI THẮNG CUỘC
            IF listing_type_text = 'VEHICLE' THEN
                UPDATE "Vehicle" SET status = 'AUCTION_PAYMENT_PENDING' WHERE id = auction_record.id;
            ELSE
                UPDATE "Battery" SET status = 'AUCTION_PAYMENT_PENDING' WHERE id = auction_record.id;
            END IF;

            -- Thêm `id` và `gen_random_uuid()` vào câu lệnh INSERT
            INSERT INTO "Transaction" (
                "id", "buyerId", "vehicleId", "batteryId", "finalPrice", "status", "type", "paymentDeadline", "listingType", "createdAt", "updatedAt"
            )
            VALUES (
                gen_random_uuid(),
                winner_record."bidderId",
                CASE WHEN listing_type_text = 'VEHICLE' THEN auction_record.id ELSE NULL END,
                CASE WHEN listing_type_text = 'BATTERY' THEN auction_record.id ELSE NULL END,
                winner_record.amount,
                'PENDING',
                'AUCTION',
                NOW() + INTERVAL '24 hours',
                listing_type_text::"ListingType",
                NOW(),
                NOW()
            );

            -- Logic hoàn cọc cho người thua (giữ nguyên)
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

            -- THÊM MỚI: Ghi lại giao dịch tài chính cho việc hoàn cọc
            INSERT INTO "FinancialTransaction" (id, "walletId", amount, type, status, description, "createdAt", "updatedAt")
            SELECT gen_random_uuid(), w.id, ad.amount, 'AUCTION_DEPOSIT_REFUND', 'COMPLETED', 'Refund for losing auction on ' || listing_type_text || ' #' || auction_record.id, now(), now()
            FROM "AuctionDeposit" ad
            JOIN "Wallet" w ON ad."userId" = w."userId"
            WHERE ad."status" = 'PAID'
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
            -- KHÔNG CÓ AI ĐẤU GIÁ (giữ nguyên logic)
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
$$ LANGUAGE plpgsql;