"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import siteData from "@/data/site.json";

type Feature = (typeof siteData.features)[number];
type Service = (typeof siteData.services)[number];
type GalleryItem = (typeof siteData.gallery.items)[number];
type SectionKey = "hero" | "features" | "services" | "gallery" | "contact";
type FormField = "name" | "email" | "phone" | "message";
type AnimationType = "fade" | "slide" | "zoom";

type ContentState = {
  hero: typeof siteData.hero;
  features: Feature[];
  services: Service[];
  gallery: typeof siteData.gallery;
  contact: typeof siteData.contact;
  footer: typeof siteData.footer;
  navigation: typeof siteData.navigation;
  meta: typeof siteData.meta;
};

type SectionState = {
  id: SectionKey;
  label: string;
  enabled: boolean;
};

type AdminState = {
  preview: "desktop" | "tablet" | "mobile";
  animationsEnabled: boolean;
  animationType: AnimationType;
  sections: SectionState[];
  formFields: Record<FormField, { enabled: boolean; label: string }>;
  recipients: { email: string; crm: string };
  submissions: Array<{ name?: string; email?: string; phone?: string; message?: string; date: string }>;
  lockUntil: number;
  failedCount: number;
  history: ContentState[];
  future: ContentState[];
  role: "admin" | "editor" | null;
  authenticated: boolean;
};

const HISTORY_LIMIT = 20;
const ADMIN_LOCK_THRESHOLD = 3;
const ADMIN_LOCK_MS = 5 * 60 * 1000;

const Magnetic: React.FC<{ className?: string; children: React.ReactNode }> = ({
  className,
  children,
}) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 260, damping: 26, mass: 0.4 });
  const springY = useSpring(y, { stiffness: 260, damping: 26, mass: 0.4 });

  return (
    <motion.div
      className={`magnetic-area inline-block ${className ?? ""}`}
      style={{ x: springX, y: springY }}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - rect.left - rect.width / 2) * 0.12);
        y.set((e.clientY - rect.top - rect.height / 2) * 0.12);
      }}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.div>
  );
};

const CustomCursor = ({ disabled }: { disabled: boolean }) => {
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const scale = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 400, damping: 40 });
  const springY = useSpring(y, { stiffness: 400, damping: 40 });
  const springScale = useSpring(scale, { stiffness: 260, damping: 30 });

  useEffect(() => {
    if (disabled) return;
    const move = (e: MouseEvent) => {
      x.set(e.clientX - 12);
      y.set(e.clientY - 12);
      scale.set(1);
    };
    const hide = () => scale.set(0);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerleave", hide);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerleave", hide);
    };
  }, [disabled, scale, x, y]);

  if (disabled) return null;
  return (
    <motion.div
      className="pointer-events-none fixed left-0 top-0 z-[90] h-6 w-6 rounded-full border border-white/40 bg-white/10 backdrop-blur"
      style={{ translateX: springX, translateY: springY, scale: springScale }}
    >
      <motion.div
        className="absolute inset-0 rounded-full blur-2xl"
        style={{
          background:
            "radial-gradient(circle at 30% 30%, rgba(54,224,139,0.55), transparent 55%), radial-gradient(circle at 70% 70%, rgba(224,54,139,0.55), transparent 55%)",
        }}
      />
    </motion.div>
  );
};

const EditableText = ({
  text,
  onChange,
  as: Tag = "p",
  admin,
  className,
}: {
  text: string;
  onChange: (v: string) => void;
  as?: "p" | "h1" | "h2" | "h3" | "span";
  admin: boolean;
  className?: string;
}) => {
  return (
    <Tag
      contentEditable={admin}
      suppressContentEditableWarning
      className={`${className ?? ""} ${admin ? "outline-none ring-1 ring-white/10 rounded-sm" : ""}`}
      onBlur={(e) => admin && onChange(e.currentTarget.textContent || "")}
    >
      {text}
    </Tag>
  );
};

