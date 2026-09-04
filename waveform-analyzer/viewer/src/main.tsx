import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { WaveformPage } from "./layout/WaveformPage"
import "./index.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <WaveformPage />
  </StrictMode>,
)
