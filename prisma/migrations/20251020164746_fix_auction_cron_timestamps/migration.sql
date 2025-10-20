-- Kích hoạt extension pgcrypto nếu chưa có
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Cập nhật lại function để nó tự tạo ID và điền timestamp
CREATE OR REPLACE FUNCTION process_ended_auctions()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    auction_record RECORD;
    winner_record RECORD;
BEGIN
    -- Xử lý cho Vehicle
    FOR auction_record IN
        SELECT id, "sellerId" FROM "Vehicle"
        WHERE status = 'AUCTION_LIVE' AND "auctionEndsAt" <= now()
    LOOP
        -- Tìm người thắng cuộc
        SELECT "bidderId", amount INTO winner_record
        FROM "Bid"
        WHERE "vehicleId" = auction_record.id
        ORDER BY amount DESC, "createdAt" ASC
        LIMIT 1;

        IF FOUND THEN
            -- CÓ NGƯỜI THẮNG, TẠO TRANSACTION VÀ CHỜ THANH TOÁN
            INSERT INTO "Transaction" ("id", "buyerId", "vehicleId", status, "finalPrice", "paymentGateway", "createdAt", "updatedAt")
            VALUES (gen_random_uuid(), winner_record."bidderId", auction_record.id, 'PENDING', winner_record.amount, 'WALLET', NOW(), NOW());

            UPDATE "Vehicle" SET status = 'AUCTION_PAYMENT_PENDING' WHERE id = auction_record.id;
        ELSE
            -- KHÔNG CÓ AI BID, KẾT THÚC ĐẤU GIÁ
            UPDATE "Vehicle" SET status = 'AUCTION_ENDED' WHERE id = auction_record.id;
        END IF;

        -- HOÀN CỌC CHO NGƯỜI THUA (Logic không đổi)
        UPDATE "Wallet" w
        SET "availableBalance" = "availableBalance" + ad.amount
        FROM "AuctionDeposit" ad
        WHERE ad."vehicleId" = auction_record.id
          AND ad.status = 'PAID'
          AND ad."userId" != COALESCE(winner_record."bidderId", '0');

        UPDATE "AuctionDeposit"
        SET status = 'REFUNDED'
        WHERE "vehicleId" = auction_record.id
          AND status = 'PAID'
          AND "userId" != COALESCE(winner_record."bidderId", '0');

    END LOOP;

    -- Tương tự, xử lý cho Battery
    FOR auction_record IN
        SELECT id, "sellerId" FROM "Battery"
        WHERE status = 'AUCTION_LIVE' AND "auctionEndsAt" <= now()
    LOOP
        -- Tìm người thắng cuộc
        SELECT "bidderId", amount INTO winner_record
        FROM "Bid"
        WHERE "batteryId" = auction_record.id
        ORDER BY amount DESC, "createdAt" ASC
        LIMIT 1;

        IF FOUND THEN
            -- CÓ NGƯỜI THẮNG, TẠO TRANSACTION VÀ CHỜ THANH TOÁN
            INSERT INTO "Transaction" ("id", "buyerId", "batteryId", status, "finalPrice", "paymentGateway", "createdAt", "updatedAt")
            VALUES (gen_random_uuid(), winner_record."bidderId", auction_record.id, 'PENDING', winner_record.amount, 'WALLET', NOW(), NOW());

            UPDATE "Battery" SET status = 'AUCTION_PAYMENT_PENDING' WHERE id = auction_record.id;
        ELSE
            -- KHÔNG CÓ AI BID, KẾT THÚC ĐẤU GIÁ
            UPDATE "Battery" SET status = 'AUCTION_ENDED' WHERE id = auction_record.id;
        END IF;

        -- HOÀN CỌC CHO NGƯỜI THUA
        UPDATE "Wallet" w
        SET "availableBalance" = "availableBalance" + ad.amount
        FROM "AuctionDeposit" ad
        WHERE ad."batteryId" = auction_record.id
          AND ad.status = 'PAID'
          AND ad."userId" != COALESCE(winner_record."bidderId", '0');

        UPDATE "AuctionDeposit"
        SET status = 'REFUNDED'
        WHERE "batteryId" = auction_record.id
          AND status = 'PAID'
          AND "userId" != COALESCE(winner_record."bidderId", '0');

    END LOOP;

END;
$$;