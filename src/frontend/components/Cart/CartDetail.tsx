// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import CartItems from '../CartItems';
import CheckoutForm from '../CheckoutForm';
import { IFormData } from '../CheckoutForm/CheckoutForm';
import SessionGateway from '../../gateways/Session.gateway';
import { useCart } from '../../providers/Cart.provider';
import { useCurrency } from '../../providers/Currency.provider';
import { CypressFields } from '../../utils/enums/CypressFields';
import { captureBlockingCheckoutError, emitMilestone } from '../../utils/rum/events';
import { setProductLabel } from '../../utils/rum/labels';
import { fetchRuntimeConfig } from '../../utils/rum/runtimeConfig';
import * as S from '../../styles/Cart.styled';

const CheckoutError = styled.div`
  border: 1px solid #c0392b;
  background: #fdecea;
  color: #922b21;
  padding: 12px 16px;
  border-radius: 4px;
  margin-bottom: 16px;
`;

const { userId } = SessionGateway.getSession();

const BLOCKING_CHECKOUT_MESSAGE =
  'Checkout is temporarily unavailable. Please try again later or contact support.';

const CartDetail = () => {
  const {
    cart: { items },
    emptyCart,
    placeOrder,
  } = useCart();
  const { selectedCurrency } = useCurrency();
  const { push } = useRouter();
  const [blockingError, setBlockingError] = useState<string | null>(null);

  useEffect(() => {
    setProductLabel('checkout');
    emitMilestone('checkout_started', 'checkout');
  }, []);

  const onPlaceOrder = useCallback(
    async ({
      email,
      state,
      streetAddress,
      country,
      city,
      zipCode,
      creditCardCvv,
      creditCardExpirationMonth,
      creditCardExpirationYear,
      creditCardNumber,
    }: IFormData) => {
      setBlockingError(null);

      const runtimeConfig = await fetchRuntimeConfig();
      if (runtimeConfig.bugBlocking) {
        captureBlockingCheckoutError(
          new Error('Demo blocking checkout failure: place order rejected')
        );
        setBlockingError(BLOCKING_CHECKOUT_MESSAGE);
        return;
      }

      const order = await placeOrder({
        userId,
        email,
        address: {
          streetAddress,
          state,
          country,
          city,
          zipCode,
        },
        userCurrency: selectedCurrency,
        creditCard: {
          creditCardCvv,
          creditCardExpirationMonth,
          creditCardExpirationYear,
          creditCardNumber,
        },
      });

      emitMilestone('checkout_completed', 'checkout');

      push({
        pathname: `/cart/checkout/${order.orderId}`,
        query: { order: JSON.stringify(order) },
      });
    },
    [placeOrder, push, selectedCurrency]
  );

  return (
    <S.Container>
      {blockingError ? (
        <CheckoutError data-cy={CypressFields.DemoCheckoutBlocked} role="alert">
          {blockingError}
        </CheckoutError>
      ) : null}
      <div>
        <S.Header>
          <S.CarTitle>Shopping Cart</S.CarTitle>
          <S.EmptyCartButton onClick={emptyCart} $type="link">
            Empty Cart
          </S.EmptyCartButton>
        </S.Header>
        <CartItems productList={items} />
      </div>
      <CheckoutForm onSubmit={onPlaceOrder} />
    </S.Container>
  );
};

export default CartDetail;