const EditableImage = ({
  src,
  alt,
  admin,
  onChange,
  className,
  width,
  height,
  ...rest
}: {
  src: string;
  alt: string;
  admin: boolean;
  onChange: (v: string) => void;
  className?: string;
  width: number;
  height: number;
  [key: string]: unknown;
}) => {
  const handleClick = () => {
    if (!admin) return;
    const next = prompt("Укажите URL изображения", src);
    if (next && next.trim()) onChange(next.trim());
  };
  return (
        <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={`${className ?? ""} ${admin ? "cursor-pointer" : ""}`}
      onClick={handleClick}
      {...rest}
    />
  );
};

const SectionHeader = ({
  eyebrow,
  title,
  description,
  admin,
  onChange,
}: {
  eyebrow: string;
  title: string;
  description: string;
  admin?: boolean;
  onChange?: (next: { eyebrow?: string; title?: string; description?: string }) => void;
}) => (
  <div className="mb-10 flex flex-col gap-3 text-center lg:text-left">
    <EditableText
      as="span"
      admin={Boolean(admin)}
      className="text-xs uppercase tracking-[0.2em] text-white/60 inline-block"
      text={eyebrow}
      onChange={(v) => onChange?.({ eyebrow: v })}
    />
    <EditableText
      as="h2"
      admin={Boolean(admin)}
      className="text-balance text-3xl font-bold leading-tight lg:text-4xl"
      text={title}
      onChange={(v) => onChange?.({ title: v })}
    />
    <EditableText
      admin={Boolean(admin)}
      className="mx-auto max-w-3xl text-base text-white/70 lg:mx-0"
      text={description}
      onChange={(v) => onChange?.({ description: v })}
    />
  </div>
);

const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false,
  );
  useEffect(() => {
    const m = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    m.addEventListener("change", handler);
    return () => m.removeEventListener("change", handler);
  }, [query]);
  return matches;
};

