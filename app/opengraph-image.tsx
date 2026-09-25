import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "MyBuildy: your AI coding agent, finally explained";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const [font, robot] = await Promise.all([
    readFile(join(process.cwd(), "app/fonts/Satoshi-Bold.ttf")),
    readFile(join(process.cwd(), "public/images/buildy-idle.png")),
  ]);
  const robotSrc = `data:image/png;base64,${robot.toString("base64")}`;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#050506", fontFamily: "Satoshi", position: "relative" }}>
        <div
          style={{
            position: "absolute", right: -40, top: -20, width: 640, height: 640, borderRadius: 9999, display: "flex",
            background: "radial-gradient(circle at 50% 50%, rgba(252,168,0,0.30) 0%, rgba(252,132,0,0.12) 32%, rgba(5,5,6,0) 60%)",
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 0 0 80px", width: 700 }}>
          <div style={{ fontSize: 28, color: "#FC8400", letterSpacing: "0.02em" }}>MyBuildy</div>
          <div style={{ fontSize: 76, lineHeight: 1.04, color: "#F4F2EF", marginTop: 20, letterSpacing: "-0.03em" }}>
            Your AI coding agent, finally explained.
          </div>
          <div style={{ fontSize: 26, color: "#9A968F", marginTop: 28 }}>Free and source-available · Windows and Mac</div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={robotSrc} width={440} height={660} style={{ position: "absolute", right: 60, top: -40 }} alt="" />
      </div>
    ),
    { ...size, fonts: [{ name: "Satoshi", data: font, weight: 700, style: "normal" }] },
  );
}
