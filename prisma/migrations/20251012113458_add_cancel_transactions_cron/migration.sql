-- Function để hủy các giao dịch quá hạn
CREATE OR REPLACE FUNCTION cancel_overdue_transactions()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    overdue_interval CONSTANT interval := '30 minutes';
BEGIN
    UPDATE "Transaction"
    SET "status" = 'CANCELLED', "updatedAt" = now()
    WHERE
        "status" = 'PENDING'
        AND "createdAt" < (now() - overdue_interval);
END;
$$;

-- Function để tạo hoặc cập nhật một cron job một cách an toàn
-- Function này sẽ được chạy bởi user có quyền cao hơn
CREATE OR REPLACE FUNCTION schedule_cron_job(
    p_jobname text,
    p_schedule text,
    p_command text
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Sử dụng `PERFORM` vì chúng ta không cần kết quả trả về
    PERFORM cron.schedule(p_jobname, p_schedule, p_command);
END;
$$;