import { ImageResponse } from "next/og";

export const alt = "MedBook";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #003049 0%, #0A9396 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 80,
            height: 80,
            borderRadius: 20,
            background: "#fff",
            color: "#0A9396",
            fontSize: 40,
            fontWeight: 800,
            marginBottom: 20,
          }}
        >
          M
        </div>
        <div
          style={{
            fontSize: 60,
            fontWeight: 800,
            color: "#fff",
            letterSpacing: "-0.02em",
          }}
        >
          MedBook
        </div>
        <div
          style={{
            fontSize: 24,
            color: "#94D2BD",
            marginTop: 12,
            textAlign: "center",
            maxWidth: 500,
          }}
        >
          Intelligent care for modern clinics
        </div>
      </div>
    ),
    { ...size },
  );
}
