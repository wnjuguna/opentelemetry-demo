// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildRuntimeConfigFromEnv, parseEnvBoolean, resolveCoralogixDomain } from './buildRuntimeConfig';

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
});
