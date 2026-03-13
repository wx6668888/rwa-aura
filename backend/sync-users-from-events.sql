INSERT INTO users (address, total_staked, cumulative_personal_stake, first_stake_time, is_active)
SELECT 
    user_address,
    SUM(CAST(amount AS DECIMAL(36,18))),
    SUM(CASE WHEN lock_period > 0 THEN CAST(amount AS DECIMAL(36,18)) ELSE 0 END),
    FROM_UNIXTIME(MIN(timestamp)),
    TRUE
FROM stake_events
GROUP BY user_address
ON DUPLICATE KEY UPDATE
    total_staked = VALUES(total_staked),
    cumulative_personal_stake = VALUES(cumulative_personal_stake),
    is_active = TRUE;
