import * as translate from "../functions/api/translate.js";
import * as accountExport from "../functions/api/account/export.js";
import * as accountDelete from "../functions/api/account/request-delete.js";
import * as adminGift from "../functions/api/admin/gift-code.js";
import * as adminRefundAction from "../functions/api/admin/refund-action.js";
import * as adminRefunds from "../functions/api/admin/refunds.js";
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

const routes = new Map([
  ["/api/translate", translate],
  ["/api/account/export", accountExport],
  ["/api/account/request-delete", accountDelete],
  ["/api/admin/gift-code", adminGift],
  ["/api/admin/refund-action", adminRefundAction],
  ["/api/admin/refunds", adminRefunds],
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

export default {
  async fetch(request, env, ctx) {
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
};
