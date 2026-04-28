const { Client } = require('pg');

// Используем Transaction Pooler (порт 6543) для совместимости с IPv4
const connectionString = 'postgresql://postgres.lrnajodxfwegimnwnbdd:Uvbuuvbu4366%40@aws-0-eu-central-1.pooler.supabase.co:6543/postgres';

const client = new Client({
  connectionString,
});

const sql = `
  -- Создаем таблицу услуг
  CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price INTEGER NOT NULL,
    duration_minutes INTEGER NOT NULL,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
  );

  -- Включаем Row Level Security
  ALTER TABLE services ENABLE ROW LEVEL SECURITY;

  -- Разрешаем всем читать услуги
  DROP POLICY IF EXISTS "Allow public read" ON services;
  CREATE POLICY "Allow public read" ON services FOR SELECT USING (true);
  
  -- Разрешаем всё делать админу
  DROP POLICY IF EXISTS "Allow admin all" ON services;
  CREATE POLICY "Allow admin all" ON services FOR ALL USING (true);

  -- Таблица профилей
  CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY,
    phone TEXT UNIQUE NOT NULL,
    name TEXT,
    role TEXT DEFAULT 'client',
    telegram_chat_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
  );

  -- Таблица записей
  CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES profiles(id),
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status TEXT DEFAULT 'active',
    total_price INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
  );

  -- Таблица графика работы
  CREATE TABLE IF NOT EXISTS schedule_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    day_of_week INTEGER NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_working BOOLEAN DEFAULT true
  );

  -- Таблица исключений графика
  CREATE TABLE IF NOT EXISTS schedule_exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    is_working BOOLEAN DEFAULT true
  );
`;

async function setup() {
  try {
    console.log('Подключаемся к базе данных Supabase...');
    await client.connect();
    
    console.log('Создаем таблицы и настраиваем политики безопасности...');
    await client.query(sql);
    
    console.log('✅ База данных успешно настроена!');
  } catch (err) {
    console.error('❌ Ошибка при настройке базы:', err.message);
  } finally {
    await client.end();
  }
}

setup();
