declare module "@cashfreepayments/cashfree-js" {
  export interface CashfreeCheckoutOptions {
    paymentSessionId: string;
    redirectTarget?: "_modal" | "_self" | "_blank" | HTMLElement | undefined;
    appearance?: Record<string, unknown> | undefined;
  }

  export interface CashfreeInstance {
    checkout(options: CashfreeCheckoutOptions): Promise<unknown>;
    component(type: string, options?: Record<string, unknown> | undefined): unknown;
  }

  export type Cashfree = CashfreeInstance;

  export function load(options: { mode: "sandbox" | "production" }): Promise<CashfreeInstance>;
}
