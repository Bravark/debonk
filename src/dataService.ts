import { DexToolResponse, ResponseObject, TokenDetails } from "./types";
import { calculatePercentageChange } from "./utils";

export const getTokenDetails_DEXTOOLS = async (token: string) => {
  console.log("token: ", token);
  try {
    const res = await fetch(
      `https://www.dextools.io/shared/search/pair?query=${token}&strict=true`,
      {
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "sec-ch-ua":
            '"Google Chrome";v="129", "Not=A?Brand";v="8", "Chromium";v="129"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"Windows"',
          Referer:
            "https://www.dextools.io/app/en/solana/pair-explorer/BbxxfuZFC8owtCnaSx9WwFACzum78bZzb5STCTrDQR2G?t=1727523395484",
          "Referrer-Policy": "strict-origin-when-cross-origin",
        },
        body: null,
        method: "GET",
      }
    );
    const _data = await res.json();
    // console.log("_data: ", _data);

    let data: DexToolResponse;
    if (_data.data) {
      data = _data.data[0] as DexToolResponse;
    } else {
      data = _data.results[0] as DexToolResponse;
    }
    console.log("data: ", data);

    let result: TokenDetails;

    const priceInSol =
      (data.periodStats["1h"].price.chain.last * data.price) /
      data.periodStats["1h"].price.usd.last;

    result = {
      name: data.name,
      symbol: data.symbol,
      address: data.id.token,
      priceUsd: data.price,
      priceNative: priceInSol,
      mc: data.price * Number(data.token.totalSupply),
      liquidityInUsd: data.metrics.liquidity,
      telegramUrl: data.token.links.telegram,
      twitterUrl: data.token.links.twitter,
      websiteUrl: data.token.links.website,
      volume: {
        m5: data.periodStats["5m"].volume?.buys,
        h1: data.periodStats["1h"].volume?.buys,
        h24: data.price24h ? data.price24h?.buys : 0,
      },
      change: {
        m5: calculatePercentageChange(
          data.periodStats["5m"].price.usd.last,
          data.price
        ),
        h1: calculatePercentageChange(
          data.periodStats["1h"].price.usd.last,
          data.price
        ),
        h24: calculatePercentageChange(
          data.periodStats["24h"].price.usd.last,
          data.price
        ),
      },
    };

    return result;
  } catch (error) {
    console.log("error: ", error);
    return null;
  }
};

export const getTokenDetails_DEXSCREENER = async (
  token: string
): Promise<TokenDetails> => {
  const res = await fetch(
    `https://api.dexscreener.com/latest/dex/tokens/${token}`,
    {
      method: "GET",
    }
  );
  const data: ResponseObject = await res.json();

  if (data.pairs) {
    let result: TokenDetails;

    result = {
      name: data.pairs[0].baseToken.name,
      symbol: data.pairs[0].baseToken.symbol,
      address: data.pairs[0].baseToken.address,
      priceUsd: Number(data.pairs[0].priceUsd),
      priceNative: Number(data.pairs[0].priceNative),
      mc: data.pairs[0].marketCap,
      liquidityInUsd: data.pairs[0].liquidity.base,
      telegramUrl: data.pairs[0].info.socials.find((s) => s.type === "telegram")
        ?.url,
      twitterUrl: data.pairs[0].info.socials.find((s) => s.type === "twitter")
        ?.url,
      websiteUrl: data.pairs[0].info.websites[0]?.url,

      volume: {
        m5: data.pairs[0].volume.m5,
        h1: data.pairs[0].volume.h1,
        h24: data.pairs[0].volume.h24,
      },
      change: {
        m5: data.pairs[0].priceChange.m5,
        h1: data.pairs[0].priceChange.h1,
        h24: data.pairs[0].priceChange.h24,
      },
    };

    return result;
  }
  return null;
};
