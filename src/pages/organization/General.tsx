import { useRef, useState } from "react";
import { Building2, ImagePlus, Pencil, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, PageHeader } from "./shared";
import { useOrg } from "./orgStore";

const NAME_MAX = 80;
const DESC_MAX = 240;
const SLUG_MAX = 40;
const LANGUAGES = ["Vietnamese", "English"];

/**
 * Organization profile — name, logo, description, URL slug, default language. Editable by an
 * Org Admin or Space (Tenant) Admin; both current demo personas qualify, so this page no longer
 * distinguishes between them. Previously hard "View only" for every Space, seed ones included —
 * see BA doc "Org/Tenant/Structure flow", Gap 2.
 */
export default function General() {
  const { tree, orgProfile, updateOrgProfile } = useOrg();

  const [name, setName] = useState(tree.name);
  const [description, setDescription] = useState(orgProfile.description ?? "");
  const [logoDataUrl, setLogoDataUrl] = useState<string | undefined>(orgProfile.logoDataUrl);
  const [urlSlug, setUrlSlug] = useState(orgProfile.urlSlug ?? "");
  const [defaultLanguage, setDefaultLanguage] = useState(orgProfile.defaultLanguage ?? LANGUAGES[0]);
  const [nameTouched, setNameTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameValid = name.trim().length > 0;

  const handleLogoPick = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Vui lòng chọn một file hình ảnh (PNG hoặc JPG).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogoDataUrl(typeof reader.result === "string" ? reader.result : undefined);
    reader.readAsDataURL(file);
  };

  const save = () => {
    if (!nameValid) { setNameTouched(true); return; }
    setSaving(true);
    // Nothing actually async happens here — the brief pause just keeps this from feeling like
    // the click did nothing.
    window.setTimeout(() => {
      updateOrgProfile({
        name: name.trim(),
        description: description.trim() || undefined,
        logoDataUrl,
        urlSlug: urlSlug.trim() || undefined,
        defaultLanguage,
      });
      setSaving(false);
      toast.success("Đã lưu thông tin tổ chức.");
    }, 400);
  };

  return (
    <div className="px-8 py-8 max-w-[760px] mx-auto animate-fade-up space-y-6">
      <PageHeader title="General" desc="Thông tin doanh nghiệp/tổ chức — hiển thị cho mọi thành viên. Org Admin và Space (Tenant) Admin có thể chỉnh sửa." />

      <Card>
        <div className="flex items-center gap-4 mb-6">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-16 h-16 rounded-xl bg-surface-muted border border-dashed border-border flex items-center justify-center shrink-0 overflow-hidden hover:border-primary/50 transition-base cursor-pointer"
            aria-label="Chọn logo tổ chức"
          >
            {logoDataUrl ? (
              <img src={logoDataUrl} alt={`${tree.name} logo`} className="w-full h-full object-contain" />
            ) : (
              <Building2 size={22} className="text-muted-foreground" />
            )}
          </button>
          <div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-sm font-medium text-primary hover:underline cursor-pointer flex items-center gap-1.5"
            >
              <Pencil size={13} /> {logoDataUrl ? "Đổi logo" : "Tải logo lên"}
            </button>
            <p className="text-xs text-muted-foreground mt-0.5">PNG hoặc JPG.</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={e => handleLogoPick(e.target.files?.[0])}
          />
        </div>

        <div className="mb-5">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium">Organization name <span className="text-destructive">*</span></label>
            <span className="text-xs text-muted-foreground">{name.length}/{NAME_MAX}</span>
          </div>
          <input
            value={name}
            maxLength={NAME_MAX}
            onChange={e => setName(e.target.value)}
            onBlur={() => setNameTouched(true)}
            className="w-full h-10 px-3 rounded-lg border border-border bg-white text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-base"
          />
          {nameTouched && !nameValid && (
            <p className="text-xs text-destructive mt-1.5">Vui lòng nhập tên tổ chức.</p>
          )}
        </div>

        <div className="mb-5">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium">Mô tả</label>
            <span className="text-xs text-muted-foreground">{description.length}/{DESC_MAX}</span>
          </div>
          <textarea
            value={description}
            maxLength={DESC_MAX}
            onChange={e => setDescription(e.target.value)}
            placeholder="Mô tả ngắn về tổ chức (không bắt buộc)"
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-border bg-white text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-base resize-none"
          />
        </div>

        <div className="mb-5">
          <label className="text-sm font-medium mb-1.5 block">URL slug</label>
          <div className="flex items-center rounded-lg border border-border bg-white overflow-hidden focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-base">
            <span className="pl-3 pr-1 text-sm text-muted-foreground shrink-0 select-none">app.fptai.com/</span>
            <input
              value={urlSlug}
              maxLength={SLUG_MAX}
              onChange={e => setUrlSlug(e.target.value.replace(/[^a-z0-9-]/gi, "-").toLowerCase())}
              placeholder="fpt-corp"
              className="flex-1 h-10 pr-3 text-sm outline-none bg-transparent"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            Đổi slug sẽ đổi luôn URL đăng nhập của mọi thành viên trong tổ chức.
          </p>
        </div>

        <div className="mb-2">
          <label className="text-sm font-medium mb-1.5 block">Default language</label>
          <select
            value={defaultLanguage}
            onChange={e => setDefaultLanguage(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-border bg-white text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-base"
          >
            {LANGUAGES.map(lang => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground mt-1.5">
            Ngôn ngữ mặc định cho thành viên mới — mỗi người vẫn có thể tự đổi ngôn ngữ riêng sau đó.
          </p>
        </div>

        <div className="flex justify-end mt-6 pt-5 border-t border-border">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="btn-primary h-9 px-4 inline-flex items-center gap-1.5 disabled:opacity-60"
          >
            {saving ? (
              <><Loader2 size={14} className="animate-spin" /> Đang lưu...</>
            ) : (
              <>Save changes <Check size={14} /></>
            )}
          </button>
        </div>
      </Card>
    </div>
  );
}
