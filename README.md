# anbeanş

## Yerel demo girişleri

Yeni veritabanında önce şemayı uygulayın. Eski veritabanında düz metin
`passcode` sütunu varsa, sütunu kaldıracak bir şema güncellemesinden önce seed
komutunu çalıştırın. Ardından `drizzle/seed.sql` ile temel demo verilerini
yükleyin. `.env.local` içinde `ALLOW_DEMO_SEED=true` ayarlayıp
`npm run seed:demo` komutunu çalıştırın. Komut production ortamında çalışmaz;
demo parolalarını veritabanına scrypt hash'i olarak yazar. Demo giriş parolası
`1234`'tür. Bu hesaplar yalnızca yerel geliştirme içindir.

Eski veritabanlarında bulunan düz metin `passcode` değerleri seed komutu
çalışırken parola hash'ine dönüştürülür ve sütun kaldırılır.

## İş ortağı başvuru şeması

Mevcut veritabanına restoran/filo başvuru tablolarını eklemek için, proje kökünde
`DATABASE_URL` tanımlıyken `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f drizzle/0001_partner_applications.sql`
komutunu çalıştırın. Bu migration mevcut kullanıcı tablolarına dokunmaz.