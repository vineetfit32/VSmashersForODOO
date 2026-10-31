import { CreateCustomerForm, CreateStaffForm } from "@/components/setup-forms";
import { PageHeader } from "@/components/page-header";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = { title: "Customers · Billpilot" };

export default async function CustomersPage() {
  const session = await getSession();
  if (!session) return null;
  const customers = await prisma.customer.findMany({
    where: { organizationId: session.organizationId },
    orderBy: { companyName: "asc" },
    select: { id: true, companyName: true, contactName: true, email: true, userId: true },
  });

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      <PageHeader title="Customers" description="Companies you bill. A portal password lets that contact sign in and see only their own invoices." />
      <CreateCustomerForm />
      {session.role === "ADMIN" ? <CreateStaffForm /> : null}
      <div className="overflow-x-auto rounded-xl border-2 border-[#1c1422] bg-white/80">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-[#fff4cc] text-left text-xs uppercase">
            <tr>
              <th className="px-3 py-2">Company</th>
              <th className="px-3 py-2">Contact</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Portal</th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">No customers yet.</td>
              </tr>
            ) : (
              customers.map((customer) => (
                <tr key={customer.id} className="border-t">
                  <td className="px-3 py-2 font-medium">{customer.companyName}</td>
                  <td className="px-3 py-2">{customer.contactName}</td>
                  <td className="px-3 py-2">{customer.email}</td>
                  <td className="px-3 py-2">{customer.userId ? "Yes" : "No"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
