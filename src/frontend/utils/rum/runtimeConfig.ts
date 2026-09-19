// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

import type { RumRuntimeConfig } from './types';

let cachedConfig: RumRuntimeConfig | null = null;
let inflight: Promise<RumRuntimeConfig> | null = null;

const defaultConfig = (): RumRuntimeConfig => ({
  application: 'astronomy-shop-demo',
  environment: 'demo',
  version: '1.0.0',
  coralogixDomain: 'EU2',
  bugBlocking: false,
  bugNoisy: false,
  brokenAddToCart: false,
});

export const fetchRuntimeConfig = async (): Promise<RumRuntimeConfig> => {
  if (typeof window === 'undefined') {
    return defaultConfig();
  }

  if (cachedConfig) {
    return cachedConfig;
  }

  if (!inflight) {
    inflight = fetch('/api/runtime-config', { cache: 'no-store' })
      .then(async response => {
        if (!response.ok) {
          return defaultConfig();
        }

        return (await response.json()) as RumRuntimeConfig;
      })
      .catch(() => defaultConfig())
      .then(config => {
        cachedConfig = config;
        return config;
      })
      .finally(() => {
        inflight = null;
      });
  }

  return inflight;
};

export const resetRuntimeConfigCache = (): void => {
  cachedConfig = null;
  inflight = null;
};
