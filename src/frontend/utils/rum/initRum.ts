// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

import { CoralogixRum } from '@coralogix/browser';
import type { CoralogixDomain } from '@coralogix/browser';
import { markRumReady, markRumUnavailable } from './rumQueue';
import { fetchRuntimeConfig } from './runtimeConfig';
import type { RumRuntimeConfig } from './types';

let initStarted = false;

export const buildCoralogixRumInitOptions = (config: RumRuntimeConfig, userId?: string) => ({
  public_key: config.publicKey,
  application: config.application,
  environment: config.environment,
  version: config.version,
  coralogixDomain: config.coralogixDomain as CoralogixDomain,
  ...(config.coralogixDomainUrl ? { coralogixDomainUrl: config.coralogixDomainUrl } : {}),
  ...(userId
    ? {
        user_context: {
          user_id: userId,
          user_name: userId,
        },
      }
    : {}),
  sessionRecordingConfig: {
    enable: true,
    autoStartSessionRecording: true,
    recordConsoleEvents: true,
    sessionRecordingSampleRate: 100,
    immediateFlush: true,
  },
  traceParentInHeader: {
    enabled: true,
  },
  instrumentations: {
    xhr: true,
    fetch: true,
    web_vitals: true,
    interactions: true,
    errors: true,
    long_tasks: true,
    resources: true,
  },
});

export const initCoralogixRum = async (userId?: string): Promise<void> => {
  if (typeof window === 'undefined') {
    return;
  }

  if (CoralogixRum.isInited) {
    markRumReady();
    return;
  }

  if (initStarted) {
    return;
  }

  initStarted = true;

  try {
    const config = await fetchRuntimeConfig();

    if (!config.publicKey) {
      markRumUnavailable();
      return;
    }

    CoralogixRum.init(buildCoralogixRumInitOptions(config, userId));

    markRumReady();
  } catch (error) {
    markRumUnavailable();
    console.warn('Coralogix RUM initialization skipped', error);
  }
};
