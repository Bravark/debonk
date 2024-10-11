import { DexToolResponse, ResponseObject, TokenDetails } from "./types";
import { calculatePercentageChange } from "./utils";

export const getTokenDetails_DEXTOOLS = async (token: string) => {
  console.log("token: ", token);
  console.log("DEXTOOLS");
  try {
    const res = await fetch(
      `https://www.dextools.io/shared/search/pair?query=${token}&strict=true`,
      {
        headers: {
          accept: "application/json",
          "accept-language": "en-GB,en-NG;q=0.9,en-US;q=0.8,en;q=0.7",
          "content-type": "application/json",
          priority: "u=1, i",
          "sec-fetch-dest": "empty",
          // "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          cookie:
            "_pk_id.1.b299=7c727f644b8e74ac.1727104557.; _pk_id.5.b299=c7057c46d727efc0.1727104557.; cf_clearance=bDcNSxW4eG6iCmr0exVeppdlsLAjGqyTZ.pqDwBY1_c-1728646284-1.2.1.1-iKVc6BHRGKiUIoODXmjdrwrmTfu53KIzo3NB_OK.KQJ59HuSgy3IkSmfYgTSkKxVRqX16gAKm.qC3jOcx0.9hL7g5Dd4fQchOfU0bFe47qjPJv_bTVQRuZV6j98_LuNIo0TdALPjyzXRKqXqOotE27yaGgMCfFG2i3dH0aUU_tlKpzEtUa_JhRuGm6gDGBjUUIyGKzgsYtmYAWKH9Mk6hqw9dlZm_91s3H7f_BWmG404L80SoTimL9iH1l8mFhV0lSWB2QQBf2PnsFghLbdihnJt6eKmYYMfIYUyW5QlcGcjVhSLc2ZcEjjXZuISftKkKIqgRirPq4HwdTLL9JKPgQTQTu_JhMx3Xd0M6CY32nK8b4CM2beqDzEIaCF2fFEB; _pk_ref.1.b299=%5B%22%22%2C%22%22%2C1728646285%2C%22https%3A%2F%2Fsolscan.io%2F%22%5D; _pk_ses.1.b299=1; _pk_ref.5.b299=%5B%22%22%2C%22%22%2C1728646285%2C%22https%3A%2F%2Fsolscan.io%2F%22%5D; _pk_ses.5.b299=1; __cf_bm=M6zNdlOnpnoKBCIwd5qr8SdqnBY42lUKDIeTdKLhk2c-1728646304-1.0.1.1-WMpdhJzc3ZzbMC2tjs8dvkl60HrLinsPoqptRVWczr0SeJBnNVZICeLhU7PBlm_K38YHMlPm1QdL3duQDVcK4g",
          Referer:
            "https://www.dextools.io/app/en/solana/pair-explorer/8g4tAcENPc39Hcj7UdbSwntivkqsxfB5C18pyYTEpump?t=1728646285447",
          "Referrer-Policy": "strict-origin-when-cross-origin",
        },
        body: null,
        method: "GET",
      }
    );
    const _data = await res.json();
    console.log("_data: ", _data);

    let data: DexToolResponse;
    if (_data.data) {
      data = _data.data[0] as DexToolResponse;
    } else {
      data = _data.results[0] as DexToolResponse;
    }
    // console.log("data: ", data);

    let result: TokenDetails;

    console.log("data.periodStats xxx: ", data);
    const priceInSol =
      (data.periodStats["1h"].price.chain.last * data.price) /
      data.periodStats["1h"].price.usd.last;
    console.log("data.periodStatsyyyy: ", data);

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
  console.log("DEXSCREENER");
  const res = await fetch(
    `https://api.dexscreener.com/latest/dex/tokens/${token}`,
    {
      method: "GET",
    }
  );
  const data: ResponseObject = await res.json();

  try {
    // console.log("data.pairs: ", data.pairs);
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
        telegramUrl: data.pairs[0]?.info?.socials.find(
          (s) => s.type === "telegram"
        )?.url,
        twitterUrl: data.pairs[0]?.info?.socials.find(
          (s) => s.type === "twitter"
        )?.url,
        websiteUrl: data.pairs[0]?.info?.websites[0]?.url,

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
  } catch (error) {
    console.log("error: ", error);
    return null;
  }
};
//THIS IS A TEST FOR THE PUSHING
