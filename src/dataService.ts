import { DexToolResponse, ResponseObject, TokenDetails } from "./types";
import { calculatePercentageChange } from "./utils";

export const getTokenDetails_DEXTOOLS = async (token: string) => {
  try {
    const res = await fetch(
      `https://www.dextools.io/shared/data/pair?address=${token}&chain=solana`,
      {
        headers: {
          accept: "application/json",
          "accept-language": "en-GB,en-NG;q=0.9,en-US;q=0.8,en;q=0.7",
          "content-type": "application/json",
          "if-none-match": 'W/"26d3-IEqT0IbSP9V8zn5qbgxBQ/EV2s8"',
          priority: "u=1, i",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          cookie:
            "_pk_ref.1.b299=%5B%22%22%2C%22%22%2C1727104557%2C%22https%3A%2F%2Fsolscan.io%2F%22%5D; _pk_id.1.b299=7c727f644b8e74ac.1727104557.; _pk_ref.5.b299=%5B%22%22%2C%22%22%2C1727104557%2C%22https%3A%2F%2Fsolscan.io%2F%22%5D; _pk_id.5.b299=c7057c46d727efc0.1727104557.; cf_clearance=Fymb7sA.C8FYdvQqUUyTXu.5mf95o3RAolljSUEs6sE-1727105513-1.2.1.1-8zIFsRCwWQcUjnxFywep3LydQ0sakQgTbXOkAXieMOwhBhN6k1K_URxqdPuOFhYgCTfz0KFKhxqettRRUOBSwT8JJgE2a7LMbTVC_ddZVLNpj3mmkBFQW0a90P8PEJOM7v6it3DAQouQCpQJ_qNpHMZ5aEtKfCKX.9bAIGZvhzJoCfOsOBnHX_nInLnFS82jJ.lnx60TdKgBz_ktCa2tDca3aBLubz1wrBUPv2RGdf2d7TKkunILz1Xi2XNWkAJ9bEmXNVlq.DG_9SFqIOp3qcLoXMnlEGf8H7HLNAgQEAi3jXCHh_S4U.psDI4rAlecCtQe5kcXk_9ugEDh4j463bxCJqUeZ9_GUVfze1VUxU4hR3YMgQdx30kbqqnqKHR8; __cf_bm=ilpDfXaEqqWOczZs238rT851P_ExKIEK6l6WtIooy5Y-1727124287-1.0.1.1-aKKGpIHkbU6RaIcUfWdAwG_MFSjPgEfZARlzCKGt7bPl9aZuOi_MxwvB7_JioUWLTkz9bO5btNgmj0T.aKmKzw",
          Referer:
            "https://www.dextools.io/app/en/solana/pair-explorer/8g4tAcENPc39Hcj7UdbSwntivkqsxfB5C18pyYTEpump?t=1727124305466",
          "Referrer-Policy": "strict-origin-when-cross-origin",
        },
        body: null,
        method: "GET",
      }
    );
    const _data = await res.json();

    const data = _data.data[0] as DexToolResponse;

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
