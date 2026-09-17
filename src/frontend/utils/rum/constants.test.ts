// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEMO_MILESTONES, PRODUCT_LABELS, isDemoMilestone, isProductLabel } from './constants';

describe('RUM demo constants', () => {
  it('defines exactly the five requested product labels', () => {
    assert.deepEqual([...PRODUCT_LABELS], [
      'checkout',
      'cart',
      'product-detail',
      'order-confirmation',
      'home',
    ]);
  });

  it('defines checkout funnel milestones in order', () => {
    assert.deepEqual([...DEMO_MILESTONES], [
      'checkout_started',
      'checkout_completed',
      'payment_completed',
    ]);
    assert.equal(isDemoMilestone('checkout_completed'), true);
    assert.equal(isDemoMilestone('browse'), false);
    assert.equal(isDemoMilestone('browse_started'), false);
  });

  it('validates product labels', () => {
    assert.equal(isProductLabel('checkout'), true);
    assert.equal(isProductLabel('unknown'), false);
  });
});
