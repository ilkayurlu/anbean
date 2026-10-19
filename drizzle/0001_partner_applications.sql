BEGIN;

CREATE TABLE restaurant_applications (
  id serial PRIMARY KEY,
  business_name text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  city text NOT NULL,
  district text NOT NULL,
  address text NOT NULL,
  cuisine text NOT NULL,
  website text NOT NULL DEFAULT '',
  opening_hours text NOT NULL DEFAULT '',
  kvkk_consent boolean NOT NULL,
  communication_consent boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'submitted',
  review_reason text NOT NULL DEFAULT '',
  reviewed_by_user_id integer REFERENCES users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX restaurant_applications_status_idx ON restaurant_applications (status, created_at);

CREATE TABLE fleet_applications (
  id serial PRIMARY KEY,
  company_name text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  service_types jsonb NOT NULL DEFAULT '[]'::jsonb,
  regions jsonb NOT NULL DEFAULT '[]'::jsonb,
  vehicle_count_range text NOT NULL,
  website text NOT NULL DEFAULT '',
  "references" text NOT NULL DEFAULT '',
  kvkk_consent boolean NOT NULL,
  communication_consent boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'submitted',
  review_reason text NOT NULL DEFAULT '',
  reviewed_by_user_id integer REFERENCES users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX fleet_applications_status_idx ON fleet_applications (status, created_at);

CREATE TABLE merchants (
  id serial PRIMARY KEY,
  application_id integer NOT NULL UNIQUE REFERENCES restaurant_applications(id),
  slug text NOT NULL UNIQUE,
  business_name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE merchant_members (
  id serial PRIMARY KEY,
  merchant_id integer NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'owner',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT merchant_members_merchant_user_uq UNIQUE (merchant_id, user_id)
);

CREATE TABLE fleets (
  id serial PRIMARY KEY,
  application_id integer NOT NULL UNIQUE REFERENCES fleet_applications(id),
  slug text NOT NULL UNIQUE,
  company_name text NOT NULL,
  contract_status text NOT NULL DEFAULT 'pending',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE fleet_members (
  id serial PRIMARY KEY,
  fleet_id integer NOT NULL REFERENCES fleets(id) ON DELETE CASCADE,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'owner',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fleet_members_fleet_user_uq UNIQUE (fleet_id, user_id)
);

COMMIT;
