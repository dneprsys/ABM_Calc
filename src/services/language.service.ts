
import { Injectable, signal, computed } from '@angular/core';

export type Language = 'ru' | 'uk';

export const TRANSLATIONS = {
  ru: {
    common: { close: "Закрыть", save: "Сохранить", delete: "Удалить", cancel: "Отмена", yes: "Да", no: "Нет", edit: "Редактировать", download: "Скачать", details: "Подробнее", sort: "Сортировка" },
    header: { ref_manual: "Справочник оператора", send_report: "Отправить отчет", stats: "Статистика", history: "История", settings: "Настройки", create_part: "Создать деталь", admin: "Админка", cloud: "База Файлов", logout: "Выйти", shift_end: "Конец смены через" },
    nav: { timer: "Таймер", cloud: "Облако", ref: "Справка", report: "Отчет", stats: "Статы", hist: "История", settings: "Настр.", exit: "Выход", admin: "Админ" },
    filters: { all: "ВСЕ", work: "РАБОТА", idle: "ПРОСТОЙ", pause: "ПАУЗА", bar: "ПРУТОК", done: "ГОТОВО" },
    machine_card: {
      name_placeholder: "Название станка", part_placeholder: "Название детали...", mk_label: "МК", mk_placeholder: "Номер МК", measurements: "Замеры",
      start: "ЗАПУСК", pause: "ПАУЗА", continue: "ПРОДОЛЖИТЬ", bar_replaced: "ПРУТОК ЗАМЕНЕН", ready: "ГОТОВО",
      plan: "План", min: "Мин", sec: "Сек", material_consumption: "Расход материала", bar_end: "КОНЕЦ ПРУТКА",
      stock_len: "L ЗАГОТОВКИ", part_len: "L ДЕТАЛИ", cut_width: "припуск на back", rem: "Остаток",
      bar_time_auto: "Время на пруток (мин / авто)", parts_per_bar: "Дет. с прутка", bars_needed: "Прутков надо",
      reset_confirm: "Сбросить прогресс и настройки станка?", delete_confirm: "Удалить этот станок с панели? Это действие нельзя отменить.",
      enter_qty: "Введите количество!", enter_pause_reason: "Укажите причину паузы!", pause_reason_placeholder: "Укажите причину паузы (будет сохранено в отчет)...",
      time_per_part: "Время детали", bars_per_series: "Прутков на серию", end_series: "Конец серии",
      notification_on: "Уведомления ВКЛ", notification_off: "Уведомления ВЫКЛ", bar_rem_time: "Остаток времени прутка",
      last_check: "Посл.", reset_progress: "Сбросить прогресс", delete_machine: "Удалить станок",
      time_until_stop: "Время до следующей остановки станка", total_series_time: "Общее время серии",
      tab_general: "Основные", tab_material: "Материал",
      material_type: "Тип материала", diameter: "Диаметр (мм)"
    },
    history: {
      title: "История", export_xlsx: "Сохранить в формате *.xlsx", clear: "Очистить историю",
      clear_confirm: "Вы уверены, что хотите очистить всю историю? Это действие нельзя отменить.", no_data: "Нет данных для экспорта.",
      empty: "Записей не найдено.", filter_machine: "Все станки", filter_type: "Все события",
      sort_new: "Сначала новые", sort_old: "Сначала старые",
      event: { start: "Старт серии", pause: "Пауза", done: "Конец серии", check: "Замеры", bar: "Конец прутка", bar_reload: "Замена прутка", work: "Работа", info: "Инфо" },
      machine_prefix: "Станок"
    },
    settings: {
        title: "Настройки", language: "Язык (Language)", telegram_settings: "НАСТРОЙКИ TELEGRAM", launch_bot: "Запустить бота",
        telegram_instruction: "Как подключить: 1. Нажмите ссылку бота. 2. Нажмите 'Запустить' (Start). 3. Скопируйте полученный Chat ID и вставьте в поле ниже.",
        chat_id: "Chat ID", test_btn: "Тест", telegram_msgs: "Настройки сообщений в телеграме:",
        notifications_desktop: "Уведомления (Desktop)", machine_mgmt: "Управление станками", add_machine: "+ Добавить станок на дашборд",
        delete: "Удалить", delete_machine_confirm: "Удалить Станок #{{id}}? История и настройки этого станка будут потеряны.", save_btn: "Сохранить",
        events: { start: "Старт серии", done: "Конец серии", pause: "Пауза", bar: "Конец прутка", check: "Замеры (ОТК)", reminder: "Напоминание" }
    },
    checklist: {
        title: "Чек лист", mk_num: "№ МК", search_placeholder: "Название детали...", find_btn: "Найти в БД / Сгенерировать",
        table_no: "№", table_dim: "Размер", table_nominal: "Номинал", table_fact: "Факт",
        no_params: "Нет параметров для проверки. Введите название и нажмите поиск.", save_db: "Сохранить в БД",
        gen_error: "Не удалось создать чек-лист. Проверьте API Key.", last_check_time: "Время последнего замера",
        comment_placeholder: "Комментарий к замерам...", toggle_comment: "Добавить комментарий"
    },
    reference: {
        title: "Справочник оператора", tab_g: "G-Codes", tab_m: "M-Codes", tab_tol: "Допуски",
        tab_star: "Star 206", tab_tsugami: "Tsugami 206", tab_defects: "Дефекты",
        col_code: "Код", col_desc: "Описание", col_ex: "Пример", col_nom: "Номинал (мм)",
        col_val_h7: "Вал h7", col_hole_H7: "Отв. H7", col_val_g6: "Вал g6", col_val_k6: "Вал k6",
        col_val_h6: "Вал h6", col_val_f7: "Вал f7", col_val_m6: "Вал m6",
        col_common: "Общ. js14",
        col_prob: "Проблема", col_cause: "Возможная причина", col_sol: "Решение"
    },
    create_part: {
        title: "Создание новой детали", name_label: "Название детали", generate_name: "Сгенерировать название",
        add_param: "+ Добавить размер", save_download: "Сохранить и Скачать XLSX",
        save_cloud: "Сохранить в Облако",
        col_name: "Название размера", col_nom: "Номинал", col_tp: "Допуск (+)", col_tm: "Допуск (-)",
        err_name: "Введите название детали!", success: "Деталь сохранена в базу и скачана!", success_cloud: "Файл сохранен в Базу Данных!"
    },
    stats: { 
        title: "Статистика производства", 
        period: "Период", 
        total_parts: "Всего деталей", 
        est_material: "Расход (м)", 
        active_machine: "Топ станок", 
        daily_prod: "Выпуск по дням", 
        by_machine: "Загрузка по станкам", 
        downtime_reasons: "Причины простоев" 
    },
    auth: {
        login_title: "Вход в систему", register_title: "Регистрация", username: "Логин", password: "Пароль",
        btn_login: "Войти", btn_register: "Зарегистрироваться",
        to_register: "Нет аккаунта? Создать", to_login: "Есть аккаунт? Войти",
        err_login: "Неверный логин или пароль", err_exists: "Пользователь уже существует"
    },
    admin: {
        title: "Управление пользователями", user: "Пользователь", role: "Роль", actions: "Действия",
        make_admin: "Сделать Админом", make_user: "Сделать Оператором",
        integrations_tab: "Интеграции", users_tab: "Пользователи",
        docker_server: "Сервер Docker", docker_desc: "Подключение к внешнему Docker для управления контейнерами.",
        docker_host: "URL Хоста Docker", gdrive: "Google Drive", gdrive_desc: "Подключение Google Disk для автоматического бекапа.",
        api_token: "API Токен / Ключ", save_connections: "Сохранить подключения",
        last_login: "Посл. вход", ip: "IP адрес", tg_id: "Telegram ID"
    },
    cloud: {
        title: "База Файлов (Детали)", no_files: "Нет сохраненных файлов.",
        updated: "Обновлено", upload_btn: "Загрузить (XLSX/JSON)", create_btn: "Создать деталь",
        tab_all: "Все файлы", tab_user: "Мои файлы",
        upload_success: "Файл успешно загружен в БД!", upload_err: "Ошибка при чтении файла. Проверьте формат."
    },
    report: {
        title: "Генерация отчета", date_range: "Выберите период", start_date: "С", end_date: "По",
        generate_btn: "Сгенерировать и Отправить", sending: "Отправка..."
    },
    msg: {
        test_msg: "🔔 Тестове сообщение от CNC Master",
        sent_ok: "Сообщение отправлено!",
        sent_err: "Ошибка отправки. Проверьте Token и Chat ID.",
        report_sent: "Отчет отправлен!",
        confirm_report: "Отправить текущий отчет в Telegram?",
        qc_alert: "⚠️ <b>Произведи замеры детали!</b>\n\n⚙️ Станок #{{id}}\n🛠 Деталь: {{part}}\n📄 МК: {{mk}}",
        qc_browser_title: "ВРЕМЯ ЗАМЕРА", qc_browser_body: "Произведите контроль размеров детали!",
        start_browser_title: "Станок ЗАПУЩЕН", start_browser_body: "План: {{qty}} шт.",
        pause_browser_title: "Станок СНЯТ С ПАУЗЫ", pause_browser_body: "Причина была: {{reason}}",
        bar_browser_title: "КОНЕЦ ПРУТКА", bar_browser_body: "Замените материал!",
        done_browser_title: "Готово!", done_browser_body: "{{note}} ({{qty}} шт.) завершен.",
        
        tg_start: "🟢 <b>СТАРТ СЕРИИ: {{machine}}</b>\n📝 Деталь: {{note}}\n📄 МК: {{mk}}\n🧱 Материал: {{material}}\n📦 План серии: {{qty}} шт\n⏱ Цикл (шт): {{cycle}}\n🏁 Окончание: {{finish}}\n👤 Оператор: {{operator}}",
        
        tg_pause: "🟡 <b>ПАУЗА: {{machine}}</b>\n👤 Оператор: {{operator}}\n📝 Деталь: {{note}}\n📄 МК: {{mk}}\n⏱ Цикл (шт): {{cycle}}\n📦 Остаток серии: {{rem}} шт\n⏳ <b>Простой: {{duration}}</b>\n❓ Причина: {{reason}}",
        
        tg_done: "🏁 <b>ГОТОВО: {{machine}}</b>\n📝 {{note}}\n✅ Выполнено: {{qty}} шт",
        
        tg_bar: "🟠 <b>ПРУТОК: {{machine}}</b>\n📝 {{note}}\n⏱ Замените материал!",
        
        qc_title: "📏 <b>КОНТРОЛЬ КАЧЕСТВА (ОТК)</b>",
        qc_part: "🔩 Деталь", qc_mk: "📄 МК", qc_plan: "📊 План/Факт", qc_cycle: "⏱ Цикл", qc_finish: "🏁 Окончание", qc_res: "📋 <b>Результати замеров:</b>",
        
        tg_check: "📏 <b>ЗАМЕРЫ (ОТК): {{machine}}</b>\n👤 Контролер: {{operator}}\n📝 Деталь: {{note}}\n📄 МК: {{mk}}\n🧱 Материал: {{material}}\n⏳ До конца серии: {{timeLeft}}\n📦 Остаток (шт): {{rem}}\n\n📋 <b>Результати:</b>\n<pre>{{results}}</pre>{{comment}}",
        
        not_spec: "Не указана",
        report_title: "📊 Отчет CNC MASTER", all_stopped: "Все станки остановлены.", log_title: "📜 Лог событий за сегодня:", total_done: "✅ ИТОГО СДАНО", empty_hist: "История пуста."
    }
  },
  uk: {
    common: { close: "Закрити", save: "Зберегти", delete: "Видалити", cancel: "Скасувати", yes: "Так", no: "Ні", edit: "Редагувати", download: "Завантажити", details: "Детальніше", sort: "Сортування" },
    header: { ref_manual: "Довідник оператора", send_report: "Надіслати звіт", stats: "Статистика", history: "Історія", settings: "Налаштування", create_part: "Створити деталь", admin: "Адмінка", cloud: "База Файлів", logout: "Вийти", shift_end: "Кінець зміни через" },
    nav: { timer: "Таймер", cloud: "Хмара", ref: "Довідка", report: "Звіт", stats: "Стати", hist: "Історія", settings: "Налаш.", exit: "Вихід", admin: "Адмін" },
    filters: { all: "ВСІ", work: "РОБОТА", idle: "ПРОСТІЙ", pause: "ПАУЗА", bar: "ПРУТОК", done: "ГОТОВО" },
    machine_card: {
      name_placeholder: "Назва верстата", part_placeholder: "Назва деталі...", mk_label: "МК", mk_placeholder: "Номер МК", measurements: "Виміри",
      start: "ПУСК", pause: "ПАУЗА", continue: "ПРОДОВЖИТИ", bar_replaced: "ПРУТОК ЗАМІНЕНО", ready: "ГОТОВО",
      plan: "План", min: "Хв", sec: "Сек", material_consumption: "Витрата матеріалу", bar_end: "КІНЕЦЬ ПРУТКА",
      stock_len: "L ЗАГОТОВКИ", part_len: "L ДЕТАЛІ", cut_width: "припуск на back", rem: "Залишок",
      bar_time_auto: "Час на пруток (хв / авто)", parts_per_bar: "Дет. з прутка", bars_needed: "Прутків треба",
      reset_confirm: "Скинути прогрес та налаштування верстата?", delete_confirm: "Видалити цей верстат з панелі? Цю дію неможливо скасувати.",
      enter_qty: "Введіть кількість!", enter_pause_reason: "Вкажіть причину паузи!", pause_reason_placeholder: "Вкажіть причину паузи (буде збережено у звіт)...",
      time_per_part: "Час деталі", bars_per_series: "Прутків на серію", end_series: "Кінець серії",
      notification_on: "Сповіщення ВКЛ", notification_off: "Сповіщення ВИКЛ", bar_rem_time: "Залишок часу прутка",
      last_check: "Остан.", reset_progress: "Скинути прогрес", delete_machine: "Видалити верстат",
      time_until_stop: "Час до наступної зупинки верстата", total_series_time: "Загальний час серії",
      tab_general: "Основні", tab_material: "Матеріал",
      material_type: "Тип матеріалу", diameter: "Діаметр (мм)"
    },
    history: {
      title: "Історія", export_xlsx: "Зберегти у форматі *.xlsx", clear: "Очистити історію",
      clear_confirm: "Ви впевнені, що хочете очистити всю істою? Цю дію неможливо скасувати.", no_data: "Немає даних для експорту.",
      empty: "Записів не знайдено.", filter_machine: "Всі верстати", filter_type: "Всі події",
      sort_new: "Спочатку нові", sort_old: "Спочатку старі",
      event: { start: "Старт серії", pause: "Пауза", done: "Кінець серії", check: "Виміри", bar: "Кінець прутка", bar_reload: "Заміна прутка", work: "Робота", info: "Інфо" },
      machine_prefix: "Верстат"
    },
    settings: {
        title: "Налаштування", language: "Мова (Language)", telegram_settings: "НАЛАШТУВАННЯ TELEGRAM", launch_bot: "Запустити бота",
        telegram_instruction: "Як підключити: 1. Натисніть посилання бота. 2. Натисніть 'Розпочати' (Start). 3. Скопіюйте отриманий Chat ID і вставте в поле нижче.",
        chat_id: "Chat ID", test_btn: "Тест", telegram_msgs: "Налаштування повідомлень у Telegram:",
        notifications_desktop: "Сповіщення (Desktop)", machine_mgmt: "Керування верстатами", add_machine: "+ Додати верстат на дашборд",
        delete: "Удалить", delete_machine_confirm: "Видалити Верстат #{{id}}? Історія та налаштування цього верстата будуть втрачені.", save_btn: "Зберегти",
        events: { start: "Старт серії", done: "Конец серии", pause: "Пауза", bar: "Конец прутка", check: "Замеры (ОТК)", reminder: "Нагадування" }
    },
    checklist: {
        title: "Чек лист", mk_num: "№ МК", search_placeholder: "Назва деталі...", find_btn: "Знайти в БД / Сгенерировать",
        table_no: "№", table_dim: "Розмір", table_nominal: "Номінал", table_fact: "Факт",
        no_params: "Нет параметров для перевірки. Введіть назву та натисніть пошук.", save_db: "Зберегти в БД",
        gen_error: "Не вдалося створити чек-лист. Перевірте API Key.", last_check_time: "Час останнього виміру",
        comment_placeholder: "Коментар до вимірів...", toggle_comment: "Додати коментар"
    },
    reference: {
        title: "Довідник оператора", tab_g: "G-Codes", tab_m: "M-Codes", tab_tol: "Допуски",
        tab_star: "Star 206", tab_tsugami: "Tsugami 206", tab_defects: "Дефекты",
        col_code: "Код", col_desc: "Опис", col_ex: "Приклад", col_nom: "Номінал (мм)",
        col_val_h7: "Вал h7", col_hole_H7: "Отв. H7", col_val_g6: "Вал g6", col_val_k6: "Вал k6",
        col_val_h6: "Вал h6", col_val_f7: "Вал f7", col_val_m6: "Вал m6",
        col_common: "Заг. js14",
        col_prob: "Проблема", col_cause: "Можлива причина", col_sol: "Рішення"
    },
    create_part: {
        title: "Створення нової деталі", name_label: "Назва деталі", generate_name: "Згенерувати назву",
        add_param: "+ Додати розмір", save_download: "Зберегти та Завантажити XLSX",
        save_cloud: "Зберегти в Хмару (БД)",
        col_name: "Назва розміру", col_nom: "Номінал", col_tp: "Допуск (+)", col_tm: "Допуск (-)",
        err_name: "Введіть назву деталі!", success: "Деталь збережено в базу та завантажено!", success_cloud: "Файл збережено в Базу Даних!"
    },
    stats: { 
        title: "Статистика виробництва", 
        period: "Період", 
        total_parts: "Всього деталей", 
        est_material: "Витрата (м)", 
        active_machine: "Топ верстат", 
        daily_prod: "Випуск по днях", 
        by_machine: "Завантаження по верстатах", 
        downtime_reasons: "Причини простоїв" 
    },
    auth: {
        login_title: "Вхід у систему", register_title: "Реєстрація", username: "Логін", password: "Пароль",
        btn_login: "Увійти", btn_register: "Зареєструватися",
        to_register: "Немає акаунту? Створити", to_login: "Є акаунт? Увійти",
        err_login: "Невірний логін або пароль", err_exists: "Користувач вже існує"
    },
    admin: {
        title: "Керування користувачами", user: "Користувач", role: "Роль", actions: "Дії",
        make_admin: "Зробити Адміном", make_user: "Зробити Оператором",
        integrations_tab: "Інтеграції", users_tab: "Користувачі",
        docker_server: "Сервер Docker", docker_desc: "Підключення до зовнішнього Docker для керування контейнерами.",
        docker_host: "URL Хоста Docker", gdrive: "Google Drive", gdrive_desc: "Підключення Google Disk для автоматичного бекапу.",
        api_token: "API Токен / Ключ", save_connections: "Зберегти з'єднання",
        last_login: "Ост. вхід", ip: "IP адреса", tg_id: "Telegram ID"
    },
    cloud: {
        title: "База Файлів (Деталі)", no_files: "Немає збережених файлів.",
        updated: "Оновлено", upload_btn: "Завантажити (XLSX/JSON)", create_btn: "Створити деталь",
        tab_all: "Всі файли", tab_user: "Мои файлы",
        upload_success: "Файл успішно завантажено в БД!", upload_err: "Помилка при читанні файлу. Перевірте формат."
    },
    report: {
        title: "Генерація звіту", date_range: "Оберіть період", start_date: "З", end_date: "По",
        generate_btn: "Згенерувати та Надіслати", sending: "Відправка..."
    },
    msg: {
        test_msg: "🔔 Тестове повідомлення від CNC Master",
        sent_ok: "Повідомлення надіслано!",
        sent_err: "Помилка надсилання. Перевірте Token та Chat ID.",
        report_sent: "Звіт надіслано!",
        confirm_report: "Надіслати поточний звіт у Telegram?",
        qc_alert: "⚠️ <b>Зроби виміри деталі!</b>\n\n⚙️ Верстат #{{id}}\n🛠 Деталь: {{part}}\n📄 МК: {{mk}}",
        qc_browser_title: "ЧАС ВИМІРУ", qc_browser_body: "Зробіть контроль розмірів деталі!",
        start_browser_title: "Верстат ЗАПУЩЕНО", start_browser_body: "План: {{qty}} шт.",
        pause_browser_title: "Верстат ЗНЯТО З ПАУЗИ", pause_browser_body: "Причина була: {{reason}}",
        bar_browser_title: "КІНЕЦЬ ПРУТКА", bar_browser_body: "Замініть матеріал!",
        done_browser_title: "Готово!", done_browser_body: "{{note}} ({{qty}} шт.) завершено.",
        
        tg_start: "🟢 <b>СТАРТ СЕРІЇ: {{machine}}</b>\n📝 Деталь: {{note}}\n📄 МК: {{mk}}\n🧱 Матеріал: {{material}}\n📦 План серії: {{qty}} шт\n⏱ Цикл (шт): {{cycle}}\n🏁 Закінчення: {{finish}}\n👤 Оператор: {{operator}}",
        
        tg_pause: "🟡 <b>ПАУЗА: {{machine}}</b>\n👤 Оператор: {{operator}}\n📝 Деталь: {{note}}\n📄 МК: {{mk}}\n⏱ Цикл (шт): {{cycle}}\n📦 Залишок серії: {{rem}} шт\n⏳ <b>Простій: {{duration}}</b>\n❓ Причина: {{reason}}",
        
        tg_done: "🏁 <b>ГОТОВО: {{machine}}</b>\n📝 {{note}}\n✅ Виконано: {{qty}} шт",
        
        tg_bar: "🟠 <b>ПРУТОК: {{machine}}</b>\n📝 {{note}}\n⏱ Замініть матеріал!",
        
        qc_title: "📏 <b>КОНТРОЛЬ ЯКОСТІ (ОТК)</b>",
        qc_part: "🔩 Деталь", qc_mk: "📄 МК", qc_plan: "📊 План/Факт", qc_cycle: "⏱ Цикл", qc_finish: "🏁 Закінчення", qc_res: "📋 <b>Результати вимірів:</b>",
        
        tg_check: "📏 <b>ВИМІРИ (ОТК): {{machine}}</b>\n👤 Контролер: {{operator}}\n📝 Деталь: {{note}}\n📄 МК: {{mk}}\n🧱 Матеріал: {{material}}\n⏳ До кінця серії: {{timeLeft}}\n📦 Залишок (шт): {{rem}}\n\n📋 <b>Результати:</b>\n<pre>{{results}}</pre>{{comment}}",
        
        not_spec: "Не вказана",
        report_title: "📊 Звіт CNC MASTER", all_stopped: "Всі верстати зупинені.", log_title: "📜 Лог подій за сьогодні:", total_done: "✅ РАЗОМ ЗДАНО", empty_hist: "Історія порожня."
    }
  }
};

@Injectable({ providedIn: 'root' })
export class LanguageService {
  currentLang = signal<Language>('ru');
  t = computed(() => TRANSLATIONS[this.currentLang()]);

  setLanguage(lang: Language) {
    this.currentLang.set(lang);
    if(typeof document !== 'undefined') {
        document.documentElement.lang = lang;
    }
  }
}
