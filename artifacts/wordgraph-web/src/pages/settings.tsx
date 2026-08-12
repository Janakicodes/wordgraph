import { Settings } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-6">
        <Settings className="w-8 h-8 text-muted-foreground" aria-hidden />
      </div>
      <h1 className="text-2xl font-bold text-foreground mb-3">Settings</h1>
      <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">
        Preferences and customisation options will be available here. Use the
        theme toggle in the sidebar to switch between light and dark mode.
      </p>
    </div>
  );
}
