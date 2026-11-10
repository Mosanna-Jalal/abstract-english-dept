import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Same mark as app/icon.svg: a gold open book on a claret seal.
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
          background: "linear-gradient(140deg, #84283a, #5a1722)",
        }}
      >
        <div
          style={{
            width: 150,
            height: 150,
            borderRadius: 32,
            border: "3px solid rgba(233,201,143,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width="96"
            height="96"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ecd3a0"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 5v16" />
            <path d="M20.001 19A2 2 0 0022 17V5a2 2 0 00-1.999-2L16 3.002A5 5 0 0012 5a5 5 0 00-4-2H4a2 2 0 00-2 2v12a2 2 0 001.999 2H8a5 5 0 014 2 5 5 0 014-2z" />
          </svg>
        </div>
      </div>
    ),
    size,
  );
}