const AdminPanel = ({
  onAddFeature,
  onAddGallery,
  adminState,
  setAdminState,
  onSaveLocal,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: {
  onAddFeature: (item: Feature) => void;
  onAddGallery: (item: GalleryItem) => void;
  adminState: AdminState;
  setAdminState: (fn: (s: AdminState) => AdminState) => void;
  onSaveLocal: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [step, setStep] = useState<"login" | "code">("login");
  const [loginForm, setLoginForm] = useState({ email: "", password: "", code: "" });
  const [feedback, setFeedback] = useState<null | string>(null);
  const [draft, setDraft] = useState({
    title: "",
    text: "",
    category: "UI",
    type: "feature",
  });

  const mockUsers = [
    { email: "admin@example.com", password: "admin123", role: "admin" as const, tfa: true },
    { email: "editor@example.com", password: "editor123", role: "editor" as const, tfa: false },
  ];

  const handleLogin = () => {
    if (adminLocked) {
      setAuthError("Доступ временно заблокирован. Попробуйте позже.");
      return;
    }
    const found = mockUsers.find(
      (u) =>
        u.email.toLowerCase() === loginForm.email.toLowerCase() &&
        u.password === loginForm.password,
    );
    if (!found) {
      setAuthError("Неверный логин или пароль");
      setAdminState((s) => {
        const failed = s.failedCount + 1;
        if (failed >= ADMIN_LOCK_THRESHOLD) {
          return { ...s, failedCount: 0, lockUntil: Date.now() + ADMIN_LOCK_MS };
        }
        return { ...s, failedCount: failed };
      });
      return;
    }
    if (found.tfa) {
      setStep("code");
      setAuthError(null);
      return;
    }
    setAdminState((s) => ({ ...s, role: found.role, authenticated: true, failedCount: 0 }));
    setAuthOpen(false);
    setAuthError(null);
  };

  const handleCode = () => {
    if (adminLocked) {
      setAuthError("Доступ временно заблокирован. Попробуйте позже.");
      return;
    }
    if (loginForm.code.trim() !== "000000" && loginForm.code.trim() !== "123456") {
      setAuthError("Неверный код 2FA (используй 000000)");
      return;
    }
    const found = mockUsers.find(
      (u) =>
        u.email.toLowerCase() === loginForm.email.toLowerCase() &&
        u.password === loginForm.password,
    );
    if (!found) {
      setAuthError("Сессия устарела, перезайдите");
      setStep("login");
      return;
    }
    setAdminState((s) => ({ ...s, role: found.role, authenticated: true, failedCount: 0 }));
    setAuthOpen(false);
    setAuthError(null);
  };

  const handleSubmit = () => {
    if (!draft.title || !draft.text) return;
    if (draft.type === "feature") {
      onAddFeature({
        title: draft.title,
        text: draft.text,
        tag: "Admin",
        icon: "/images/feature-4.svg",
      });
    } else {
      onAddGallery({
        title: draft.title,
        description: draft.text,
        category: draft.category as GalleryItem["category"],
        src: "/images/gallery-5.svg",
      });
    }
    setDraft({ title: "", text: "", category: "UI", type: "feature" });
    setFeedback(
      draft.type === "feature"
        ? "Карточка добавлена в секцию «Преимущества» (вверху страницы)."
        : "Карточка добавлена в «Галерею» — смотри фильтр «Все» или выбранную категорию.",
    );
    setTimeout(() => setFeedback(null), 3200);
  };

  return (
    <div className="glass-panel fixed right-4 top-4 z-40 max-w-xs rounded-2xl p-4 text-sm text-white/80 shadow-2xl">
      {authOpen && (
        <div className="mb-3 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-[0.16em] text-white/60">Вход</span>
            <button className="text-xs underline" onClick={() => setAuthOpen(false)}>
              Закрыть
            </button>
          </div>
          {step === "login" && (
            <>
              <input
                className="rounded-lg bg-white/5 px-3 py-2 text-white"
                placeholder="Email"
                value={loginForm.email}
                onChange={(e) => setLoginForm((p) => ({ ...p, email: e.target.value }))}
              />
              <input
                className="rounded-lg bg-white/5 px-3 py-2 text-white"
                type="password"
                placeholder="Пароль"
                value={loginForm.password}
                onChange={(e) => setLoginForm((p) => ({ ...p, password: e.target.value }))}
              />
              <button
                className="glow-button w-full rounded-xl px-4 py-2 text-sm font-semibold text-white"
                onClick={handleLogin}
              >
                Войти
              </button>
            </>
          )}
          {step === "code" && (
            <>
              <div className="text-xs text-white/70">Введите код 2FA (например, 000000)</div>
              <input
                className="rounded-lg bg-white/5 px-3 py-2 text-white"
                placeholder="Код"
                value={loginForm.code}
                onChange={(e) => setLoginForm((p) => ({ ...p, code: e.target.value }))}
              />
              <button
                className="glow-button w-full rounded-xl px-4 py-2 text-sm font-semibold text-white"
                onClick={handleCode}
              >
                Подтвердить
              </button>
              <button
                className="text-xs text-white/70 underline"
                onClick={() => {
                  setStep("login");
                  setCodeRequested(false);
                }}
              >
                Изменить логин/пароль
              </button>
            </>
          )}
          {authError && <div className="text-xs text-red-400">{authError}</div>}
        </div>
      )}
      {!authOpen && (
        <div className="mb-2 flex items-center justify-between text-xs text-white/70">
          <span>Роль: {adminState.role === "admin" ? "Админ" : "Редактор"}</span>
          <button
            className="underline"
            onClick={() => {
              setAdminState((s) => ({ ...s, role: null, authenticated: false }));
              setStep("login");
              setAuthOpen(true);
              setLoginForm({ email: "", password: "", code: "" });
            }}
          >
            Выйти
          </button>
        </div>
      )}

      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs uppercase tracking-[0.16em] text-white/60">
          Админ-панель
        </span>
        <button
          className="text-xs text-white/80 underline"
          onClick={() => setOpen((p) => !p)}
        >
          {open ? "Скрыть" : "Добавить"}
        </button>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex flex-col gap-3 overflow-hidden"
          >
            <select
              className="rounded-lg bg-white/5 px-3 py-2 text-white"
              value={draft.type}
              onChange={(e) =>
                setDraft((d) => ({ ...d, type: e.target.value }))
              }
            >
              <option value="feature">К карточкам</option>
              <option value="gallery">В галерею</option>
            </select>
            <input
              className="rounded-lg bg-white/5 px-3 py-2 text-white"
              placeholder="Заголовок"
              value={draft.title}
              onChange={(e) =>
                setDraft((d) => ({ ...d, title: e.target.value }))
              }
            />
            <textarea
              className="min-h-[80px] rounded-lg bg-white/5 px-3 py-2 text-white"
              placeholder="Текст"
              value={draft.text}
              onChange={(e) =>
                setDraft((d) => ({ ...d, text: e.target.value }))
              }
            />
            {draft.type === "gallery" && (
              <select
                className="rounded-lg bg-white/5 px-3 py-2 text-white"
                value={draft.category}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, category: e.target.value }))
                }
              >
            {content.gallery.categories.map((cat) => (
                  <option key={cat}>{cat}</option>
                ))}
              </select>
            )}
            <button
              className="glow-button w-full rounded-xl px-4 py-3 text-sm font-semibold text-white"
              onClick={handleSubmit}
            >
              Добавить карточку
            </button>
            {feedback && (
              <div className="rounded-lg bg-white/5 px-3 py-2 text-xs text-white/80">
                {feedback}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ContactForm = ({ contact }: { contact: ContentState["contact"] }) => {
  const [state, setState] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle",
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.name || !state.email || !state.message) return;
    try {
      setStatus("loading");
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state),
      });
      if (!res.ok) throw new Error("failed");
      setStatus("done");
      setState({ name: "", email: "", message: "" });
    } catch {
      setStatus("error");
    }
  };

  return (
    <form
      onSubmit={submit}
      className="glass-panel card-gradient relative overflow-hidden rounded-3xl p-6 shadow-lg"
      itemScope
      itemType="https://schema.org/ContactPage"
    >
      <div className="absolute right-6 top-6 h-20 w-20 rounded-full bg-[#2d21ed]/30 blur-3xl" />
      <h3
        className="text-2xl font-semibold"
        style={{ fontFamily: "var(--font-arsenica)" }}
        itemProp="headline"
      >
        {contact.title}
      </h3>
      <p className="mt-2 max-w-xl text-white/70" itemProp="description">
        {contact.subtitle}
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-white/70">
          Имя
          <motion.input
            whileFocus={{ scale: 1.01 }}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
            className="rounded-2xl bg-white/5 px-4 py-3 text-white outline-none ring-0 transition focus:bg-white/8"
            value={state.name}
            required
            itemProp="name"
            onChange={(e) => setState((s) => ({ ...s, name: e.target.value }))}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-white/70">
          Email
          <motion.input
            type="email"
            whileFocus={{ scale: 1.01 }}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
            className="rounded-2xl bg-white/5 px-4 py-3 text-white outline-none ring-0 transition focus:bg-white/8"
            value={state.email}
            required
            itemProp="email"
            onChange={(e) =>
              setState((s) => ({ ...s, email: e.target.value }))
            }
          />
        </label>
      </div>
      <label className="mt-4 flex flex-col gap-2 text-sm text-white/70">
        Задача
        <motion.textarea
          whileFocus={{ scale: 1.005 }}
          transition={{ type: "spring", stiffness: 280, damping: 24 }}
          className="min-h-[140px] rounded-2xl bg-white/5 px-4 py-3 text-white outline-none ring-0 transition focus:bg-white/8"
          value={state.message}
          required
          itemProp="message"
          onChange={(e) =>
            setState((s) => ({ ...s, message: e.target.value }))
          }
        />
      </label>
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <Magnetic>
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            disabled={status === "loading"}
            className="glow-button rounded-full px-5 py-3 text-sm font-semibold text-white shadow-lg"
            type="submit"
            itemProp="potentialAction"
          >
            {status === "loading"
              ? "Отправляем..."
              : status === "done"
                ? "Отправлено"
                : contact.cta}
          </motion.button>
        </Magnetic>
        {status === "error" && (
          <span className="text-xs text-red-400">Не получилось, попробуйте еще</span>
        )}
        <div className="flex flex-col text-sm text-white/60">
          <span itemProp="email">{contact.email}</span>
          <span itemProp="telephone">{contact.phone}</span>
          <span itemProp="address">{contact.address}</span>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-white/70">
        {contact.socials.map((social) => (
          <a
            key={social.label}
            href={social.href}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-white/5 px-4 py-2 hover:bg-white/10"
          >
            {social.label}
          </a>
        ))}
      </div>
    </form>
  );
};

