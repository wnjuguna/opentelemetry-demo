// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildCoralogixRumInitOptions } from './initRum';
import type { RumRuntimeConfig } from './types';

const baseRuntimeConfig = (): RumRuntimeConfig => ({
  publicKey: 'rum-public-key',
  application: 'astronomy-shop-demo',
  environment: 'demo',
  version: '1.0.0',
  coralogixDomain: 'EU2',
  bugBlocking: false,
  bugNoisy: false,
  brokenAddToCart: false,
});

describe('buildCoralogixRumInitOptions', () => {
  it('enables traceparent header propagation via traceParentInHeader', () => {
    const options = buildCoralogixRumInitOptions(baseRuntimeConfig());

    assert.deepEqual(options.traceParentInHeader, { enabled: true });
  });

  it('keeps fetch and xhr instrumentations enabled', () => {
    const options = buildCoralogixRumInitOptions(baseRuntimeConfig());

    assert.equal(options.instrumentations?.fetch, true);
    assert.equal(options.instrumentations?.xhr, true);
  });

  it('includes user_context when userId is provided', () => {
    const options = buildCoralogixRumInitOptions(baseRuntimeConfig(), 'shopper-42');

    assert.deepEqual(options.user_context, {
      user_id: 'shopper-42',
      user_name: 'shopper-42',
    });
  });

  it('omits user_context when userId is not provided', () => {
    const options = buildCoralogixRumInitOptions(baseRuntimeConfig());

    assert.equal('user_context' in options, false);
  });

  it('includes coralogixDomainUrl only when configured', () => {
    const withCustomIngress = buildCoralogixRumInitOptions({
      ...baseRuntimeConfig(),
      coralogixDomainUrl: 'https://rum-proxy.example.com',
    });
    const withoutCustomIngress = buildCoralogixRumInitOptions(baseRuntimeConfig());

    assert.equal(withCustomIngress.coralogixDomainUrl, 'https://rum-proxy.example.com');
    assert.equal('coralogixDomainUrl' in withoutCustomIngress, false);
  });
});
