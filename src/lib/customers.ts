export interface Customer {
  id: string;
  name: string;
}

export const OTHER_CUSTOMER = "Other / Custom Builder";

const STARTER_NAMES = [
  "Adams Homes",
  "America's Home Place",
  "Anker Homes",
  "Ashton Woods Homes",
  "Beazer Homes",
  "Brown Haven Homes",
  "Century Communities",
  "Chafin Communities",
  "D.R. Horton Inc.",
  "Davidson Homes",
  "DRB Homes",
  "Dream Finders Homes",
  "Edward Andrews Homes",
  "EMC Homes",
  "Empire Communities",
  "Fischer Homes",
  "Jim Chapman Construction Group",
  "Knight Homes",
  "Lennar Atlanta",
  "McCar Homes",
  "Meritage Homes",
  "Paran Homes",
  "Pulte Homes",
  "Reliant Homes",
  "Rocklyn Homes",
  "Smith Douglas Homes",
  "Southern Luxury Homes",
  "Stanley Martin Homes",
  "Taylor Morrison",
  "The Providence Group",
  "Toll Brothers",
  "Traton Homes",
  "Waters Edge Group",
];

export function newCustomerId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `cust-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const STARTER_CUSTOMERS: Customer[] = STARTER_NAMES.map((name) => ({
  id: `cust-${name}`,
  name,
}));

export function emptyCustomer(partial: Partial<Customer> = {}): Customer {
  return {
    id: newCustomerId(),
    name: "",
    ...partial,
  };
}

export function isPlaceholderBuilder(name: string): boolean {
  return name.trim().toLowerCase() === OTHER_CUSTOMER.toLowerCase();
}

export function ensureCustomerIds(
  customers: Array<Partial<Customer> & { name?: string }>,
): Customer[] {
  const seen = new Set<string>();
  return sortCustomers(
    customers
      .filter((item) => !isPlaceholderBuilder(String(item.name || "")))
      .map((item, index) => {
        const name = String(item.name || "").trim();
        if (item.id && !seen.has(item.id)) {
          seen.add(item.id);
          return { id: item.id, name };
        }
        const fromName = name ? `cust-${name}` : `cust-new-${index}`;
        let id = fromName;
        let n = 2;
        while (seen.has(id)) id = `${fromName}-${n++}`;
        seen.add(id);
        return { id, name };
      }),
  );
}

export function sortCustomers(customers: Customer[]): Customer[] {
  return [...customers].sort((a, b) => {
    const left = a.name.trim();
    const right = b.name.trim();
    if (!left && !right) return 0;
    if (!left) return 1;
    if (!right) return -1;
    return left.localeCompare(right, undefined, { sensitivity: "base" });
  });
}

export function findCustomer(
  customers: Customer[],
  name: string,
): Customer | undefined {
  const needle = name.trim().toLowerCase();
  if (!needle) return undefined;
  return customers.find((item) => item.name.trim().toLowerCase() === needle);
}

/** Add a typed builder name if it is not already on the list. */
export function rememberCustomer(
  customers: Customer[],
  name: string,
): Customer[] {
  const trimmed = name.trim();
  if (!trimmed || isPlaceholderBuilder(trimmed)) return customers;
  if (findCustomer(customers, trimmed)) return customers;
  return sortCustomers([...customers, emptyCustomer({ name: trimmed })]);
}

export function parseCustomerList(text: string): Customer[] {
  const names = text
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter((line) => line && !/^customers?\b/i.test(line) && !/^builders?\b/i.test(line));
  const unique: Customer[] = [];
  for (const name of names) {
    if (isPlaceholderBuilder(name) || findCustomer(unique, name)) continue;
    unique.push(emptyCustomer({ name }));
  }
  return sortCustomers(unique);
}
