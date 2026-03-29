import Icon from "@/components/ui/icon";

const settings = [
  { icon: "Bell", label: "Уведомления", desc: "Настройка уведомлений" },
  { icon: "Shield", label: "Конфиденциальность", desc: "Кто видит ваш профиль" },
  { icon: "Lock", label: "Безопасность", desc: "Пароль и двухфакторная аутентификация" },
  { icon: "Palette", label: "Внешний вид", desc: "Тема и шрифты" },
  { icon: "Timer", label: "Исчезающие сообщения", desc: "По умолчанию для новых чатов" },
  { icon: "Database", label: "Хранилище", desc: "Управление данными" },
  { icon: "Globe", label: "Язык", desc: "Русский" },
];

export default function SettingsPage() {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="font-bold text-base">Настройки</h2>
      </div>

      <div className="flex-1 overflow-y-auto py-3 space-y-1">
        {settings.map(s => (
          <button key={s.label}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-all text-left">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(37,99,235,0.2))" }}>
              <Icon name={s.icon as Parameters<typeof Icon>[0]["name"]} size={18} className="text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{s.label}</p>
              <p className="text-xs text-muted-foreground">{s.desc}</p>
            </div>
            <Icon name="ChevronRight" size={16} className="text-muted-foreground" />
          </button>
        ))}

        <div className="px-4 pt-6 pb-3">
          <p className="text-xs text-muted-foreground text-center">NovaMess v1.0.0</p>
          <p className="text-xs text-muted-foreground text-center mt-1">Сквозное шифрование · Приватность</p>
        </div>
      </div>
    </div>
  );
}
