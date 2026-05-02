import { supabaseAdmin } from './supabase';

const TOKEN = process.env.TELEGRAM_TOKEN;
const ADMIN_ID = process.env.ADMIN_TELEGRAM_ID; // The admin chat ID to send alerts to

export async function checkInventoryAlerts(appointmentId: string) {
  try {
    // 1. Get all materials involved in this appointment
    const { data: materials, error } = await supabaseAdmin
      .from('appointment_services')
      .select(`
        service_id,
        service_materials (
          amount,
          inventory_items (id, name, unit, actual_stock, reserved_stock, min_threshold)
        )
      `)
      .eq('appointment_id', appointmentId);

    if (error || !materials) return;

    // 2. Flatten and unique materials
    const uniqueMats = new Map();
    materials.forEach((s: any) => {
      s.service_materials.forEach((sm: any) => {
        const item = sm.inventory_items;
        if (!uniqueMats.has(item.id)) {
          uniqueMats.set(item.id, item);
        }
      });
    });

    // 3. For each material, check if we need an alert
    for (const item of uniqueMats.values()) {
      const available = item.actual_stock - item.reserved_stock;
      
      let message = '';
      if (available < 0) {
        message = `🚨 *ДЕФИЦИТ!* \n\nНа новую запись не хватает материала: *${item.name}*.\n\n📊 В наличии: ${item.actual_stock} ${item.unit}\n📅 В резерве (с учетом этой записи): ${item.reserved_stock} ${item.unit}\n⚠️ Недостача: ${Math.abs(available)} ${item.unit}`;
      } else if (available <= item.min_threshold) {
        message = `⚠️ *СКЛАД НА ИСХОДЕ* \n\nМатериал: *${item.name}*\n\n📊 Остаток после записи: ${available} ${item.unit}\n📉 Порог уведомления: ${item.min_threshold} ${item.unit}\n\nРекомендуем заказать в ближайшее время.`;
      }

      if (message && TOKEN && ADMIN_ID) {
        await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: ADMIN_ID,
            text: message,
            parse_mode: 'Markdown'
          })
        });
      }
    }
  } catch (e) {
    console.error('Inventory alert error:', e);
  }
}
