// src/data.js

export const defaultData = {
    productionType: "film",
    metaDay: "СЪЕМОЧНЫЙ ДЕНЬ #04",
    metaProject: "Проект «Аврора» (Смена 12)",
    metaDate: "2026-10-28",
    metaVersion: "v1.9 Pro",
    generalCallTime: "07:30",
    generalCallDate: "2026-10-28",
    generalCallDesc: "Получение раций, инструктаж по ТБ, проверка пропусков на КПП",
    
    weatherTemp: "+7°C",
    weatherCondition: "Солнечно с плывущими объемными облаками",
    weatherWind: "6.9 м/с",
    weatherHumidity: "40%",
    weatherPressure: "761 мм",
    sunRise: "07:25",
    sunSet: "17:01",

    locationName: "Офис АНО «АртМастерс»",
    locationAddress: "Москва, улица Мясницкая, 17 стр. 1",
    locationMetro: "Метро «Лубянка» / «Чистые пруды»",
    locationBus: "Центр города",
    locationParking: "Парковка по предварительному заказу пропуска.",
    lat: 55.7618,
    lon: 37.6338,

    scenes: [
        { num: "12", ie: "ИНТ.", desc: "Главный холл — Ресепшн. Диалог героев.", time: "4/8", cast: "Актёр 1, Актёр 2" },
        { num: "14", ie: "НАТ.", desc: "Улица Мясницкая — Финал погони.", time: "2/8", cast: "Актёр 1, Каскадеры" }
    ],

    theaterScenes: [
        { act: "Акт I", scene: "Картина 1", desc: "Явление первое. Разговор в гостиной.", time: "15 мин", cast: "Артист А, Артист Б" }
    ],

    timeline: [
        { time: "07:00", event: "Заезд технического транспорта и охраны", responsible: "Транспортный цех", done: false },
        { time: "07:30", event: "Общий сбор группы и получение раций", responsible: "Второй режиссёр", done: false },
        { time: "08:00", event: "Начало работы светобазы и грима", responsible: "Осветители / Грим", done: false },
        { time: "09:00", event: "Мотор! Первая сменный кадр", responsible: "Режиссёр-постановщик", done: false }
    ],

    theaterTimeline: [
        { time: "10:00", event: "Монтировка декораций на сцене", responsible: "Завпост", done: false },
        { time: "12:00", event: "Общий сбор труппы", responsible: "Помощник режиссера", done: false }
    ],

    departments: [
        {
            name: "Режиссура / Производство",
            time: "07:00",
            ready: true,
            crew: [
                { role: "Режиссер-постановщик", name: "Иванов И. И.", phone: "+7 (999) 111-22-33" },
                { role: "Второй режиссер", name: "Петров П. П.", phone: "+7 (999) 222-33-44" }
            ]
        },
        {
            name: "Операторская группа",
            time: "07:00",
            ready: true,
            crew: [
                { role: "Оператор-постановщик", name: "Смирнов С. С.", phone: "+7 (999) 333-44-55" },
                { role: "Фокус-пуллер", name: "Ковалев К. К.", phone: "+7 (999) 444-55-66" }
            ]
        },
        {
            name: "Технический отдел / Свет",
            time: "06:30",
            ready: false,
            crew: [
                { role: "Гэфер (Бригадир осветителей)", name: "Зломанов О. В.", phone: "+7 (999) 555-66-77" }
            ]
        }
    ],

    theaterDepartments: [
        {
            name: "Мо монтировочный цех",
            time: "09:00",
            ready: true,
            crew: [
                { role: "Заведующий монтировочной частью", name: "Сидоров С. С.", phone: "+7 (999) 777-88-99" }
            ]
        }
    ],

    contacts: [
        { role: "Директор картины", name: "Володин Б. Б.", phone: "+7 (999) 000-00-01" },
        { role: "Линейный продюсер", name: "Арсеньева Е.", phone: "+7 (999) 000-00-02" },
        { role: "Менеджер локации", name: "Шанаева А.", phone: "+7 (999) 000-00-03" },
        { role: "Технический специалист", name: "Зломанов О.", phone: "+7 (999) 000-00-04" }
    ]
};

export const venuesDatabase = [
    { name: "Офис АНО «АртМастерс»", address: "Москва, улица Мясницкая, 17 стр. 1", metro: "Лубянка / Чистые пруды", bus: "Центр города", lat: 55.7618, lon: 37.6338 },
    { name: "Live Arena", address: "Московская область, Одинцовский городской округ, Новолажское шоссе", metro: "—", bus: "Автобус от м. Парк Победы", lat: 55.7150, lon: 37.3800 },
    { name: "XOVP Virtual Production Studio", address: "Москва, ул. Электрозаводская, 21", metro: "Электрозаводская", bus: "Наземный транспорт", lat: 55.7830, lon: 37.7050 },
    { name: "Электротеатр Станиславский", address: "Москва, Тверская ул., 23", metro: "Пушкинская / Тверская", bus: "Центр", lat: 55.7665, lon: 37.6035 }
];