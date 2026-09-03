import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Button, IconArrowLeft } from "../../ui";

export function AccountShell({ title, children }: { title: string; children: ReactNode }) {
  const navigate = useNavigate();
  return (
    <>
      <div className="mb-5 flex items-center gap-3">
        <Button variant="ghost" onClick={() => navigate("/account")} aria-label="ย้อนกลับ">
          <IconArrowLeft size={16} />
        </Button>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-subtle">ACCOUNT</p>
          <h1 className="text-2xl font-semibold">{title}</h1>
        </div>
      </div>
      {children}
    </>
  );
}
