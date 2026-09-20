// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

import { NextPage } from 'next';
import Head from 'next/head';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useCallback, useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import Ad from '../../../components/Ad';
import Layout from '../../../components/Layout';
import ProductPrice from '../../../components/ProductPrice';
import Recommendations from '../../../components/Recommendations';
import Select from '../../../components/Select';
import { CypressFields } from '../../../utils/enums/CypressFields';
import ApiGateway from '../../../gateways/Api.gateway';
import { Product } from '../../../protos/demo';
import AdProvider from '../../../providers/Ad.provider';
import { useCart } from '../../../providers/Cart.provider';
import * as S from '../../../styles/ProductDetail.styled';
import { useCurrency } from '../../../providers/Currency.provider';
import {
  captureBrokenAddToCartError,
  captureNoisyProductDetailError,
  isBrokenAddToCartProductId,
} from '../../../utils/rum/events';
import { setProductLabel } from '../../../utils/rum/labels';
import { fetchRuntimeConfig } from '../../../utils/rum/runtimeConfig';

const quantityOptions = new Array(10).fill(0).map((_, i) => i + 1);

const BROKEN_ADD_TO_CART_MESSAGE =
  'Could not add this item to your cart. Please try again.';

const ProductDetail: NextPage = () => {
  const { push, query } = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [addToCartFailure, setAddToCartFailure] = useState<string | null>(null);
  const noisyBugHandled = useRef(false);
  const {
    addItem,
    cart: { items },
  } = useCart();
  const { selectedCurrency } = useCurrency();
  const productId = query.productId as string;

  useEffect(() => {
    setQuantity(1);
    setAddToCartFailure(null);
  }, [productId]);

  useEffect(() => {
    setProductLabel('product-detail');
  }, [productId]);

  useEffect(() => {
    noisyBugHandled.current = false;
  }, [productId]);

  useEffect(() => {
    if (!productId || noisyBugHandled.current) {
      return;
    }

    let cancelled = false;

    void fetchRuntimeConfig().then(runtimeConfig => {
      if (cancelled || !runtimeConfig.bugNoisy || noisyBugHandled.current) {
        return;
      }

      noisyBugHandled.current = true;
      captureNoisyProductDetailError(
        new Error(`Failed to load related products for ${productId}`)
      );
    });

    return () => {
      cancelled = true;
    };
  }, [productId]);

  const {
    data: {
      name,
      picture,
      description,
      priceUsd = { units: 0, currencyCode: 'USD', nanos: 0 },
      categories,
    } = {} as Product,
  } = useQuery({
      queryKey: ['product', productId, 'selectedCurrency', selectedCurrency],
      queryFn: () => ApiGateway.getProduct(productId, selectedCurrency),
      enabled: !!productId,
    }
  ) as { data: Product };

  const onAddItem = useCallback(async () => {
    const runtimeConfig = await fetchRuntimeConfig();
    if (runtimeConfig.brokenAddToCart && isBrokenAddToCartProductId(productId)) {
      const error = new Error(
        `Broken add to cart failure: could not add product ${productId}`
      );
      captureBrokenAddToCartError(error, productId);
      setAddToCartFailure(BROKEN_ADD_TO_CART_MESSAGE);
      return;
    }

    setAddToCartFailure(null);
    await addItem({
      productId,
      quantity,
    });
    push('/cart');
  }, [addItem, productId, quantity, push]);

  return (
    <AdProvider
      productIds={[productId, ...items.map(({ productId }) => productId)]}
      contextKeys={[...new Set(categories)]}
    >
      <Head>
        <title>Otel Demo - Product</title>
      </Head>
      <Layout>
        <S.ProductDetail data-cy={CypressFields.ProductDetail}>
          <S.Container>
            {picture ? (
              <S.Image
                $src={`/images/products/${picture}`}
                data-cy={CypressFields.ProductPicture}
              />
            ) : null}
            <S.Details $fullWidth={!picture}>
              <S.Name data-cy={CypressFields.ProductName}>{name}</S.Name>
              <S.Description data-cy={CypressFields.ProductDescription}>{description}</S.Description>
              <S.ProductPrice>
                <ProductPrice price={priceUsd} />
              </S.ProductPrice>
              <S.Text>Quantity</S.Text>
              <Select
                data-cy={CypressFields.ProductQuantity}
                onChange={event => setQuantity(+event.target.value)}
                value={quantity}
              >
                {quantityOptions.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
              <S.AddToCartBlock>
                <S.AddToCart data-cy={CypressFields.ProductAddToCart} onClick={onAddItem}>
                  <Image src="/icons/Cart.svg" height="15" width="15" alt="cart" /> Add To Cart
                </S.AddToCart>
                {addToCartFailure ? (
                  <S.AddToCartFailure role="alert">{addToCartFailure}</S.AddToCartFailure>
                ) : null}
              </S.AddToCartBlock>
            </S.Details>
          </S.Container>
          <Recommendations />
        </S.ProductDetail>
        <Ad />
      </Layout>
    </AdProvider>
  );
};

export default ProductDetail;
