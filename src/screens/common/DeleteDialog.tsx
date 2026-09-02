import { useState } from "react";
import { Modal, Button } from "../../ui";

export function DeleteDialog({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [text, setText] = useState("");
  const [ack, setAck] = useState(false);
  const ready = text.trim() === "ลบ" && ack;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="ยืนยันการลบ"
      footer={
        <>
          <Button onClick={onClose}>ยกเลิก</Button>
          <Button
            variant="danger"
            disabled={!ready}
            onClick={() => {
              onConfirm();
              setText("");
              setAck(false);
            }}
          >
            ลบถาวร
          </Button>
        </>
      }
    >
      <p className="mb-3 rounded-lg bg-danger-soft p-3 text-sm font-semibold text-danger">
        การลบไม่สามารถย้อนกลับได้
      </p>
      <label className="block text-sm font-semibold">
        พิมพ์คำว่า ลบ
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm font-normal"
        />
      </label>
      <label className="mt-3 flex items-start gap-2 text-sm">
        <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />
        <span>ฉันเข้าใจว่ารายการนี้จะถูกลบถาวร</span>
      </label>
    </Modal>
  );
}
