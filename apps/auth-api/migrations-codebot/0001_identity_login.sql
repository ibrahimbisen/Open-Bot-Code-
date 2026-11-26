CREATE TABLE account_identities (
  issuer TEXT NOT NULL,
  subject TEXT NOT NULL,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  username TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked')),
  blocked_reason TEXT,
  refresh_token_ciphertext TEXT,
  checked_at INTEGER NOT NULL,
  attempted_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (issuer, subject)
);

CREATE INDEX account_identities_attempted_at ON account_identities(status, attempted_at);

CREATE TABLE account_login_flows (
  state_hash TEXT PRIMARY KEY,
  nonce TEXT NOT NULL,
  provider_verifier TEXT NOT NULL,
  redirect_uri TEXT,
  client_state TEXT,
  client_challenge TEXT,
  device_code_hash TEXT,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  CHECK (
    (redirect_uri IS NOT NULL AND client_state IS NOT NULL AND client_challenge IS NOT NULL AND device_code_hash IS NULL)
    OR (redirect_uri IS NULL AND client_state IS NULL AND client_challenge IS NULL AND device_code_hash IS NOT NULL)
  )
);

CREATE INDEX account_login_flows_expires_at ON account_login_flows(expires_at);

CREATE TABLE account_login_codes (
  code_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_challenge TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  redeemed_at INTEGER,
  session_id TEXT
);

CREATE INDEX account_login_codes_expires_at ON account_login_codes(expires_at);
CREATE INDEX account_login_codes_user ON account_login_codes(user_id);

CREATE TABLE account_device_logins (
  device_code_hash TEXT PRIMARY KEY,
  user_code TEXT NOT NULL UNIQUE,
  device_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'waiting', 'approved', 'denied', 'redeemed')),
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  approval_hash TEXT,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  polled_at INTEGER,
  session_id TEXT
);

CREATE INDEX account_device_logins_expires_at ON account_device_logins(expires_at);
CREATE INDEX account_device_logins_user ON account_device_logins(user_id);
