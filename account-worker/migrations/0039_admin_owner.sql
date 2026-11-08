-- Attach the workspace owner's existing account through its reserved profile address.
INSERT INTO admin_users(user_id)
SELECT user_id FROM profile_aliases WHERE slug = 'bfbf414a98b9c4d8214e7f6c'
ON CONFLICT(user_id) DO NOTHING;
