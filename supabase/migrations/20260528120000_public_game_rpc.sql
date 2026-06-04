-- Public read-only game summary for share links (callable by anon).
CREATE OR REPLACE FUNCTION public.get_public_game(p_game_id uuid)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'id', g.id,
    'title', g.title,
    'game_date', g.game_date,
    'start_time', g.start_time,
    'end_time', g.end_time,
    'status', g.status,
    'max_players', g.max_players,
    'venue', CASE
      WHEN v.id IS NOT NULL THEN json_build_object(
        'name', v.name,
        'address', v.address,
        'map_url', v.map_url
      )
      ELSE NULL
    END,
    'players', COALESCE(
      (
        SELECT json_agg(
          json_build_object(
            'full_name', pl.full_name,
            'telegram_username', pl.telegram_username
          )
          ORDER BY gp.created_at
        )
        FROM game_participants gp
        INNER JOIN players pl ON pl.id = gp.player_id
        WHERE gp.game_id = g.id
      ),
      '[]'::json
    )
  )
  FROM games g
  LEFT JOIN venues v ON v.id = g.venue_id
  WHERE g.id = p_game_id;
$$;

REVOKE ALL ON FUNCTION public.get_public_game(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_game(uuid) TO anon, authenticated;
