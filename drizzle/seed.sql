-- ANBEAN seed — idempotent
BEGIN;

INSERT INTO organizations (name, slug, type) VALUES
  ('Anbean Bireysel', 'bireysel', 'bireysel'),
  ('Moda Butik', 'moda-butik', 'isletme'),
  ('Kadıköy Teknoloji A.Ş.', 'kadikoy-teknoloji', 'kurumsal')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO tariffs (code, name, description, base_kurus, per_km_kurus, per_kg_kurus, sla_minutes, accent_status) VALUES
  ('sehir_ici', 'Şehir İçi', 'Aynı şehir içinde, aynı gün teslim. Standart operasyon penceresi.', 7900, 950, 1200, 300, 'transit'),
  ('ekspres', 'Ekspres', 'Alımdan itibaren 90 dakika hedefli, önceliklendirilmiş kurye ataması.', 14900, 1450, 1600, 90, 'waiting'),
  ('kurumsal', 'Kurumsal', 'Sözleşmeli hacim, API entegrasyonu ve SLA raporlaması.', 5900, 780, 900, 240, 'delivered')
ON CONFLICT (code) DO NOTHING;

INSERT INTO service_zones (city, district, zone_code, surcharge_kurus) VALUES
  ('İstanbul', 'Kadıköy', 'IST-A', 0),
  ('İstanbul', 'Beşiktaş', 'IST-A', 0),
  ('İstanbul', 'Şişli', 'IST-A', 0),
  ('İstanbul', 'Üsküdar', 'IST-A', 0),
  ('İstanbul', 'Bakırköy', 'IST-B', 1500),
  ('İstanbul', 'Maltepe', 'IST-B', 1500),
  ('İstanbul', 'Beylikdüzü', 'IST-C', 3500),
  ('İstanbul', 'Pendik', 'IST-C', 3500),
  ('Ankara', 'Çankaya', 'ANK-A', 0),
  ('İzmir', 'Konak', 'IZM-A', 0)
ON CONFLICT DO NOTHING;

INSERT INTO media_slots (slot_key, query, kind, provider_id, url, credit, fallback_css) VALUES
  ('home.hero', 'courier delivery van city street', 'gradyan', '', '', 'Pexels',
    'radial-gradient(900px 480px at 15% 10%, rgba(255,92,53,0.30), transparent 60%), radial-gradient(700px 420px at 85% 25%, rgba(37,99,235,0.28), transparent 60%), linear-gradient(180deg,#0B1220,#0a101c)'),
  ('home.trust', 'smiling courier with parcel', 'foto', '7843937',
    'https://images.pexels.com/photos/7843937/pexels-photo-7843937.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200', 'Pexels — Kampus Production', ''),
  ('services.city', 'delivery van night city lights', 'foto', '7363197',
    'https://images.pexels.com/photos/7363197/pexels-photo-7363197.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200', 'Pexels — RDNE Stock project', ''),
  ('services.corporate', 'logistics warehouse conveyor packages', 'foto', '10834810',
    'https://images.pexels.com/photos/10834810/pexels-photo-10834810.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200', 'Pexels — Ihsan Adityawarman', ''),
  ('corporate.hero', 'city aerial dusk traffic', 'foto', '1267329',
    'https://images.pexels.com/photos/1267329/pexels-photo-1267329.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200', 'Pexels — ELEVATE', ''),
  ('courier.apply', 'cargo bike courier urban', 'foto', '7843984',
    'https://images.pexels.com/photos/7843984/pexels-photo-7843984.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200', 'Pexels — Kampus Production', '')
ON CONFLICT (slot_key) DO NOTHING;

INSERT INTO cms_pages (slug, title, body) VALUES
  ('hakkimizda', 'Hakkımızda', 'Anbean, şehir içi teslimatta belirsizliği ortadan kaldırmak için kuruldu. Vaadimiz hız değil görünürlük: gönderinin nerede olduğunu an be an bilmek.'),
  ('iletisim', 'İletişim', 'Merkez: Kadıköy / İstanbul · destek@anbean.com.tr · 0850 000 00 00'),
  ('kvkk', 'KVKK Aydınlatma Metni', 'Kişisel verileriniz yalnızca teslimat hizmetinin ifası amacıyla işlenir. Takip sayfasında adres ve telefon bilgisi gösterilmez.')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO couriers (user_id, full_name, phone, city, vehicle, status, active_load, last_lat, last_lng, last_seen_at) VALUES
  ((SELECT id FROM users WHERE email='kurye@anbean.com.tr'), 'Mert Aksoy', '05322220022', 'İstanbul', 'motosiklet', 'aktif', 1, 40.9901, 29.0275, now()),
  (NULL, 'Seda Kaya', '05325550055', 'İstanbul', 'motosiklet', 'aktif', 0, 41.0422, 29.0094, now()),
  (NULL, 'Onur Şahin', '05326660066', 'İstanbul', 'panelvan', 'aktif', 2, 41.0138, 28.9497, now()),
  (NULL, 'Deniz Arslan', '05327770077', 'İstanbul', 'bisiklet', 'evrak_bekliyor', 0, NULL, NULL, NULL)
ON CONFLICT DO NOTHING;

COMMIT;

-- Tur 4: hero video slotu + append-only triggerlar
UPDATE media_slots SET kind='video', provider_id='11533609',
  url='https://videos.pexels.com/video-files/11533609/11533609-hd_1280_720_60fps.mp4',
  poster_url='https://images.pexels.com/videos/11533609/pexels-photo-11533609.jpeg?auto=compress&cs=tinysrgb&w=1280',
  credit='Pexels — Altaf Shah', query='birds eye view street night'
WHERE slot_key='home.hero';

-- Append-only: ledger ve denetim kaydi veritabani seviyesinde degistirilemez.
CREATE OR REPLACE FUNCTION anbean_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'append-only: % tablosunda % yasak, duzeltme ters kayitla yapilir', TG_TABLE_NAME, TG_OP;
END;
$$;
DROP TRIGGER IF EXISTS ledger_entries_append_only ON ledger_entries;
CREATE TRIGGER ledger_entries_append_only BEFORE UPDATE OR DELETE ON ledger_entries FOR EACH ROW EXECUTE FUNCTION anbean_append_only();
DROP TRIGGER IF EXISTS ledger_entries_no_truncate ON ledger_entries;
CREATE TRIGGER ledger_entries_no_truncate BEFORE TRUNCATE ON ledger_entries FOR EACH STATEMENT EXECUTE FUNCTION anbean_append_only();
DROP TRIGGER IF EXISTS audit_log_append_only ON audit_log;
CREATE TRIGGER audit_log_append_only BEFORE UPDATE OR DELETE ON audit_log FOR EACH ROW EXECUTE FUNCTION anbean_append_only();
DROP TRIGGER IF EXISTS audit_log_no_truncate ON audit_log;
CREATE TRIGGER audit_log_no_truncate BEFORE TRUNCATE ON audit_log FOR EACH STATEMENT EXECUTE FUNCTION anbean_append_only();

-- Tur 6: riza kayitlari append-only (geri cekme yeni kayitla olur, silme yok)
DROP TRIGGER IF EXISTS consents_append_only ON consents;
CREATE TRIGGER consents_append_only BEFORE UPDATE OR DELETE ON consents FOR EACH ROW EXECUTE FUNCTION anbean_append_only();
DROP TRIGGER IF EXISTS consents_no_truncate ON consents;
CREATE TRIGGER consents_no_truncate BEFORE TRUNCATE ON consents FOR EACH STATEMENT EXECUTE FUNCTION anbean_append_only();
