import assert from "node:assert/strict";
import test from "node:test";
import {
  OTHER_CUSTOMER,
  STARTER_CUSTOMERS,
  findCustomer,
  parseCustomerList,
  rememberCustomer,
} from "./customers";

test("starter builders match the company customer list", () => {
  assert.equal(STARTER_CUSTOMERS.length, 34);
  assert.ok(findCustomer(STARTER_CUSTOMERS, "D.R. Horton Inc."));
  assert.ok(findCustomer(STARTER_CUSTOMERS, "lennar atlanta"));
  assert.equal(STARTER_CUSTOMERS.at(-1)?.name, OTHER_CUSTOMER);
});

test("rememberCustomer adds a typed name once", () => {
  const once = rememberCustomer(STARTER_CUSTOMERS, "  New Builder Co  ");
  assert.equal(once.length, STARTER_CUSTOMERS.length + 1);
  assert.ok(findCustomer(once, "New Builder Co"));
  const twice = rememberCustomer(once, "new builder co");
  assert.equal(twice.length, once.length);
});

test("paste builder names one per line", () => {
  const parsed = parseCustomerList("Builders\nAdams Homes\n- New Custom\nAdams Homes");
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].name, "Adams Homes");
  assert.equal(parsed[1].name, "New Custom");
});
