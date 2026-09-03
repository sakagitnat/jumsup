import * as translate from "../functions/api/translate.js";
import * as accountExport from "../functions/api/account/export.js";
import * as accountDelete from "../functions/api/account/request-delete.js";
import * as adminGift from "../functions/api/admin/gift-code.js";
import * as adminGiftCodes from "../functions/api/admin/gift-codes.js";
import * as adminOverview from "../functions/api/admin/overview.js";
import * as adminDictionary from "../functions/api/admin/dictionary.js";
import * as adminReports from "../functions/api/admin/reports.js";
import * as adminRefundAction from "../functions/api/admin/refund-action.js";
import * as adminRefunds from "../functions/api/admin/refunds.js";
import * as adminBots from "../functions/api/admin/bots.js";
import * as adminUsers from "../functions/api/admin/users.js";
import * as adminReviews from "../functions/api/admin/reviews.js";
import * as adminContent from "../functions/api/admin/content.js";
import * as adminSeasons from "../functions/api/admin/seasons.js";
import * as adminXpIntegrity from "../functions/api/admin/xp-integrity.js";
import * as contentPublish from "../functions/api/content/publish-confirmed.js";
import * as contentSave from "../functions/api/content/save.js";
import * as dictionarySuggest from "../functions/api/dictionary/suggest.js";
import * as giftRedeem from "../functions/api/gift/redeem.js";
import * as referralClaim from "../functions/api/referral/claim.js";
import * as refundList from "../functions/api/refund/list.js";
import * as refundRequest from "../functions/api/refund/request.js";
import * as stripeCheckout from "../functions/api/stripe/create-checkout.js";
import * as stripePortal from "../functions/api/stripe/create-portal.js";
import * as stripeWebhook from "../functions/api/stripe/webhook.js";
import * as usageSave from "../functions/api/usage/save.js";
import * as usageStart from "../functions/api/usage/start.js";
import { closeWeek } from "./jobs/closeWeek.js";
import { purgeDeletions } from "./jobs/purgeDeletions.js";

const routes = new Map([
  ["/api/translate", translate],
  ["/api/account/export", accountExport],
  ["/api/account/request-delete", accountDelete],
  ["/api/admin/gift-code", adminGift],
  ["/api/admin/gift-codes", adminGiftCodes],
  ["/api/admin/overview", adminOverview],
  ["/api/admin/dictionary", adminDictionary],
  ["/api/admin/reports", adminReports],
  ["/api/admin/refund-action", adminRefundAction],
  ["/api/admin/refunds", adminRefunds],
  ["/api/admin/bots", adminBots],
  ["/api/admin/users", adminUsers],
  ["/api/admin/reviews", adminReviews],
  ["/api/admin/content", adminContent],
  ["/api/admin/seasons", adminSeasons],
  ["/api/admin/xp-integrity", adminXpIntegrity],
  ["/api/content/publish-confirmed", contentPublish],
  ["/api/content/save", contentSave],
  ["/api/dictionary/suggest", dictionarySuggest],
  ["/api/gift/redeem", giftRedeem],
  ["/api/referral/claim", referralClaim],
  ["/api/refund/list", refundList],
  ["/api/refund/request", refundRequest],
  ["/api/stripe/create-checkout", stripeCheckout],
  ["/api/stripe/create-portal", stripePortal],
  ["/api/stripe/webhook", stripeWebhook],
  ["/api/usage/save", usageSave],
  ["/api/usage/start", usageStart],
]);

const methodHandler = (route, method) => route[`onRequest${method[0]}${method.slice(1).toLowerCase()}`];

// Cron Triggers (see [triggers] in wrangler.toml). The daily 18:00 UTC tick only
// sweeps account deletions; every other tick (the Sunday 17:10 UTC one, = Monday
// 00:10 Asia/Bangkok, just after the weekly XP boundary) also closes the week.
const CRON_DELETION_SWEEP = "0 18 * * *";

export default {
  async fetch(request, env, ctx) {
    if (env.SUPABASE_SERVER_KEY) {
      env.SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVER_KEY;
    }
    const url = new URL(request.url);
    const route = routes.get(url.pathname);
    if (!route) return env.ASSETS.fetch(request);

    const handler = methodHandler(route, request.method);
    if (!handler) {
      return new Response(JSON.stringify({ error: "METHOD_NOT_ALLOWED" }), {
        status: 405,
        headers: { "content-type": "application/json; charset=utf-8", allow: "GET, POST, OPTIONS" },
      });
    }

    return handler({ request, env, ctx, params: {}, data: {} });
  },

  async scheduled(event, env, ctx) {
    if (env.SUPABASE_SERVER_KEY) {
      env.SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVER_KEY;
    }
    const run = async () => {
      // Any tick that isn't the daily deletion sweep is the weekly close.
      // purgeDeletions runs on every tick so a missed daily one still gets caught.
      if (event.cron !== CRON_DELETION_SWEEP) {
        await closeWeek(env);
      }
      await purgeDeletions(env);
    };
    ctx.waitUntil(run());
  },
};
