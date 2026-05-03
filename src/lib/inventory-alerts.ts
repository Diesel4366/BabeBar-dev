import { supabaseAdmin } from './supabase';

/**
 * Проверяет остатки материалов для записи и возвращает текст предупреждения,
 * если обнаружен дефицит или низкий порог.
 */
export async function getInventoryWarning(appointmentId: string): Promise<string> {
  try {
    // 1. Получаем все материалы для этой записи
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

    if (error || !materials) return '';

    const uniqueMats = new Map();
    materials.forEach((s: any) => {
      if (s.service_materials) {
        s.service_materials.forEach((sm: any) => {
          const item = sm.inventory_items;
          if (item && !uniqueMats.has(item.id)) {
            uniqueMats.set(item.id, item);
          }
        });
      }
    });

    let warnings: string[] = [];

    for (const item of uniqueMats.values()) {
      // Запрашиваем свежие данные после триггеров
      const { data: freshItem } = await supabaseAdmin
        .from('inventory_items')
        .select('*')
        .eq('id', item.id)
        .single();
      
      if (!freshItem) continue;

      const available = freshItem.actual_stock - freshItem.reserved_stock;
      
      if (available < 0) {
        warnings.push(`🚨 *ДЕФИЦИТ:* ${freshItem.name} (не хватает ${Math.abs(available)} ${freshItem.unit})`);
      } else if (available <= freshItem.min_threshold) {
        warnings.push(`⚠️ *МАЛО:* ${freshItem.name} (остаток ${available} ${freshItem.unit})`);
      }
    }

    if (warnings.length > 0) {
      return `\n\n📦 *СКЛАД:*\n${warnings.join('\n')}`;
    }
    
    return '';
  } catch (e) {
    console.error('Inventory alert error:', e);
    return '';
  }
}