export default function Home() {
  const prefersReducedMotion = useReducedMotion();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const STORAGE_KEY = "landing-two-content-v1";
  const ADMIN_KEY = "landing-two-admin-v1";
  const loadedRef = useRef(false);
  const [content, setContent] = useState<ContentState>(() => {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        try {
          return JSON.parse(raw) as ContentState;
        } catch {
          /* ignore parse error */
        }
      }
    }
    return siteData;
  });
  const [adminState, setAdminState] = useState<AdminState>(() => {
    const defaultState: AdminState = {
      preview: "desktop",
      animationsEnabled: true,
      animationType: "fade",
      sections: [
        { id: "hero", label: "Hero", enabled: true },
        { id: "features", label: "Преимущества", enabled: true },
        { id: "services", label: "Функционал", enabled: true },
        { id: "gallery", label: "Галерея", enabled: true },
        { id: "contact", label: "Контакты", enabled: true },
      ],
      formFields: {
        name: { enabled: true, label: "Имя" },
        email: { enabled: true, label: "Email" },
        phone: { enabled: false, label: "Телефон" },
        message: { enabled: true, label: "Сообщение" },
      },
      recipients: { email: "hello@example.com", crm: "https://crm.local/webhook" },
      submissions: [],
      lockUntil: 0,
      failedCount: 0,
      history: [],
      future: [],
      role: null,
      authenticated: false,
    };
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem(ADMIN_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as Partial<AdminState>;
          return { ...defaultState, ...parsed, history: [], future: [] };
        } catch {
          /* ignore */
        }
      }
    }
    return defaultState;
  });
  const [filter, setFilter] = useState(content.gallery.categories[0]);
  const [viewport, setViewport] = useState({ w: 1280, h: 720 });

  useEffect(() => {
    loadedRef.current = true;
  }, []);

  useEffect(() => {
    if (!loadedRef.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(content));
    } catch (e) {
      console.warn("Failed to save content", e);
    }
  }, [content]);

  useEffect(() => {
    if (!loadedRef.current) return;
    const toStore = {
      preview: adminState.preview,
      animationsEnabled: adminState.animationsEnabled,
      animationType: adminState.animationType,
      sections: adminState.sections,
      formFields: adminState.formFields,
      recipients: adminState.recipients,
    };
    try {
      localStorage.setItem(ADMIN_KEY, JSON.stringify(toStore));
    } catch (e) {
      console.warn("Failed to save admin state", e);
    }
  }, [
    adminState.preview,
    adminState.animationsEnabled,
    adminState.animationType,
    adminState.sections,
    adminState.formFields,
    adminState.recipients,
    loadedRef,
  ]);

  useEffect(() => {
    if (!loadedRef.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(content));
    } catch (e) {
      console.warn("Failed to save content", e);
    }
  }, [content]);

  useEffect(() => {
    const update = () =>
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const parallaxX = useTransform(
    mouseX,
    [-viewport.w / 2, viewport.w / 2],
    [-12, 12],
  );
  const parallaxY = useTransform(
    mouseY,
    [-viewport.h / 2, viewport.h / 2],
    [-10, 10],
  );

  const hero = content.hero;
  const services: Service[] = content.services;
  const features = content.features;
  const galleryItems = content.gallery.items;
  const navItems = content.navigation;
  const filteredGallery = useMemo(
    () =>
      filter === "Все"
        ? galleryItems
        : galleryItems.filter((item) => item.category === filter),
    [filter, galleryItems],
  );

  const showAdmin =
    pathname?.includes("/admin") ||
    searchParams.get("admin") === "1" ||
    searchParams.get("admin") === "true";

  const pushHistory = (snapshot: ContentState) => {
    setAdminState((s) => ({
      ...s,
      history: [snapshot, ...s.history].slice(0, HISTORY_LIMIT),
      future: [],
    }));
  };

  const updateContent = (mutate: (draft: ContentState) => ContentState) => {
    setContent((current) => {
      const snap = typeof structuredClone === "function" ? structuredClone(current) : JSON.parse(JSON.stringify(current));
      const next = mutate(snap);
      pushHistory(current);
      return next;
    });
  };

  const handleUndo = () => {
    setAdminState((s) => {
      if (s.history.length === 0) return s;
      const [latest, ...rest] = s.history;
      const future = [content, ...s.future].slice(0, HISTORY_LIMIT);
      setContent(latest);
      return { ...s, history: rest, future };
    });
  };

  const handleRedo = () => {
    setAdminState((s) => {
      if (s.future.length === 0) return s;
      const [latest, ...rest] = s.future;
      const history = [content, ...s.history].slice(0, HISTORY_LIMIT);
      setContent(latest);
      return { ...s, future: rest, history };
    });
  };

  const [now, setNow] = useState(() => (typeof window !== "undefined" ? Date.now() : 0));
  useEffect(() => {
    if (typeof window === "undefined" || adminState.lockUntil <= 0) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [adminState.lockUntil]);
  const adminLocked = adminState.lockUntil > 0 && now < adminState.lockUntil;

  const letterAnimation = {
    hidden: { y: 40, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 320 } },
  };

  return (
    <div
      className="relative overflow-hidden"
      onPointerMove={(e) => {
        mouseX.set(e.clientX - viewport.w / 2);
        mouseY.set(e.clientY - viewport.h / 2);
      }}
    >
      <CustomCursor disabled={isMobile} />
      {showAdmin && (
        <AdminPanel
          onAddFeature={(item) => setFeatures((prev) => [item, ...prev])}
          onAddGallery={(item) => setGalleryItems((prev) => [item, ...prev])}
        />
      )}

      <div className="pointer-events-none fixed inset-0 z-0 grid-bg" />
      <header className="sticky top-0 z-30 mx-auto max-w-6xl px-4 pt-4">
        <nav className="glass-panel flex items-center justify-between gap-4 rounded-2xl px-4 py-3 text-sm text-white">
          <span
            className="text-base font-semibold"
            style={{ fontFamily: "var(--font-arsenica)" }}
          >
            Neon Layer
          </span>
          <div className="hidden items-center gap-3 md:flex">
            {navItems.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-full px-3 py-2 text-white/80 transition hover:bg-white/10"
              >
                {link.label}
              </a>
            ))}
          </div>
          <Magnetic>
            <a
              href="#contact"
              className="glow-button rounded-full px-4 py-2 text-xs font-semibold text-white shadow-lg"
            >
              Связаться
            </a>
          </Magnetic>
        </nav>
      </header>

      <main className="relative mx-auto flex max-w-6xl flex-col gap-24 px-4 pb-20 pt-14 sm:px-6 lg:px-10">
        <section
          id="hero"
          className="relative mt-6 grid gap-10 lg:grid-cols-[1.1fr_0.9fr]"
          itemScope
          itemType="https://schema.org/CreativeWork"
        >
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-white/5 via-transparent to-white/0 blur-3xl" />
          <div className="flex flex-col gap-6">
            <span className="flex w-fit items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/70">
              <span className="h-2 w-2 rounded-full bg-[#36e08b]" />
              {hero.badge}
            </span>
            <motion.h1
              className="text-balance text-4xl font-bold leading-[1.05] sm:text-5xl"
              style={{ fontFamily: "var(--font-arsenica)" }}
            >
              {hero.title.split("").map((letter, i) => (
                <motion.span
                  key={i}
                  className={letter.trim() === "" ? "inline-block w-2" : ""}
                  variants={letterAnimation}
                  initial="hidden"
                  animate="show"
                  transition={{ delay: i * 0.02 }}
                >
                  {letter}
                </motion.span>
              ))}
            </motion.h1>
            <motion.p
              className="max-w-2xl text-lg text-white/70"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: prefersReducedMotion ? 0 : 0.6 }}
            >
              {hero.subtitle}
            </motion.p>
            <div className="flex flex-wrap items-center gap-4">
              <Magnetic>
                <motion.a
                  href="#contact"
                  whileHover={{ scale: prefersReducedMotion ? 1 : 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="glow-button rounded-full px-6 py-3 text-sm font-semibold text-white shadow-xl"
                >
                  {hero.ctaPrimary}
                </motion.a>
              </Magnetic>
              <Magnetic>
                <motion.a
                  href="#services"
                  className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white hover:border-white/30 hover:bg-white/5"
                  whileHover={{ scale: prefersReducedMotion ? 1 : 1.01 }}
                >
                  {hero.ctaSecondary}
                </motion.a>
              </Magnetic>
            </div>
            <div className="grid grid-cols-3 gap-4 pt-4" itemProp="aggregateRating">
              {hero.stats.map((stat) => (
                <div
                  key={stat.label}
                  className="glass-panel rounded-2xl px-4 py-3 text-center shadow"
                  itemScope
                  itemType="https://schema.org/QuantitativeValue"
                >
                  <div className="text-xl font-semibold text-white" itemProp="value">
                    {stat.value}
                  </div>
                  <div className="text-xs uppercase tracking-[0.12em] text-white/60" itemProp="name">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <motion.div
              className="glass-panel soft-shadow relative overflow-hidden rounded-[28px] p-4"
              style={{ x: parallaxX, y: parallaxY }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/0" />
              <Image
                src={hero.image}
                alt="Hero иллюстрация"
                width={800}
                height={640}
                priority
                className="w-full rounded-2xl object-cover"
              />
              <div className="absolute left-4 top-4 flex gap-3">
                {hero.decor.map((item) => (
                  <motion.div
                    key={item}
                    className="h-14 w-14 rounded-full bg-white/5 p-2"
                    style={{
                      x: parallaxX,
                      y: parallaxY,
                    }}
                  >
                    <Image
                      src={item}
                      alt="decor"
                      width={64}
                      height={64}
                      className="h-full w-full object-contain"
                    />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        <section
          id="features"
          className="space-y-10"
          itemScope
          itemType="https://schema.org/ItemList"
        >
          <SectionHeader
            eyebrow="Преимущества"
            title="Создано для роста: архитектура, брендинг, UX, код"
            description="Каждый блок можно расширять через админку. Карточки реагируют на курсор и собирают внимание."
          />
          <div className="grid gap-6 md:grid-cols-2">
            {features.map((feature, idx) => (
              <motion.article
                key={`${feature.title}-${idx}`}
                className="glass-panel card-gradient group relative overflow-hidden rounded-3xl p-5 shadow-xl"
                whileHover={
                  prefersReducedMotion
                    ? undefined
                    : { scale: 1.01, rotateX: -1.2, rotateY: 1.2 }
                }
                transition={{ type: "spring", stiffness: 260, damping: 18 }}
                itemScope
                itemProp="itemListElement"
                itemType="https://schema.org/Service"
              >
                <div className="absolute right-4 top-4 h-16 w-16 rounded-full bg-white/5 blur-2xl" />
                <div className="flex items-start gap-4">
                  <div className="rounded-2xl bg-white/5 p-3">
                    <Image
                      src={feature.icon}
                      alt={feature.title}
                      width={56}
                      height={56}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.14em] text-white/70">
                        {feature.tag}
                      </span>
                    </div>
                    <h3
                      className="text-lg font-semibold text-white"
                      style={{ fontFamily: "var(--font-arsenica)" }}
                      itemProp="name"
                    >
                      {feature.title}
                    </h3>
                    <p className="text-sm text-white/70" itemProp="description">
                      {feature.text}
                    </p>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </section>

        <section
          id="services"
          className="space-y-10"
          itemScope
          itemType="https://schema.org/ItemList"
        >
          <SectionHeader
            eyebrow="Функционал"
            title="Что делаем для запуска и роста продукта"
            description="Работаем слоями: стратегия → дизайн → motion → продакшн. Анимации упрощаются на мобильных для скорости."
          />
          <div className="grid gap-6 md:grid-cols-2">
            {services.map((service, idx) => (
              <motion.article
                key={service.title}
                className="glass-panel card-gradient group relative overflow-hidden rounded-3xl p-5 shadow-xl"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{
                  duration: prefersReducedMotion ? 0 : 0.5,
                  delay: idx * 0.05,
                }}
                itemScope
                itemProp="itemListElement"
                itemType="https://schema.org/Service"
              >
                <div className="absolute inset-0 opacity-0 transition group-hover:opacity-100">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/0" />
                </div>
                <div className="flex items-start gap-4">
                  <div className="rounded-2xl bg-white/5 p-3">
                    <Image
                      src={service.icon}
                      alt={service.title}
                      width={56}
                      height={56}
                    />
                  </div>
                  <div className="space-y-2">
                    <h3
                      className="text-lg font-semibold text-white"
                      style={{ fontFamily: "var(--font-arsenica)" }}
                      itemProp="name"
                    >
                      {service.title}
                    </h3>
                    <p className="text-sm text-white/70" itemProp="description">
                      {service.text}
                    </p>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </section>

        <section
          id="gallery"
          className="space-y-10"
          itemScope
          itemType="https://schema.org/ImageGallery"
        >
          <SectionHeader
            eyebrow="Галерея"
            title="Медиа и UI с фильтрами по категориям"
            description="Lazy-load, мягкое появление, фильтрация по клику. Каждое изображение — декоративный элемент из палитры."
          />
          <div className="flex flex-wrap gap-3">
            {content.gallery.categories.map((category) => (
              <Magnetic key={category}>
                <button
                  onClick={() => setFilter(category)}
                  className={`rounded-full px-4 py-2 text-sm transition ${
                    filter === category
                      ? "glow-button text-white"
                      : "bg-white/5 text-white/80 hover:bg-white/10"
                  }`}
                >
                  {category}
                </button>
              </Magnetic>
            ))}
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {filteredGallery.map((item, idx) => (
              <motion.figure
                key={`${item.title}-${idx}`}
                className="glass-panel group relative overflow-hidden rounded-3xl shadow-xl"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.55, delay: idx * 0.04 }}
                itemScope
                itemProp="associatedMedia"
                itemType="https://schema.org/ImageObject"
              >
                <Image
                  src={item.src}
                  alt={item.title}
                  width={640}
                  height={420}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
                <figcaption className="absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-4 text-white">
                  <span className="text-sm uppercase tracking-[0.12em] text-white/70">
                    {item.category}
                  </span>
                  <span className="text-lg font-semibold">{item.title}</span>
                  <p className="text-sm text-white/70">{item.description}</p>
                </figcaption>
              </motion.figure>
            ))}
          </div>
        </section>

        <section
          id="contact"
          className="space-y-10"
          itemScope
          itemType="https://schema.org/ContactPoint"
        >
          <SectionHeader
            eyebrow="Контакты"
            title="Свяжемся и предложим план запуска"
            description="Форма отправляет на /api/contact (mock). Поля плавно реагируют на фокус, кнопка — 3D glow."
          />
          <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
            <div className="glass-panel relative overflow-hidden rounded-3xl p-6">
              <div className="absolute -left-6 -top-6 h-36 w-36 rounded-full bg-[#2d21ed]/25 blur-3xl" />
              <h3
                className="text-2xl font-semibold"
                style={{ fontFamily: "var(--font-arsenica)" }}
                itemProp="name"
              >
                Neon Layer Studio
              </h3>
              <p className="mt-2 max-w-md text-white/70">
                Microdata schema.org на каждом блоке. Sticky меню, плавный scroll, мобильная оптимизация.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-white/70">
                <li>• Sticky навигация с плавным скроллом</li>
                <li>• Премиум-анимации: fade, slide-up, parallax, магнитные CTA</li>
                <li>• Lazy-load изображений, минификация CSS/JS</li>
              </ul>
            </div>
            <ContactForm contact={content.contact} />
        </div>
        </section>
      </main>

      <footer
        className="border-t border-white/10 bg-black/50 px-4 py-6 text-sm text-white/70"
        itemScope
        itemType="https://schema.org/WPFooter"
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div
              className="text-lg font-semibold text-white"
              style={{ fontFamily: "var(--font-arsenica)" }}
            >
              Neon Layer Studio
            </div>
            <p>{content.footer.text}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {content.footer.links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="rounded-full bg-white/5 px-4 py-2 hover:bg-white/10"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
