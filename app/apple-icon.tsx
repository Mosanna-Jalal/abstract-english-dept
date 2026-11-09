import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#7a2533",
        }}
      >
        <div
          style={{
            width: 132,
            height: 132,
            borderRadius: 999,
            border: "2px solid rgba(233,201,143,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff8f2",
            fontSize: 92,
            fontStyle: "italic",
            fontFamily: "serif",
          }}
        >
          A
        </div>
      </div>
    ),
    size,
  );
}
