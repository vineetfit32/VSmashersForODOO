"use client";

import { useState, type FormEvent } from "react";

import { createCustomer, createPlan, createProduct, createStaff, createSubscription } from "@/app/app/setup-actions";
import { Button } from "@/components/ui/button";

function useSaver(action: (formData: FormData) => Promise<{ error?: string; ok?: boolean }>) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSaved(false);
    const result = await action(new FormData(event.currentTarget));
    if (result?.error) setError(result.error);
    else {
      setSaved(true);
      event.currentTarget.reset();
    }
    setPending(false);
  }

  return { error, saved, pending, onSubmit };
}

const field = "h-9 w-full rounded-md border border-[#1c1422] bg-white/80 px-2 text-sm";

export function CreateCustomerForm() {
  const form = useSaver(createCustomer);
  return (
    <form onSubmit={form.onSubmit} className="grid gap-3 rounded-xl border-2 border-[#1c1422] bg-white/70 p-4 shadow-[4px_4px_0_#1c1422] md:grid-cols-2">
      <h2 className="text-sm font-semibold md:col-span-2">Add a customer</h2>
      <input name="companyName" required placeholder="Company" className={field} />
      <input name="contactName" required placeholder="Contact name" className={field} />
      <input name="email" type="email" required placeholder="Email" className={field} />
      <input name="phone" placeholder="Phone" className={field} />
      <input name="billingAddress" placeholder="Billing address" className={`${field} md:col-span-2`} />
      <input name="password" type="password" placeholder="Optional portal password" className={field} />
      <div className="flex items-center">
        <Button type="submit" size="sm" disabled={form.pending}>{form.pending ? "Saving…" : "Save customer"}</Button>
      </div>
      {form.error ? <p className="text-sm text-destructive md:col-span-2">{form.error}</p> : null}
      {form.saved ? <p className="text-sm md:col-span-2">Customer saved in this workspace.</p> : null}
    </form>
  );
}

export function CreateStaffForm() {
  const form = useSaver(createStaff);
  return (
    <form onSubmit={form.onSubmit} className="grid gap-3 rounded-xl border-2 border-[#1c1422] bg-white/70 p-4 shadow-[4px_4px_0_#1c1422] md:grid-cols-2">
      <h2 className="text-sm font-semibold md:col-span-2">Add a staff login</h2>
      <input name="firstName" required placeholder="First name" className={field} />
      <input name="lastName" required placeholder="Last name" className={field} />
      <input name="email" type="email" required placeholder="Email" className={field} />
      <input name="password" type="password" required placeholder="Password" className={field} />
      <Button type="submit" size="sm" disabled={form.pending}>{form.pending ? "Saving…" : "Save staff"}</Button>
      {form.error ? <p className="text-sm text-destructive md:col-span-2">{form.error}</p> : null}
      {form.saved ? <p className="text-sm md:col-span-2">Staff can sign in to this workspace.</p> : null}
    </form>
  );
}

export function CreateProductForm() {
  const form = useSaver(createProduct);
  return (
    <form onSubmit={form.onSubmit} className="grid gap-3 rounded-xl border-2 border-[#1c1422] bg-white/70 p-4 shadow-[4px_4px_0_#1c1422] md:grid-cols-3">
      <h2 className="text-sm font-semibold md:col-span-3">Add a product</h2>
      <input name="name" required placeholder="Product name" className={`${field} md:col-span-2`} />
      <input name="salesPrice" type="number" min="0" step="0.01" required placeholder="Price" className={field} />
      <Button type="submit" size="sm" disabled={form.pending}>{form.pending ? "Saving…" : "Save product"}</Button>
      {form.error ? <p className="text-sm text-destructive md:col-span-3">{form.error}</p> : null}
      {form.saved ? <p className="text-sm md:col-span-3">Product saved.</p> : null}
    </form>
  );
}

export function CreatePlanForm() {
  const form = useSaver(createPlan);
  return (
    <form onSubmit={form.onSubmit} className="grid gap-3 rounded-xl border-2 border-[#1c1422] bg-white/70 p-4 shadow-[4px_4px_0_#1c1422] md:grid-cols-2">
      <h2 className="text-sm font-semibold md:col-span-2">Add a plan</h2>
      <input name="name" required placeholder="Plan name" className={field} />
      <input name="code" required placeholder="Code, e.g. MONTHLY" className={field} />
      <select name="interval" defaultValue="MONTHLY" className={field}>
        <option value="DAILY">Daily</option>
        <option value="WEEKLY">Weekly</option>
        <option value="MONTHLY">Monthly</option>
        <option value="YEARLY">Yearly</option>
      </select>
      <input name="basePrice" type="number" min="0" step="0.01" required placeholder="Base price" className={field} />
      <label className="flex items-center gap-2 text-sm"><input name="allowPause" type="checkbox" defaultChecked /> Allow pause</label>
      <label className="flex items-center gap-2 text-sm"><input name="autoClose" type="checkbox" /> Auto-close at expiry</label>
      <Button type="submit" size="sm" disabled={form.pending}>{form.pending ? "Saving…" : "Save plan"}</Button>
      {form.error ? <p className="text-sm text-destructive md:col-span-2">{form.error}</p> : null}
      {form.saved ? <p className="text-sm md:col-span-2">Plan saved.</p> : null}
    </form>
  );
}

export function CreateSubscriptionForm({
  customers,
  plans,
  products,
}: {
  customers: Array<{ id: string; companyName: string }>;
  plans: Array<{ id: string; name: string }>;
  products: Array<{ id: string; name: string }>;
}) {
  const form = useSaver(createSubscription);
  return (
    <form onSubmit={form.onSubmit} className="grid gap-3 rounded-xl border-2 border-[#1c1422] bg-white/70 p-4 shadow-[4px_4px_0_#1c1422] md:grid-cols-2">
      <h2 className="text-sm font-semibold md:col-span-2">New subscription</h2>
      <select name="customerId" required className={field} defaultValue="">
        <option value="" disabled>Customer</option>
        {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.companyName}</option>)}
      </select>
      <select name="planId" required className={field} defaultValue="">
        <option value="" disabled>Plan</option>
        {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
      </select>
      <select name="productId" required className={field} defaultValue="">
        <option value="" disabled>Product</option>
        {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
      </select>
      <input name="quantity" type="number" min="1" defaultValue="1" className={field} />
      <input name="startDate" type="date" required className={field} />
      <Button type="submit" size="sm" disabled={form.pending}>{form.pending ? "Saving…" : "Create draft"}</Button>
      {form.error ? <p className="text-sm text-destructive md:col-span-2">{form.error}</p> : null}
      {form.saved ? <p className="text-sm md:col-span-2">Draft subscription created. Open it to send the quotation.</p> : null}
    </form>
  );
}
