with agg as (
  select bs.id as session_id, bs.user_id,
         coalesce(sum(case when t.side='sell' then t.total_sek else -t.total_sek end), 0) as realized,
         greatest(bs.starting_portfolio_sek, coalesce(p.assigned_level_sek, 0), 10000) as new_base
  from bot_sessions bs
  join profiles p on p.id = bs.user_id
  left join trades t on t.user_id = bs.user_id and t.executed_at >= bs.started_at
  group by bs.id, bs.user_id, bs.starting_portfolio_sek, p.assigned_level_sek
)
update bot_sessions bs
set starting_portfolio_sek = agg.new_base,
    current_multiplier = greatest(1, 1 + agg.realized / agg.new_base)
from agg
where bs.id = agg.session_id
  and (bs.starting_portfolio_sek < coalesce((select assigned_level_sek from profiles where id = bs.user_id), 0)
       or bs.current_multiplier > 5);