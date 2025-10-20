-- Function để xử lý các phiên đấu giá vừa kết thúc
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
            -- Có người thắng, tạo transaction và chờ thanh toán
            INSERT INTO "Transaction" ("buyerId", "vehicleId", status, "finalPrice", "paymentGateway")
            VALUES (winner_record."bidderId", auction_record.id, 'PENDING', winner_record.amount, 'WALLET');

            UPDATE "Vehicle" SET status = 'AUCTION_PAYMENT_PENDING' WHERE id = auction_record.id;
        ELSE
            -- Không có ai bid, kết thúc đấu giá
            UPDATE "Vehicle" SET status = 'AUCTION_ENDED' WHERE id = auction_record.id;
        END IF;

        -- Hoàn cọc cho người thua
        UPDATE "Wallet" w
        SET "availableBalance" = "availableBalance" + ad.amount
        FROM "AuctionDeposit" ad
        WHERE ad."vehicleId" = auction_record.id
          AND ad.status = 'PAID'
          AND ad."userId" != COALESCE(winner_record."bidderId", '0') -- Hoàn cọc cho tất cả nếu không có người thắng
          AND w."userId" = ad."userId";

        UPDATE "AuctionDeposit"
        SET status = 'REFUNDED'
        WHERE "vehicleId" = auction_record.id
          AND status = 'PAID'
          AND "userId" != COALESCE(winner_record."bidderId", '0');

    END LOOP;

    -- Tương tự, xử lý cho Battery (bạn có thể copy và sửa lại phần trên)
    -- ...

END;
$$;


-- Function để xử lý các phiên đấu giá quá hạn thanh toán
CREATE OR REPLACE FUNCTION process_overdue_auction_payments()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    overdue_interval CONSTANT interval := '24 hours'; -- Thời hạn thanh toán là 24 giờ
    overdue_transaction RECORD;
BEGIN
    FOR overdue_transaction IN
        SELECT id, "buyerId", "vehicleId", "batteryId" FROM "Transaction"
        WHERE status = 'PENDING'
          AND "paymentGateway" = 'WALLET' -- Chỉ xử lý giao dịch từ đấu giá
          AND "createdAt" < (now() - overdue_interval)
    LOOP
        -- Tịch thu tiền cọc của người thắng
        UPDATE "AuctionDeposit"
        SET status = 'FORFEITED'
        WHERE "userId" = overdue_transaction."buyerId"
          AND status = 'PAID'
          AND ("vehicleId" = overdue_transaction."vehicleId" OR "batteryId" = overdue_transaction."batteryId");

        -- Cập nhật trạng thái listing và transaction
        IF overdue_transaction."vehicleId" IS NOT NULL THEN
            UPDATE "Vehicle" SET status = 'AUCTION_ENDED' WHERE id = overdue_transaction."vehicleId";
        ELSE
            UPDATE "Battery" SET status = 'AUCTION_ENDED' WHERE id = overdue_transaction."batteryId";
        END IF;

        UPDATE "Transaction" SET status = 'CANCELLED' WHERE id = overdue_transaction.id;

    END LOOP;
END;
$$;