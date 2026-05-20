import { baseApi } from "@/app/baseApi";

export interface SubscriptionData {
  plan: "free" | "pro" | "custom";
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionStatus?: "active" | "trialing" | "past_due" | "canceled" | "unpaid" | null;
  currentPeriodEnd?: string | null;
}

export interface PricesData {
  proMonthly: string;
  proYearly: string;
}

const billingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSubscription: builder.query<SubscriptionData, void>({
      query: () => "/billing/subscription",
      transformResponse: (res: { success: boolean; data: SubscriptionData }) => res.data,
      providesTags: ["Billing"],
    }),

    getPrices: builder.query<PricesData, void>({
      query: () => "/billing/prices",
      transformResponse: (res: { success: boolean; data: PricesData }) => res.data,
    }),

    createCheckoutSession: builder.mutation<{ url: string }, { priceId: string }>({
      query: (body) => ({ url: "/billing/checkout", method: "POST", body }),
      transformResponse: (res: { success: boolean; data: { url: string } }) => res.data,
    }),

    createPortalSession: builder.mutation<{ url: string }, void>({
      query: () => ({ url: "/billing/portal", method: "POST" }),
      transformResponse: (res: { success: boolean; data: { url: string } }) => res.data,
    }),
  }),
});

export const {
  useGetSubscriptionQuery,
  useGetPricesQuery,
  useCreateCheckoutSessionMutation,
  useCreatePortalSessionMutation,
} = billingApi;
