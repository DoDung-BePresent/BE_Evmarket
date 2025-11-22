-- Function để xử lý các giao dịch đấu giá quá hạn thanh toán
CREATE OR REPLACE FUNCTION handle_expired_auction_payments()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    expired_txn RECORD;
    deposit_record RECORD;
    listing_seller_id TEXT; -- Biến để lưu ID người bán
BEGIN
    -- Lặp qua các giao dịch đấu giá quá hạn
    FOR expired_txn IN
        SELECT * FROM "Transaction"
        WHERE "type" = 'AUCTION'
          AND "status" = 'PENDING'
          AND "paymentDeadline" < NOW()
    LOOP
        -- 1. Hủy giao dịch
        UPDATE "Transaction" SET "status" = 'CANCELLED' WHERE "id" = expired_txn."id";

        -- 2. Tìm khoản cọc tương ứng của người mua đã không thanh toán
        SELECT * INTO deposit_record
        FROM "AuctionDeposit"
        WHERE "userId" = expired_txn."buyerId"
          AND "status" = 'PAID' -- Chỉ xử lý cọc đang được giữ
          AND (
            ("vehicleId" = expired_txn."vehicleId") OR
            ("batteryId" = expired_txn."batteryId")
          )
        LIMIT 1;

        -- Tìm ID của người bán từ sản phẩm tương ứng
        IF expired_txn."vehicleId" IS NOT NULL THEN
            SELECT "sellerId" INTO listing_seller_id FROM "Vehicle" WHERE "id" = expired_txn."vehicleId";
        ELSE
            SELECT "sellerId" INTO listing_seller_id FROM "Battery" WHERE "id" = expired_txn."batteryId";
        END IF;

        -- Chỉ thực hiện nếu tìm thấy cọc và người bán
        IF FOUND AND listing_seller_id IS NOT NULL THEN
            -- 3. TỊCH THU TIỀN CỌC: Chuyển tiền vào ví của NGƯỜI BÁN
            UPDATE "Wallet"
            SET "availableBalance" = "availableBalance" + deposit_record.amount
            WHERE "userId" = listing_seller_id;

            -- Cập nhật trạng thái cọc là đã bị tịch thu
            UPDATE "AuctionDeposit" SET "status" = 'FORFEITED' WHERE "id" = deposit_record.id;

            -- THÊM MỚI: Ghi lại giao dịch tài chính
            INSERT INTO "FinancialTransaction" (id, "walletId", amount, type, status, description, "createdAt", "updatedAt")
            SELECT gen_random_uuid(), w.id, deposit_record.amount, 'SALE_REVENUE', 'COMPLETED', 'Auction deposit forfeited by buyer for transaction ' || expired_txn.id, now(), now()
            FROM "Wallet" w WHERE w."userId" = listing_seller_id;
            
        END IF;

        -- 4. Đưa sản phẩm trở lại trạng thái AVAILABLE
        IF expired_txn."vehicleId" IS NOT NULL THEN
            UPDATE "Vehicle" SET "status" = 'AVAILABLE', "isAuction" = false WHERE "id" = expired_txn."vehicleId";
        ELSE
            UPDATE "Battery" SET "status" = 'AVAILABLE', "isAuction" = false WHERE "id" = expired_txn."batteryId";
        END IF;

        RAISE NOTICE 'Transaction % cancelled. Deposit transferred to seller %.', expired_txn."id", listing_seller_id;
    END LOOP;
END;
$$;