CREATE TABLE collection_progress_goals (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goal_key TEXT NOT NULL,
  goal_json TEXT NOT NULL,
  PRIMARY KEY (user_id, goal_key)
);
