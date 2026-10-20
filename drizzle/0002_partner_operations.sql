BEGIN;

ALTER TABLE restaurants
  ADD COLUMN about text NOT NULL DEFAULT '',
  ADD COLUMN phone text NOT NULL DEFAULT '',
  ADD COLUMN website text NOT NULL DEFAULT '',
  ADD COLUMN address text NOT NULL DEFAULT '',
  ADD COLUMN opening_hours text NOT NULL DEFAULT '',
  ADD COLUMN phone_visible boolean NOT NULL DEFAULT false;

CREATE TABLE merchant_categories (
  id serial PRIMARY KEY,
  restaurant_id integer NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT merchant_categories_restaurant_name_uq UNIQUE (restaurant_id, name)
);
CREATE UNIQUE INDEX merchant_members_user_uq ON merchant_members (user_id);
ALTER TABLE menu_items ADD COLUMN category_id integer REFERENCES merchant_categories(id) ON DELETE SET NULL;
ALTER TABLE menu_items ADD COLUMN stock_quantity integer CHECK (stock_quantity IS NULL OR stock_quantity >= 0);

CREATE TABLE order_events (
  id serial PRIMARY KEY,
  order_id integer NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status text NOT NULL,
  note text NOT NULL DEFAULT '',
  actor_id integer REFERENCES users(id),
  actor_role text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX order_events_order_idx ON order_events (order_id, created_at);

ALTER TABLE fleets
  ADD COLUMN about text NOT NULL DEFAULT '',
  ADD COLUMN phone text NOT NULL DEFAULT '',
  ADD COLUMN website text NOT NULL DEFAULT '',
  ADD COLUMN service_types jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN regions jsonb NOT NULL DEFAULT '[]'::jsonb;
CREATE UNIQUE INDEX fleet_members_user_uq ON fleet_members (user_id);

CREATE TABLE fleet_vehicles (
  id serial PRIMARY KEY,
  fleet_id integer NOT NULL REFERENCES fleets(id) ON DELETE CASCADE,
  label text NOT NULL,
  vehicle_type text NOT NULL,
  registration text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'available',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fleet_vehicles_registration_uq UNIQUE (fleet_id, registration),
  CHECK (status IN ('available', 'in_use', 'maintenance', 'inactive'))
);
CREATE INDEX fleet_vehicles_fleet_idx ON fleet_vehicles (fleet_id);

CREATE TABLE fleet_couriers (
  id serial PRIMARY KEY,
  fleet_id integer NOT NULL REFERENCES fleets(id) ON DELETE CASCADE,
  courier_id integer NOT NULL REFERENCES couriers(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fleet_couriers_fleet_courier_uq UNIQUE (fleet_id, courier_id)
);
CREATE UNIQUE INDEX fleet_couriers_courier_uq ON fleet_couriers (courier_id);

CREATE TABLE fleet_tasks (
  id serial PRIMARY KEY,
  fleet_id integer NOT NULL REFERENCES fleets(id),
  shipment_id integer NOT NULL UNIQUE REFERENCES shipments(id),
  assigned_courier_id integer REFERENCES couriers(id),
  status text NOT NULL DEFAULT 'assigned',
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CHECK (status IN ('assigned', 'accepted', 'in_progress', 'completed', 'cancelled'))
);
CREATE INDEX fleet_tasks_fleet_status_idx ON fleet_tasks (fleet_id, status);

CREATE TABLE reviews (
  id serial PRIMARY KEY,
  target_type text NOT NULL,
  target_id integer NOT NULL,
  order_id integer REFERENCES orders(id),
  fleet_task_id integer REFERENCES fleet_tasks(id),
  author_id integer NOT NULL REFERENCES users(id),
  stars integer NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  flagged boolean NOT NULL DEFAULT false,
  moderated_by_user_id integer REFERENCES users(id),
  moderated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (target_type IN ('restaurant', 'fleet')),
  CHECK (status IN ('pending', 'visible', 'hidden')),
  CHECK (
    (target_type = 'restaurant' AND order_id IS NOT NULL AND fleet_task_id IS NULL) OR
    (target_type = 'fleet' AND fleet_task_id IS NOT NULL AND order_id IS NULL)
  )
);
CREATE UNIQUE INDEX reviews_order_target_uq ON reviews (order_id, target_type, target_id);
CREATE UNIQUE INDEX reviews_fleet_task_target_uq ON reviews (fleet_task_id, target_type, target_id);
CREATE INDEX reviews_target_status_idx ON reviews (target_type, target_id, status);

CREATE OR REPLACE FUNCTION anbean_order_events_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'append-only: order_events rows cannot be updated or deleted';
END;
$$;
CREATE TRIGGER order_events_append_only
  BEFORE UPDATE OR DELETE ON order_events
  FOR EACH ROW EXECUTE FUNCTION anbean_order_events_append_only();

COMMIT;
