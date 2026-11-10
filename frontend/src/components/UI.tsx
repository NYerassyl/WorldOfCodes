import { useEffect, useRef, type ReactNode } from "react";
import { handleEditorKeyDown } from "../lib/editor-keys";
import {
  House,
  BookOpen,
  Code,
  Sword,
  Users,
  Keyboard,
  UserCircle,
  Trophy,
  Lightning,
  Check,
  CheckCircle,
  ArrowRight,
  ArrowUpRight,
  Sparkle,
  Coins,
  Planet,
  CaretDown,
  GearSix,
  List,
  X,
  TerminalWindow,
  GitBranch,
  Fire,
  Hexagon,
} from "@phosphor-icons/react";
export function Icon({ name }: { name: string }) {
  const icons: Record<string, typeof House> = {
    home: House,
    learn: BookOpen,
    code: Code,
    duel: Sword,
    friends: Users,
    copy: Keyboard,
    profile: UserCircle,
    trophy: Trophy,
    bolt: Lightning,
    check: Check,
    "check-circle": CheckCircle,
    arrow: ArrowRight,
    "arrow-up": ArrowUpRight,
    sparkle: Sparkle,
    coin: Coins,
    planet: Planet,
    caret: CaretDown,
    settings: GearSix,
    menu: List,
    close: X,
    terminal: TerminalWindow,
    branch: GitBranch,
    flame: Fire,
    logo: Hexagon,
  };
  const Glyph = icons[name] || Code;
  return <Glyph size={20} weight="regular" aria-hidden="true" />;
}
export function Heading({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </div>
  );
}
export function ButtonLink({
  to,
  children,
  secondary = false,
}: {
  to: string;
  children: ReactNode;
  secondary?: boolean;
}) {
  return (
    <a className={`btn${secondary ? " secondary" : ""}`} href={`#${to}`}>
      {children}
    </a>
  );
}
export function Notice({ children }: { children: ReactNode }) {
  return <div className="notice">{children}</div>;
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <h2>{title}</h2>
      {children}
      <button className="btn secondary" onClick={onClose}>
        Close
      </button>
    </dialog>
  );
}
export function Editor({
  value,
  onChange,
  title = "solution.js",
  placeholder,
  smartEditing = true,
  indent,
  autoIndent = true,
}: {
  value: string;
  onChange: (value: string) => void;
  title?: string;
  placeholder?: string;
  smartEditing?: boolean;
  indent?: string;
  autoIndent?: boolean;
}) {
  return (
    <div className="editor">
      <div className="editor-head">
        <span>
          <span className="editor-dot" /> {title}
        </span>
        <span>UTF-8</span>
      </div>
      <textarea
        aria-label="Code editor"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(event) =>
          smartEditing &&
          handleEditorKeyDown(event, value, onChange, { indent, autoIndent })
        }
        placeholder={placeholder}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
      />
    </div>
  );
}
