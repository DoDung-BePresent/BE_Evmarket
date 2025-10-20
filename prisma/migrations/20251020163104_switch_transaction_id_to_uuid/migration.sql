-- Kích hoạt extension pgcrypto để PostgreSQL có thể tạo UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Cập nhật lại function để nó tự tạo ID bằng gen_random_uuid()
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
            -- FIX: Sử dụng gen_random_uuid() để tạo ID cho transaction
            INSERT INTO "Transaction" ("id", "buyerId", "vehicleId", status, "finalPrice", "paymentGateway")
            VALUES (gen_random_uuid(), winner_record."bidderId", auction_record.id, 'PENDING', winner_record.amount, 'WALLET');

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
    -- ...

END;
$$;