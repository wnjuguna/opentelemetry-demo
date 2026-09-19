// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

import { getElementByField } from '../../utils/Cypress';
import { CypressFields } from '../../utils/enums/CypressFields';

const CHECKOUT_HEALTHY_PRODUCT_IDS = ['L9ECAV7KIM', '2ZYFJ3GM2N'] as const;

describe('Checkout Flow', () => {
  before(() => {
    cy.intercept('POST', '/api/cart*').as('addToCart');
    cy.intercept('GET', '/api/cart*').as('getCart');
    cy.intercept('POST', '/api/checkout*').as('placeOrder');
  });

  beforeEach(() => {
    cy.intercept('GET', '/api/runtime-config', {
      application: 'astronomy-shop-demo',
      environment: 'demo',
      version: '1.0.0',
      coralogixDomain: 'EU2',
      bugBlocking: false,
      bugNoisy: false,
      brokenAddToCart: true,
    });
  });

  it('should create an order with two items', () => {
    cy.visit(`/product/${CHECKOUT_HEALTHY_PRODUCT_IDS[0]}`);
    getElementByField(CypressFields.ProductAddToCart).click();

    cy.wait('@addToCart');
    cy.wait('@getCart', { timeout: 10000 });
    cy.wait(2000);

    cy.location('href').should('match', /\/cart$/);
    getElementByField(CypressFields.CartItemCount).should('contain', '1');

    cy.visit(`/product/${CHECKOUT_HEALTHY_PRODUCT_IDS[1]}`);
    getElementByField(CypressFields.ProductAddToCart).click();

    cy.wait('@addToCart');
    cy.wait('@getCart', { timeout: 10000 });
    cy.wait(2000);

    cy.location('href').should('match', /\/cart$/);
    getElementByField(CypressFields.CartItemCount).should('contain', '2');

    getElementByField(CypressFields.CartIcon).click({ force: true });
    getElementByField(CypressFields.CartGoToShopping).click();

    cy.location('href').should('match', /\/cart$/);

    getElementByField(CypressFields.CheckoutPlaceOrder).click();

    cy.wait('@placeOrder');

    cy.location('href').should('match', /\/checkout/);
    getElementByField(CypressFields.CheckoutItem).should('have.length', 2);
  });
});

export {};
