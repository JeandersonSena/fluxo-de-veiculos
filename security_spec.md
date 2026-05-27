# Security Specification: Grupo Fertipar Vehicle Dispatch Desk

## 1. Data Invariants
1. **Unchanged Key Values**: Any update on an order document must not tamper with `id`, `createdAt`, or `createdBy` fields.
2. **Key Type & Range Boundaries**: 
   - `plate` must be a high-contrast alphanumeric string of maximum length 15.
   - `weight` must be a positive float (`weight > 0 && weight <= 200.0`).
   - `status` must strictly be one of `['Draft', 'Waiting', 'Completed', 'Cancelled']`.
3. **Transition Locks**: An order with a status of `'Completed'` or `'Cancelled'` is in a terminal state and cannot be modified by standard users.
4. **Chronological Validity**: All timestamps written during creation/update must align with the server time (`request.time`).
5. **No Shadow Fields & ID Checking**: Malicious users cannot inject extra columns (no ghost fields) or use poisoned strings (junk-character paths) for document IDs.

---

## 2. The "Dirty Dozen" Payloads
Here are 12 malicious payloads designed to break the invariants of Identity, Integrity, or State.

### Payload 1: ID Spoofing (Create path variable mismatch)
```json
// Target path: /orders/ORD-MALICIOUS-999
{
  "id": "ORD-GENUINE-100", // Mismatch between payload id and path variable
  "plate": "BRA2E19",
  "driverName": "Hacker Bob",
  ...
}
```

### Payload 2: Negative Weight Injection
```json
{
  "weight": -10.5, // Negative weight bypassing physical laws
  "plate": "BRA2E19",
  ...
}
```

### Payload 3: Obscene Weight Exhaustion (Denial-of-Wallet / Storage Attack)
```json
{
  "weight": 99999.0, // Weight exceeding maximum capacity of 200 t
  "plate": "BRA2E19",
  ...
}
```

### Payload 4: Invalid Status Transition Skipping Status Pipeline
```json
{
  "status": "Completed", // Trying to bypass Draft/Waiting gating physical weighing verification
  ...
}
```

### Payload 5: Terminal State Shortcircuiting (Modifying a Completed Order)
```json
// Target existing order with status "Completed"
{
  "weight": 55.0, // Attempting to change weight of a finalized truck payload
  ...
}
```

### Payload 6: Ghost Field Tampering (Shadow Update)
```json
{
  "isApproved": true, // Unauthorized ghost field trying to unlock weighing gate directly
  ...
}
```

### Payload 7: Identity Hijacking (Forging createdBy User)
```json
{
  "createdBy": "Gerente de Logística Geral", // Spoofing identity of a system administrator
  ...
}
```

### Payload 8: Future Timestamp Forgery
```json
{
  "createdAt": "2030-12-31T23:59:59Z", // Client forging a future system timestamp
  ...
}
```

### Payload 9: Invalid Character ID Poisoning
```json
// Target path: /orders/ORD_$$$_MALICIOUS_###
{
  "id": "ORD_$$$_MALICIOUS_###", // Junk symbols matching ID Poisoning attempt
  ...
}
```

### Payload 10: Private PII Retrieval
```json
// Attempting to read direct private configuration doc as non-admin authenticated client
```

### Payload 11: Oversized Plate Injection
```json
{
  "plate": "LONG_LICENSE_PLATE_EXCEED_SIZE_LIMITATION_TRUCK", // > 15 byte plate
  ...
}
```

### Payload 12: Bypassing Immutable Creation Date
```json
// Update payload on existing order
{
  "createdAt": "2026-05-01T00:00:00Z" // Trying to rewrite history
}
```

---

## 3. The Test Runner (`firestore.rules.test.ts`)
```typescript
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc } from 'firebase/firestore';

describe('Fertipar Firestore Security Rules', () => {
  let testEnv: any;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'lunar-geode-h8gvj',
      firestore: {
        host: 'localhost',
        port: 8080,
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  it('Payload 1 (ID Mismatch) should be rejected', async () => {
    const context = testEnv.authenticatedContext('bob_triador');
    const db = context.firestore();
    const docRef = doc(db, 'orders', 'ORD-MALICIOUS-999');
    await assertFails(setDoc(docRef, {
      id: 'ORD-GENUINE-100',
      plate: 'BRA2E19',
      driverName: 'Robert Carlos',
      cargoType: 'Ureia',
      weight: 32.5,
      carrier: 'Empresa',
      priority: 'normal',
      urgent: false,
      status: 'Draft',
      protocols: [],
      timeline: [],
      createdAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
      createdBy: 'Logistica'
    }));
  });

  it('Payload 2 (Negative Weight) should be rejected', async () => {
    const context = testEnv.authenticatedContext('bob_triador');
    const db = context.firestore();
    const docRef = doc(db, 'orders', 'ORD-2026-002');
    await assertFails(setDoc(docRef, {
      id: 'ORD-2026-002',
      plate: 'BRA2E19',
      driverName: 'Robert Carlos',
      cargoType: 'Ureia',
      weight: -10.0,
      carrier: 'Empresa',
      priority: 'normal',
      urgent: false,
      status: 'Draft',
      protocols: [],
      timeline: [],
      createdAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
      createdBy: 'Logistica'
    }));
  });

  it('Payload 3 (Oversized Weight) should be rejected', async () => {
    const context = testEnv.authenticatedContext('bob_triador');
    const db = context.firestore();
    const docRef = doc(db, 'orders', 'ORD-2026-003');
    await assertFails(setDoc(docRef, {
      id: 'ORD-2026-003',
      plate: 'BRA2E19',
      driverName: 'Robert Carlos',
      cargoType: 'Ureia',
      weight: 9999.0,
      carrier: 'Empresa',
      priority: 'normal',
      urgent: false,
      status: 'Draft',
      protocols: [],
      timeline: [],
      createdAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
      createdBy: 'Logistica'
    }));
  });
});
```
