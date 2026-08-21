import { useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useDeviceStore } from "@/stores/deviceStore";

export default function App() {
  useEffect(() => useDeviceStore.getState().start(), []);
  return <AppShell />;
}
