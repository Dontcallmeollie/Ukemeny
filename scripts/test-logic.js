import {
  mergeAmounts,
  getExpiryInfo,
  estimateDefaultShelfLifeDays,
  addDaysToDate,
  formatDateToISO
} from '../src/utils/unitConverter.ts';

let failed = 0;
function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    failed++;
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

console.log('--- Testing Unit Converter & Merge Amounts ---');

const merge1 = mergeAmounts(200, 'g', 300, 'g');
assert(merge1?.amount === 500 && merge1?.unit === 'g', '200g + 300g = 500g');

const merge2 = mergeAmounts(500, 'g', 1, 'kg');
assert(merge2?.amount === 1.5 && merge2?.unit === 'kg', '500g + 1kg = 1.5kg');

const merge3 = mergeAmounts(4, 'dl', 1, 'l');
assert(merge3?.amount === 1.4 && merge3?.unit === 'l', '4dl + 1l = 1.4l');

console.log('\n--- Testing Expiration Info ---');

const today = new Date();
const todayStr = formatDateToISO(today);
const in2Days = addDaysToDate(today, 2);
const in10Days = addDaysToDate(today, 10);
const yesterday = addDaysToDate(today, -1);

const expToday = getExpiryInfo(todayStr);
assert(expToday.status === 'expired' && expToday.daysRemaining === 0, 'Today expiry marked as expired (0 days)');

const expIn2 = getExpiryInfo(in2Days);
assert(expIn2.status === 'warning' && expIn2.daysRemaining === 2, '2 days expiry marked as warning');

const expIn10 = getExpiryInfo(in10Days);
assert(expIn10.status === 'ok' && expIn10.daysRemaining === 10, '10 days expiry marked as ok');

const expPast = getExpiryInfo(yesterday);
assert(expPast.status === 'expired' && expPast.daysRemaining === -1, 'Past expiry marked as expired (-1 days)');

console.log('\n--- Testing Default Shelf Life Estimation ---');

assert(estimateDefaultShelfLifeDays('Kjøttdeig') === 4, 'Meat defaults to 4 days');
assert(estimateDefaultShelfLifeDays('Matfløte') === 8, 'Dairy cream defaults to 8 days');
assert(estimateDefaultShelfLifeDays('Agurk') === 5, 'Fresh cucumber defaults to 5 days');
assert(estimateDefaultShelfLifeDays('Spagetti') === 180, 'Pasta defaults to 180 days');

if (failed === 0) {
  console.log('\n🎉 ALL LOGIC TESTS PASSED!');
  process.exit(0);
} else {
  console.error(`\n💥 ${failed} tests failed!`);
  process.exit(1);
}
