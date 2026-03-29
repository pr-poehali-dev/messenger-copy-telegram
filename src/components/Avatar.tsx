interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: number;
  online?: boolean;
  className?: string;
}

const COLORS = [
  "linear-gradient(135deg, #7c3aed, #2563eb)",
  "linear-gradient(135deg, #2563eb, #06b6d4)",
  "linear-gradient(135deg, #ec4899, #7c3aed)",
  "linear-gradient(135deg, #f59e0b, #ef4444)",
  "linear-gradient(135deg, #10b981, #2563eb)",
  "linear-gradient(135deg, #06b6d4, #10b981)",
];

function getColor(name?: string) {
  if (!name) return COLORS[0];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i)) % COLORS.length;
  return COLORS[h];
}

export default function Avatar({ src, name, size = 40, online, className = "" }: AvatarProps) {
  const initials = name ? name.slice(0, 2).toUpperCase() : "??";
  const fontSize = size * 0.38;

  return (
    <div className={`relative flex-shrink-0 ${className}`} style={{ width: size, height: size }}>
      {src ? (
        <img src={src} alt={name} className="w-full h-full rounded-full object-cover" />
      ) : (
        <div
          className="w-full h-full rounded-full flex items-center justify-center font-bold text-white select-none"
          style={{ background: getColor(name), fontSize }}>
          {initials}
        </div>
      )}
      {online && (
        <div className="online-dot" />
      )}
    </div>
  );
}
