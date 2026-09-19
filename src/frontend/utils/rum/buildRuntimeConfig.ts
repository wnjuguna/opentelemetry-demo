// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

import type { RumRuntimeConfig } from './types';

const DEFAULT_APPLICATION = 'astronomy-shop-demo';
const DEFAULT_ENVIRONMENT = 'demo';
const DEFAULT_VERSION = '1.0.0';
const DEFAULT_CORALOGIX_DOMAIN = 'EU2';

const TRUTHY = new Set(['true', '1', 'yes', 'on']);

export const parseEnvBoolean = (value: string | undefined, defaultValue = false): boolean => {
  if (value === undefined || value.trim() === '') {
    return defaultValue;
  }

  return TRUTHY.has(value.trim().toLowerCase());
};

// Matches regional app/API hostnames and standard RUM ingress hostnames.
const REGION_HOST_RE =
  /^(?:https?:\/\/)?(?:ingress\.)?(eu1|eu2|us1|us2|us3|ap1|ap2|ap3)\.(?:rum-ingress-coralogix\.com|coralogix\.com)\/?$/i;
const STAGING_HOST_RE =
  /^(?:https?:\/\/)?(?:ingress\.)?staging\.(?:rum-ingress-coralogix\.com|coralogix\.com)\/?$/i;

export const resolveCoralogixDomain = (
  rawDomain: string | undefined
): Pick<RumRuntimeConfig, 'coralogixDomain' | 'coralogixDomainUrl'> => {
  const domain = (rawDomain ?? DEFAULT_CORALOGIX_DOMAIN).trim();

  if (!domain.includes('.')) {
    return { coralogixDomain: domain.toUpperCase() };
  }

  const regionMatch = domain.match(REGION_HOST_RE);
  if (regionMatch) {
    return { coralogixDomain: regionMatch[1].toUpperCase() };
  }

  if (STAGING_HOST_RE.test(domain)) {
    return { coralogixDomain: 'STAGING' };
  }

  const coralogixDomainUrl = domain.startsWith('http') ? domain.replace(/\/+$/, '') : `https://${domain.replace(/\/+$/, '')}`;
  return { coralogixDomain: DEFAULT_CORALOGIX_DOMAIN, coralogixDomainUrl };
};

export const buildRuntimeConfigFromEnv = (
  env: NodeJS.ProcessEnv | Record<string, string | undefined>
): RumRuntimeConfig => {
  const publicKey = env.CORALOGIX_RUM_PUBLIC_KEY?.trim() || env.CX_RUM_KEY?.trim() || undefined;
  const version = env.DEMO_RELEASE_VERSION?.trim() || env.RELEASE_VERSION?.trim() || DEFAULT_VERSION;
  const domainFields = resolveCoralogixDomain(env.CORALOGIX_DOMAIN);

  return {
    ...(publicKey ? { publicKey } : {}),
    application: env.CORALOGIX_RUM_APPLICATION?.trim() || DEFAULT_APPLICATION,
    environment: env.CORALOGIX_RUM_ENVIRONMENT?.trim() || DEFAULT_ENVIRONMENT,
    version,
    ...domainFields,
    bugBlocking: parseEnvBoolean(env.DEMO_BUG_BLOCKING, false),
    bugNoisy: parseEnvBoolean(env.DEMO_BUG_NOISY, false),
    brokenAddToCart: parseEnvBoolean(env.DEMO_BUG_BROKEN_ADD_TO_CART, false),
  };
};
