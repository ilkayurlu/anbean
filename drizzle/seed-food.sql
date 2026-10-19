-- Pilot yemek katalogu: tum isletmeler is_demo=true, arayuzde rozetli.
-- Sahte puan/yorum alani YOKTUR (semada tanimli degil).
INSERT INTO restaurants (slug, name, cuisine, city, district, is_open, min_basket_kurus, delivery_fee_kurus, service_fee_kurus, small_basket_fee_kurus, prep_minutes, is_demo, note) VALUES
 ('pilot-firin-modal','Pilot Fırın — Moda','Fırın & Kahvaltı','İstanbul','Kadıköy',true,12000,4900,3500,2000,20,true,'Pilot katalog: demo işletme. Gerçek restoran ortağı değildir.'),
 ('pilot-esnaf-lokantasi','Pilot Esnaf Lokantası — Kadıköy','Ev yemekleri','İstanbul','Kadıköy',true,15000,5900,3500,2500,30,true,'Pilot katalog: demo işletme.'),
 ('pilot-vegan-mutfak','Pilot Vegan Mutfak — Beşiktaş','Vegan','İstanbul','Beşiktaş',false,18000,6900,4000,0,35,true,'Pilot katalog: demo işletme. Şu an kapalı durumu için örnek.')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO menu_items (restaurant_id, category, name, description, price_kurus, is_available, allergens, sort_index)
SELECT r.id, m.category, m.name, m.description, m.price_kurus, m.is_available, m.allergens, m.sort_index
FROM (VALUES
 ('pilot-firin-modal','Kahvaltı','Serpme Kahvaltı Tabağı','Peynir çeşitleri, zeytin, domates, salatalık, bal-kaymak, iki adet sahanda yumurta.',32500,true,'Süt, yumurta, gluten',1),
 ('pilot-firin-modal','Kahvaltı','Menemen','Bakır sahanda, yanında ekmek.',14500,true,'Yumurta, domates',2),
 ('pilot-firin-modal','Fırın','Simit (adet)','Odun fırınında, susamlı.',2500,true,'Gluten, susam',3),
 ('pilot-firin-modal','Fırın','Poğaça — peynirli','Günlük üretim.',3500,false,'Gluten, süt',4),
 ('pilot-firin-modal','Tatlı','Limonlu Kek Dilimi','Ev yapımı.',6500,true,'Gluten, yumurta, süt',5),
 ('pilot-esnaf-lokantasi','Çorbalar','Mercimek Çorbası','Tereyağı ve limon ile.',7500,true,'Gluten, süt',1),
 ('pilot-esnaf-lokantasi','Ana yemek','Kuru Fasulye + Pilav','Güveçte pişirilir.',16500,true,'—',2),
 ('pilot-esnaf-lokantasi','Ana yemek','İzmir Köfte','Domates soslu, fırında.',19500,true,'Gluten, yumurta',3),
 ('pilot-esnaf-lokantasi','Ana yemek','Etli Türlü','Mevsim sebzeleriyle.',22500,true,'—',4),
 ('pilot-esnaf-lokantasi','Tatlı','Sütlaç','Fırında.',8500,true,'Süt, pirinç',5),
 ('pilot-esnaf-lokantasi','İçecek','Ayran (300 ml)','—',4500,true,'Süt',6),
 ('pilot-vegan-mutfak','Ana yemek','Nohutlu Vegan Bowl','Kinoa, avokado, tahin sos.',21500,true,'Susam',1),
 ('pilot-vegan-mutfak','Ana yemek','Mercimek Köfte','Marul ile servis.',13500,true,'Gluten',2),
 ('pilot-vegan-mutfak','İçecek','Ev yapımı limonata','Şekersiz seçenek.',6500,true,'—',3)
) AS m(rslug, category, name, description, price_kurus, is_available, allergens, sort_index)
JOIN restaurants r ON r.slug = m.rslug
WHERE NOT EXISTS (SELECT 1 FROM menu_items mi JOIN restaurants rr ON rr.id=mi.restaurant_id WHERE rr.slug=m.rslug);

INSERT INTO coupons (code, kind, value, min_basket_kurus, valid_until, usage_limit, is_active) VALUES
 ('ILKSIPARIS','yuzde',10,15000, now() + interval '90 days', 0, true),
 ('DENEME25','tutar',2500,10000, now() + interval '30 days', 0, true),
 ('SURESIDOLDU','tutar',5000,0, now() - interval '1 day', 0, false)
ON CONFLICT (code) DO NOTHING;
