/**
 * @file index.js
 * @description Плагин автоматического питания для бота BlockMine.
 * Использует встроенный механизм скрытия полей через префикс `enable` и `actionsPreset`.
 * @role Controller / Feature Module
 * @dependency mineflayer
 */

const FOOD_VALUES = {
    'cooked_beef': 8,
    'cooked_porkchop': 8,
    'pumpkin_pie': 8,
    'cooked_mutton': 6,
    'cooked_chicken': 6,
    'golden_carrot': 6,
    'baked_potato': 5,
    'cooked_salmon': 6,
    'cooked_rabbit': 5,
    'bread': 5,
    'cooked_cod': 5,
    'carrot': 3,
    'apple': 4,
    'melon_slice': 2,
    'sweet_berries': 2,
    'glow_berries': 2,
    'cookie': 2,
    'golden_apple': 4,
    'chorus_fruit': 4,
    'dried_kelp': 1,
    'potato': 1,
    'beetroot': 1,
    'beef': 3,
    'porkchop': 3,
    'mutton': 2,
    'chicken': 2,
    'rabbit': 3,
    'cod': 2,
    'salmon': 2,
    'rotten_flesh': 4,
    'spider_eye': 2,
    'poisonous_potato': 2,
    'pufferfish': 1
};

module.exports = (bot, options) => {
    const log = bot.sendLog;
    const settings = options.settings || {};
    let isEating = false;
    let checkInterval = null;

    log('[AutoEat] Инициализация плагина авто-еды...');

    function emitEvent(eventType, args) {
        if (process.send) {
            process.send({
                type: 'event',
                eventType,
                args
            });
        }
    }

    function findBestFood() {
        if (!bot.inventory) return null;
        const items = bot.inventory.items();
        let bestFood = null;
        let maxRestoration = -1;

        for (const item of items) {
            const value = FOOD_VALUES[item.name];
            if (value !== undefined && value > maxRestoration) {
                maxRestoration = value;
                bestFood = item;
            }
        }
        return bestFood;
    }

    async function checkHunger() {
        if (isEating) return;
        
        const isEnabled = settings.autoEatEnabled !== false;
        if (!isEnabled) return;

        const minHunger = settings.minHunger !== undefined ? Number(settings.minHunger) : 14;

        if (bot.food <= minHunger) {
            isEating = true;
            log(`[AutoEat] Низкий уровень сытости (${bot.food} <= ${minHunger}). Запуск процесса питания...`);

            emitEvent('autoEat:start', {
                username: bot.username,
                currentHunger: bot.food,
                method: settings.actionsPreset || 'item'
            });

            try {
                if (settings.actionsPreset === 'custom') {
                    const cmd = settings.enableEatCommand || '/feed';
                    log(`[AutoEat] Выполняю команду питания: ${cmd}`);
                    bot.chat(cmd);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } else {
                    const foodItem = findBestFood();
                    if (foodItem) {
                        log(`[AutoEat] Выбираю лучшую еду: ${foodItem.displayName} (+${FOOD_VALUES[foodItem.name]} сытости)`);
                        await bot.equip(foodItem, 'hand');
                        await bot.consume();
                        log(`[AutoEat] Бот успешно съел ${foodItem.displayName}.`);
                    } else {
                        log('[AutoEat] ВНИМАНИЕ: Требуется еда, но в инвентаре ничего не найдено!');
                    }
                }

                emitEvent('autoEat:stop', {
                    username: bot.username,
                    currentHunger: bot.food
                });
            } catch (error) {
                log(`[AutoEat] Ошибка при попытке поесть: ${error.message}`);
            } finally {
                isEating = false;
            }
        }
    }

    bot.on('health', checkHunger);
    checkInterval = setInterval(checkHunger, 5000);

    bot.once('end', () => {
        bot.removeListener('health', checkHunger);
        if (checkInterval) clearInterval(checkInterval);
    });
};