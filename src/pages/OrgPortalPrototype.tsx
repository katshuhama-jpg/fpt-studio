import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/** Quản lý Org: nhúng prototype tĩnh "EOS Portal Phân quyền tổ chức" (public/prototypes) full màn hình. */
const SRC = "/prototypes/eos-portal-phan-quyen.html";

export default function OrgPortalPrototype() {
  const navigate = useNavigate();

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin === window.location.origin && e.data === "eos-back") navigate("/");
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [navigate]);

  return (
    <iframe
      src={SRC}
      title="EOS Portal Phân quyền tổ chức"
      className="fixed inset-0 h-dvh w-full border-0 bg-background"
    />
  );
}
