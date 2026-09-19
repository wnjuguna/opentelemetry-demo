// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import { buildRuntimeConfigFromEnv, parseEnvBoolean, resolveCoralogixDomain } from './buildRuntimeConfig';
import {
  BROKEN_ADD_TO_CART_PRODUCT_IDS,
  captureBrokenAddToCartError,
  isBrokenAddToCartProductId,
} from './events';
import { markRumReady, resetRumQueue, setRumExecutorForTests } from './rumQueue';

describe('parseEnvBoolean', () => {
  it('returns default for empty values', () => {
    assert.equal(parseEnvBoolean(undefined, false), false);
    assert.equal(parseEnvBoolean('', true), true);
  });

  it('parses truthy strings', () => {
    assert.equal(parseEnvBoolean('true'), true);
    assert.equal(parseEnvBoolean('YES'), true);
    assert.equal(parseEnvBoolean('1'), true);
  });

  it('parses falsy strings', () => {
    assert.equal(parseEnvBoolean('false'), false);
    assert.equal(parseEnvBoolean('0'), false);
  });
});

describe('resolveCoralogixDomain', () => {
  it('defaults to EU2 region code', () => {
    assert.deepEqual(resolveCoralogixDomain(undefined), { coralogixDomain: 'EU2' });
  });

  it('normalizes region codes', () => {
    assert.deepEqual(resolveCoralogixDomain('eu2'), { coralogixDomain: 'EU2' });
  });

  it('maps regional hostnames to SDK region codes', () => {
    assert.deepEqual(resolveCoralogixDomain('eu2.coralogix.com'), { coralogixDomain: 'EU2' });
    assert.deepEqual(resolveCoralogixDomain('https://ingress.eu2.rum-ingress-coralogix.com'), {
      coralogixDomain: 'EU2',
    });
  });

  it('uses coralogixDomainUrl only for custom RUM ingress endpoints', () => {
    assert.deepEqual(resolveCoralogixDomain('https://rum-proxy.example.com'), {
      coralogixDomain: 'EU2',
      coralogixDomainUrl: 'https://rum-proxy.example.com',
    });
  });
});

describe('buildRuntimeConfigFromEnv', () => {
  it('uses locked demo defaults without secrets', () => {
    assert.deepEqual(buildRuntimeConfigFromEnv({}), {
      application: 'astronomy-shop-demo',
      environment: 'demo',
      version: '1.0.0',
      coralogixDomain: 'EU2',
      bugBlocking: false,
      bugNoisy: false,
      brokenAddToCart: false,
    });
  });

  it('reads server-side env at request time', () => {
    const config = buildRuntimeConfigFromEnv({
      CORALOGIX_RUM_PUBLIC_KEY: 'rum-public-key',
      DEMO_RELEASE_VERSION: '1.1.0-buggy',
      CORALOGIX_DOMAIN: 'eu2.coralogix.com',
      DEMO_BUG_BLOCKING: 'true',
      DEMO_BUG_NOISY: '1',
    });

    assert.equal(config.publicKey, 'rum-public-key');
    assert.equal(config.version, '1.1.0-buggy');
    assert.equal(config.coralogixDomain, 'EU2');
    assert.equal(config.coralogixDomainUrl, undefined);
    assert.equal(config.bugBlocking, true);
    assert.equal(config.bugNoisy, true);
  });

  it('accepts CX_RUM_KEY alias', () => {
    const config = buildRuntimeConfigFromEnv({ CX_RUM_KEY: 'alias-key' });
    assert.equal(config.publicKey, 'alias-key');
  });

  it('defaults brokenAddToCart off for clean 1.0.0', () => {
    const config = buildRuntimeConfigFromEnv({});
    assert.equal(config.version, '1.0.0');
    assert.equal(config.brokenAddToCart, false);
  });

  it('reads DEMO_BUG_BROKEN_ADD_TO_CART truthy values as on', () => {
    for (const value of ['true', '1', 'yes', 'on', 'YES', 'ON']) {
      assert.equal(
        buildRuntimeConfigFromEnv({ DEMO_BUG_BROKEN_ADD_TO_CART: value }).brokenAddToCart,
        true,
        value
      );
    }
  });
});

describe('broken add to cart demo SKUs and RUM', () => {
  const originalWindow = globalThis.window;

  beforeEach(() => {
    resetRumQueue();
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {},
    });
  });

  afterEach(() => {
    resetRumQueue();
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: originalWindow,
    });
  });

  it('lists exactly the two affected Astronomy Shop SKUs', () => {
    assert.deepEqual([...BROKEN_ADD_TO_CART_PRODUCT_IDS], ['66VCHSJNUP', '9SIQT8TOJO']);
    assert.equal(isBrokenAddToCartProductId('66VCHSJNUP'), true);
    assert.equal(isBrokenAddToCartProductId('9SIQT8TOJO'), true);
    assert.equal(isBrokenAddToCartProductId('OLJCESPC7Z'), false);
    assert.equal(isBrokenAddToCartProductId('2ZYFJ3GM2N'), false);
  });

  it('captures broken add to cart errors with expected RUM labels', () => {
    const captureError = mock.fn();
    setRumExecutorForTests({ setLabels: mock.fn(), info: mock.fn(), captureError });

    captureBrokenAddToCartError(new Error('add to cart failed'), '66VCHSJNUP');
    markRumReady();

    assert.equal(captureError.mock.callCount(), 1);
    assert.deepEqual(captureError.mock.calls[0]?.arguments[1], { product: 'product-detail' });
    assert.deepEqual(captureError.mock.calls[0]?.arguments[2], {
      product: 'product-detail',
      demo_bug: 'broken-add-to-cart',
      business_impact: 'medium',
      'demo.product.id': '66VCHSJNUP',
    });
  });
});
