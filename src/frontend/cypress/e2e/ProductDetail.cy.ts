// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

import { getElementByField } from '../../utils/Cypress';
import { CypressFields } from '../../utils/enums/CypressFields';

const BROKEN_ADD_TO_CART_PRODUCT_IDS = ['66VCHSJNUP', '9SIQT8TOJO'] as const;
const HEALTHY_ADD_TO_CART_PRODUCT_ID = 'L9ECAV7KIM';

const baseRuntimeConfig = {
  application: 'astronomy-shop-demo',
  environment: 'demo',
  version: '1.0.0',
  coralogixDomain: 'EU2',
  bugBlocking: false,
  bugNoisy: false,
};

const stubRuntimeConfig = (brokenAddToCart: boolean) => {
  cy.intercept('GET', '/api/runtime-config', {
    ...baseRuntimeConfig,
    brokenAddToCart,
  }).as('runtimeConfig');
};

const visitProductDetail = (productId: string) => {
  cy.visit(`/product/${productId}`);
  getElementByField(CypressFields.ProductDetail).should('exist');
  getElementByField(CypressFields.ProductAddToCart).should('exist');
};

describe('Product Detail Page', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should validate the product detail page', () => {
    cy.intercept('GET', '/api/products/*').as('getProduct');
    cy.intercept('GET', '/api/data*').as('getAd');
    cy.intercept('GET', '/api/recommendations*').as('getRecommendations');

    getElementByField(CypressFields.ProductCard).first().click();

    cy.wait('@getProduct');
    cy.wait('@getAd');
    cy.wait('@getRecommendations');

    getElementByField(CypressFields.ProductDetail).should('exist');
    getElementByField(CypressFields.ProductPicture).should('exist');
    getElementByField(CypressFields.ProductName).should('exist');
    getElementByField(CypressFields.ProductDescription).should('exist');
    getElementByField(CypressFields.ProductAddToCart).should('exist');

    getElementByField(CypressFields.ProductCard, getElementByField(CypressFields.RecommendationList)).should(
      'have.length',
      4
    );
    getElementByField(CypressFields.Ad).should('exist');
  });

  it('should not render product picture or request undefined image when picture is missing', () => {
    cy.intercept('GET', '/api/products/*', req => {
      req.continue(res => {
        delete res.body.picture;
      });
    }).as('getProduct');

    cy.intercept('GET', '/images/products/undefined').as('undefinedImage');

    getElementByField(CypressFields.ProductCard).first().click();
    cy.wait('@getProduct');

    getElementByField(CypressFields.ProductDetail).should('exist');
    getElementByField(CypressFields.ProductPicture).should('not.exist');
    getElementByField(CypressFields.ProductName).should('exist');
    getElementByField(CypressFields.ProductDescription).should('exist');
    getElementByField(CypressFields.ProductAddToCart).should('exist');

    cy.get('@undefinedImage.all').should('have.length', 0);
  });

  it('should add item to cart', () => {
    cy.intercept('POST', '/api/cart*').as('addToCart');
    cy.intercept('GET', '/api/cart*').as('getCart');
    cy.visit(`/product/${HEALTHY_ADD_TO_CART_PRODUCT_ID}`);
    getElementByField(CypressFields.ProductAddToCart).click();

    cy.wait('@addToCart');
    cy.wait('@getCart', { timeout: 10000 });
    cy.wait(2000);
    cy.location('href').should('match', /\/cart$/);

    getElementByField(CypressFields.CartItemCount).should('contain', '1');
    getElementByField(CypressFields.CartIcon).click({ force: true });

    getElementByField(CypressFields.CartDropdownItem).should('have.length', 1);
  });
});

describe('broken add to cart demo bug', () => {
  describe('when runtime config flag is off', () => {
    BROKEN_ADD_TO_CART_PRODUCT_IDS.forEach(productId => {
      it(`adds affected SKU ${productId} to cart`, () => {
        stubRuntimeConfig(false);
        cy.intercept('POST', '/api/cart*').as('addToCart');
        cy.intercept('GET', '/api/cart*').as('getCart');

        visitProductDetail(productId);
        getElementByField(CypressFields.ProductAddToCart).click();

        cy.wait('@addToCart');
        cy.wait('@getCart', { timeout: 10000 });
        cy.location('href').should('match', /\/cart$/);
      });
    });
  });

  describe('when runtime config flag is on', () => {
    BROKEN_ADD_TO_CART_PRODUCT_IDS.forEach(productId => {
      it(`keeps affected SKU ${productId} on PDP without POST /api/cart`, () => {
        stubRuntimeConfig(true);
        cy.intercept('POST', '/api/cart*').as('addToCart');

        cy.on('uncaught:exception', err => {
          expect(err.message).to.include('Demo broken add to cart failure');
          return false;
        });

        visitProductDetail(productId);
        cy.wait('@runtimeConfig');

        let brokenAddToCartSettled!: Promise<void>;

        cy.window().then(win => {
          brokenAddToCartSettled = new Cypress.Promise<void>(resolve => {
            win.addEventListener(
              'unhandledrejection',
              event => {
                expect(String(event.reason?.message)).to.include('Demo broken add to cart failure');
                resolve();
              },
              { once: true }
            );
          });
        });

        getElementByField(CypressFields.ProductAddToCart).click();
        cy.then(() => brokenAddToCartSettled);

        cy.get('@addToCart.all').should('have.length', 0);
        cy.location('pathname').should('eq', `/product/${productId}`);
      });
    });

    it(`adds healthy SKU ${HEALTHY_ADD_TO_CART_PRODUCT_ID} and navigates to cart`, () => {
      stubRuntimeConfig(true);
      cy.intercept('POST', '/api/cart*').as('addToCart');
      cy.intercept('GET', '/api/cart*').as('getCart');

      visitProductDetail(HEALTHY_ADD_TO_CART_PRODUCT_ID);
      getElementByField(CypressFields.ProductAddToCart).click();

      cy.wait('@addToCart');
      cy.wait('@getCart', { timeout: 10000 });
      cy.location('href').should('match', /\/cart$/);
    });
  });
});

export {};
