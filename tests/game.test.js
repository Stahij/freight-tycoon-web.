import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, acceptContract, advanceDay, repairTruck, saveState, loadState, estimateTripCosts, INITIAL_CASH } from '../src/game.js';

test('new game starts with documented initial cash and available resources', () => {
  const state=createInitialState(); assert.equal(state.cash,INITIAL_CASH); assert.equal(state.trucks.length,1); assert.equal(state.drivers.length,1); assert.equal(state.offers.filter(x=>x.status==='Доступен').length,5);
});
test('cost estimate is deterministic and non-negative',()=>{assert.deepEqual(estimateTripCosts({distanceKm:500}),{fuel:210,wear:60,total:270});});
test('accepting an available contract assigns a truck and driver without mutating original state',()=>{const initial=createInitialState();const result=acceptContract(initial,'ct-north');assert.equal(result.ok,true);assert.equal(initial.trips.length,0);assert.equal(result.state.trips.length,1);assert.equal(result.state.trucks[0].status,'В рейсе');assert.equal(result.state.drivers[0].status,'В рейсе');});
test('same contract cannot be accepted twice and missing resources are handled',()=>{const initial=createInitialState();const first=acceptContract(initial,'ct-north');const second=acceptContract(first.state,'ct-local');assert.equal(second.ok,false);assert.match(second.error,/свободного/);});
test('advancing days moves a trip, charges expenses and eventually pays the contract',()=>{let state=createInitialState();state=acceptContract(state,'ct-north').state;const before=state.cash;state=advanceDay(state);assert.equal(state.trips[0].status,'Завершён');assert.equal(state.offers.find(x=>x.id==='ct-north').status,'Завершён');assert.ok(state.cash<before+950);assert.ok(state.ledger.some(x=>x.type==='Оплата контракта'));assert.equal(state.trucks[0].status,'Свободен');});
test('save/load round trip preserves core state',()=>{const state=advanceDay(acceptContract(createInitialState(),'ct-north').state);const loaded=loadState(saveState(state));assert.equal(loaded.cash,state.cash);assert.deepEqual(loaded.trips,state.trips);assert.deepEqual(loaded.ledger,state.ledger);});
test('invalid save version is rejected',()=>{assert.throws(()=>loadState(JSON.stringify({version:99,cash:1,trucks:[],offers:[],ledger:[]})),/повреждено/);});
test('repair charges money and restores condition',()=>{let state=createInitialState();state.trucks[0].condition=80;const result=repairTruck(state,'truck-1');assert.equal(result.ok,true);assert.equal(result.state.trucks[0].condition,100);assert.equal(result.state.cash,state.cash-360);});
test('ledger operations reconcile to the current balance',()=>{let state=createInitialState();state=acceptContract(state,'ct-north').state;state=advanceDay(state);const sum=state.ledger.reduce((total,entry)=>total+entry.amount,0);assert.equal(Math.round(sum*100)/100,state.cash);});
