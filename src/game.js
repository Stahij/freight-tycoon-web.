export const INITIAL_CASH = 10_000;
export const DAILY_DRIVER_WAGE = 120;
export const FUEL_COST_PER_KM = 0.42;
export const WEAR_COST_PER_KM = 0.12;

export const CONTRACT_TEMPLATES = [
  { id: 'ct-north', origin: 'Рудный', destination: 'Костанай', distanceKm: 120, reward: 950, cargo: 'Продукты', deadlineDays: 2, risk: 'Низкий' },
  { id: 'ct-east', origin: 'Костанай', destination: 'Петропавловск', distanceKm: 500, reward: 3_200, cargo: 'Стройматериалы', deadlineDays: 4, risk: 'Средний' },
  { id: 'ct-south', origin: 'Рудный', destination: 'Астана', distanceKm: 650, reward: 4_400, cargo: 'Оборудование', deadlineDays: 5, risk: 'Средний' },
  { id: 'ct-west', origin: 'Костанай', destination: 'Актобе', distanceKm: 780, reward: 5_000, cargo: 'Промышленный груз', deadlineDays: 6, risk: 'Высокий' },
  { id: 'ct-local', origin: 'Рудный', destination: 'Лисаковск', distanceKm: 95, reward: 720, cargo: 'Паллеты', deadlineDays: 2, risk: 'Низкий' }
];

const clone = (value) => JSON.parse(JSON.stringify(value));

export function createInitialState() {
  return {
    version: 1, day: 1, cash: INITIAL_CASH, companyName: 'Northern Freight', reputation: 50,
    trucks: [{ id: 'truck-1', name: 'Volga 480', model: 'Тягач класса A', condition: 100, status: 'Свободен', location: 'Рудный', maxKmPerDay: 450 }],
    drivers: [{ id: 'driver-1', name: 'Алексей Волков', skill: 62, fatigue: 10, status: 'Свободен', assignedTruckId: null }],
    offers: CONTRACT_TEMPLATES.map((c) => ({ ...c, status: 'Доступен' })),
    trips: [], ledger: [{ id: 'tx-1', day: 1, type: 'Стартовый капитал', amount: INITIAL_CASH, note: 'Начало игры' }],
    nextId: 2, message: 'Компания готова к работе. Выберите контракт и отправьте первый груз.'
  };
}

function recordMoney(state, amount, type, note) {
  if (!Number.isFinite(amount)) throw new Error('Некорректная денежная операция');
  state.cash = Math.round((state.cash + amount) * 100) / 100;
  state.ledger.unshift({ id: `tx-${state.nextId++}`, day: state.day, type, amount, note });
}

export function estimateTripCosts(contract) {
  const fuel = Math.round(contract.distanceKm * FUEL_COST_PER_KM);
  const wear = Math.round(contract.distanceKm * WEAR_COST_PER_KM);
  return { fuel, wear, total: fuel + wear };
}

export function acceptContract(state, contractId) {
  const next = clone(state);
  const contract = next.offers.find((item) => item.id === contractId && item.status === 'Доступен');
  const truck = next.trucks.find((item) => item.status === 'Свободен' && item.condition > 0);
  const driver = next.drivers.find((item) => item.status === 'Свободен' && item.fatigue < 85);
  if (!contract) return { ok: false, state, error: 'Этот контракт уже недоступен.' };
  if (!truck || !driver) return { ok: false, state, error: 'Нет свободного исправного тягача или отдохнувшего водителя.' };
  const costs = estimateTripCosts(contract);
  if (next.cash < costs.fuel) return { ok: false, state, error: 'Недостаточно денег даже на расчётное топливо.' };
  contract.status = 'В рейсе'; truck.status = 'В рейсе'; driver.status = 'В рейсе'; driver.assignedTruckId = truck.id;
  next.trips.push({ id: `trip-${next.nextId++}`, contractId: contract.id, truckId: truck.id, driverId: driver.id, distanceKm: contract.distanceKm, remainingKm: contract.distanceKm, reward: contract.reward, deadlineDay: next.day + contract.deadlineDays, costs, status: 'В пути' });
  next.message = `Рейс ${contract.origin} → ${contract.destination} начат.`;
  return { ok: true, state: next };
}

