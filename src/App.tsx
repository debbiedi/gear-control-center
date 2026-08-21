import { useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useI18n } from "@/i18n";
import { useDeviceStore } from "@/stores/deviceStore";

export default function App() {
  // The language is settled before anything else so the first frame is drawn
  // in it, rather than flashing English and correcting itself.
  useEffect(() => {
    void useI18n.getState().init();
  }, []);
  useEffect(() => useDeviceStore.getState().start(), []);
  return <AppShell />;
}
