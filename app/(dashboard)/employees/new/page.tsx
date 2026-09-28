"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Copy } from "lucide-react";
import { EmployeeForm, type EmployeeFormValues } from "@/components/portal/employee-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/lib/api";

export default function NewEmployeePage() {
  const router = useRouter();
  const [account, setAccount] = useState<{ uuid: string; username: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const save = async (values: EmployeeFormValues) => {
    const response = await api.employees.create(values);
    if ("initial_password" in response && typeof response.initial_password === "string") {
      setAccount({ uuid: response.data.uuid, username: response.data.username, password: response.initial_password });
    } else {
      router.push(`/employees/${response.data.uuid}`);
    }
  };
  const copy = async () => {
    if (!account) return;
    await navigator.clipboard.writeText(`Username: ${account.username}\nTemporary password: ${account.password}`);
    setCopied(true);
  };
  return <div className="lp-admin">
    <Button variant="ghost" asChild className="lp-admin-back"><Link href="/employees"><ArrowLeft aria-hidden="true" />Employees</Link></Button>
    <header className="lp-admin-heading"><div><p className="lp-admin-eyebrow">Employee record</p><h1>Add an employee</h1><p className="lp-admin-description">Create the identity record first. Grant application access in the next step.</p></div></header>
    <EmployeeForm onSave={save} onCancel={() => router.push("/employees")} submitLabel="Create employee" />
    <Dialog open={!!account} onOpenChange={() => { /* Keep the one-time secret visible until the administrator continues. */ }}>
      <DialogContent showCloseButton={false}>
        <DialogHeader><DialogTitle>Employee account created</DialogTitle><DialogDescription>Record these one-time credentials. The temporary password will not be shown again.</DialogDescription></DialogHeader>
        <dl className="lp-admin-credentials"><div><dt>Username</dt><dd><code>{account?.username}</code></dd></div><div><dt>Temporary password</dt><dd><code>{account?.password}</code></dd></div></dl>
        <DialogFooter><Button variant="outline" onClick={() => void copy()}><Copy aria-hidden="true" />{copied ? "Copied" : "Copy credentials"}</Button><Button onClick={() => router.push(`/employees/${account?.uuid}/applications`)}>Continue to access<ArrowRight aria-hidden="true" /></Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}