export function advanceDay(state) {
  const next = clone(state); next.day += 1;
  for (const trip of next.trips.filter((item) => item.status === 'В пути')) {
    const truck = next.trucks.find((item) => item.id === trip.truckId);
    const driver = next.drivers.find((item) => item.id === trip.driverId);
    const contract = next.offers.find((item) => item.id === trip.contractId);
    const travelled = Math.min(trip.remainingKm, truck.maxKmPerDay);
    trip.remainingKm -= travelled; driver.fatigue = Math.min(100, driver.fatigue + travelled / 45);
    truck.condition = Math.max(0, truck.condition - travelled * 0.015);
    recordMoney(next, -Math.round(travelled * (FUEL_COST_PER_KM + WEAR_COST_PER_KM)), 'Расходы рейса', `${contract.origin} → ${contract.destination}: ${travelled} км`);
    if (trip.remainingKm <= 0) {
      const late = next.day > trip.deadlineDay;
      const damagePenalty = Math.round(trip.reward * (100 - truck.condition) / 1000);
      const payout = Math.max(0, trip.reward - (late ? Math.round(trip.reward * 0.15) : 0) - damagePenalty);
      recordMoney(next, payout, late ? 'Выплата со штрафом' : 'Оплата контракта', `${contract.origin} → ${contract.destination}`);
      contract.status = 'Завершён'; trip.status = 'Завершён'; truck.status = 'Свободен'; truck.location = contract.destination;
      driver.status = 'Свободен'; driver.assignedTruckId = null; driver.fatigue = Math.min(100, driver.fatigue + 8);
      next.reputation = Math.max(0, Math.min(100, next.reputation + (late ? -3 : 2)));
      next.message = late ? 'Рейс завершён с опозданием: применён штраф.' : 'Рейс успешно завершён. Выплата зачислена.';
    }
  }
  for (const driver of next.drivers) {
    recordMoney(next, -DAILY_DRIVER_WAGE, 'Зарплата', `Зарплата: ${driver.name}`);
    if (driver.status === 'Свободен') driver.fatigue = Math.max(0, driver.fatigue - 18);
  }
  for (const offer of next.offers) if (offer.status === 'Доступен' && next.day > 1 + offer.deadlineDays) offer.status = 'Истёк';
  if (next.cash < 0) next.message = 'Внимание: баланс отрицательный. Сократите расходы или возьмите прибыльный контракт.';
  return next;
}

export function repairTruck(state, truckId) {
  const next = clone(state); const truck = next.trucks.find((item) => item.id === truckId);
  if (!truck) return { ok: false, state, error: 'Тягач не найден.' };
  if (truck.status !== 'Свободен') return { ok: false, state, error: 'Ремонт возможен только для свободного тягача.' };
  const missing = 100 - truck.condition;
  if (missing <= 0) return { ok: false, state, error: 'Тягач уже полностью исправен.' };
  const cost = Math.ceil(missing * 18);
  if (next.cash < cost) return { ok: false, state, error: `На ремонт нужно ${cost.toLocaleString('ru-RU')} ₸.` };
  truck.condition = 100; recordMoney(next, -cost, 'Ремонт', `${truck.name}: восстановление до 100%`);
  next.message = `Тягач отремонтирован за ${cost.toLocaleString('ru-RU')} ₸.`;
  return { ok: true, state: next };
}

export function saveState(state) { return JSON.stringify(state); }
export function loadState(serialized) {
  const parsed = JSON.parse(serialized);
  if (parsed?.version !== 1 || !Number.isFinite(parsed.cash) || !Array.isArray(parsed.trucks) || !Array.isArray(parsed.offers) || !Array.isArray(parsed.ledger)) throw new Error('Сохранение повреждено или имеет неподдерживаемую версию.');
  return parsed;
}